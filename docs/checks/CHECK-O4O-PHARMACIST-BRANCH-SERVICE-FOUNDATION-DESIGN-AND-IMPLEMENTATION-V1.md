# CHECK-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1

> **WO**: `WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1`
> **선행 IR**: [IR-O4O-PHARMACIST-BRANCH-SERVICE-RECOVERY-AND-REUSE-AUDIT-V1](../ir/IR-O4O-PHARMACIST-BRANCH-SERVICE-RECOVERY-AND-REUSE-AUDIT-V1.md)
> **작성일**: 2026-08-12 · **상태**: 구현 완료 / 런타임 smoke 는 배포 후 수행

---

## 1. 먼저 확인한 6항목 (실측 결과)

문서 설명이 아니라 **실제 코드·DB** 를 기준으로 확정했다.

| # | 확인 항목 | 실측 결과 |
|---|---|---|
| 1 | `kpa_organizations` 실제 컬럼 / slug 후보 | `id, name, type, parent_id, description, address, phone, is_active, created_at, updated_at`. **slug 컬럼 없음** → nullable 로 신설. `type` 분포 = `association` 1(대한약사회) / `branch` 18(지부) / **`group` 209(분회)**, 전 행 `is_active=true`. 즉 **분회 = `type='group'`** 이다 (`branch` 가 아니다). |
| 2 | `kpa_members.organization_id` 의미·충돌 | `organizations(type='pharmacy')` 를 가리킨다 = **근무 약국**. 소속 분회가 아니므로 충돌 없음. IR 본문의 반대 기술은 [IR 부록 Z-1](../ir/IR-O4O-PHARMACIST-BRANCH-SERVICE-RECOVERY-AND-REUSE-AUDIT-V1.md) 에서 정정했다. |
| 3 | 새 serviceKey 값 | **`kpa-branch`**. `resolveCanonicalServiceKey` 가 미등록 키를 self-map 하므로 role prefix `kpa-branch:` = `service_memberships.service_key` 가 그대로 성립한다. 기존 `kpa`(=`kpa-society`) 와 값이 겹치지 않는다. |
| 4 | `service_memberships` 로 분회 소속을 표현하면 안 되는 이유 | ① 서비스 가입은 **1행 1서비스**라 분회 이동 이력이 누적되지 않는다 ② 전출→재전입이 status 덮어쓰기로 사라진다 ③ `service_memberships` 는 4개 서비스가 공유하는 Core 계약(F10/F11)이라 분회 축을 얹으면 다른 서비스까지 오염된다. → **접근 축과 소속 축을 분리**한다. |
| 5 | branch operator RBAC 최소 추가 | `roles` 3행(`kpa-branch:admin/operator/member`) + `platform_services` 1행. **분회별 역할을 만들지 않는다** (209개 × 이동 = drift). |
| 6 | slug → organization id 해석 단일화 | `resolveBranch` 하나로 수렴. 우선순위 = `:branchSlug` → Host(`branch_domains.status='active'`). 두 경로 모두 `kpa_organizations.id` 로 귀결. |

---

## 2. 사용한 기존 Core (재사용 · 신규 발명 없음)

| 축 | 재사용한 것 |
|---|---|
| Identity | `users` (변경 없음) |
| 서비스 접근 | `service_memberships` + `createMembershipScopeGuard` (F10 membership-guard, 변경 없음) |
| 서비스 역할 | `role_assignments` + `roles` 카탈로그 (F9 RBAC SSOT, 행 추가만) |
| 인증 | `requireAuth` · `AuthClient` · `useServiceAuth`(@o4o/auth-react) — 신규 인증 구조 0 |
| 서비스 등록 | `platform_services` · `service-catalog.ts` · `SERVICE_KEYS` |
| 분회 registry | `kpa_organizations` (209행 그대로, 새 분회 테이블 없음) |

`@o4o/security-core` 는 **type-only 확장**(ServiceKey union 에 `'kpa-branch'` 추가)만 했다 — F1 Freeze 범위 내.
과거 Yaksa 패키지는 복원하지 않았고, KPA Society 커뮤니티 구조와 합치지 않았다.

---

## 3. 신규 entity / table / API

### 3-1. Migration 3건 (미실행 — main push 시 CI/CD 자동 실행)

