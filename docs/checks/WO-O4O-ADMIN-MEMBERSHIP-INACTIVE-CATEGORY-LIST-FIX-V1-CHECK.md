# WO-O4O-ADMIN-MEMBERSHIP-INACTIVE-CATEGORY-LIST-FIX-V1 — CHECK

**작업일:** 2026-08-03
**판정:** PASS
**운영 데이터 write:** 0건
**DB schema / migration 변경:** 0건
**프런트 변경:** 0건 (Admin Dashboard 미수정·미배포)

---

## 1. 기존 결함의 정확한 원인

`packages/membership-yaksa/src/backend/services/MemberCategoryService.ts` 의 `list()` 가
조건 없이 `where: { isActive: true }` 로 고정되어 있었다.

```ts
async list(): Promise<MemberCategory[]> {
  return await this.repo.find({
    where: { isActive: true },              // ← 결함
    order: { sortOrder: 'ASC', name: 'ASC' },
  });
}
```

이 메서드는 관리자 목록 API `GET /api/v1/membership/categories` 의 유일한 데이터 소스다.
따라서 관리자가 분류를 비활성화하면 그 분류가 목록 응답에서 빠지고,
관리자 화면에 렌더링되지 않아 **다시 활성화할 수단이 사라졌다.**

프런트(`apps/admin-dashboard/src/pages/membership/categories/CategoryManagement.tsx`)에는
비활성 배지(L420-424)와 활성 상태 체크박스(L379-389), 토글 핸들러(L160-171)가 이미 있었으나,
API 가 비활성 행을 반환하지 않아 해당 UI 에 도달할 수 없었다. **결함은 백엔드 단독.**

---

## 2. 목록 API 전체 소비처

`MemberCategoryService.list()` 호출처 (repo 전역 grep):

| # | 호출처 | 성격 |
|---|--------|------|
| 1 | `packages/membership-yaksa/src/backend/routes/categoryRoutes.ts:23` (`GET /`) | **유일한 호출자** |

`MemberCategory` 엔티티의 그 외 접근처:

| 위치 | 성격 | 비활성 노출 위험 |
|------|------|:---:|
| `packages/membership-yaksa/src/lifecycle/install.ts:44` | `seedDefaultCategories()` — 설치 시 기본 분류 seed. `findOne({ where: { name } })` 로 중복 확인만 수행 | 없음 (읽기 경로 아님) |
| `packages/membership-yaksa/src/manifest.ts:47` | 엔티티 이름 문자열 등록 | 없음 |
| `packages/membership-yaksa/dist/**` | 빌드 산출물 | 해당 없음 |

`GET /api/v1/membership/categories` 를 호출하는 프런트:

| 앱 | 파일 | 성격 |
|----|------|------|
| admin-dashboard | `pages/membership/categories/CategoryManagement.tsx:67` | 관리자 전용 |

`apps/main-site` 및 `services/web-*` 에는 이 API 소비처가 **없다.**
(forum 쪽 `categories/.../membership-status` 매치는 별개 도메인으로 무관함을 확인)

> 결론: **일반 회원용 소비처는 현재 존재하지 않는다.** 다만 §3 정책으로 향후 유입을 차단했다.

---

## 3. 관리자용 · 일반 회원용 조회 정책

WO 핵심 주의사항("`isActive: true` 를 단순 제거하기 전에 동일 service 의 다른 소비처를 확인한다",
"일반 회원 화면에 비활성 분류가 노출되게 만들지 않는다")에 따라
**단순 제거하지 않고 opt-in 방식으로 용도를 분리**했다.

| 용도 | 호출 형태 | 반환 |
|------|-----------|------|
| 기본값 (일반 회원용 선택 목록 등 향후 소비처 포함) | `list()` / `list({ includeInactive: false })` | **활성만** — 기존 동작 그대로 |
| 관리자 목록 | `list({ includeInactive: true })` | 활성 + 비활성 |

기본값을 활성만으로 유지했기 때문에, 향후 누군가 회원용 화면에서 `list()` 를 호출해도
비활성 분류가 새어 나가지 않는다. 전체 조회는 **명시적 opt-in 1곳**에서만 일어난다
(테스트로 고정: `includeInactive: true` 문자열이 route 소스에 정확히 1회).

