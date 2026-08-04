# WO-O4O-ADMIN-INDIVIDUAL-API-ACCESS-BOUNDARY-CORRECTION-V1 — CHECK

관리자 화면 개별 API 접근 경계 정정 · 후속 순서 6번

- 작성일: 2026-08-04
- 선행: [5번 CHECK](WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1-CHECK.md) (`26f04de6e`, `PASS_WITH_BOUNDARY_FOLLOWUP`)
- **판정: `PASS_WITH_POLICY_FOLLOWUP`**

---

## 0. 이번 작업이 확인한 가장 중요한 사실

작업요청서는 "개별 API의 인증·역할·permission·scope 오류"를 전제로 했다. 실제 조사 결과
**관리자 화면에서 실패하던 회원 관리 동작들은 403(권한) 문제가 아니라 404(계약 불일치)였다.**

- 프런트가 보내던 HTTP method가 백엔드 라우트 정의와 달랐다 (POST↔PATCH, PATCH↔PUT).
- 일부 호출 경로에 `/api` 접두가 중복돼 `/api/v1/api/membership/...` 로 나갔다.

즉 **역할을 아무리 넓혀도 동작하지 않는 상태**였다. `ADMIN_ROLES` / `MEMBERSHIP_ADMIN_ROLES` 를
확대했다면 접근 범위만 잘못 넓히고 결함은 그대로 남았을 것이다. 두 상수는 이번에 **변경하지 않았다.**

---

## 1. 모집단

조사 대상은 작업요청서의 4개 그룹이다.

| 그룹 | 대상 | 조사 방식 |
|---|---|---|
| 1 | 사용자 관리 `/users` + 하위 화면 + `ADMIN_ROLES` + `users.routes.ts` 주석 | 화면 → 호출부 → 백엔드 라우트 → guard |
| 2 | Membership `/admin/membership/*` + `MEMBERSHIP_ADMIN_ROLES` | 동일 (감사 로그·소속 관리 신규 기능 제외) |
| 3 | `/enrollments`, `/admin/enrollments`, `/admin/role-applications`, `users:update` 선언 | route 선언 → 호출부 → 백엔드 존재 여부 |
| 4 | 선행 감사에서 확인된 그 밖의 개별 API 불일치 | 기능군 내 guard 일관성 · 서비스/플랫폼 혼재 · 조직 scope |

프런트 호출부는 문자열 검색 결과를 그대로 신뢰하지 않고, **화면 → 호출 함수 → 실제 method/path →
백엔드 라우트 파일의 `router.<method>()` 정의** 까지 대조해 연결 여부를 판정했다.

---

## 2. 화면 → 프런트 호출 → 백엔드 라우트 → guard 연결표

`authClient.api` 의 baseURL 은 이미 `.../api/v1` 이다 (`packages/auth-client/src/client.ts`).
따라서 아래 "프런트 경로" 는 baseURL 뒤에 붙는 부분이다.

### 2-1. 사용자 관리 (그룹 1)

| 화면 | 프런트 호출 | 백엔드 라우트 | guard | 분류 |
|---|---|---|---|---|
| 사용자 목록 | `GET /admin/users` | `apps/api-server/src/routes/admin/users.routes.ts:35` | `authenticate` + `requireRole(ADMIN_ROLES)` | A |
| 역할 해제 | `DELETE /admin/users/:id/role-assignments/:role` | 같은 파일 `:92` | 동일 | A |
| 사용자 상세 — 사업자 정보 | `GET/POST/PUT /users/:id/business-info` | **없음** | — | **I** |
| 사용자 상세 — 활동 로그 | `GET /users/:id/activity-log` | **없음** | — | **I** |

`/users/:id/business-info` 는 백엔드 전수 검색 결과 존재하지 않는다. `users.businessInfo` 데이터는
서비스별 **본인용** mypage 경로(`/cosmetics/mypage/business-info`, `/glycopharm/mypage/business-info`,
`requireAuth` + 본인 scope)로만 노출되고, 관리자용 대응 API 는 만들어진 적이 없다.
`UserDetail.tsx` 는 살아 있는 화면이므로 이 두 섹션은 항상 실패한다.

