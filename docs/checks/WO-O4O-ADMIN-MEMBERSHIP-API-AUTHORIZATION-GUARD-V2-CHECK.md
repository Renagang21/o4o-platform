# WO-O4O-ADMIN-MEMBERSHIP-API-AUTHORIZATION-GUARD-V2 — CHECK

- 작업일: 2026-08-03
- 브랜치: `main`
- 소스 커밋: `82077439a`
- 배포 리비전: `o4o-core-api-03116-dmn` (배포 워크플로 run `30776613843`, sha `82077439a`)
- 판정: **PASS** (운영 데이터 write 0건)

관련 문서

- 선행 조사: [WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-AUTHORIZATION-AUDIT-V1-CHECK.md](WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-AUTHORIZATION-AUDIT-V1-CHECK.md)
- 선행 수정: [WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-API-PREFIX-FIX-V1-CHECK.md](WO-O4O-ADMIN-MEMBERSHIP-CATEGORY-API-PREFIX-FIX-V1-CHECK.md)

---

## 1. 사전 확인

| 항목 | 결과 |
|---|---|
| 작업 시작 시 `git status --short` | 자기 파일 3개 외에는 타 세션 **untracked** 파일(`src/scripts/hff-zh-b01-*`)만 존재. tracked 수정·staged 없음 |
| Membership route가 조사 이후 변경되었는지 | `git diff --name-only 77f8be27f HEAD -- packages/membership-yaksa apps/api-server/src/bootstrap` → **변경 없음** |
| 같은 route 파일을 다른 세션이 수정 중인지 | 아니오 (타 세션은 `src/scripts/` 만 접촉) |
| `main` 최신화 | `git pull --ff-only origin main` → Already up to date |

---

## 2. 관리자 / 일반 회원 API 구분 근거

`/api/v1/membership` 하위 mount 는 `packages/membership-yaksa/src/backend/routes/index.ts` 에 정의돼 있다.
실제 소비처를 전부 grep 해서 구분했다.

| mount | 소비 화면 | 성격 |
|---|---|---|
| `/categories` | admin-dashboard `CategoryManagement`, `MemberManagement` | 관리자 |
| `/members` (목록·상세·수정·bulk) | admin-dashboard `MemberManagement`, `MemberDetail`, `BulkActionToolbar` | 관리자 |
| `/members/me`, `/members/me/summary` | main-site `MemberProfilePage`, `MemberHome` | **회원 본인** |
| `/verifications` | admin-dashboard `VerificationManagement`, `yaksaAdmin.ts` | 관리자 |
| `/stats` | admin-dashboard `MembershipDashboard` | 관리자 |
| `/export` | admin-dashboard `ExportButton` | 관리자 |
| `/audit-logs`, `/affiliations`, `/organizations/:id/members`, `/license-verification` | 아래 §8 참조 | 이번 범위 밖 |

`/members` 는 **관리자 endpoint 와 회원 본인 endpoint 가 같은 router 에 섞여 있다.**
따라서 mount 전체에 guard 를 걸지 않고 본인용 경로만 통과시키는 선택적 guard 를 사용했다.

---

## 3. 별도 확인 경로 — `GET /api/v1/membership/audit-logs/member/:id`

WO 가 지정한 별도 확인 대상이다. 판정: **존재하지 않는 route (dead call). 이번 보호 대상에서 제외.**

근거

1. `packages/membership-yaksa/src/backend/routes/auditLogRoutes.ts` 의 route 는 `GET /`, `GET /recent`, `GET /stats`, `GET /:id` 뿐이다. `/member/:id` 는 2-segment 이므로 `GET /:id` 에 매칭되지 않는다.
2. 프로덕션 실측 (비로그인): `GET /api/v1/membership/audit-logs/member/<synthetic-uuid>` → **404** (Express 기본 404 HTML). 401 도 500 도 아니다.
3. 호출부는 두 곳 모두 이 없는 route 를 부른다.
   - admin-dashboard `MemberDetail.tsx:216`
   - main-site `MemberProfilePage.tsx:160`

즉 관리자용도 회원 본인용도 아니라 **양쪽 모두 깨져 있는 호출**이다.
성격이 확정되지 않은 상태에서 임의로 변경하지 않는다는 WO 지시에 따라 **코드를 건드리지 않고 기록만 남긴다.**

