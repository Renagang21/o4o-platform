# CHECK-O4O-SERVICE-MEMBER-PASSWORD-AND-ROLE-CONSUMER-INTEGRITY-AUDIT-V1

- **대상 IR**: IR-O4O-SERVICE-MEMBER-PASSWORD-AND-ROLE-CONSUMER-INTEGRITY-AUDIT-V1
- **기준**: `origin/main` (조사 시작 HEAD `638ca7293`)
- **일자**: 2026-08-12
- **종합 판정**: **FIX 1건 적용** + PASS 다수 + HOLD 3건(보고만)

---

## 1. 비밀번호 변경 소비처 대응표

화면 → API client → route → controller → DB write 를 연결한 결과다.

| # | 화면 | 클라이언트 호출 | route | controller | DB write | serviceKey | 판정 |
|---|---|---|---|---|---|---|---|
| P1 | `packages/ui/src/operator-user-detail/UserDetailPage.tsx` PasswordModal (L110-152) | `apiAdapter.put('/operator/members/:id', { password, serviceKey })` | `PUT /api/v1/operator/members/:userId` | `MembershipConsoleController.updateMember` → `changeMemberServicePassword` | `service_credentials` UPSERT (해당 serviceKey 1행) | ✅ 필수. 후보 0/1/N 분기 UI | PASS |
| P2 | `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx` PasswordModal (L112-155) | `client.updatePassword(userId, password, serviceKey)` | 동상 | 동상 | 동상 | ✅ 후보 1건이면 자동 선택, 미선택 시 제출 차단 | PASS |
| P3 | `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx:253` | `api.put('/operator/members/${userId}', { password, serviceKey })` | 동상 | 동상 | 동상 | ✅ 전달 자체는 정상 | **FIX (적용)** — 후보 산출용 `memberships` 미매핑으로 모달이 항상 후보 0. §3-B |
| P4 | `services/web-neture/src/pages/operator/UsersManagementPage.tsx:166` | 동상 | 동상 | 동상 | 동상 | ✅ | PASS |
| P5 | `services/web-k-cosmetics/src/pages/operator/UsersPage.tsx:123` · `src/pages/admin/KCosmeticsAdminMembersPage.tsx:110` | 동상 | 동상 | 동상 | 동상 | ✅ | PASS |
| P6 | `services/web-glycopharm/src/pages/operator/UsersPage.tsx:109` · `src/pages/admin/GlycoPharmAdminMembersPage.tsx:107` | 동상 | 동상 | 동상 | 동상 | ✅ | PASS |
| P7 | `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx:305-313` 비밀번호 모달 | `PUT /operator/members/:id { password, serviceKey }` (`resolveCanonicalServiceKey`) | 동상 | 동상 | 동상 | ✅ canonical 변환 후 전달 | PASS |
| P8 | `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx:400-410` 운영자 신규 등록 | `POST /admin/users { password, serviceKey }` | `POST /api/v1/admin/users` | `AdminUserController` 운영자 등록 트랜잭션 | User + `role_assignments` + `service_memberships` + `service_credentials` 단일 트랜잭션 | ✅ `resolveOperatorTargetServiceKey` 가 역할·serviceKey 불일치 거부 | PASS |
| P9 | `apps/admin-dashboard/src/pages/users/UserForm.tsx` (`/users/:id/edit`) | `UserApi.updateUser` → `PUT /api/v1/users/:id` | `users.routes.ts:154` (`authenticate` + `requireAdmin`) | `UserManagementController.updateUser` | **없음 — password 가 조용히 무시됨** | ❌ serviceKey 개념 자체 없음 | **FIX (적용)** |
| P10 | admin-dashboard 플랫폼 계정 관리 | `PATCH /admin/platform-accounts/:id/password` | `platform-accounts.routes.ts` (`platform:super_admin`) | 동 route | `users.password` (L1) 만 | 해당 없음(플랫폼 계정 축) | PASS (기존 결정 A) · HOLD-3 참조 |
| — | Pharmacy-Hub `src/pages/operator/MembershipsPage.tsx` · `MembershipDetailPage.tsx` | `PATCH /pharmacy-hub/operator/memberships/:id/approve\|reject` 뿐 | — | — | 멤버십 상태만 | — | **대상 아님** (비밀번호·역할 write 소비처 없음) |

### serviceKey 전달 및 서비스 격리 판정

서비스 비밀번호 write 는 `MembershipConsoleController.changeMemberServicePassword` 한 곳뿐이고,