### 2-2. Membership (그룹 2)

| 화면 | 프런트 호출 (수정 전) | 백엔드 라우트 | 결과 | 분류 |
|---|---|---|---|---|
| 자격 검증 승인 | `POST /api/membership/verifications/:id/approve` | `PATCH /:id/approve` (`verificationRoutes.ts:24`) | 404 | **F** |
| 자격 검증 반려 | `POST /api/membership/verifications/:id/reject` | `PATCH /:id/reject` (`:27`) | 404 | **F** |
| 회원 목록 — 활성 토글 | `PATCH /api/membership/members/:id` | `PUT /:id` (`memberRoutes.ts:115`) | 404 | **F** |
| 회원 상세 — 저장 | `PATCH /membership/members/:id` | `PUT /:id` | 404 | **F** |
| 회원 상세 — 검증 토글 | `PATCH /membership/members/:id` | `PUT /:id` | 404 | **F** |
| 회원 상세 — 활성 토글 | `PATCH /membership/members/:id` | `PUT /:id` | 404 | **F** |
| 회원 분류 6종 | `/membership/categories*` | `categoryRoutes.ts` | 정상 | A |
| 통계 | `GET /membership/stats`, `/stats/extended` | `statsRoutes.ts:23,29` | 정상 | A |
| 목록 조회 | `GET /membership/members`, `/verifications`, `/members/:id` | 각 라우트 존재 | 정상 | A |
| 감사 로그 | `GET /api/membership/audit-logs` | `auditLogRoutes.ts:20` | 404 (접두 중복) | **F — 범위 밖** |

guard 는 모두 `apps/api-server/src/bootstrap/membership-admin-guard.ts` 의
`authenticate` + `requireRole(MEMBERSHIP_ADMIN_ROLES)` 로 동일하다 (8 subtree + `/members`,
`/members/me`·`/me/summary` 만 본인용 예외).

### 2-3. 미구현 화면 (그룹 3)

| 프런트 route | 호출 | 백엔드 | 분류 |
|---|---|---|---|
| `/enrollments`, `/admin/enrollments` | `GET /admin/enrollments` | 없음. 근거 테이블 `user_service_enrollments` 는 `20260316100000-DropUserServiceEnrollments` 로 DROP (SSOT = `service_memberships`) | **I** |
| `/admin/role-applications` | `/admin/roles/applications` + `/approve` + `/reject` | 없음 | **I** |

세 route 모두 `requiredPermissions={['users:update']}` 만 선언돼 있다. `user.permissions` 는
백엔드가 채우지 않으므로 이 선언은 현재 무력하고, 실제 접근은 `App.tsx:186` 의 shell gate
(`requiredRoles={['admin']}`)로만 걸린다. **이번에 permission 체계는 손대지 않았다.**

### 2-4. 그 밖 (그룹 4)

| 확인 대상 | 결과 |
|---|---|
| `/api/v1/admin/platform-accounts` (역할 관리) | `ADMIN_ACCESS_ROLES = ['platform:super_admin','platform:admin']` — 사용자 관리와 동일 경계. A |
| `/api/v1/admin/store-network`, `/api/v1/admin/physical-stores` | `router.use(requireAdmin)` = platform 2종. A |
| 서비스 운영자용 API 혼재 | 관리자 대시보드가 `requireServiceLegalScope('operator')` 경로를 호출하는 사례 없음. 해당 경로 미변경 |
| 조직·소유권 scope | Membership 은 `MEMBERSHIP_ORG_SCOPE_POLICY = 'platform-admin-only'` — 통과 주체가 플랫폼 관리자뿐이라 추가 조직 필터는 정당한 권한만 축소. 변경 없음 |

---

## 3. A~J 분류 건수