부수 관측 (읽기 전용, 이번 작업과 무관)

- `GET /api/v1/membership/audit-logs`, `/audit-logs/recent` → **500** `relation "yaksa_member_audit_logs" does not exist`. 프로덕션에 해당 테이블이 없다.
- `GET /api/v1/membership/me` → **404**. 실제 route 는 `/membership/members/me` 이므로 main-site `MemberProfilePage.tsx:140` 의 호출도 이미 깨져 있다.

위 3건은 이번 WO 범위 밖이며 별도 작업이 필요하다.

---

## 4. 구현

신규 파일 `apps/api-server/src/bootstrap/membership-admin-guard.ts`.

```
MEMBERSHIP_ADMIN_ROLES  = ['platform:admin', 'platform:super_admin']
MEMBERSHIP_ADMIN_SUBTREES = [
  /api/v1/membership/categories
  /api/v1/membership/export
  /api/v1/membership/stats
  /api/v1/membership/verifications
]
MEMBER_SELF_PATHS = ['/me', '/me/summary']   // /members router 안에서 guard 제외
```

- `adminOnly` = `authenticate` → `requireRole(MEMBERSHIP_ADMIN_ROLES)` 순차 합성
- `membersSelective` = `isMemberSelfPath(req.path)` 이면 `next()`, 아니면 `adminOnly`
- `registerMembershipAdminGuards(app)` 를 `app.use('/api/v1/membership', createMembershipRoutes(dataSource))` **직전**에 호출

`@o4o/membership-yaksa` 는 packages 계층이라 `apps/api-server` 미들웨어를 import 할 수 없다.
그래서 guard 는 mount 지점에서 건다 — 기존 선례 `app.use('/api/v1/lms', kpaLmsScopeGuard)` 와 같은 방식이다.

변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/bootstrap/membership-admin-guard.ts` | 신규 |
| `apps/api-server/src/bootstrap/register-routes.ts` | import 1줄 + guard 등록 1줄 + 주석 |
| `apps/api-server/src/__tests__/membership-admin-guard.spec.ts` | 신규 (테스트) |

controller / service / entity / DB / migration / API URL / method / payload / 응답 구조 **변경 없음**.

---

## 5. 권한 정책

허용: `platform:admin`, `platform:super_admin`
불허: `kpa:admin`, 그 밖의 서비스 역할, 일반 로그인 사용자

근거

- `yaksa_member_categories` 엔티티에 `serviceKey` 도 `organizationId` 도 없다 → 플랫폼 전역 데이터
- 서비스 역할로는 관리 범위를 제한할 데이터 경계가 없다
- `membership:manage` 는 프런트 라우트 가드에만 존재하고 백엔드 권한으로 확정된 적이 없다 → 백엔드에 도입하지 않았다
- `routes/admin/users.routes.ts` 의 `ADMIN_ROLES` 와 동일한 목록을 그대로 재사용했다 (신규 역할 체계 없음)

---

## 6. 테스트

`apps/api-server/src/__tests__/membership-admin-guard.spec.ts` — **44 assertions, 44 pass**
(in-memory express + supertest. DB 접근 없음, 운영 데이터 생성·수정·삭제 없음)

| # | WO 테스트 항목 | 결과 |
|---:|---|:---:|
| 1 | categories 6 endpoint 비로그인 401 | PASS |
| 2 | categories 6 endpoint 일반 사용자 403 | PASS |
| 3 | `platform:admin` 허용 | PASS |
| 4 | `platform:super_admin` 허용 | PASS |
| 5 | `export/categories.xlsx`, `export/members.xlsx` 보호 | PASS |
| 6 | `members`, `stats`, `verifications` 보호 | PASS |
| 7 | 인증 실패 시 하위 handler(controller/service) 미호출 | PASS |
| 8 | `/members/me` 계약 유지 (guard 통과 없이 handler 도달) | PASS |
| 9 | `/members/me/summary` 계약 유지 | PASS |
| 10 | 보호 누락 관리자 API 정적 검사 | PASS (§8 목록 고정) |

추가로 고정한 계약

- `kpa:admin` → 403
- `/me/detail`, `/mexico`, `/me/../abc` 는 본인용으로 오판되지 않는다 (우회 차단)
- query string 이 붙은 `/me/summary?year=2026` 도 본인용으로 인식
- `register-routes.ts` 에서 guard 가 mount **앞**에 온다
- `/api/v1/membership` 전체에 관리자 guard 가 걸려 있지 않다

---

## 7. 검증 (로컬)

| 항목 | 결과 |
|---|---|
| 신규 테스트 | 44/44 PASS |
| `tsc --noEmit -p tsconfig.json` | 변경 파일(`bootstrap/`, `__tests__/`) 오류 **0**. `src/scripts/` 의 기존 오류 20건은 이번 변경과 무관한 선행 상태 |
| `tsc -p tsconfig.build.json --noEmit` (실제 build 범위) | **오류 0** |
| 전체 monorepo build | 실행하지 않음 (WO 지시) |
| admin-dashboard | 변경 없음 → 빌드·배포 없음 |

---

## 8. 이번 범위 밖 — 보호되지 않은 채 남은 관리자 mount

정적 검사로 고정 기록했다 (테스트가 이 목록을 assert 한다).

| mount | 상태 | 비고 |
|---|---|---|
| `/audit-logs` | 미보호 | 프로덕션에서 500 (테이블 없음). §3 참조 |
| `/affiliations` | 미보호 | 소비 화면 `AffiliationManagement` 가 이중 접두(`/api/membership/...`)로 호출 중 |
| `/organizations/:organizationId/members` | 미보호 | 소비처 미확인 |
| `/license-verification` | 미보호 | 소비처 미확인 |

이번 WO 의 보호 대상 목록에 없으므로 손대지 않았다. 별도 작업 필요.

---

## 9. 프로덕션 검증 — 비로그인 (write 0건)

`https://api.neture.co.kr`, 배포 리비전 `o4o-core-api-03116-dmn`.
`POST` 는 행을 생성할 수 있으므로 **호출하지 않았다.** 존재하지 않는 합성 UUID(`00000000-…-000000000000`)만 사용했다.