과도한 구조 변경(별도 service·별도 route·API 계약 변경)은 하지 않았다.

---

## 4. 구현 방법

**`MemberCategoryService.list()`** — optional 파라미터 추가, 정렬·반환 타입 불변:

```ts
async list(options?: { includeInactive?: boolean }): Promise<MemberCategory[]> {
  return await this.repo.find({
    ...(options?.includeInactive ? {} : { where: { isActive: true } }),
    order: { sortOrder: 'ASC', name: 'ASC' },
  });
}
```

**`categoryRoutes.ts` `GET /`** — 관리자 목록이므로 opt-in:

```ts
const categories = await categoryService.list({ includeInactive: true });
res.json({ success: true, data: categories });   // 응답 구조 불변
```

- 정렬 `sortOrder ASC, name ASC` 유지
- 응답 구조 `{ success, data }` 유지
- `isActive` 값은 가공 없이 그대로 직렬화 (`false` 유지)
- 활성 토글은 **기존 API 재사용** — `PATCH /categories/:id { isActive }` (신규 엔드포인트 0개)
- 인증·권한 guard **미변경**

---

## 5. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/membership-yaksa/src/backend/services/MemberCategoryService.ts` | `list()` 에 `includeInactive` opt-in 추가 (+14/-2) |
| `packages/membership-yaksa/src/backend/routes/categoryRoutes.ts` | 관리자 목록에서 opt-in 호출 (+7/-1) |
| `apps/api-server/src/__tests__/membership-category-inactive-list.spec.ts` | 신규 테스트 15건 |

프런트 변경 없음. DB schema / migration 변경 없음.

---

## 6. 활성·비활성 전체 조회 결과

테스트 fixture(활성 2 + 비활성 2)로 검증:

- `GET /categories` → 4건 전부 반환, 그중 `isActive === false` 2건
- 응답 구조 `{ success: true, data: [...] }` 유지
- 정렬 `sortOrder ASC, name ASC` 유지 (동률 시 name 순 — 한국어 collation 기준 확인)
- `isActive: false` 가 `true` 로 왜곡되지 않음

---

## 7. 비활성 분류 재활성화 가능 여부

**가능하다.** 두 경로 모두 테스트로 확인:

1. `PATCH /categories/:id { isActive: true }` — 프런트 `handleToggleActive` 가 쓰는 기존 토글 API
2. `PUT /categories/:id { ..., isActive: true }` — 프런트 편집 폼 `handleSave` 가 쓰는 경로

시나리오 테스트: 활성 → `PATCH isActive:false` → **목록에 여전히 존재** (`isActive:false`) →
`PATCH isActive:true` → 다시 활성. 결함 재현이 사라졌다.

관리자 화면 동선: 목록에 "비활성" 배지로 표시됨 → 수정(✎) → "활성 상태" 체크 → 저장.
프런트 코드 변경이 필요 없었으므로 Admin Dashboard 는 수정·배포하지 않았다.

> 관측(수정 대상 아님): `handleToggleActive`(L160) 는 정의되어 있으나 JSX 호출부가 없다(dead handler).
> 재활성화는 편집 폼 경로로 정상 동작하므로 이번 WO 범위에서 손대지 않았다.

---

## 8. 일반 회원 영역 비노출 확인

- `list()` 기본값이 활성만 반환함을 단위 테스트로 고정
- `includeInactive: true` opt-in 이 route 소스에 정확히 1회만 존재함을 소스 계약 테스트로 고정
- `apps/main-site` / `services/web-*` 에 이 API 소비처가 없음을 grep 으로 확인
- 관리자 목록 API 자체가 V2 guard 로 `platform:admin` / `platform:super_admin` 전용이므로,
  비활성 데이터는 이중으로(권한 + 기본값) 일반 회원에게 도달하지 않는다

---

## 9. 기존 관리자 guard 유지 결과

`WO-O4O-ADMIN-MEMBERSHIP-API-AUTHORIZATION-GUARD-V2` 산출물 **무수정**:

- `apps/api-server/src/bootstrap/membership-admin-guard.ts` — 변경 0
- `apps/api-server/src/bootstrap/register-routes.ts` — 변경 0
- V2 테스트 44건 전부 재통과
- 신규 테스트에서도 401(비로그인) / 403(일반) / 200(platform:admin·super_admin) 재확인

---

## 10. 테스트 · typecheck · build

| 항목 | 결과 |
|------|------|
| `jest membership-category-inactive-list.spec.ts` | **15 passed / 15** |
| `jest membership-admin-guard.spec.ts` (V2 회귀) | **44 passed / 44** |
| `packages/membership-yaksa` `tsc --noEmit` | **exit 0** |
| `apps/api-server` `tsc --noEmit -p tsconfig.build.json` (배포 범위) | **exit 0** |
| `apps/api-server` `tsc --noEmit -p tsconfig.json` (전체) | 기존 오류 13건 — 전부 `src/scripts/*` 의 타 세션 HFF·OTC 스크립트. 이번 변경 파일 오류 0. 배포 tsconfig 범위 밖 |
| 전체 monorepo build | 미실행 (WO 지시) |
| 프런트 build | 미실행 (프런트 변경 없음) |

테스트는 in-memory fake repository / fake DataSource 만 사용한다. **운영 DB 미접속.**

### 테스트 10항목 대응표

| WO 항목 | 테스트 |
|---------|--------|
| ① 활성·비활성 모두 반환 | `includeInactive=true 는 활성·비활성을 모두 반환한다`, `활성·비활성 분류를 모두 반환하고 응답 구조를 유지한다` |
| ② `isActive=false` 유지 | `isActive=false 값을 그대로 유지한다` |
| ③ 기존 정렬 유지 | `정렬은 sortOrder ASC, name ASC 로 두 모드 모두 동일하다` |
| ④ 비활성 전환 후 목록 유지 | `비활성 전환 후에도 목록에서 사라지지 않는다` |
| ⑤ 재활성화 가능 | `목록에 남은 비활성 분류를 다시 활성화할 수 있다` (PATCH·PUT 양 경로) |
| ⑥ 일반 회원용 비노출 | `기본값은 활성 분류만 반환한다`, `opt-in 하지 않은 호출자는 비활성 분류를 볼 수 없다`, `전체 조회는 관리자 목록 route 에서만 opt-in 한다` |
| ⑦ 비로그인 401 | `비로그인은 401` |
| ⑧ 일반 사용자 403 | `일반 사용자는 403` |
| ⑨ platform 관리자 정상 | `platform:admin / platform:super_admin 은 전체 목록을 받는다` |
| ⑩ 생성·수정·삭제·토글 회귀 없음 | `기존 생성·조회·수정·삭제 계약에 회귀가 없다`, V2 44건 |

---

## 11. 배포

| 항목 | 값 |
|------|-----|
| 소스 commit | `6c285645d8089654a99946cb8a2d6ff954b07e39` |
| workflow | `Deploy API Server (Cloud Run)` |
| run id | `30781664796` (push 자동 트리거) |
| run headSha | `6c285645d8089654a99946cb8a2d6ff954b07e39` — **소스 commit 과 일치** |
| 결과 | `completed / success` |
| 이전 revision | `o4o-core-api-03116-dmn` (V2) |
| 신규 revision | `o4o-core-api-03117-cqk` |
| 프런트 배포 | **없음** (프런트 변경 0) |

> 수동 dispatch `30781681512` 를 동일 SHA 로 하나 더 만들었다가 중복 배포를 피하려고 즉시 취소했다.
> 실제 배포는 push 자동 트리거 run 1건이다.

---

## 12. 프로덕션 read-only 검증