| 분류 | 건수 | 비고 |
|---|:--:|---|
| A ALIGNED | 14 | 목록·상세·통계·분류·역할 해제·platform-accounts·store-network 등 |
| B WRONG_ROLE_GUARD | **0** | 잘못된 역할 guard 는 발견되지 않았다 |
| C WRONG_PERMISSION_GUARD | 0 | permission 체계 자체가 미공급 — J 로 이월 |
| D WRONG_SERVICE_SCOPE | 0 | |
| E WRONG_ORGANIZATION_SCOPE | 0 | |
| **F FRONTEND_WRONG_ENDPOINT** | **7** | 6건 수정 · 1건(감사 로그) 범위 밖 기록만 |
| G INCONSISTENT_SUBTREE | 0 | 5번 작업에서 이미 정렬됨 |
| **H COMMENT_OR_CATALOG_MISMATCH** | **3** | 2건 수정 · 1건(역할 카탈로그) J 로 이월 |
| **I DEAD_OR_UNIMPLEMENTED** | **5** | 기록만 (은퇴는 최소 변경 범위 밖) |
| **J POLICY_REQUIRED** | **2** | 역할 카탈로그 · permission 공급 |

---

## 4. API별 기존 guard 와 실제 업무 주체

| API 군 | 기존 guard | 다루는 데이터 | 정당한 업무 주체 | 판정 |
|---|---|---|---|---|
| `/api/v1/users/*` (관리자 구간) | `requireAdmin` → `platform:admin`·`platform:super_admin` | 플랫폼 전역 사용자 | 플랫폼 관리자 | 맞다 |
| `/api/v1/admin/users/*` | `requireRole(ADMIN_ROLES)` = 같은 2종 | 플랫폼 전역 사용자 | 플랫폼 관리자 | 맞다 |
| `/api/v1/membership/*` (관리 구간) | `requireRole(MEMBERSHIP_ADMIN_ROLES)` = 같은 2종 | 회원 분류·자격 검증 — serviceKey/organizationId 축 없음, 플랫폼 전역 | 플랫폼 관리자 | 맞다 |
| `/api/v1/membership/members/me*` | 본인용 예외 | 본인 데이터 | 회원 본인 | 맞다 |
| `/api/v1/admin/platform-accounts/*` | `platform:super_admin` 전용 동작 포함 | 관리자 계정 | 최상위 관리자 | 맞다 |

---

## 5. 가설 검증 결과

### 가설 A — platform 한정이 의도된 정책이고 주석·카탈로그가 틀렸다 → **확정**

근거 사슬 (모두 코드·마이그레이션·문서 날짜로 확인):

1. `IR-O4O-LEGACY-ROLE-PREFIX-COMPATIBILITY-AUDIT-V1` (2026-05-22) — 운영 census 에서
   `super_admin` 2건(legacy), `platform:admin`·`platform:super_admin`·`admin` 0건. 처방된 순서는
   **① 데이터 마이그레이션 → ② guard 좁히기 → ③ scope 테스트**.
2. `20261027000000-MigrateLegacyRolesToPlatformPrefixed` (커밋 `a149c6a5c`) — `role_assignments` 의
   `super_admin`/`admin` 을 `platform:` 접두로 UPDATE. ①이 실제로 수행됐다.
3. `WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1` (커밋 `712baeccb`) — ②. `requireAdmin` 과 `ADMIN_ROLES`
   가 동시에 platform 2종으로 좁혀졌다.
4. `authorization.middleware.ts` 의 `requireAdmin`, `platform-accounts.routes.ts` 의
   `ADMIN_ACCESS_ROLES`·`SUPER_ADMIN_ROLE`, `membership-admin-guard.ts` 의
   `MEMBERSHIP_ADMIN_ROLES` — 세 곳이 서로 어긋나지 않는다.

따라서 **legacy 표기(`admin`/`super_admin`)를 다시 허용하는 것은 되돌리기(regression)** 다.
`docs/rbac/RBAC-ROLE-CATALOG-V1.md` (2026-02-27)가 접두 없는 역할을 Platform Role 로 적고 있는 것은
마이그레이션보다 **3개월 앞선 문서**이므로, 코드가 아니라 카탈로그가 낡았다.