| 요청 | 이전(조사 시점) | 현재 |
|---|---|---|
| `GET /membership/categories` | 200 (목록 노출) | **401** `AUTH_REQUIRED` |
| `GET /membership/categories/{uuid}` | 400 | **401** `AUTH_REQUIRED` |
| `PUT /membership/categories/{uuid}` | 400 `Category not found` (service 도달) | **401** `AUTH_REQUIRED` |
| `PATCH /membership/categories/{uuid}` | 400 `Category not found` | **401** `AUTH_REQUIRED` |
| `DELETE /membership/categories/{uuid}` | 400 `Category not found` | **401** `AUTH_REQUIRED` |
| `GET /membership/export/categories.xlsx` | 미보호 | **401** `AUTH_REQUIRED` |
| `GET /membership/export/members.xlsx` | 미보호 | **401** `AUTH_REQUIRED` |
| `GET /membership/members` | 미보호 | **401** `AUTH_REQUIRED` |
| `GET /membership/stats` | 미보호 | **401** `AUTH_REQUIRED` |
| `GET /membership/verifications` | 미보호 | **401** `AUTH_REQUIRED` |

WO 의 기대 결과 — "존재하지 않는 ID 로 보내는 PUT·PATCH·DELETE 가 service 계층의 not found 까지 가지 않고 401 에서 끊긴다" — 를 실측으로 확인했다.
파일 내보내기는 권한 차단 여부만 확인했고 파일을 저장하거나 첨부하지 않았다.

---

## 10. 프로덕션 검증 — 로그인 사용자

사용 계정: `docs/local/TEST-ACCOUNTS.local.md` 의 KPA 운영자 계정 (자격증명은 기록하지 않는다).
보유 역할에 `platform:*` 이 없고 `kpa:admin`, `neture:admin` 등 서비스 역할만 있다.

| 요청 | 결과 |
|---|---|
| `GET /membership/categories` | **403** `One of these roles required: platform:admin, platform:super_admin` |
| `GET /membership/members` | **403** (동일) |
| `GET /membership/stats` | **403** (동일) |
| `GET /membership/verifications` | **403** (동일) |
| `GET /membership/export/categories.xlsx` | **403** (동일) |
| `GET /api/v1/admin/users` (대조군, 기존 관리자 API) | **403** (동일) |

