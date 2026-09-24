# CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1

> 작성일: 2026-09-23 · 상태: **`PHASE_A_DEPLOYED`** — `7a44a97bc` 운영 반영 완료(2026-09-24 · §7-9) · **Phase B/§43 은 미착수·별도 승인**
> WO: [`WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1`](../work-orders/WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md)
> 작업 브랜치: `wo/legacy-password-auth-retirement` (origin push 완료 · `main` 반영은 배포 담당 세션이 수행 — 본 세션 main push 0)
> 작업 worktree: `C:/tmp/o4o-legacy-password-retirement` — 다른 세션의 체크아웃·worktree 는 **불가침**
> Phase B(스키마 파괴적 제거)는 **미착수** — Phase A 배포·검증은 끝났으나(§7-9) §43 DESTRUCTIVE GATE 진입은 **사용자 승인 후**다

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

## 7. Phase A 배포 — 통제된 배포 창 대기 (사용자 결정 2026-09-24)

### 7-1. 차단 사유 해제

**"Lecture data cutover 미실행" 은 더 이상 배포 차단 사유가 아니다**(사용자 지시 2026-09-24).
- 삭제된 강의 11건의 **rekey 를 요구하지 않는다** · **Phase 2 revert 도 요구하지 않는다**.
- 근거 기록은 Lecture 트랙 소관이다: `CHECK-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1`
  §19(INCIDENT · `a7b660dbb`) · §21(LMS 31행 삭제 · `05950f5a9`) · §22(빈 상태 Phase 2 재판정 ·
  `b8ae53f4e` · `MAIN_RUNTIME_SAFE_FOR_GENERAL_DEPLOY = YES 조건부`). 본 CHECK 는 참조만 한다.
- 이전 판단(§7 구판)에서 내가 적었던 "Lecture 처분 확정까지 배포 금지" 는 이 지시로 **해제**된다.

### 7-2. 배포 대상 SHA 와 포함 변경 (2026-09-24 실측 · **대상 SHA 정정**)