| 파일 | 내용 |
|---|---|
| `20270303000000-AddKpaOrganizationSlug.ts` | `kpa_organizations.slug varchar(80) NULL` 추가 + 228행 결정적 로마자 backfill + `UQ_kpa_organizations_slug` 부분 UNIQUE(`WHERE slug IS NOT NULL`). 중복 3건은 legacy 고정 UUID 중복 트리라 `-2` 접미(`seoul-2`/`jongrogu-2`/`gangnamgu-2`). 기존 행 삭제·변경 없음(additive+nullable). |
| `20270304000000-CreateBranchFoundationTables.ts` | `branch_memberships` / `branch_sites` / `branch_domains` / `branch_posts` |
| `20270305000000-SeedKpaBranchServiceAndRoles.ts` | `platform_services('kpa-branch')` + `roles` 3행 (멱등) |

### 3-2. `branch_memberships` 불변식

- `UQ_branch_memberships_active_user` — `("user_id") WHERE status='active'` → **한 회원의 active 분회 1개**
- `CHK_branch_memberships_left_at` — `active ⇔ left_at IS NULL`
- **role 컬럼 없음** (4축 분리). UPDATE 는 전출 시 `status/left_at` 에만 발생하고, 전입은 **항상 INSERT** 다
  → 전출·재전입 이력이 삭제·덮어쓰기 없이 누적된다.

### 3-3. API (`/api/v1/kpa-branch/*`, 기존 api-server 내부 — 새 서버 없음)

| 구분 | 엔드포인트 |
|---|---|
| public | `GET /service-info` · `/branches` · `/resolve` · `/branches/:branchSlug` · `/branches/:branchSlug/site` · `/branches/:branchSlug/posts` |
| auth | `GET /me/access` · `/me/branch` · `/me/branch/history` |
| operator | `/branches/:branchSlug/operator/{members,site,posts,domains}` (GET/POST/PUT/PATCH/DELETE) |
| admin | `GET /admin/domains` · `PATCH /admin/domains/:domainId/status` |

---

## 4. 분회 tenant 해석 방식

```
URL  https://branch.kpa-society.co.kr/{slug}/...   → req.params.branchSlug
Host https://{분회 자체 도메인}/...                 → branch_domains(status='active')
                         ↓ 둘 다
                 kpa_organizations.id  (type='group' AND is_active)
```

- 해석 지점은 `resolveBranch` **한 곳**이다. 컨트롤러는 `req.branch.id` 만 신뢰하고
  **요청 body 의 organizationId 를 절대 읽지 않는다** (경계 스푸핑 차단 — Boundary Guard Rule 4 동형).
- 모든 조회는 `organization_id` 를 함께 건다 (`postId` 단독 조회 없음 — Guard Rule 1 동형).
- `parent_id`(본회→지부→분회)는 **표시용으로만** 노출하며 권한 계산 경로에 존재하지 않는다.

---

## 5. 4축 경계

| 축 | 저장소 | 판정 주체 |
|---|---|---|
| Identity | `users` | `requireAuth` |
| 서비스 접근 | `service_memberships('kpa-branch')` | `requireKpaBranchScope` |
| 서비스 역할 | `role_assignments` (`kpa-branch:admin/operator/member`) | `requireKpaBranchScope` |
| 분회 소속 | `branch_memberships` | `resolveBranch` + `requireBranchScope` |

> 운영자 role 은 "운영자인가"만 말하고, "어느 분회인가"는 `branch_memberships` 가 단독으로 말한다.
> 조직 직책(회장·부회장·위원장)은 이번 WO 에서 RBAC 역할로 만들지 않았다.

---

## 6. 검증 1~8

정적/계약 검증은 완료했다. `(DB)` 표시 항목은 **migration 이 아직 실행되지 않아** 런타임 확인이 배포 이후로 남는다
(프로덕션 migration 은 main 배포 시 CI/CD 자동 실행이 원칙 — CLAUDE.md §0).