대조군이 같은 응답을 낸다는 것은 이 계정이 **원래부터** 플랫폼 관리자가 아니었다는 뜻이며, 이번 변경이 새로운 종류의 차단을 만든 것이 아님을 보여준다. Membership 관리자 API 가 기존 `/api/v1/admin/*` 경계와 동일한 선에 정렬됐다.

**미확인 항목:** `platform:admin` / `platform:super_admin` 토큰으로의 **정상 통과**는 프로덕션에서 실측하지 못했다. `docs/local/TEST-ACCOUNTS.local.md` 에 플랫폼 관리자 계정이 없기 때문이다. 대신 다음으로 갈음했다.

- 단위 테스트에서 두 역할 모두 6개 endpoint 전부 통과 확인 (§6 #3, #4)
- 프로덕션 403 응답이 `platform:admin, platform:super_admin` 두 역할을 정확히 요구한다고 응답 본문에 명시 → 역할 목록이 배포본에 그대로 반영됨
- 동일한 `requireRole(ADMIN_ROLES)` 가 이미 `/api/v1/admin/users` 등에서 운영 중

---

## 11. 일반 회원 기능 회귀 확인

| 요청 | 결과 | 해석 |
|---|---|---|
| `GET /membership/members/me` (비로그인) | 401 `Authentication required` — **`code` 필드 없음** | guard 를 통과해 router 자체 self-check 에 도달. guard 응답(`code: AUTH_REQUIRED`)과 형태가 다르다 |
| `GET /membership/members/me/summary` (비로그인) | 401, 동일하게 `code` 없음 | 동일 |
| 위 두 경로 (로그인 쿠키 첨부) | 401, `code` 없음 | guard 가 아니라 router 자체 응답 |

`code` 필드 유무가 **guard 가 이 두 경로를 건드리지 않았다는 결정적 증거**다.
guard 는 `next()` 만 호출하고 req/res 를 수정하지 않으므로 동작이 변경 전과 동일하다 (단위 테스트에서도 pass-through 고정).

부수 관측: 로그인 쿠키를 붙여도 `/members/me*` 가 401 인 것은 **이번 변경 이전부터의 상태**다. `/api/v1/membership` 에는 `req.user` 를 채우는 미들웨어가 하나도 없었고 (`grep` 결과 `dev-auth.middleware.ts` 만 `req.user` 를 설정), router 의 self-check 는 `req.user` 를 읽는다. 즉 main-site 의 `MemberHome` / `MemberProfilePage` 회원 기능은 이번 작업 전에 이미 동작하지 않는 상태였다. 이번 변경이 만든 회귀가 아니며, 수정도 이번 범위가 아니다.

---

## 12. 운영 데이터 변경 원장

| 항목 | 건수 |
|---|---|
| INSERT / UPDATE / DELETE | **0** |
| POST 호출 (프로덕션) | **0** (의도적으로 호출하지 않음) |
| DB schema / migration 변경 | **0** |
| 내려받아 저장한 개인정보 파일 | **0** |

프로덕션 쓰기 경로 호출은 존재하지 않는 합성 UUID 에 대한 PUT/PATCH/DELETE 뿐이며, 전부 401 에서 차단되어 service 계층에 도달하지 않았다.

---

## 13. WO 구현 원칙 준수

| # | 원칙 | 준수 |
|---:|---|:---:|
| 1 | `/api/v1/membership` 전체에 관리자 guard 금지 | O (테스트로 고정) |
| 2 | 관리자용 router/endpoint 에만 적용 | O |
| 3 | 기존 표준 패턴 재사용 | O (`authenticate` + `requireRole`) |
| 4 | 신규 역할/권한 체계 생성 금지 | O |
| 5 | `kpa:admin` · `membership:manage` 추가 금지 | O |
| 6 | controller · service · DB 로직 변경 금지 | O |
| 7 | API URL · method · payload · 응답 구조 변경 금지 | O |
| 8 | 운영 데이터 생성·수정·삭제 금지 | O (§12) |
| 9 | DB schema · migration 변경 금지 | O |

---

## 14. WO 범위 제외 항목 확인

일반 회원 API 구조 변경 / `/admin/membership` 이전 / 회원 분류 메뉴 연결 / 비활성 분류 결함 수정 / 회원 분류 데이터 CRUD / 물리삭제→soft delete / `kpa:admin` 부여 / `membership:manage` 백엔드 도입 / API prefix 잔여 정비 / 공용 인증 리팩터링 / DB schema·migration / 프런트 변경 / 다국어 작업 — **13개 항목 전부 손대지 않았다.**

---

## 15. 중지 조건 점검

| # | 조건 | 해당 여부 |
|---:|---|:---:|
| 1 | 관리자/일반 회원 API 를 안전하게 구분 불가 | 아니오 (§2 로 확정) |
| 2 | 보호 대상을 일반 회원 화면도 사용 | 아니오 (§2 grep 전수) |
| 3 | `authenticate`/`requireRole` 자체 변경 필요 | 아니오 (그대로 사용) |
| 4 | platform 역할이 현재 토큰에서 인식 안 됨 | 아니오 (403 응답이 역할 목록을 정확히 반영) |
| 5 | 새로운 정책 결정 필요 | 아니오 (WO 가 정책 명시) |
| 6 | 같은 route 파일을 다른 세션이 수정 중 | 아니오 (§1) |
| 7 | 기존 변경과 안전 분리 불가 | 아니오 (pathspec 커밋) |
| 8 | 운영 데이터 쓰기 없이 핵심 검증 불가 | 아니오 (401 차단은 쓰기 없이 확인) |
| 9 | `audit-logs/member/:id` 성격 확정 불가 | 아니오 — route 부재로 확정 (§3) |

---

## 16. Git

| 항목 | 값 |
|---|---|
| 소스 커밋 | `82077439a` |
| 커밋 파일 | `bootstrap/membership-admin-guard.ts`, `bootstrap/register-routes.ts`, `__tests__/membership-admin-guard.spec.ts` (3개, 개별 pathspec) |
| `git show --name-only` 확인 | 3개만 포함 |
| push | `3f27daff2..82077439a  main -> main` |
| 타 세션 파일 접촉 | 없음 (`src/scripts/hff-zh-b01-*` 는 untracked 로 그대로 둠) |
| `.env` / `pnpm-lock.yaml` | 미접촉 |

---

## 17. 배포

| 항목 | 값 |
|---|---|
| 워크플로 | Deploy API Server (Cloud Run) |
| run | `30776613843` — **success** |
| 배포 sha | `82077439a30208c7da60fcd27d683f2eb25df747` (= 소스 커밋) |
| Cloud Run 리비전 | `o4o-core-api-03116-dmn` (latestReady = traffic) |
| Admin Dashboard 배포 | **하지 않음** (프런트 변경 없음) |

---

## 18. 남은 문제 (별도 작업 필요)

| # | 항목 | 근거 |
|---:|---|---|
| 1 | 비활성 분류가 목록에서 사라진다 | `MemberCategoryService.list()` 가 `where: { isActive: true }` 로 필터. 비활성화하면 화면에서 사라지고 재활성 경로가 없다 |
| 2 | 회원 분류 메뉴 미연결 | `/admin/membership/categories` 라우트는 있으나 사이드바에 항목 없음 |
| 3 | `audit-logs/member/:id` dead call 2곳 | §3 |
| 4 | `yaksa_member_audit_logs` 테이블 부재 (500) | §3 |
| 5 | main-site `/membership/me` dead call | §3 |
| 6 | `/members/me*` 가 로그인 상태에서도 401 | §11 — `req.user` 를 채우는 미들웨어 없음 |
| 7 | 미보호 mount 4종 | §8 |
| 8 | API 이중 접두 잔여 58건 / 28파일 | `AffiliationManagement.tsx:52`, `AuditLogManagement.tsx:52`, `MemberManagement.tsx:187`, `VerificationManagement.tsx:119,139`, `yaksaAdmin.ts` 등 포함 |

---

## 19. 판정

**PASS.**

- 관리자용 Membership API 10개 경로가 비로그인 401 / 비플랫폼 사용자 403 으로 차단됨을 프로덕션에서 실측했다.
- 회원 본인용 `/members/me`, `/members/me/summary` 는 guard 를 타지 않는다는 것을 응답 형태 차이로 확인했다.
- 운영 데이터 write 0건, schema 변경 0건, 프런트 변경 0건.
- 미확인 1건: `platform:admin` 토큰의 프로덕션 정상 통과 (계정 부재. §10 참조).
