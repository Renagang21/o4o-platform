# CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1

> 작성일: 2026-09-23 · 상태: **IN PROGRESS — §1 BEFORE 전수 census 완료 · 런타임 전환 착수**
> WO: [`WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1`](../work-orders/WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md)
> 작업 worktree: `C:/tmp/o4o-pwretire` (detached · base `f651885ed`) — 메인 체크아웃은 타 세션 branch 로 **불가침**

---

## 0. 판정 기준

| 판정 | 의미 |
|---|---|
| `ACTIVE_REMOVE` | 현재 동작하는 password 경로 — 제거 |
| `ACTIVE_REDESIGN_GOOGLE` | 기능 자체는 남아야 함 — Google 기준으로 재설계 |
| `DEAD_DELETE` | 이미 소비처 0 — 삭제 |
| `HISTORICAL_KEEP` | migration history · 과거 CHECK/WO · 감사 로그 — **불변** |
| `SCHEMA_REMOVE` | 물리 스키마 제거 대상 (destructive gate 이후) |
| `OUT_OF_SCOPE_WITH_REASON` | password 문자열이지만 인증과 무관 |

---

## 1. BEFORE — 전수 census (2026-09-23)

검색 축과 규모 (node_modules 제외):

| 검색 축 | 히트 | 파일 |
|---|---:|---:|
| `service_credentials` / `ServiceCredential` | 118 | 49 |
| forgot/reset/`PasswordResetToken` 계열 | 166 | 51 |
| `type="password"` 입력 | — | 21 |
| `bcrypt` | — | 16 |
| `hashPassword` / `comparePassword` | — | 24 |
| password policy | — | 23 |
| lockout (`loginAttempts`·`lockedUntil`·`login_attempts`) | — | 33 |
| `password_reset_tokens` (스키마) | — | 7 |

### 1-1. Backend — 인증 런타임

| 항목 | 경로 | 판정 |
|---|---|---|
| `POST /auth/login` (email+password) | `modules/auth/routes/auth.routes.ts:49` | `ACTIVE_REMOVE` |
| `POST /auth/register` · `/auth/signup` | 같은 파일 `:56` `:63` | `ACTIVE_REMOVE` |
| `POST /auth/forgot-password` · `/reset-password` · `/find-id` | 같은 파일 `:202` `:209` `:216` | `ACTIVE_REMOVE` |
| `POST /auth/check-email` | 같은 파일 `:114` | `ACTIVE_REMOVE` — password 가입 UX 전용 |
| `AuthLoginService` (414줄) | `services/auth/auth-login.service.ts` | `ACTIVE_REMOVE` |
| `AuthRegisterController` (975줄) | `modules/auth/controllers/auth-register.controller.ts` | `ACTIVE_REMOVE` |
| `PasswordController` (124줄) | `modules/auth/controllers/password.controller.ts` | `ACTIVE_REMOVE` |
| `passwordResetService` (298줄) | `services/passwordResetService.ts` | `ACTIVE_REMOVE` |
| `admin-password-reset-scope.service` (88줄) | `services/admin/` | `ACTIVE_REMOVE` |
| Google link 의 `currentPassword` 재인증 | `google-auth.service.ts` · `dto/google.dto.ts` | `ACTIVE_REDESIGN_GOOGLE` — 세션 소유 증명으로 대체 |
| `PATCH /admin/platform-accounts/:id/password` | `routes/admin/platform-accounts.routes.ts` | `ACTIVE_REMOVE` |
| `PUT /users/password` | `routes/users.routes.ts:99` → `UserController.changePassword` | `ACTIVE_REMOVE` |
| `PUT /operator/members/:userId` raw credential upsert | `controllers/operator/MembershipConsoleController.ts:214-219` | `ACTIVE_REMOVE` |
| `utils/auth.utils.ts` (hash/compare, 17줄) | | `ACTIVE_REMOVE` |
| `utils/password-policy.ts` + 테스트 | | `ACTIVE_REMOVE` |
| `packages/auth-utils/passwordPolicy.ts` + 테스트 | | `ACTIVE_REMOVE` |
| `LoginSecurityService` · `SecurityAuditService` | `services/` | `ACTIVE_REDESIGN_GOOGLE` — password 실패 카운트만 제거, IP block 유지 |
| `jobs/cleanupLoginAttempts.ts` · `LoginAttempt` entity | | `ACTIVE_REMOVE` |
| `scripts/reset-admin-password.ts` · `create-admin-user.ts` · `create-manager-user.ts` · `diagnose-admin-login.ts` | `api-server/src/scripts/` | `ACTIVE_REMOVE` |
| `account-linking.service.ts` password 경로 | | `ACTIVE_REDESIGN_GOOGLE` |
| `mail-core` password reset 템플릿 | `packages/mail-core/src/mail.service.ts` | `ACTIVE_REMOVE` — 해당 템플릿만 |
| `swagger/schemas/index.ts` password 스키마 | | `ACTIVE_REMOVE` |

### 1-2. Frontend — 서비스별 auth surface matrix