> **배포 대상 SHA 최종(2026-09-24 · PR #226 merge 후):** **`7a44a97bc83c5a43af5b889af1098a628161670f`(`7a44a97bc`)**
>
> 1차 병합 `0af9db301` 은 CI red 였고(§7-7), 수정 2라운드(`f38f120bf` · `44d6dd66c`)를 PR #226 으로 올려
> **CI 전부 success** 확인 후 merge 한 것이 이 SHA 다. 본 세션 독립 검증(2026-09-24):
> `origin/main = 7a44a97bc…` · 수정 tip `44d6dd66c` 조상 포함 · marker 6종(`9a3b402b9` · `3c7083be5` ·
> `ebc7204ba` · `0af9db301` · `f38f120bf` · `44d6dd66c`) 전부 포함 ·
> §43 재확인(`0af9db301..7a44a97bc`): 신규 migration **0** · 파괴적 SQL **0**.
> SonarCloud 는 `new_duplicated_lines_density 4.3%(>3%)` 로 fail — 계약 테스트를 명시적으로 늘린 결과이며
> 등급·hotspot 은 전부 통과. 비필수 게이트이고 헬퍼 추출은 "케이스마다 무엇을 지키는지 보이게" 하려는 의도와
> 상충하므로 현행 유지, 필요 시 사용자 판단으로 정리한다.
>
> (이전) 1차 병합 기록: **`0af9db3011cb1ed105c198721d5bbb87420cd225`(`0af9db301`)**
> = `origin/main 21e8ad587` + Phase A 브랜치 tip `d1f6c3d4f` 의 `--no-ff` merge. 병합 실행은 배포 담당 세션이 했고,
> 본 세션은 **독립 검증만** 했다(본 세션 main push 0 · 병합 미실행).
>
> | 검증(본 세션 · 2026-09-24) | 결과 |
> |---|---|
> | `origin/main` | `0af9db3011cb1ed105c198721d5bbb87420cd225` |
> | Phase A tip `d1f6c3d4f` 조상 포함 | **포함** |
> | marker 3종 `9a3b402b9` · `3c7083be5` · `ebc7204ba` | **전부 포함** |
> | 병합 규모 | 171 files · +1,911 / −16,120 · **충돌 0** |
> | §43 미포함 재검증 (`21e8ad587..0af9db301`) | 신규 migration **0건** · 파괴적 SQL(DROP/DELETE/TRUNCATE/dropColumn) **0건** |
> | Phase A 산출물 main 반영 | 정적 guard spec · Google-only E2E spec · 본 CHECK **전부 존재** |
> | 은퇴 파일 main 부재 | `auth-login.service.ts` · `passwordResetService.ts` · `passwordPolicy.ts` **전부 없음** |
>
> 이전 보고의 `b8ae53f4e` · `fc2a2ca38` 기준은 **폐기**한다(병합 전 main HEAD 였다). 아래 표의 "현재 서빙" 실측은 유효하다.

| 축 | 현재 서빙 revision (이미지 기준) | 그 revision 을 만든 SHA | 대상 SHA |
|---|---|---|---|
| API | `o4o-core-api-03746-qlz` (09-23 06:53Z) | `f651885ed` | **`b8ae53f4e`** (origin/main) |
| Web | `lecture-web-00011-drs` · `kpa-society-web-01993-6z9` · `k-cosmetics-web-01161-lw5` · `pharmacy-hub-web-00251-49n` (06:20Z) | `63c9b602f` | **`b8ae53f4e`** |
| Admin | `o4o-admin-dashboard-01305-z8l` (05:18Z) | `cc87a9385` | **`b8ae53f4e`** |

대상 SHA 에는 **이미지·revision 이 아직 없다**. 13:02:48Z(`3c7083be5`) 배포가 만든 `03748-64l` ·
`00014-9gj` · `01996-r8d` · `01308-29m` 가 마지막이며, 13:21:59Z 에 `DEPLOY_ENABLED=false` 로 닫힌 뒤
실행된 배포 4건(`f951ad841` 13:46 · `ebc7204ba` 13:47 · `11c249c80` 14:20 · `b8ae53f4e` 14:56)은
workflow 결과가 success 여도 **revision 을 만들지 않았다** — fail-closed 게이트가 잡 전체를 skip 했다(게이트 정상 동작 실측).

포함 변경(서빙 SHA → `b8ae53f4e` · 경로 필터 기준):

| 축 | 파일 수 | 주요 범위 |
|---|---:|---|
| API | 74 | `modules/lms` services/controllers/utils(17) · `__tests__`(19) · `services/payment/b2b`(3) · `routes/kpa`(6) · `packages/shared-space-ui`(3) 등 |
| Web | 145 | web-kpa-society 56 · web-pharmacy-hub 28 · web-k-cosmetics 27 · web-lecture 26 · shared-space-ui 4 · web-neture 2 · store-ui-core 1 |
| Admin | 12 | admin-dashboard 4 · shared-space-ui 5 · store-ui-core 1 · pnpm-lock 1 · workflow 1 |

**migration 실행 여부: 신규 migration 파일 0** (`git diff f651885ed..b8ae53f4e -- apps/api-server/src/database/migrations` 결과 없음 ·
최신 main `fc2a2ca38` 동기화 후에도 동일). Lecture 트랙 세션 독립 확인과 일치: incremental manifest **4건**
(`CreateStoreOwnerTerminationCases1789701000000` · `AlterHandoffTokensTargetWorkspace1789974015939` ·
`CreateOperatorInvitations1790125106065` · `CreateHospitalDeviceTables1790125390245`) · 운영 DB prefix **4/4** ·
기대 상태 `CreateHospitalDeviceTables1790125390245` · fingerprint `bc27f5bc…(5826)`.
API 배포의 migration Job 은 `build-and-deploy` 안에 있어 실행되더라도 적용 대상이 없으므로
`INCREMENTAL_EXECUTED=0` 이 기대값이다(Lecture 트랙이 격리 PG15 에서 동일 지문 `bc27f5bc…/5826` 으로 선확인).

**예상 배포 job**: `deploy-api`(api_deploy_affected=true 예상 · migration 0) ·
`deploy-web-services`(kpa-society · k-cosmetics · pharmacy-hub · lecture — neture/store 는 변경 2/1 파일이라 per-service 판정에 따름) ·
`deploy-admin`. 3 워크플로 모두 `environment: production` 승인 게이트 + `DEPLOY_ENABLED=='true'` 조건이 걸려 있다.

### 7-3. 이번 배포 창에서 하지 않는 것

- **전역 `DEPLOY_ENABLED` 를 내가 켜지 않는다.** 다른 세션의 push 가 이어지는 동안 변수를 열면
  그 push 들이 함께 배포되므로, 켜는 시점은 사용자가 정한다(사용자 지시 2026-09-24).
- **§43 destructive migration(Phase B)은 이번 배포에 포함하지 않는다** — `service_credentials` 5행 삭제 ·
  `users.password`/`loginAttempts`/`lockedUntil` · `password_reset_tokens` · `login_attempts` DROP 은
  **별도 판정·별도 승인** 대상으로 유지한다(§9-5).
- Phase A 브랜치(`wo/legacy-password-auth-retirement`)는 **아직 main 미병합**이다. 병합은 **사용자 승인 사항**이며
  피어 세션의 요청만으로는 실행하지 않는다(요청받았으나 거절하고 사용자 승인을 기다린다 · 2026-09-24).
  승인되면 병합 → 최종 main SHA 를 Lecture 트랙 세션에 통보 → 그 세션이 marker 3종 대조 회신 →
  같은 SHA 를 양쪽 CHECK 에 기록 → 통제된 배포 1회.

### 7-4. 배포 창 절차 (승인 시 이 순서로 실행)

```text
① 사용자 승인 + DEPLOY_ENABLED=true (사용자 타이밍)
② 3 워크플로 실행 → environment production 승인(required reviewer)
③ 새 revision 생성 확인 (api · web 4 · admin)  ← 아직 트래픽 전환 안 함
④ 실제 HTTP 검증 — Lecture 트랙 세션과 합의한 통합 목록
   [Lecture]  GET /api/v1/lms/courses 200·빈 목록 · 삭제된 강의 ID 404 ·
              study.neture.co.kr 200 · KPA/KCos/PH 화면 200
   [Password] /auth/login · /auth/register · /auth/forgot-password · /auth/reset-password ·
              /auth/find-id · PUT /users/password · /auth/google/link → 전부 404 ·
              로그인 화면 password 입력 0 · Google 진입 렌더
   [공통]     인증 경로 정상 · 다른 서비스 API 회귀 0 · migration INCREMENTAL_EXECUTED=0
              (다르게 나오면 그 자체가 STOP 신호)
⑤ 통과 → 명시적 `update-traffic` 으로 전환 → old revision traffic 0 확인
   실패 → 전환하지 않는다. 트래픽이 특정 revision 에 pin 돼 있어 새 revision 은 배포돼도 0% 로 남으므로
   **전환하지 않는 것이 곧 롤백 상태 유지**다(이 pin 이 사실상 안전장치).
⑥ 배포 후 production smoke: Google 로그인(관리자·테스트 계정) · 서비스 가입 flow
⑦ 그 다음에만 §43 destructive gate 보고 → 별도 승인
```

### 7-5. "Phase A 단독 배포(Lecture 제외)" 경로 — 조사 완료 후 철회 (2026-09-24)

사용자가 "Phase A 를 반영할 때 Lecture Phase 2 를 함께 서빙하지 않는 방법" 을 조사하라고 지시해 **실증까지 마쳤고,
그 뒤 같은 사용자 판단으로 이 경로는 철회**됐다(불필요한 대기를 만든다 · 별도 배포용 코드가 필요하다).
조사 결과는 다음 번 같은 요구가 생길 때 재사용할 수 있으므로 사실만 남긴다.

**결론: 기술적으로 가능했다.** Phase A 커밋 11개는 Lecture 경로(`services/web-lecture` · `modules/lms` ·
`modules/lecture`)를 **0파일** 건드리므로 pre-Phase2 base 위로 그대로 옮겨진다.

| 실증 항목 | 결과 (로컬 전용 · push 0 · 시험 브랜치 삭제) |
|---|---|
| 구성 | 현재 API 서빙 SHA `f651885ed`(pre-Phase2) + 배포 게이트 2커밋 + Phase A 11커밋 cherry-pick → ref `8cdd0b2ac` |
| cherry-pick | **충돌 0** (11+2 커밋 전부) |
| Lecture Phase 2 `9a3b402b9` | **미포함** |
| 검증 | auth+guard **10 suites 117/117** · api-server tsc **0** · install/build:packages 성공 |
| 서빙 web SHA(`63c9b602f`) 대비 추가 변경 | web-neture **2파일뿐** |

**⚠️ 이 조사에서 찾은 위험(경로를 쓰지 않아도 유효한 사실):**
워크플로는 **dispatch 한 ref 의 파일로 실행**된다. pre-Phase2 base 에는 배포 게이트 2종
(`3c7083be5` fail-closed `DEPLOY_ENABLED` · `f2fdead81` environment 승인)이 **없으므로**, 게이트 커밋을
함께 얹지 않고 그 ref 로 배포하면 **게이트가 둘 다 무력화**된다. 과거 ref 로 배포하는 모든 작업에 적용되는 함정이다.

### 7-6. 확정된 배포 계획 (사용자 지시 2026-09-24 · 전달 경유)

- 배포 대상 = **Phase A 를 main 에 병합한 직후의 최종 main SHA 하나**. 이 배포에는 **Lecture Phase 2 도 함께 운영에 올라간다**
  (전제: LMS 데이터가 비어 있고 Lecture 트랙이 재판정 `MAIN_RUNTIME_SAFE_FOR_GENERAL_DEPLOY = YES(조건부)` 를 기록).
  rekey·이관은 배포 조건이 아니다.
- 배포 창: **다른 main push 중지** → `DEPLOY_ENABLED` 개방(사용자) → production environment 승인 →
  대상 SHA 의 API · 필요한 Web · Admin 배포.
- **API migration 결과가 기대(`INCREMENTAL_EXECUTED=0`)와 다르면 중지.**
- 새 revision 과 현재 트래픽 확인 → **명시적 `update-traffic` 으로 전환** → 즉시 smoke
  (Lecture 빈 목록 · 인증 · Password Phase A 경로).
- 실패 시 **기존 revision 으로 트래픽 되돌리고 게이트를 닫는다**.
- **§43 파괴적 migration 은 포함하지 않는다.**

실행 전 실측(타 세션 확인 + 본 세션 확인 일치):
- 대상 SHA 에 **컨테이너 이미지가 없다** — 13:21:59Z 이후 배포는 게이트로 job 전체 skip(빌드 0).
  따라서 배포 창은 build → migration job → deploy 전 과정이 필요하다.
- 트래픽은 6축 모두 특정 revision 에 **pin** 되어 있어 새 revision 은 배포돼도 **0%** 로 남는다.
  전환·롤백 모두 명시적 `update-traffic` 이며, 이 pin 이 사실상 안전장치다.
  현재 서빙: `o4o-core-api-03746-qlz` · `lecture-web-00011-drs` · `kpa-society-web-01993-6z9` ·
  `k-cosmetics-web-01161-lw5` · `pharmacy-hub-web-00251-49n` · `o4o-admin-dashboard-01305-z8l`.

**본 세션의 병합 승인 상태: 대기.** 피어 세션이 사용자 발언을 전달했으나(두 차례), 피어 메시지는 본 세션의
보류 중 승인을 대신하지 못한다 — 피어 자신도 같은 판단을 확인했다. 사용자 확인 한 줄을 받으면 즉시
`origin/main` 재동기화 → 병합 → 최종 SHA·CI 보고 순으로 진행한다. 그때까지 main 무접촉 ·
`DEPLOY_ENABLED` 무접촉 · 트래픽 전환 0.

### 7-7. 병합 후 main CI red — 원인·수정·검증 범위 정정 (2026-09-24)

**사실:** 병합 커밋 `0af9db301` 의 **CI Pipeline 이 failure** 였다(run `35936532173`). 배포는 일어나지 않았다 —
Deploy 3종은 workflow 결과가 success 여도 `DEPLOY_ENABLED=false` 게이트로 job 전체가 skip 돼 **revision 생성 0**,
운영은 여전히 pre-Phase-A 코드를 서빙했다(실측: `/auth/login` `/auth/register` `/auth/forgot-password` 모두 **400**
= route 생존 · neture·kpa-society·pharmacyhub 번들에 `type="password"`·`비밀번호 찾기` 잔존 · admin 만 이미 Google 전용).

**실패 5건 — 전부 Phase A 여파(런타임 결함 0)**

| # | 실패 | 원인 | 수정 |
|---|---|---|---|
| 1 | Code Quality · TS6133 | `services/web-pharmacy-hub/src/lib/api/pharmacyHubAccount.ts` 의 미사용 `SERVICE_KEY` import (password 변경 함수 삭제 잔재) | import 1줄 제거 |
| 2 | `database-migration-ownership-startup-health-final-closure.spec` dangling | `apps/api-server/package.json` 의 `"create-admin": npx tsx src/scripts/create-admin-user.ts` 가 **삭제된 파일** 참조 | script 항목 제거 |
| 3 | `legacy-partner-runtime-retirement.spec` ENOENT | 삭제된 `auth-register.controller.ts` 를 읽어 `NETURE_ALLOWED_SIGNUP_ROLES` 확인 | 가드를 **살아 있는 경로**로 갱신 — password 회원가입 controller **부재** + `HandoffController.joinService` 가 partner 를 모른다 |
| 4 | `pharmacy-hub-member-model-contract.spec` ENOENT | `SIGNUP_WRITE_PATHS` 가 같은 삭제 파일 포함 | 살아남은 `PharmacyHubJoinController.ts` 1곳으로 정정(사유 주석) |
| 5 | `serviceCredentialLifecycle.test` 4케이스 | hard delete 의 credential 동반 폐기를 기대 — Phase A 가 **의도적으로 은퇴**(STEP H1b · orphan 문제는 password 축 문제였고 축이 사라져 재현 조건 없음) | 계약을 **지우지 않고 뒤집어 고정**: "membership 은 삭제 · credential write **0**" · 마지막 케이스를 `password 축 부활 감지` 로 전환 · 헤더에 구 계약→은퇴 사유→Phase B 경위 기록 |

**본 세션 실책(기록):** 브랜치에 **CI 를 한 번도 돌리지 않았고**, 검증을 auth 범위 jest(`src/services/auth` ·
`src/modules/auth` + 신규 guard)와 프런트 일부 tsc 로 좁혀 놓고 `READY_FOR_PHASE_A_DEPLOY` 를 보고했다.
**전체 API jest 와 `pnpm run type-check:frontend`(web-pharmacy-hub·web-store 포함)를 돌리지 않은 것이 직접 원인**이다.
배포 담당 세션도 병합 전에 "브랜치 CI 이력 0" 을 확인하지 않았음을 자기 CHECK 에 남기기로 했다.
재발 방지 합의: **main 반영 전 PR 로 CI 를 한 번 통과시키는 것을 기본값**으로 한다(이번 수정도 PR 경유).

**추가 실패 1건 (PR #226 CI 에서 드러남 · 같은 계열):** `packages/auth-react/src/__tests__/useServiceAuth.test.tsx` 6 test —
Phase A 가 훅 표면에서 password `login` 을 은퇴시켰는데 vitest 가 그것을 계속 검사했다(앞선 tsc 실패가 job 을 먼저
죽여 가려져 있었다). 같은 원칙으로 처리: ① `login` **부재 자체를 계약**으로 고정(부활 감지) + 로그인 진입이
Google 둘뿐임을 고정 ② 살아 있어야 하는 계약(`SERVICE_NOT_MEMBER` 가입 안내 분기 · 429 rate-limit ·
네트워크 오류 구분)은 **Google 경로(`loginWithGoogle`)로 이전** ③ `INVALID_CREDENTIALS` 는 password 축 소멸로
발생 자체가 없어져 제거. → auth-react **64/64 PASS**.
**본 세션 실책 2차:** auth-react vitest 도 재실행하지 않았다(브랜치 WIP 커밋이 `useServiceAuth.ts` 를 바꿨는데도).
이후 CI 가 돌리는 **vitest 8종 전부**를 검증 범위에 포함한다(아래).

**수정 후 검증(본 세션 · 2026-09-24):** 문제 4 suite **92/92 PASS** · **전체 API jest `--maxWorkers=1`(heap 6GB) → 347 suites / 5,965 tests PASS · 실패 0**(4 suite·32 test skipped) · `pnpm run type-check:frontend` **OK**(TS6133 해소) · `apps/api-server tsc --noEmit` **0** · **vitest 9종 전부 PASS**(auth-react 64/64 · ui · auth-utils ·
store-ui-core 8 · operator-core-ui 4 · shared-space-ui 8 · auth-client 2 · web-neture 20 · web-kpa-society 2).
역할 분담: 본 세션은 **브랜치 push 만**, PR 생성·CI·merge 는 배포 담당 세션(main freeze 보유).

### 7-8. 배포 후 negative 검증 대상 변경 (2026-09-24 실측)

운영 `users` 가 **2 → 1** 로 줄었다. 남은 계정은 관리자(`cfd2a5e7…` · Google 연결 1 · roles 11 · creds 5)이고
**테스트 계정 `renagang21`(`f707c74e…`)이 삭제**됐다(본 세션 write 0 · 다른 경로에서 삭제). 그 결과:

- 기존 smoke 항목 "테스트 계정으로 admin 접근 차단" 은 **대상 부재**로 실행 불가 → 배포 후 negative 검증을
  ① 미인증 요청의 401/403 · ② 가짜 Google idToken 의 `401 GOOGLE_ID_TOKEN_INVALID` · ③ 은퇴 endpoint 404 로 대체한다.
- `service_credentials` 5행 · `password_reset_tokens` 5행은 모두 관리자 소유이며 `users.password` non-null 은 **0**이다
  (§43 gate 보고에 쓸 최신 count).

### 7-9. Phase A 운영 반영 (2026-09-24 · 통제된 배포 창)

배포 실행은 배포 담당 세션이 했고(같은 창에서 Lecture Phase 2 동반), **본 세션은 독립 검증만** 했다
(본 세션 배포 실행 0 · `DEPLOY_ENABLED` 무접촉 · 트래픽 전환 0 · main push 0).

| 항목 | 실측(본 세션) |
|---|---|
| 배포 SHA | **`7a44a97bc`**(tag `deploy/2026-09-24-phase-a`) |
| 서빙 revision | `o4o-core-api-03749-9p8` · `lecture-web-00015-gk9` · `kpa-society-web-01997-d7x` · `k-cosmetics-web-01165-wzj` · `pharmacy-hub-web-00255-qw8` · `o4o-admin-dashboard-01309-hrs`(명시적 전환) · `neture-web-01656-vnf` · `store-web-00016-bvj`(pin 없어 자동 추종) — 전부 **100%** |
| `DEPLOY_ENABLED` | 창 종료 후 **`false` 복귀**(03:15:17Z) |
| migration | 2회 모두 **`INCREMENTAL_EXECUTED = 0`** · PRE/POST assertion PASS · `LEGACY_HISTORY_FINGERPRINT = MATCH` · **스키마 변화 0** |
| 은퇴 endpoint(본 세션 curl) | `/auth/login` · `/auth/register` · `/auth/signup` · `/auth/check-email` · `/auth/forgot-password` · `/auth/reset-password` · `/auth/find-id` · `/auth/google/link` · `/auth/google/link/status` → **전부 404** |
| 서빙 번들 | `type="password"` **0**(배포 담당 세션 전수 — entry + lazy chunk 74) |
| Google 경로 | `/auth/google/config` 200(enabled) · `google/login` 가짜 idToken → 401 `GOOGLE_ID_TOKEN_INVALID` · `google/signup` → 400(consents 필수) |
| 가입 flow | `/pharmacy-hub/join` 200 · `POST /pharmacy-hub/join` 401 · KPA `/register`·`/join`·`/branch/join` 200 · 해당 번들 password 입력 0 |

**기대와 달랐던 2건 — 본 세션 재측정으로 판정**

1. `POST /auth/google/bootstrap-admin` — 빈 body 로는 **400**(DTO 검증이 먼저). 형식이 맞는 body 로는
   **404 `GOOGLE_ADMIN_BOOTSTRAP_DISABLED`**(재측정 확인). 즉 **내 E2E spec 의 404 기대는 유효**하며,
   "빈 body 400" 을 route 생존으로 읽지 않도록 spec 에 근거 주석을 추가했다.
2. `PUT /users/password` — **401**. 대조 프로브(`/users/me/profile` · `/users/__does_not_exist__`)도 전부 401 이라
   **401 은 은퇴 근거가 못 된다**(라우터 수준 `requireAuth`). 내 E2E spec 이 이 경로를 404 목록에 넣은 것은 **오류** —
   목록에서 빼고, "401 이며 임의 경로와 구분되지 않는다" 를 명시 고정하는 케이스로 교체했다.
   소스 수준 부재는 정적 guard P2 가 본다.

**Phase A 정리 누락 2건(지적 접수 · 본 세션 수정)**

- `packages/auth-utils/src/errorMessages.ts` 의 `INVALID_CREDENTIALS → '비밀번호가 올바르지 않습니다.'` 제거
  (`packages/error-handling` 은 이미 제거됐던 **대칭 누락**). 6개 서비스 번들에 실려 나가던 문구가 사라진다.
  `errorMessages.test.ts` 는 삭제 대신 **부활 감지 계약**으로 전환(매핑 부재 + 전체 메시지에 "비밀번호" 0 + 미지 코드 fallback).
- `securityDescription` 3곳을 Google 전용 문구로 정정 — pharmacy-hub `MyProfilePage`("Pharmacy-Hub 로그인 수단 — Google 계정") ·
  kpa-society `MySettingsPage`("KPA 로그인 수단 — Google 계정") · k-cosmetics `MySettingsPage`("로그인 수단 — Google 계정").
  ※ `AccountSecuritySettings` 의 `onChangePassword` 는 **이미 prop 자체가 없고 주석 언급만** 남아 있었다(지적 일부 정정).

**NOT VERIFIED (PASS 로 쓰지 않는다):** Google 전용이라 스크립트로 세션을 만들 수 없고 사용 가능한 테스트 계정도 없어
**인증 후 E2E(로그인 → 세션 유지 → 가입 제출 → 로그아웃)는 미검증**이다. 실계정 확인이 필요하면 Google 테스트 계정
재생성이 선행돼야 한다(본 WO 는 계정을 만들지 않는다). 상세 배포 기록은 Lecture CHECK §23.

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
| 최신 main 동기화 재검증 (2026-09-24 · `fc2a2ca38` → merge `195798f6c`) | 충돌 **0** · `pnpm install --frozen-lockfile` · `build:packages` 성공 · auth 테스트+guard **10 suites 117/117** · api-server tsc **0** · admin-dashboard·web-neture·web-account·web-kpa-society tsc 각 **0** |
| E2E 잠금 위험 소멸 | 09-23 사고(E2E 가 운영자 `loginAttempts` 누적 → 30분 잠금)는 **구조적으로 재발 불가** — 스위트가 password 자격증명을 전혀 쓰지 않고(§5 CI 재정의 · workflow 에 소비 0 회귀 검사), 로그인 시도 자체를 하지 않는다 |

## 9. 남은 작업 (재개 시)

1. ~~Lecture main 처분 확정 대기~~ → **해제(2026-09-24 · §7-1)**
2. `origin/main` 재동기화 + CI 전체 재검증 — 2026-09-24 `3fbed5f7c` 로 수행(충돌 0 · 아래 §8 재검증 완료)
3. Phase A merge → deploy(api · web · admin) → old revision traffic 0 확인
4. production smoke: 은퇴 경로 404 · 가입 flow · 번들 password 0(§7-9) + **Google 실브라우저 smoke PASS**(§10-6 · 2026-09-24) — **완료**
5. **§43 DESTRUCTIVE GATE** — census · 제거안 · rollback 한계 **보고 완료(§10 · 2026-09-24 · production write 0)** → **사용자 승인 대기** → Phase B(코드 선행 → incremental migration → 격리 PG15 fingerprint → expected-schema-states)
6. Smoke A/B(operator invitation WO) 인계 항목 정리

---

## 10. §43 DESTRUCTIVE GATE — read-only census · Phase B 제거안 (2026-09-24)

**PRODUCTION WRITE = 0.** 이 절의 모든 수치는 Cloud SQL Auth Proxy v2 를 통한 **SELECT 전용** 조회다.
DELETE · DROP · migration 실행은 사용자 승인 전까지 하지 않았고, 이 절은 승인 판단 자료다.

### 10-1. 데이터 census (production · 2026-09-24 03:57Z~04:06Z · Cloud SQL Auth Proxy v2 · SELECT 전용)

| 대상 | 실측 |
|---|---|
| `users` | total **1** · `password` non-null **0** · `reset_password_token` non-null **0** · `reset_password_expires` non-null **0** · `loginAttempts` ≠0 **0** · `lockedUntil` non-null **0** |
| `service_credentials` | **5행 / distinct user 1** · service_key 각 1행(`k-cosmetics` · `kpa-branch` · `kpa-society` · `neture` · `pharmacy-hub`) · orphan(소유자 없는 행) **0** · 최신 갱신 2026-09-17 |
| `password_reset_tokens` | **5행** · used 4 / unused 1 · **expired 5 / unexpired 0** · distinct user 1 · service_key `kpa-society` 3 · `neture` 1 · NULL 1 · 최신 2026-09-21 |
| `login_attempts` (테이블) | **존재 · 0행** (컬럼: id · email · ipAddress · userAgent · success · failureReason · createdAt) |
| `linked_accounts` | `google` **1행 / 1 user** (verified · primary) · **legacy/기타 provider 0행** |
| `refresh_tokens` · `email_verification_tokens` · `handoff_tokens` | 각 **0행** |
| 관리자 identity | `cfd2a5e7…` · status `active` · `isActive` true · role_assignments **11**(전부 `is_active` · 만료 없음 · `platform:super_admin` 포함) · service_memberships **5**(전부 `active`) |
| 의존 객체 | password 축을 참조하는 **view 0** · `users` 의 password/lockout 컬럼 위 **index 0** · `users` **trigger 0** · FK 는 두 테이블 → `users` 방향 **2건**(자식 쪽이므로 다른 의존자 없음) |
| 적용된 migration | `typeorm_migrations` 최신 = `CreateHospitalDeviceTables1790125390245` (id 689) = manifest 의 incremental #4 |

**census 로 새로 드러난 것 3건** (원래 후보 목록에 없었다)

1. `users.reset_password_token` · `users.reset_password_expires` **컬럼이 실재**한다 — 후보에 빠져 있었다.
2. `google-auth.service.ts:419-427` 이 Google 로그인 성공마다 `loginAttempts: 0` · `lockedUntil: null` 을
   **UPDATE 한다.** 이 두 컬럼을 먼저 드롭하면 **Google 로그인이 깨진다** → 코드 선행, 컬럼 후행.
3. `packages/auth-core/src/manifest.ts` 가 `login_attempts` 를 **소유 테이블로 선언한 FROZEN Core**(§3·F10)이고
   `maxLoginAttempts` · `lockoutDurationMinutes` 정책 기본값도 여기 있다 → Core 변경은 **별도 명시 승인**.

### 10-2. 코드 census (git-tracked 런타임 소스 4,720개 · comment 제거 후 판정)

판정 대상에서 제외: `dist` · `build` · `node_modules` · `__tests__` · `*.spec/*.test` · `*.d.ts` ·
`src/database/migrations/`(frozen historical) · `e2e/` · `docs/`.
**dist 를 근거로 판정하지 않는다** — 동료 세션이 추적되지 않은 stale `dist/*.d.ts` 로 은퇴를 오판한 사례(2026-09-24)가 있다.

| 축 | 결과 | 남은 hit 의 정체 |
|---|---|---|
| `users.password` runtime **reader** | **0** | `media-catalog.service.ts:63` 의 `u.password` 는 URL 객체 파싱(오탐) |
| `users.password` runtime **writer** | **1 (NULL 기록만)** | `google-auth.service.ts:284` 의 `password: null` — 신규 user 생성 시 명시적 NULL. 컬럼 드롭 시 이 줄도 제거 |
| `service_credentials` reader/writer | **0 / 0** | entity 선언 · `entities.ts` 등록 · canonical baseline SQL 뿐. **repository 소비처 0** |
| password reset runtime consumer | **0** | entity · baseline · **sanitizer 3곳**(`admin-user-sanitizer` · `lms/sanitize-user` · `ForumControllerBase`)의 응답 차단 블랙리스트 |
| bcrypt / hashPassword / comparePassword | **0** | import 4건은 전부 **frozen historical migration** 파일 |
| password login frontend surface | **0** | — |
| forgot/reset frontend surface | **0 (살아 있는 화면)** | 5서비스 `App.tsx` 의 `Navigate to /login` **리다이렉트 스텁**뿐 |
| password 변경 admin/operator surface | **0** | `changePassword` · `currentPassword` · `ChangePasswordModal` 전부 0 |
| 남은 `type="password"` | **2 (인증 아님)** | k-cosmetics 매장 채널 **PIN** · Neture **SMTP 앱 비밀번호**. 정적 guard allowlist 항목 |

### 10-3. Phase B 제거안 — 항목별 판정

| 대상 | 판정 | 근거 · 제약 |
|---|---|---|
| `service_credentials` 테이블 | **DROP** | runtime 소비 0 · 5행 전부 관리자 1인 소유 · orphan 0 · 인증 경로에서 읽히지 않음 |
| `password_reset_tokens` 테이블 | **DROP** | runtime 소비 0 · 5행 전부 **expired** · 재설정 경로 은퇴 |
| `users.password` 컬럼 | **DROP** | non-null 0 · reader 0 · writer 는 NULL 기록 1줄뿐(같은 커밋에서 제거) |
| `users.reset_password_token` · `reset_password_expires` | **DROP** | non-null 0 · reader 0 (census 로 추가 발견) |
| `users.loginAttempts` · `users.lockedUntil` | **DROP (순서 제약)** | 값은 default 뿐이지만 `google-auth.service.ts` 가 매 로그인 **UPDATE** 한다 → **코드에서 먼저 제거한 뒤** 컬럼 드롭. 같은 배포에 묶되 migration 은 코드 뒤 |
| `login_attempts` 테이블 | **KEEP_WITH_REASON (이번 범위 밖)** | 0행이지만 **FROZEN `auth-core` manifest 소유 테이블**(§3·F10). Core 변경 승인이 선행돼야 한다 — 이번 WO 에 넣으면 Core Freeze 위반 |
| `ServiceCredential` · `PasswordResetToken` entity + `entities.ts` 등록 | **DROP** | repository 소비처 0 · `synchronize: false` 라 런타임 스키마 검증 없음 |
| `LoginAttempt` entity | **KEEP_WITH_REASON** | 위 테이블 판정과 동일(Core) |
| password 전용 service/repository | **ALREADY_ABSENT** | Phase A 에서 제거(`auth-login.service` · `passwordResetService` · `password-policy` · `admin-password-reset-scope`) |
| password 전용 DTO/type | **ALREADY_ABSENT** | `PasswordResetEmailData` 등 은퇴 주석만 남음 |
| password 전용 mail template | **DROP (dead asset)** | `apps/api-server/src/templates/email/password-reset.html` · `packages/mail-core/templates/email/password-reset.html` — **소비처 0** (sender·template service 모두 은퇴) |
| `mail.service.ts` 의 `password_changed` · `suspicious_login_attempts` 알림 타입 | **KEEP_WITH_REASON** | `sendSecurityAlert` 의 열거 값. 발송 경로는 없지만 제거는 mail-core 공용 계약 변경 → 별도 WO |
| `bcrypt` · `bcryptjs` · `@types/bcryptjs` dependency | **KEEP_WITH_REASON** | import 하는 4개 파일이 **frozen historical migration**(`historical-migrations.manifest.json` 544 entries, 집합 축소는 `--baseline-rollover` 로만 허용). dep 제거는 baseline rollover WO 소관 |
| `users.email` optional 화 | **범위 밖** | 사용자 지시로 이번 WO 제외 |
| role_assignments · service_memberships · `linked_accounts.google` · consent · business data | **불변** | 건드리지 않는다 |
| `SecurityAuditService` 의 `failedLoginAttempts` | **KEEP_WITH_REASON** | in-memory rate limit — DB 컬럼과 무관 |
| `canonical-schema-baseline.ts` | **편집하지 않는다** | 신규 DB 는 baseline 생성 → incremental drop 순으로 같은 최종 상태에 도달한다. 판정 기준은 `EXPECTED_SCHEMA_STATES[k]` |

### 10-4. 실행 레시피 (승인 시 · 아직 미실행)

1. **코드 먼저** — `google-auth.service.ts` 의 `loginAttempts`/`lockedUntil`/`password: null` write 제거 ·
   entity 2종 + `entities.ts` 등록 제거 · dead mail template 2개 삭제 · sanitizer 는 **유지**(과거 필드명 방어).
2. **incremental migration 1건** — `src/database/migrations/<epoch13>-<PascalName>.ts`,
   `epoch13 > 1790125390245`, class 명 = `name` 값. manifest 에 import + append.
3. **격리 PostgreSQL 15** 에서 baseline + incremental 전체를 순서대로 적용해 POST_MIGRATION fingerprint 획득 →
   `expected-schema-states.ts` 에 append (append-only · **live DB fingerprint 복사 금지**).
4. 같은 커밋에 `check-migration-contract.mjs` C22 통과 · ledger/agent spec 동반 갱신 · 정적 guard 갱신.
5. PR → CI 전체 통과 → 통제된 배포 창(사용자 승인 + `DEPLOY_ENABLED` + environment production).

### 10-5. Rollback 한계 (승인 전 반드시 읽을 항목)

- `DROP TABLE` · `DROP COLUMN` 은 **되돌려도 데이터가 돌아오지 않는다.** 구조는 down migration 으로 복원 가능하지만
  `service_credentials` 5행의 **password hash 와 `password_reset_tokens` 5행은 영구 소실**이다.
- 그 소실이 의미하는 것: **비밀번호 로그인으로의 복귀 경로가 닫힌다.** 되살리려면 각 사용자가 Google 로 로그인한 뒤
  비밀번호를 **새로 설정**해야 한다(현재 계정은 1개이고 그 계정은 이미 `password` NULL 이므로 실질 손실은 0).
- 운영 DB 백업 시점 이전으로의 point-in-time 복구는 **다른 테이블까지 함께 되돌린다** — 이번 변경만 선택적으로
  되돌리는 수단이 아니다.
- `login_attempts` 는 이번에 남기므로 lockout 관련 되돌림 여지는 유지된다.

### 10-6. Google production smoke — **PASS** (2026-09-24 04:38Z · 사용자 브라우저 + 서버측 실측)

브라우저 조작은 사용자가 수행하고(이 세션에 브라우저 자동화 도구 없음 · Google 이 자동 브라우저 로그인을 차단),
**identity 판정은 이 세션이 DB read-only 로** 했다. 화면 문자열은 판정 근거로 쓰지 않았다.

사용자 관측: `admin.neture.co.kr` → Google 로그인(`sohae2100@gmail.com`) → Admin 진입 →
**F5 세션 유지** → 로그아웃 → **동일 Google 계정 재로그인** 까지 오류 없이 완료.

서버측 실측 (기준선 = 2026-09-22 12:59:20)

| 검증 항목 | 실측 | 판정 |
|---|---|---|
| Google `sub` 가 **기존** admin `users.id` 에 연결 | `linked_accounts(provider='google', providerId=117391***)` → `users.id cfd2a5e7…` · verified · primary · `linkedAt` 2026-09-22(신규 생성 아님) | PASS |
| `users.lastLoginAt` 전진 | 2026-09-22 12:59:20.598 → **2026-09-24 04:38:09.130** | PASS |
| google link `lastUsedAt` 전진 | 2026-09-22 12:59:20.605 → **2026-09-24 04:38:09.134** | PASS |
| `users.email` 이 인증 식별자가 **아님** | `linked_accounts.email` 이 **NULL** — 연결 행은 `provider` + `providerId(sub)` 만 보유한다. 즉 조회 키에 email 이 **들어갈 수 없다**. `users.email`(프로필/내부 이메일)은 로그인 계정과 **다른 값**이며 그대로 유지됐다 | PASS |
| `platform:super_admin` active 유지 | `role_assignments` 11행 **전부 `is_active`** · `platform:super_admin` active 1 · `assigned_at` 2026-05-15(재발급 아님) | PASS |
| roles 11 / memberships 5 불변 | 11 / 5(전부 `active`) — smoke 전후 동일 | PASS |
| 새 계정 생성 0 | `users` total **1** · distinct email 1 | PASS |
| gate 수치 불변(내 write 0) | `service_credentials` 5 · `password_reset_tokens` 5 · `login_attempts` 0 · `users.password` non-null 0 · `refresh_tokens` 0 | PASS |

`lastLoginAt` / `lastUsedAt` 두 값의 전진은 **애플리케이션이 로그인 처리 중 수행한 write** 이며,
이 세션의 write 가 아니다(이 세션은 SELECT 만 실행했다).

**`GOOGLE_PRODUCTION_SMOKE = PASS`.** 남은 미검증은 Invitation Smoke B / Assignment Smoke A 뿐이고
이 둘은 이 WO 와 별개로 계속 `PENDING_USER_ACTION` 이다.

#### 10-6a. 화면 표시 2건 — 권한 정본이 아니며 이 WO 범위 밖(보고만)

사용자 화면에 `역할: kpa-branch:operator | SSO 인증` 과 프로필 이메일 `ren***@gmail.com` 이 보였다. 조사 결과:

1. **원인은 정렬 없는 조회다.** `AdminHeader.tsx:153` 이 `user?.role` 을 출력하고, 그 값은
   `auth-context.helper.ts:82` / `auth-account.controller.ts:56` 의 **`roles[0]`** 이다.
   `roles` 는 `role-assignment.service.ts:42` 의 `repository.find({ where })` — **`ORDER BY` 가 없다**.
   PostgreSQL 은 순서를 보장하지 않으므로 `roles[0]` 은 **비결정적**이고, 11개 보유 role 중 임의의 하나가 찍힌다.
2. **권한 판정은 이 값을 쓰지 않는다.** 실측: 백엔드 guard 는 `roles.includes('platform:super_admin')` 형태의
   **배열 판정**이고, admin-dashboard 진입은 `requiredRoles={['platform:super_admin']}` 이다.
   `user.role` 스칼라를 비교하는 인가 코드는 **0건**이다(검색 결과 없음). 따라서 **표시 문제이며 권한 결함이 아니다.**
3. 프로필 이메일 표시도 같은 성격이다 — `users.email` 은 인증에 관여하지 않지만(위 표),
   화면에는 그것만 보여 "어느 Google 계정으로 들어왔는지" 를 알 수 없다.

둘 다 **이 WO 범위 밖**이므로 고치지 않고 보고한다(§16-2 · 범위 외 수정 금지).
별도 WO 제안: ① `roles[0]` 대표값을 결정적으로 만들 것 — 정렬 추가 또는 우선순위 규칙(`platform:super_admin` 우선).
② 계정 표시를 **"Google 로그인: … / 프로필 이메일: …"** 로 분리(`users.email` optional 화 판단과 함께).

#### 10-6b. smoke 전 기준선 (보존)

smoke 전에 확보한 기준선이다. 전진 비교의 근거이므로 갱신하지 않고 그대로 남긴다.

| 기준선 (2026-09-24 03:59Z 조회) | 값 |
|---|---|
| `users.lastLoginAt` | **2026-09-22 12:59:20.598** |
| `linked_accounts.lastUsedAt` (google) | **2026-09-22 12:59:20.605** |
| google `providerId`(sub) | `117391***` (마스킹) |
| `refresh_tokens` | 0행 |

사전 상태(조회): `admin.neture.co.kr` 200 · `/auth/google/config` `enabled:true` · `POST /auth/login` **404**.
두 타임스탬프는 실제로 전진했고 판정은 위 §10-6 표에 있다.

### 10-7. GATE 보고 (사용자 승인 대기)

```text
PASSWORD RETIREMENT DESTRUCTIVE GATE

Google production smoke = PASS  (2026-09-24 04:38Z · 사용자 브라우저 조작 + 서버측 DB 실측)
  evidence: google sub 117391*** -> users.id cfd2a5e7 (기존 id · 신규 생성 0)
            users.lastLoginAt   2026-09-22 12:59:20 -> 2026-09-24 04:38:09
            google lastUsedAt   2026-09-22 12:59:20 -> 2026-09-24 04:38:09
            linked_accounts.email IS NULL -> email 은 조회 키에 들어갈 수 없다
            platform:super_admin active 유지 · roles 11 / memberships 5 불변

users:
  total = 1
  password_non_null = 0
  reset_password_token_non_null = 0
  loginAttempts_nonzero = 0
  lockedUntil_non_null = 0

service_credentials:
  rows = 5
  users = 1
  by_service = k-cosmetics 1 / kpa-branch 1 / kpa-society 1 / neture 1 / pharmacy-hub 1
  orphan = 0

password_reset_tokens:
  total = 5
  used = 4
  unused = 1
  expired = 5   unexpired = 0

lockout/password auxiliary:
  users.loginAttempts / users.lockedUntil  = 컬럼 존재 · non-default 0
  users.reset_password_token / reset_password_expires = 컬럼 존재 · non-null 0  (census 로 추가 발견)
  login_attempts table = 존재 · 0 rows  (FROZEN auth-core 소유 → 이번 범위 밖)

linked_accounts:
  google = 1 (verified · primary)
  legacy = 0

Runtime readers = 0/0
Runtime writers = 1/1  (google-auth.service.ts 의 password:null · loginAttempts/lockedUntil reset — 코드 선행 제거 대상)
Frontend password surfaces = 0/0  (남은 type="password" 2곳은 매장 PIN · SMTP 앱 비밀번호)

Planned DROP/DELETE:
  DROP TABLE service_credentials            (5 rows 소실)
  DROP TABLE password_reset_tokens          (5 rows 소실 · 전부 expired)
  ALTER TABLE users DROP COLUMN password
  ALTER TABLE users DROP COLUMN reset_password_token
  ALTER TABLE users DROP COLUMN reset_password_expires
  ALTER TABLE users DROP COLUMN "loginAttempts"     (코드 선행 제거 필요)
  ALTER TABLE users DROP COLUMN "lockedUntil"       (코드 선행 제거 필요)
  DELETE 단독 실행은 하지 않는다 — DROP 에 포함된다

Preserved:
  login_attempts table            (FROZEN auth-core manifest 소유 · 별도 Core 승인 필요)
  linked_accounts (google)        · refresh_tokens · email_verification_tokens · handoff_tokens
  sanitizer 블랙리스트 3곳        (과거 필드명 방어 · 제거하면 재유입 시 무방비)
  bcrypt/bcryptjs dependency      (frozen historical migration 4파일이 import)
  users.email                     (optional 화는 범위 밖)
  canonical-schema-baseline.ts    (편집하지 않음 · incremental 로만 변경)

Expected unchanged:
  admin users.id           = cfd2a5e7… (변경·삭제 없음)
  platform:super_admin     = 유지
  role_assignments         = 11
  service_memberships      = 5 (전부 active)
  linked_accounts.google   = 1

Rollback limitation:
  DROP 은 구조만 복원 가능 · 데이터는 영구 소실(§10-5)
  password 로그인 복귀 경로가 닫힌다 (현 계정은 이미 password NULL → 실질 손실 0)
  point-in-time 복구는 다른 테이블까지 함께 되돌린다 — 선택적 복구 수단이 아니다

PRODUCTION WRITE = 0
PHASE B EXECUTION = WAITING_FOR_USER_APPROVAL
```

## 판정

`LEGACY PASSWORD AUTH RETIREMENT: PHASE_A_DEPLOYED / PHASE_B_PENDING_APPROVAL`

Phase A 는 **운영 반영까지 끝났다**(`7a44a97bc` · 2026-09-24 · §7-9). 런타임에서 password reader/writer/UI 0 ·
은퇴 endpoint 404 · 서빙 번들 password 입력 0 을 실측했고, 스키마는 **의도대로 무변화**다(migration 0).
**Google 실브라우저 smoke 는 PASS 로 닫혔다**(§10-6 · 2026-09-24 04:38Z · Google sub → 기존 admin `users.id` ·
두 타임스탬프 전진 · `platform:super_admin` 유지 · roles 11 / memberships 5 불변).
남은 것은 **Phase B/§43 하나**다 — census · 항목별 제거안 · 실행 레시피 · rollback 한계를 §10 에 보고했고
(**production write 0**) **사용자 승인 대기**다. 승인 전에는 DELETE · DROP · production migration 을 실행하지 않는다.
`login_attempts` 는 FROZEN `auth-core` 소유라 이번 범위에서 **제외**했다(Core 승인 선행).
범위 밖 보고 2건: `roles[0]` 대표 role 이 정렬 없는 조회라 **비결정적**(표시 전용 · 인가는 배열 판정) ·
로그인 Google 계정과 프로필 이메일이 화면에서 구분되지 않음(§10-6a).

문서 정합: 발견 2건(MYPAGE 매트릭스 password 2행 — 정정 완료 / USER-DOMAIN-SSOT 다이어그램 password 표기 — Phase B 로 이월) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(F10 Core Freeze 본문 갱신 여부 판단)