| # | WO 검증 항목 | 결과 |
|---|--------------|------|
| ① | 플랫폼 관리자 목록 정상 응답 | **미검증** — `platform:admin` / `platform:super_admin` 을 가진 테스트 계정이 없음 (§16-2) |
| ② | 기존 비활성 분류가 목록에 표시 | **미검증(해당 데이터 없음)** — `yaksa_member_categories` 운영 row 수 **0** |
| ③ | 활성·비활성 상태 표시 정상 | **미검증(데이터 없음)** — 코드 경로·테스트로 대체 검증 (§6, §10) |
| ④ | 비로그인 401 | **PASS** — `401 {"code":"AUTH_REQUIRED"}` |
| ⑤ | 일반 사용자 403 | **PASS** — 로그인한 비(非)플랫폼 계정 → `403 {"code":"ROLE_REQUIRED","details":{"requiredRoles":["platform:admin","platform:super_admin"]}}` |
| ⑥ | 신규 500 및 오류 없음 | **PASS** — 신규 revision 의 `severity>=ERROR` / `status>=500` 로그 **0건**. `/membership/categories` 트래픽은 내 검증 요청의 401·403 뿐 |

대조군: `GET /api/v1/admin/users` 가 동일 계정에서 동일하게 401·403 을 반환한다.
즉 이번 변경으로 **새로운 lockout 유형이 생기지 않았다.**

### 운영 데이터 관측 (read-only SELECT)

cloud-sql-proxy + `o4o_api` read-only 접속:

```
SELECT COUNT(*) FROM yaksa_member_categories;        -- 0
SELECT COUNT(*) FROM yaksa_members WHERE "categoryId" IS NOT NULL;  -- 0
```

**운영 DB 에 회원 분류가 한 건도 없다.** 따라서 비활성 분류도 존재하지 않으며,
WO 지시("운영 데이터에 비활성 분류가 없으면 새 분류를 만들거나 상태를 변경하지 않는다")대로
**분류를 만들지도, 상태를 바꾸지도 않았다.** 코드 경로와 테스트로 검증하고 미검증으로 기록한다.

> 부수 관측(이번 WO 범위 밖): `install.ts` 의 `seedDefaultCategories()` 기본 4분류조차 적재되어
> 있지 않다. 후속 "회원 분류 메뉴 연결" 작업에서 최초 분류 등록 동선을 함께 확인할 필요가 있다.
> 컬럼 물리명은 quoted camelCase(`"isActive"`, `"sortOrder"`)다.

---

## 13. 운영 데이터 write

**0건.** SELECT / 인증 실패 응답 확인만 수행. 회원 분류 생성·수정·비활성화·재활성화·삭제 없음.

## 14. DB schema · migration 변경

**0건.** 엔티티·컬럼·인덱스·migration 파일 변경 없음.

## 15. 제외 범위 준수

WO 범위 제외 15항목 전부 미수행:
운영 회원 분류 CRUD / 회원 분류 메뉴 연결 / soft delete 전환 / 관리자 API 경로 이전 /
인증·역할 정책 변경 / `kpa:admin` 추가 / `membership:manage` 도입 / `/membership/me` 수정 /
`/members/me`·`/members/me/summary` 수정 / audit log 테이블 생성 / audit-logs 경로 정비 /
DB schema·migration / API prefix 정비 / 공용 Membership 구조 리팩터링.

## 16. 미검증 항목

1. **운영 환경에서의 비활성 분류 표시** — `yaksa_member_categories` 운영 row 가 0건이라 표시할 데이터 자체가 없다. WO 지시에 따라 분류를 새로 만들지 않았다. 코드 경로 + 테스트 15건으로 대체 검증.
2. **platform 관리자 계정 200 응답** — `docs/local/TEST-ACCOUNTS.local.md` 의 계정 3개 모두 `platform:admin` / `platform:super_admin` 이 아니다(전부 403). 대조군 `/api/v1/admin/users` 도 동일하게 403 이므로 이번 변경 고유의 문제는 아니다. 실제 200 렌더링은 플랫폼 관리자 계정 확보 후 후속 "관리자 화면 실제 관리 동선 검증" 단계에서 확인해야 한다.
3. `handleToggleActive` dead handler — 관측만, 수정 대상 아님.
4. 브라우저 실측 smoke — 위 2번 사유로 미실시.

## 17. 후속 작업 (사용자 지정 순서)

1. 회원 분류 메뉴 연결
2. 관리자 화면에서 실제 관리 동선 검증
3. `/membership/me` 및 `/members/me*` 기존 인증 결함 별도 조사 (main-site 회원 기능 파손 관측)
4. 존재하지 않는 `audit-logs/member/:id` 호출 + 감사 로그 테이블 문제 별도 정비