| 서비스 | 현재 login | password 가입 | forgot/reset | 판정 |
|---|---|---|---|---|
| web-store | GoogleContinue | 없음 | 없음 | 이미 목표 상태 |
| web-hospital-pharmacy | GoogleContinue(LoginPanel) | 없음 | 없음 | 이미 목표 상태 |
| web-lecture | Google | 없음 | 없음 | 이미 목표 상태 |
| web-neture | `LoginModal` | `RegisterModal` | `ResetPasswordPage`·`AccountRecoveryPage` | `ACTIVE_REMOVE` → GoogleContinue |
| web-kpa-society | `LoginModal` | `RegisterModal` | `ResetPasswordPage`·`AccountRecoveryPage` | `ACTIVE_REMOVE` → GoogleContinue |
| web-k-cosmetics | `LoginPage`·`LoginModal` | `RegisterPage` | `ResetPasswordPage`·`AccountRecoveryPage` | `ACTIVE_REMOVE` → GoogleContinue |
| web-pharmacy-hub | `LoginPage` | `JoinPage` | `ForgotPasswordPage`·`ResetPasswordPage` | `ACTIVE_REMOVE` → GoogleContinue |
| web-kpa-branch | `LoginPage` | `JoinPage` | `ResetPasswordPage` | `ACTIVE_REMOVE` → GoogleContinue |
| admin-dashboard | Google (전환 완료) | — | `ForgotPassword.tsx`·`ResetPassword.tsx` 잔존 | `DEAD_DELETE` — route 는 이미 제거됨 |

### 1-3. 공통 패키지

| 항목 | 판정 |
|---|---|
| `packages/account-ui/PasswordChangeModal.tsx` | `ACTIVE_REMOVE` |
| `packages/account-ui/AccountSecuritySettings.tsx` password 블록 | `ACTIVE_REDESIGN_GOOGLE` — 연결된 Google identity 표시로 대체 |
| `packages/ui` `UserDetailPage.tsx` PasswordModal + `UserDetailPasswordModal.test.tsx` | `ACTIVE_REMOVE` |
| `packages/operator-core-ui` `OperatorMembersConsolePage.tsx` PasswordModal | `ACTIVE_REMOVE` |
| `operator-core-ui` `members/types.ts:123` `updatePassword?` | `ACTIVE_REMOVE` |
| `packages/auth-react` `GoogleContinue.tsx` | 정본 유지 |
| `packages/auth-react` `GoogleAccountLink.tsx` password 필드 | `ACTIVE_REDESIGN_GOOGLE` |
| `admin-dashboard/src/lib/password-policy.ts` + 테스트 | `ACTIVE_REMOVE` |

### 1-4. 스키마

| 대상 | 판정 |
|---|---|
| `users.password` | `SCHEMA_REMOVE` — Phase B |
| `users."loginAttempts"` · `users."lockedUntil"` | `SCHEMA_REMOVE` |
| `users.reset_password_token` · `reset_password_expires` | `SCHEMA_REMOVE` |
| `service_credentials` (production 5행) | `SCHEMA_REMOVE` |
| `password_reset_tokens` | `SCHEMA_REMOVE` |
| `login_attempts` | `SCHEMA_REMOVE` |
| `email_verification_tokens` | `OUT_OF_SCOPE_WITH_REASON` — email 인증은 password 와 독립 |
| `linked_accounts` · `role_assignments` · `service_memberships` | 불변 |

### 1-5. HISTORICAL_KEEP (수정 금지)

- `database/migrations/**` 의 password 관련 과거 migration 전부
  (`1700000000000-CreateUsersTable` · `1703000000000-AddRefreshTokenAndLoginAttempt` ·
  `1737100000000-UpdateGlucoseViewTestAccountPasswords` · `1770601460383-ActivateAdminUser` ·
  `2026012100001-CreateO4OAdminVaultAccount` · `20260523000000-CreateServiceCredentials` ·
  `20260927100000-BootstrapCanonicalSeedAccounts` · `1771200000015-CreateAuthTokenTables` ·
  `20261026000000/1/2` PasswordResetTokens 계열) · `historical-migrations.manifest.json`
- `account_activities` · `action_logs` 의 과거 password 이벤트 행 (WO §19)
- 과거 CHECK / WO / IR 본문

### 1-6. OUT_OF_SCOPE_WITH_REASON

`SimpleAIModal`(API key) · `EmailSettingsPage`(SMTP) · `StoreSettingsPage` ·
`web-account/AccountLayout` · `e2e/global-setup.ts` 비인증 입력 ·
`deploy-api.yml` 의 `DB_PASSWORD=o4o-db-password:latest`(DB 자격) ·
`admin-dashboard __debug__` 3개 페이지(프로덕션 미등록 · CLAUDE.md §8-3)

---

## 2. Core Freeze 판정 (명시 기록)

`apps/api-server/src/modules/auth/routes/auth.routes.ts` 는
`@core O4O_PLATFORM_CORE — Auth · Freeze: WO-O4O-CORE-FREEZE-V1` 이다.
본 WO 가 `/login` · `/register` · `/forgot-password` · `/reset-password` 제거를 **명시적으로 지시**하므로
**본 WO 를 해당 Core 경로의 CORE_CHANGE 승인으로 간주**하고 진행한다.
변경 대상은 auth route/controller/service 계열로 한정하며,
`role_assignments` · `service_memberships` · handoff · refresh 계약은 건드리지 않는다.

---

## 3. 이후 섹션 (작성 예정)

§3 런타임 전환 · §4 API 계약 변화 · §5 테스트/CI · §6 정적 가드 ·
§7 Phase A 배포 · §8 destructive gate 보고 · §9 Phase B 스키마 contract ·
§10 production smoke · §11 postVerify · §12 문서 정합 · §13 남은 Smoke A/B 인계
