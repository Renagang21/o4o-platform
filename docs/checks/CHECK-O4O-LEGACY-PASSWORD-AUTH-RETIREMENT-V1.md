# CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1

> 작성일: 2026-09-23 · 상태: **`READY_FOR_PHASE_A_DEPLOY / BLOCKED_BY_LECTURE_INCIDENT`** (§7 · 사용자 결정 2026-09-23)
> WO: [`WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1`](../work-orders/WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md)
> 작업 브랜치: `wo/legacy-password-auth-retirement` (origin push 완료 · `main` 무접촉)
> 작업 worktree: `C:/tmp/o4o-legacy-password-retirement` — 다른 세션의 체크아웃·worktree 는 **불가침**
> Phase B(스키마 파괴적 제거)는 **미착수** — §43 DESTRUCTIVE GATE 는 Phase A production 배포·검증 이후에만 진입한다

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

## 3. Phase A 런타임 전환 — 잔여 컷오버 (2026-09-23)

backend Phase A 2커밋(`010952f0d` · `c921f90b5`)과 프런트/공통 WIP(`4d7e054da`) 이후의 **잔여**를 마감했다.
`origin/main` 은 인계 시점(`84cf13f22`)보다 고유 커밋 **약 30개**(PR #225 Lecture Phase 2 등) 앞서 있었고,
교집합 8파일을 먼저 확인한 뒤 merge 했다 — **충돌 0**(`47c6ec3aa` · WO 커밋 4개 보존 · force push 0).

| 축 | 조치 | 커밋 |
|---|---|---|
| `services/web-account` | 자체 email/password 로그인 폼 · raw `POST /auth/login` 제거. **판정 근거**: 배포 대상 아님(workflow 0 · Cloud Run 서비스 0) · route 는 `/handoff` + `/`(대시보드) 둘뿐 · baseline `O4O-MYPAGE-CANONICAL-V1`(Option D)이 "최소 계정센터(서비스 목록 + Handoff outbound) · 비밀번호 UI 금지"로 고정 → **독립 인증 진입점이 아니라 세션 소비자**. 미인증은 대표 진입점 링크, 세션 확인은 `GET /auth/me`(`AuthContext.refresh`). `@o4o/auth-react` 의존성 추가 불필요 | `2080c8415` |
| `apps/admin-dashboard` | `AdminAccountsSettings` 비밀번호 재설정 액션·모달·결과 패널 제거(서버 `PATCH /admin/platform-accounts/:id/password` 은퇴와 정합) · `UserForm` password 필드/zod/payload 제거(서버 `POST /users` 가 password 미수신) · `types/user.ts` `UserFormData.password` 제거 · `lib/password-policy.ts`·테스트·`pages/auth/ForgotPassword.tsx`·`ResetPassword.tsx` 삭제(route 는 선행 WO 에서 이미 제거) | `2080c8415` |
| 공통 패키지 | `auth-utils` `passwordPolicy`(+test) 삭제·export 제거 · `types` `LoginPayload`/`RegisterPayload` 제거(소비처 0 실측) · `mail-core` `password-reset` 템플릿·`passwordResetTemplate`·`sendPasswordResetEmail`·`PasswordResetEmailData` 제거 | `2080c8415` |
| `services/web-neture` | 관리자 계정 화면의 비밀번호 재설정 버튼·모달·`handleResetPassword`·`platformAdminApi.resetPassword` 제거 — **정적 guard 가 찾아낸 잔재**(admin-dashboard 와 중복 surface · 서버 endpoint 는 이미 은퇴) | `a7eecd436` |

## 4. 테스트 재정의 — 실측 기준

`password` 를 언급하는 api-server 테스트 41개를 실행해 **대상 코드 부재로 실패하는 것만** 삭제했다(추측 삭제 0).

| 분류 | 파일 | 처분 |
|---|---|---|
| 은퇴 코드 대상(FAIL) | `loginLockoutStaleLockContract` · `orphanCredentialLoginContract` · `representativeEntryLoginContract` · `login-account-status-exposure.spec` · `MembershipConsoleController.servicePassword` · `servicePasswordLoginSelection` | **삭제 6** |
| "password 를 다루지 않는다" 계약(PASS 유지) | `AdminUserController.passwordContract` · `UserManagementController.passwordContract` | **보존** — 여전히 회귀 가치가 있다 |
| 은퇴 계약 참조분 | `googleAuthService.test.ts` link describe(10건) · `googleAuthDto.test.ts` link 케이스 · `googleIdentityNoEmailMergeGuard` G3 | **정정** — G3 은 "password 로그인 런타임 파일 부재 + import 0" 으로 재정의 |

결과: api-server `src/services/auth` + `src/modules/auth` **9 suites 85/85 PASS**.

## 5. 정적 재유입 guard (`a7eecd436`)

신규 `apps/api-server/src/__tests__/legacy-password-auth-retirement.spec.ts` — DB·네트워크 접근 0.

| 판정 | 내용 |
|---|---|
| P1 | 은퇴 런타임 파일 **10종 부재** + 해당 모듈 `import` 0(`auth-login.service/controller` · `passwordResetService` · `password-policy`/`passwordPolicy` · `admin-password-reset-scope` · `PasswordChangeModal`) |
| P2 | `auth.routes.ts` 에 `/login` · `/register` · `/signup` · `/check-email` · `/forgot-password` · `/reset-password` · `/find-id` · `/google/link`(+`/status`) 등록 0 · `users.routes.ts` password route 0 · `platform-accounts.routes.ts` password route 0 |
| P3 | 런타임 소스 `bcrypt`/`bcryptjs` import **0** · `hashPassword`/`comparePassword` export **0** |
| P4 | 인증 surface `type="password"` **0**. allowlist 10건은 성격을 명시(API key · SMTP · CMS form type · OAuth client secret · 매장 태블릿 PIN · `__debug__` 비프로덕션) + **죽은 예외 검사** 포함 |
| P5 | Google 경로 유지 검사 — `/google/config` · `/google/login` · `/google/signup` · `/refresh` · `/logout` |

설계 메모: 판정은 **주석을 제외한 코드**만 본다(은퇴 사실을 적은 주석이 위반으로 잡히지 않게). 스캔 집합이 공집합이면 먼저 실패하는 검사(`FILES.length > 500`)를 넣어 "빈 통과" 를 막았다. **guard 가 실제 잔재 1건(web-neture)을 잡아냈다** — §3 마지막 행.

## 6. 문서 정합

| 문서 | 조치 |
|---|---|
| `O4O-IDENTITY-ARCHITECTURE-V3` | **변경 없음** — 이미 CANONICAL(Google 단일 로그인 · 최소 개인정보 User)이며 본 WO 가 그 §16 Phase 구현이다. V1/V2 는 2026-09-17 SUPERSEDED 표기 완료 |
| `O4O-MYPAGE-CANONICAL-V1` | §2 매트릭스의 **비밀번호 변경 · 비밀번호 재설정 2행을 "은퇴" 로 정정** + `로그인 수단(Google 계정)` 행 추가 · Option D 근거 중 "비밀번호가 서비스별" 논거 소멸 표기. **canonical 위치 결정(web-account = Handoff outbound 전용)은 불변** |
| `O4O-CORE-FREEZE-V1`(F10) | 본문 미수정 — Core auth route 변경의 승인 근거는 본 WO 이며 §2 에 기록했다. Freeze 문서 본문 갱신은 별도 판단 사항으로 **보고만**(CLAUDE.md §16-4) |
| `USER-DOMAIN-SSOT-V1` | 다이어그램에 `password` 컬럼 표기 1건 — **Phase B(스키마 제거) 시점에 갱신**. 지금 고치면 코드/스키마 상태와 어긋난다 |

## 7. Phase A 배포 — BLOCKED (Lecture incident · 사용자 결정 2026-09-23)

배포 워크플로 3종(`deploy-api.yml` · `deploy-web-services.yml` · `deploy-admin.yml`)에 **`--no-traffic` 이 없다**(실측).
즉 `main` merge → `gcloud run deploy` 실행 → **새 revision 이 100% 트래픽을 받는다**. 현재 `main` 에는
Lecture Phase 2 코드가 들어 있고 production 은 pre-cutover revision 으로 롤백된 상태이므로
(incident 기록: `CHECK-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1` §19 · 커밋 `a7b660dbb` · 롤백 실행은 타 세션),
**본 WO 를 main 에 merge 하면 Lecture Phase 2 가 함께 재배포되어 롤백이 무효화된다.**

사용자 결정(선택지 1) 에 따른 현재 경계:

| 항목 | 상태 |
|---|---|
| 코드 작업 · 테스트/CI · 작업 브랜치 push | **허용** |
| `main` merge/push · deploy-api/web/admin 실행 · Cloud Run 직접 deploy | **금지** |
| `service_credentials` 5행 삭제 · password column/table DROP · §43 destructive gate | **금지** |
| production DB write | **금지**(본 WO 에서 0건) |

재개 조건 — "Lecture 롤백 완료" 가 아니라 **"`main` 의 Lecture 코드가 다시 배포해도 되는 상태"** 다:
① Lecture Phase 2 를 `main` 에서 revert 하고 pre-cutover 를 정본으로 확정, 또는
② Lecture Phase 2 의 data/membership 정책까지 승인·완료해 재배포 가능 상태로 확정.
그 뒤 순서: 최신 `origin/main` fetch → 브랜치 재동기화 → CI 재검증 → Phase A merge/deploy →
production Google/auth smoke → **그 다음에만** §43 destructive gate.

## 8. 검증 (2026-09-23 · 격리 worktree `C:/tmp/o4o-legacy-password-retirement`)

| 항목 | 결과 |
|---|---|
| api-server auth 테스트 | 9 suites **85/85 PASS** |
| 정적 guard | **32/32 PASS** |
| `apps/api-server` tsc | **0 에러** |
| `packages/auth-utils` · `mail-core` · `types` · `account-ui` tsc | 각 **0 에러** · `pnpm build:packages` 성공 |
| `apps/admin-dashboard` · `services/web-neture` · `services/web-account` | tsc **0** + `vite build` **PASS** |
| eslint(변경/신규 파일) | **오류 0** |
| production DB write | **0** (본 WO 에서 SELECT 조차 하지 않았다 — incident 검증 read-only 는 Lecture CHECK 소관) |
| Git | 브랜치 `wo/legacy-password-auth-retirement` origin push 완료(배포 트리거 아님 — 3 워크플로 모두 `branches: main`/`develop` 한정 실측) · `main` 무접촉 |

## 9. 남은 작업 (재개 시)

1. Lecture main 처분 확정 대기(위 §7 재개 조건)
2. `origin/main` 재동기화 + CI 전체 재검증
3. Phase A merge → deploy(api · web · admin) → old revision traffic 0 확인
4. production smoke: Google 로그인(관리자 · 테스트 계정) · 서비스 가입 flow 회귀 · password 경로 404/410 확인
5. **§43 DESTRUCTIVE GATE** — row count · DROP 대상 · rollback 한계 보고 → 사용자 승인 → Phase B(migration · entity · manifest/expected schema)
6. Smoke A/B(operator invitation WO) 인계 항목 정리

---

## 판정

`LEGACY PASSWORD AUTH RETIREMENT: READY_FOR_PHASE_A_DEPLOY / BLOCKED_BY_LECTURE_INCIDENT`

Phase A 런타임 컷오버·테스트·정적 guard·문서 정합은 완료했고 배포만 대기한다. Phase B(스키마)는 미착수다.

문서 정합: 발견 2건(MYPAGE 매트릭스 password 2행 — 정정 완료 / USER-DOMAIN-SSOT 다이어그램 password 표기 — Phase B 로 이월) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(F10 Core Freeze 본문 갱신 여부 판단)