- 후보 = 호출자 관리 범위 ∩ 대상자의 `service_memberships` (`SELECT service_key FROM service_memberships WHERE user_id = $1`)
- 명시 serviceKey 가 후보 밖이면 404 `SERVICE_NOT_MEMBER` / 403 `SERVICE_SCOPE_FORBIDDEN`
- 플랫폼 관리자가 아니고 후보가 정확히 1건일 때만 자동 확정, 그 외 미지정은 400 `SERVICE_KEY_REQUIRED`
- tier 판정(`OPERATIONAL_TIER_RANK[caller] <= OPERATIONAL_TIER_RANK[target]` → 403 `INSUFFICIENT_OPERATOR_TIER`)은 **선택된 서비스 안에서만** 수행
- write 는 `INSERT ... ON CONFLICT ON CONSTRAINT "uq_service_credentials_user_service" DO UPDATE` 로 **(user, 선택 serviceKey) 1행에만** 적용. `users.password` 및 타 서비스 credential 은 건드리지 않는다.

→ **타 서비스 회원·credential 에 영향을 줄 수 있는 비밀번호 소비처는 없다.**

"복수 서비스 운영자에게 대상이 불명확하거나 400 이 나는 경로"는 UI 에서 이미 차단된다(P1·P2 모두 후보 0/1/N 분기 + 미선택 제출 차단, 각 서비스 화면은 이 두 공통 모달을 소비).
근거 테스트: `MembershipConsoleController.servicePassword`, `MembershipConsoleController.crossServiceIsolation`, `packages/ui/src/operator-user-detail/__tests__/UserDetailPasswordModal.test.tsx`.

단, **KPA 만** 공통 모달에 후보를 공급하는 `user.memberships` 를 채우지 않아 화면이 항상 "변경할 수 있는 서비스가 없습니다" 로 막혔다(프로덕션 실측). 서비스 격리 문제는 아니고 **UI↔공통 컴포넌트 연결 결함**이며 §3-B 에서 수정했다. Neture / K-Cos / GlycoPharm 은 canonical 목록(`GET /operator/members`)이 `memberships` 를 그대로 내려주므로 해당 없음.

---

## 2. 역할 변경 경로 대응표 · dead branch 판정

| # | 화면 | API | 가드 | 판정 |
|---|---|---|---|---|
| R1 | `UserDetailPage.tsx:273` 역할 추가 | `POST /operator/members/:userId/roles` | 서비스 경계(prefix/serviceKey) + `isAssignable` + operator/admin tier 는 플랫폼 관리자 전용(403 `ROLE_ASSIGNMENT_PLATFORM_ADMIN_ONLY`) | PASS |
| R2 | `UserDetailPage.tsx:460` 역할 해제 | `DELETE /operator/members/:userId/roles/:role` | R1 가드 + `SELF_ROLE_REVOKE_FORBIDDEN` + `LAST_PLATFORM_SUPER_ADMIN`(409) + `revokeServiceAdminRoleWithLock`(`LAST_ADMIN_PROTECTED`) | PASS |
| R3 | `OperatorsPage.tsx:458,485` · `UsersListClean.tsx:168,185` 역할 회수 | `DELETE /admin/users/:userId/role-assignments/:role` | `platform:super_admin` 전용, soft revoke(`is_active=false`) | PASS |
| R4 | 역할 선택 목록 | `GET /operator/roles`(서버가 범위 산출) + 클라이언트 `isAdminRole` 필터 | 서버 판정이 정본 | PASS |
| R5 | `apps/admin-dashboard/src/pages/users/UserForm.tsx` 역할 체크박스 | `POST /api/v1/users` · `PUT /api/v1/users/:id` | `requireAdmin` = `platform:super_admin` 전용 | **HOLD-1 / HOLD-2** |
| R6 | `apps/admin-dashboard/src/pages/cpt-acf/forms/UserForm.tsx` (CPTACFRouter 하위 `/users/new`, `/users/edit/:id`) | 없음 — 14줄 "temporarily disabled" 스텁 | — | dead 이지만 write 0. 콘텐츠 라우터 소유라 이번 범위에서 손대지 않음 |

`requireAdmin` 은 `platform:super_admin` 단독이다(`common/middleware/auth/authorization.middleware.ts:58`). 따라서 R5 경로로 **서비스 운영자가 타 서비스 역할을 건드릴 수 있는 구멍은 없다** — 아래 HOLD 는 경계 침범이 아니라 계약 불일치 문제다.

### 비활성·폐기 역할 데이터 영향