### 가설 B — 상수가 과도하게 좁다 → **기각**

`ADMIN_ROLES` 확대의 전제(“legacy 역할 보유자가 정당한 관리자다”)는 2번 마이그레이션으로
성립하지 않는다. 마이그레이션 후 legacy 표기 role_assignment 는 남지 않는다.

### 가설 C — 사용자 관리와 Membership 이 같은 경계를 가진다는 전제 자체가 틀렸다 → **이 두 영역에서는 기각**

작업요청서가 특히 열어두라고 한 가설이라 별도로 검증했다. 기각 근거는 "둘 다 `platform:` 이니까" 가
아니라 **데이터 축**이다.

- `/users`, `/admin/users` — 대상은 플랫폼 전역 `users`. serviceKey·organizationId 축 없음.
- Membership 관리 구간 — 대상은 회원 분류·자격 검증·통계. 역시 서비스/조직 축으로 분할되지 않는다.
  (조직 축을 가지는 `affiliations`·`organizations/:id/members` 도 통과 주체가 플랫폼 관리자뿐이다.)
- 반대로 **서비스 축이 있는 API 는 이미 다른 상수를 쓴다** — `requireServiceLegalScope`,
  `require{Service}Scope`. 즉 "공용 상수" 는 두 영역을 억지로 묶은 것이 아니라
  *축이 같은* 영역끼리만 묶여 있다.

단, 이 기각은 **현재 조사한 두 영역에 한정**한다. 조직 축을 가지는 Membership 기능이 향후
플랫폼 관리자 외에게 열리면 그때는 기능별 상수 분리가 필요하다 (§8 이월).

---

## 6. 수정한 endpoint 와 근거

### 6-1. 프런트 호출 계약 정정 6건 (F)

| 파일 | 수정 전 | 수정 후 | 근거 |
|---|---|---|---|
| `VerificationManagement.tsx:123` | `POST /api/membership/verifications/:id/approve` | `PATCH /membership/verifications/:id/approve` | `verificationRoutes.ts:24` |
| `VerificationManagement.tsx:144` | `POST /api/membership/verifications/:id/reject` | `PATCH /membership/verifications/:id/reject` | `verificationRoutes.ts:27` |
| `MemberManagement.tsx:192` | `PATCH /api/membership/members/:id` | `PUT /membership/members/:id` | `memberRoutes.ts:115` |
| `MemberDetail.tsx:251` (저장) | `PATCH /membership/members/:id` | `PUT /membership/members/:id` | 동일 |
| `MemberDetail.tsx:279` (검증 토글) | 동일 | 동일 | 동일 |
| `MemberDetail.tsx:297` (활성 토글) | 동일 | 동일 | 동일 |

**PUT 로 바꾸기 전에 전체 교체 위험을 확인했다.** `MemberService.update` 는 로드한 엔티티에
`Object.assign(member, dto)` 후 save 하므로 **부분 병합**이다. 따라서 `{ isActive }` 한 필드만 보내도
다른 필드가 지워지지 않는다. 만약 전체 교체였다면 이 수정은 데이터 손실을 만들었을 것이다.

`PATCH /members/:id/verify` 를 쓰지 않은 이유: `MemberController.verify` 가
`setVerified(id, true)` 로 고정돼 **검증 해제를 표현할 수 없다.** 토글에 쓸 수 없다.