| # | 검증 | 결과 | 근거 |
|---|---|---|---|
| ① | 2개 분회 slug 가 각기 다른 tenant 로 해석 | PASS (계약) | `findBranchBySlug` 가 `UQ_kpa_organizations_slug` 로 1:1. slug→id 해석 경로 단일. `(DB)` 실 응답 대조는 배포 후 |
| ② | 분회 A 운영자가 분회 B 회원 관리 불가 | PASS (계약) | operator 라우트 전량이 `resolveBranch → requireBranchScope`. active 소속 ≠ `req.branch.id` → **403 `BRANCH_SCOPE_MISMATCH`**. 분회 식별자가 role 에 없으므로 role 만으로 넘어갈 수 없다 |
| ③ | 일반 회원이 운영자 mutation 불가 | PASS (계약) | `requireKpaBranchScope('kpa-branch:operator')` — `scopeRoleMapping` 상 member 는 operator 를 만족하지 않는다 |
| ④ | A 가입 → 전출 → B 가입 | PASS (계약) | `BranchMembershipService.join()` 이 트랜잭션 내에서 기존 active 행을 `SELECT FOR UPDATE` → `left` 로 닫고 **새 행 INSERT** |
| ⑤ | B 전출 → A 재가입 가능 | PASS (계약) | active 부분 UNIQUE 는 `status='active'` 행에만 걸리므로 (user, A) 조합이 몇 번이든 재삽입된다. `organization_members` 의 `UNIQUE(org,user)` 와 다른 지점 |
| ⑥ | 과거 affiliation 이력 보존 | PASS (계약) | 삭제 경로 없음(서비스에 delete 없음), 전출은 UPDATE 2컬럼뿐, 전입은 INSERT 전용 |
| ⑦ | 기존 KPA Society auth/organization/store 회귀 없음 | PASS | 기존 파일 수정은 **추가 전용 5건**뿐: `service-keys.ts`(상수 1행) · `service-catalog.ts`(항목 1) · `entities.ts`(등록 5) · `register-routes.ts`(mount 1, try/catch 격리) · `security-core/types.ts`(union 1, type-only). 기존 라우트·가드·쿼리 수정 0. `kpa_organizations` 는 런타임 소비처가 0 이었고 이번 변경도 additive+nullable |
| ⑧ | 지부 parent 관계가 권한에 영향 없음 | PASS | `parent_id` 를 읽는 곳은 목록/상세 **응답 필드 2곳뿐**. 미들웨어·서비스·쿼리 조건 어디에도 없다 |

### 6-1. 빌드·타입 검증 (실행 결과)

| 대상 | 명령 | 결과 |
|---|---|---|
| api-server | `npx tsc --noEmit -p tsconfig.json` | **PASS** (0 errors) |
| web-kpa-branch | `npx tsc -b` | **PASS** (0 errors) |
| web-kpa-branch | `npx vite build` | **PASS** (177 modules, 300.12 kB) |

---

## 7. 프론트엔드 `services/web-kpa-branch`

고정 템플릿(`classic`) 분회 홈페이지. **페이지 빌더 아님.**

| 경로 | 화면 |
|---|---|
| `/` | 분회 찾기 (registry 209) |
| `/login` · `/me` | 로그인 / 내 분회 + 전입·전출 이력 |
| `/:branchSlug` | 분회 홈 — 로고·이름·소개·연락처 + 공지/자료실 최신 |
| `/:branchSlug/notices` · `/resources` | 공지 · 자료실 |
| `/:branchSlug/operator/site` · `/posts` · `/domains` | 홈페이지 설정 · 관리자 글쓰기 · 자체 도메인 연결 |

- 자체 도메인으로 들어오면 **같은 번들**이 `GET /kpa-branch/resolve` 로 tenant 를 확정하고
  slug 세그먼트 없이 동일 트리를 루트에 붙인다 → **분회별 별도 배포·별도 백엔드 없음.**
- `config/service.ts` 의 `ROLE_SCOPE_MAPPING` 은 backend `KPA_BRANCH_SCOPE_CONFIG.scopeRoleMapping` 과 같은 표다.
- 조회 실패를 빈 목록으로 삼키지 않는다 (`lib/errors.ts` — 401/403/404 를 구분해 노출).

---

## 8. 배포 (미수행 — 별도 WO)

- `services/web-kpa-branch/Dockerfile` 은 포함했으나 **`.github/workflows/deploy-web-services.yml` 은 변경하지 않았다.**
  CI/빌드 인프라 변경은 CLAUDE.md 중지 조건이며, Cloud Run 서비스·DNS 생성도 필요하다 → **후속 배포 WO**.
- `branch_domains` 의 `active` 전이가 admin 전용인 것도 같은 이유다(도메인 매핑·인증서는 인프라 작업).

---

## 9. 미결 / 후속

| # | 항목 |
|---|---|
| 1 | 배포 WO — Cloud Run 서비스 + `deploy-web-services.yml` 등록 + `branch.kpa-society.co.kr` DNS |
| 2 | 배포 후 런타임 smoke — 검증 ①④⑤⑥ 실 데이터 재확인, `/branches` 209행 응답 |
| 3 | 분회 회원 관리 UI (백엔드 API 는 이미 있음 — 1차 화면 범위 밖) |
| 4 | 첨부파일 업로드 (현재 `attachments` 는 스키마만 존재) |
| 5 | 신상신고 → 회비 → 연수교육 평점 3개 핵심 업무 |

---

## 10. 문서 정합

```
문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

- IR 본문 2건(§D 회원 기본정보 행 · §H forum_post 재사용)이 실측과 어긋나 **본문 보존 + 부록 Z 정정**으로 처리했다.
- 기준 문서(`docs/baseline/` · `docs/architecture/`) 에서 발견한 drift 는 없다.