- 권한 판정(`role-assignment.service.ts` 의 `getRoles`/`hasRole`/`hasAnyRole`/`getUsersWithRole`)은 전부 `isActive: true` 필터를 건다.
- 목록 조회(`MembershipConsoleController` L353, `AdminUserController` L248)도 `is_active = true` 만 집계한다.
- 상세 조회(`MembershipConsoleController` L484)는 의도적으로 비활성 행까지 이력으로 반환하지만, FE 는 보유 역할을 `roles.filter(r => r.isActive)` 로 계산하고(`UserDetailPage.tsx:830`) 비활성 행에는 회수 버튼을 주지 않는다(L712·L724).

→ **비활성·폐기 역할 데이터가 화면 판단이나 권한 판정에 새는 곳은 없다.** PASS.

---

## 3. 수정 내역 (FIX)

### 결함

`/users/:id/edit`(admin-dashboard, `platform:super_admin`)에서 비밀번호를 입력하고 저장하면
`PUT /api/v1/users/:id` 로 `password` 가 전송되는데, `UserManagementController.updateUser` 가 body 에서
`password` 를 destructure 하지 않아 **조용히 무시**했다. 화면은 `User updated successfully` 를 띄우지만
`users.password` 도 `service_credentials` 도 바뀌지 않는다.

로그인은 `credentialHash ?? user.password` 이므로(`auth-login.service.ts`), 이는
`WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1` 가 `AdminUserController` 에서 이미 제거한
"성공했는데 안 바뀜" 과 같은 유형이다. 계약 변경 없이 같은 방식으로 닫는다.

### 변경

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/controllers/UserManagementController.ts` | `updateUser` 에서 `password !== undefined` 이면 400 `PASSWORD_NOT_ALLOWED_HERE` 로 **명시적 거부**(`AdminUserController.updateUser` 와 동일 code·문구). 거부 시 users 저장·역할 변경 모두 수행하지 않는다. |
| `apps/admin-dashboard/src/pages/users/UserForm.tsx` | 편집 모드에서 비밀번호 입력란 제거 → 정본 경로 안내 문구로 대체하고 `password` 를 전송하지 않는다. 신규 등록 모드는 유지하되 검증을 `min(6)` 에서 플랫폼 정본 정책(`isPasswordPolicyCompliant`/`PASSWORD_POLICY_MESSAGE` — 8자 이상 + 영문 1 + 숫자 1)으로 정렬(백엔드 `passwordPolicyBodyValidator` 와 동일). |
| `apps/api-server/src/controllers/__tests__/UserManagementController.passwordContract.test.ts` (신규) | 400 거부 / 거부 시 write 없음 / password 없는 일반 수정 정상 — 3케이스 고정. |

### 3-B. KPA 운영자 회원 관리 비밀번호 변경 도달 불가 (FIX-3)

프로덕션 `https://kpa.neture.co.kr/operator/members` 에서 어떤 회원을 선택해도 비밀번호 변경 모달이
"이 회원의 비밀번호를 변경할 수 있는 서비스가 없습니다 / 내가 관리하는 서비스 중 이 회원이 가입한 서비스가 없습니다"
만 표시하고 서비스 선택 `<select>` 가 0개였다(`pradix@naver.com`, `renagang21@gmail.com` 실측).