### 6-2. 주석 정정 2건 (H — 동작 변경 없음)

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/routes/admin/users.routes.ts:85` | "legacy super_admin / admin 도 모두 허용" → 사실과 다름. `ADMIN_ROLES` 는 `:32` 에서 platform 2종으로 좁혀졌고 legacy 는 마이그레이션됨을 명시 |
| `packages/membership-yaksa/src/backend/routes/index.ts` | 이 패키지 JSDoc 전체가 `/api/membership/...` 로 적혀 있어 **프런트 접두 오류의 개연적 원인**이다. 실제 마운트가 `/api/v1/membership` 임을 헤더에 명시 |

두 번째 항목은 개별 파일 71개 주석 줄을 일괄 치환하지 않고 **진입 파일 1곳에 canonical 규칙을 명시**하는
방식을 택했다. 공유 패키지의 대량 diff 를 만들지 않으면서 원인을 기록하기 위해서다.

### 6-3. 수정하지 않은 것

| 항목 | 이유 |
|---|---|
| `ADMIN_ROLES` · `MEMBERSHIP_ADMIN_ROLES` | §5 가설 A 확정 — 현재 경계가 맞다 |
| 감사 로그 화면 접두(`AuditLogManagement.tsx:52`) | 작업요청서가 감사 로그를 두 번 범위 밖으로 명시 |
| 미구현 화면 5건 (§2-1, §2-3) | 은퇴는 최소 변경 범위 밖 · 별도 승인 필요 |
| `RBAC-ROLE-CATALOG-V1.md` | 문서 갱신은 정책 결정 — J |

---

## 7. 변경 전후 역할 접근 행렬

**역할 경계는 한 줄도 바뀌지 않았다.** 바뀐 것은 *도달 가능성* 이다.

| endpoint | 주체 | 변경 전 | 변경 후 |
|---|---|:--:|:--:|
| 자격 검증 승인/반려 | 비로그인 | 401 | 401 |
| | `kpa:admin` 등 서비스 역할 | 403 | 403 |
| | `platform:admin` / `platform:super_admin` | **404 (동작 불가)** | **200 — handler 도달** |
| 회원 수정/검증/활성 토글 (4곳) | 비로그인 | 401 | 401 |
| | 서비스 역할 | 403 | 403 |
| | `platform:admin` / `platform:super_admin` | **404 (동작 불가)** | **200 — handler 도달** |

401·403 행은 백엔드 guard 가 그대로이므로 변화가 없다
(`membership-admin-guard.spec.ts` 가 이 행렬을 이미 고정하고 있다).
**실질 변화는 플랫폼 관리자가 회원 저장·검증·활성 토글·자격 검증 승인/반려를
처음으로 실제 수행할 수 있게 된 것이다.**

---

## 8. POLICY_REQUIRED (J)

| # | 항목 | 필요한 결정 |
|---|---|---|
| J1 | `docs/rbac/RBAC-ROLE-CATALOG-V1.md` 가 마이그레이션 이전 상태 | 카탈로그를 `platform:` 접두 기준으로 갱신할지, 접두 없는 표기를 되살릴지. 코드는 이미 platform 기준으로 일관 — 문서 갱신이 자연스러우나 RBAC Freeze 문서이므로 별도 WO |
| J2 | `user.permissions` 미공급 상태에서 `requiredPermissions` 선언이 무력 | 공급할지, 선언을 제거할지. 신규 permission 체계 도입은 이번 범위 밖 |

기록만 하고 넘긴 항목 (I):

- `/users/:id/business-info`, `/users/:id/activity-log` — 살아 있는 `UserDetail.tsx` 가 호출하나 백엔드 없음
- `/enrollments`, `/admin/enrollments` — 근거 테이블 DROP 완료
- `/admin/role-applications` — 백엔드 없음

---

## 9. 메뉴 – route – backend 재정합성

5번 작업의 정합성이 깨지지 않았음을 회귀 테스트로 확인했다.

- `admin-menu-route-backend-alignment.test.ts` — 24 pass
- `admin-protected-route-access.test.ts` — 14 pass
- admin-dashboard 전체 스위트 — 13 파일 **228 pass** (실패 0)

이번 수정은 메뉴 선언·route 선언·guard 를 건드리지 않았으므로 3계층 정합성은 그대로다.

---

## 10. 테스트 · typecheck · 변이 확인

| 항목 | 결과 |
|---|---|
| 신규 `apps/admin-dashboard/src/tests/membership-admin-api-contract.test.ts` | **8 pass** |
| `membership-category-api-paths.test.tsx` | 9 pass |
| `admin-menu-route-backend-alignment.test.ts` | 24 pass |
| `admin-protected-route-access.test.ts` | 14 pass |
| admin-dashboard 전체 스위트 | **13 파일 228 pass** |
| api-server `membership-admin-guard.spec.ts` 외 3종 (jest) | **192 pass** |
| `tsc --noEmit` admin-dashboard | 0 error |
| `tsc --noEmit` membership-yaksa | 0 error |

**변이 확인** — 신규 테스트가 실제로 결함을 잡는지 확인했다. 테스트는 백엔드 라우트 파일에서
`router.<method>()` 정의를 직접 파싱해 프런트 (method, path) 와 대조하므로,
호출을 POST 나 `/api/` 접두로 되돌리면 실패한다. 수정 전 형태(`POST /:id/approve`)가
백엔드에 존재하지 않는다는 것도 명시적으로 단언한다.

역할 허용·거부 행렬 자체는 이미 `membership-admin-guard.spec.ts` 가 고정하고 있어
(비로그인 거부 / `kpa:admin` 거부 / platform 2종 허용 / 본인용 경로 예외) 중복 작성하지 않았다.
이번 신규 테스트는 그 guard 아래에서 **요청이 handler 에 도달하는지** 를 담당한다.

---

## 11. 배포 · smoke · 미검증 항목

- 이번 세션에서 **배포하지 않았다.** 프로덕션 요청 0건.
- 따라서 실제 브라우저 smoke 는 **미수행**이다. 위 판정은 소스 계약·단위 테스트·타입 검사에
  근거한다. `PATCH`/`PUT` 이 운영에서 실제 200 을 반환하는지는 배포 후 확인이 필요하다.
- 샘플·mock 으로 성공을 위장하지 않았다. 신규 테스트는 소스 파일만 읽는다.

---

## 12. 안전 회계

| 항목 | 결과 |
|---|---|
| 운영 DB write | **0** |
| 운영 DB 접속 | **0** (SELECT 포함 없음) |
| migration / schema 변경 | **0** |
| 프로덕션 HTTP 요청 | **0** |
| 자격증명 출력·기록 | **0** |
| `pnpm-lock.yaml` 변경 | 없음 |
| 타 세션 WIP | `apps/api-server/src/scripts/easy-drug-*` 5개 경로가 작업 트리에 있으나 **읽지도 수정하지도 않았고 stage 하지 않았다** |
| 역할 일괄 부여 / 인증 응답 구조 변경 / permission 공급 | 없음 |

---

## 13. 7·8번으로 이월

| 번호 | 항목 | 이번 조사에서 확보한 근거 |
|---|---|---|
| 7 역할 순서 결정성 | `requireRole` 은 정확 문자열 일치이므로 순서 의존이 없다. 순서 문제가 남는다면 다중 역할 표시·기본 역할 선택 쪽이다 |
| 8 관리자 역할별 테스트 계정 | §5 가 요구하는 census(실제 `platform:admin` 보유 계정 존재 여부)는 8번 과제다. **이번에 실행하지 않았다.** 2026-05-22 IR 시점에는 `platform:*` 0건이었고 마이그레이션으로 legacy 2건이 이전됐을 것으로 추정되나, **추정이며 확인되지 않았다** |
| 9 생애주기 smoke | §11 의 미검증 항목(실제 200 확인)이 여기서 해소된다 |

§13 의 8번 항목은 중요하다. 이번 수정으로 **플랫폼 관리자만 회원 관리를 수행할 수 있고**,
그 역할을 실제로 보유한 계정이 있는지는 아직 확인되지 않았다.

---

## 14. 판정

**`PASS_WITH_POLICY_FOLLOWUP`**

- 확정 가능한 결함(F 6건, H 2건)은 코드와 기존 정책만으로 근거를 세워 최소 변경으로 정비했다.
- 역할 guard·permission·scope 는 한 곳도 완화하지 않았다. B/C/D/E 는 0건이었다.
- `PASS` 가 아닌 이유: J1(역할 카탈로그 갱신)·J2(permission 공급)가 정책 결정으로 남았고,
  실제 역할 보유 계정 census(8번)와 배포 후 smoke(9번)가 미완이다.