원인은 백엔드가 아니다. 공통 `OperatorMembersConsolePage` 의 PasswordModal 은 후보 서비스를
`user.memberships` 에서만 도출하는데(L120-124), KPA wrapper 의 `kpaMemberToUserData()` 가 그 필드를
매핑하지 않았다. 반면 `GET /kpa/members` 는 **`FROM service_memberships sm`** 이고 응답에 `sm_id` ·
`service_key` · `status` · `role` 을 이미 포함한다 — 즉 row 자체가 membership 이다.

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx` | `KpaMemberRaw` 에 `service_key` · `role` 선언 추가, `kpaMemberToUserData()` 가 같은 row 값으로 `memberships: [{ id: sm_id, serviceKey: service_key, status, role, createdAt }]` 를 채운다. 임의 주입이 아니라 응답에 이미 있는 값의 매핑 누락 복구다. |

백엔드 계약은 불변이다. 후보 확정 뒤에도 서버가 `service_memberships` 교집합 · 관리 범위 · tier 를
다시 판정하므로(§1), FE 매핑만으로 격리가 약해질 수 없다. 레거시 `service_key = 'kpa'` 행이 있으면
서버 후보에는 들어가나 KPA 운영자 scope 는 `kpa-society` 단독이라 403 `SERVICE_SCOPE_FORBIDDEN` 이
된다 — 코드가 아니라 데이터 축 문제이므로 HOLD-4 로 분리한다.

---

**유지된 것**: URL·권한·membership 의미·`service_credentials` 계약 전부 불변. 새 기능 없음. schema·migration·운영 데이터 write 0건.

---

## 4. 수정하지 않고 보고만 하는 항목 (HOLD)

| # | 내용 | 근거 | 후속 범위 |
|---|---|---|---|
| HOLD-1 | `PUT /api/v1/users/:id` 의 `roles` 분기가 `roleAssignmentService.removeAllRoles(userId)` 후 재부여 → **전 서비스 역할을 한 번에 내린다**. `UserForm` 은 편집 시 항상 `roles` 를 보낸다. | `UserManagementController.updateUser`, `role-assignment.service.ts:253`(`where: { userId, isActive: true }` 전체 해제) | 가드가 `platform:super_admin` 전용이라 경계 침범은 아니나 역할 부여·회수 정본 경로(R1~R3)와 계약이 다르다. 정본 경로로 일원화할지 = RBAC 의미 판단 → 별도 WO. |
| HOLD-2 | `UserForm` 역할 카탈로그(`rbac-catalog` ROLES: `super_admin`·`admin`·`branch_admin`·`branch_operator`·`moderator`·`pharmacist` 등)와 백엔드 검증(`body('roles.*').isIn(Object.values(UserRole))`)이 불일치 → 다수 선택지가 400 이고, prefixed 역할(`kpa:operator` 등) 보유 회원 편집도 400 이다. 또한 `POST /api/v1/users` 의 `roles` 는 엔티티의 **runtime-only 필드**(`User.roles` — 컬럼 아님)에 대입되어 `role_assignments` 에 **저장되지 않는다**. | `apps/api-server/src/routes/users.routes.ts:22-33`, `modules/auth/entities/User.ts:69-74`, `UserManagementController.createUser` | 카탈로그를 어느 축(bare/prefixed)에 맞출지 = RBAC 의미 결정. HOLD-1 과 같은 WO 에서 처리해야 한다. |
| HOLD-4 | `service_memberships.service_key` 에 KPA 의 legacy alias `'kpa'` 행이 남아 있으면 해당 회원은 비밀번호 변경이 403 `SERVICE_SCOPE_FORBIDDEN` 이 된다(운영자 scope = `kpa-society` 단독). | `routes/kpa/controllers/member.controller.ts` 목록 조건 `sm.service_key IN ('kpa-society','kpa')`, `utils/serviceScope.ts`(`kpa:*` → `['kpa-society']`) | 운영 데이터 정비(alias 행 canonical 화) 또는 scope alias 허용 = membership 의미·데이터 변경 → 별도 WO. 이번 작업에서 DB 는 조회·변경 모두 하지 않았다. |
| HOLD-3 | `PATCH /admin/platform-accounts/:id/password` 는 의도적으로 `users.password`(L1) 만 갱신한다(결정 A, `WO-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1`). 다만 이 route 의 검증은 `MIN_PASSWORD_LENGTH = 8` 뿐이고 영문·숫자 복잡도를 확인하지 않아 정본 정책과 어긋난다. | `apps/api-server/src/routes/admin/platform-accounts.routes.ts` | 플랫폼 계정 축이라 이번 IR(서비스 운영자 경로) 밖. 비밀번호 정책 통일 WO 로 분리. |

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm --filter @o4o/api-server type-check` | PASS |
| `pnpm --filter @o4o/admin-dashboard type-check` | PASS |
| jest — `UserManagementController.passwordContract`, `AdminUserController.passwordContract`, `MembershipConsoleController.{servicePassword, crossServiceIsolation, roleRevokeSafety}` | 5 suites / 64 tests PASS |
| `pnpm --filter @o4o/admin-dashboard build` | PASS (선행 `@o4o/auth-context` build 필요 — dist 가 stale 하면 `canWriteProductDb` export 오류. 이번 변경과 무관한 로컬 조건) |
| `pnpm --filter @o4o/web-kpa-society exec tsc --noEmit` | PASS |
| `pnpm --filter @o4o/web-kpa-society build` | PASS |
| 운영 데이터 write | **0건**. 조사는 전부 코드·테스트 기준이며 프로덕션 DB 조회도 수행하지 않았다. |

---

## 6. 프로덕션 smoke

| 항목 | 결과 |
|---|---|
| commit | (push 후 기입) |
| admin 배포 | (기입) |
| `/users/:id/edit` 비밀번호 입력란 제거 확인 | (기입) |
| 운영자 회원 관리 비밀번호 변경(정본 경로) 회귀 | (기입) |
