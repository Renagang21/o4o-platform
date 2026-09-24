# CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1

> 작성일: 2026-09-23 · 상태: **`MERGED_TO_MAIN / AWAITING_CONTROLLED_DEPLOY`** — 배포 대상 SHA **`7a44a97bc`** (§7-2 · CI 수정 2라운드 반영 · 2026-09-24)
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
4. production smoke: Google 로그인(관리자 · 테스트 계정) · 서비스 가입 flow 회귀 · password 경로 404/410 확인
5. **§43 DESTRUCTIVE GATE** — row count · DROP 대상 · rollback 한계 보고 → 사용자 승인 → Phase B(migration · entity · manifest/expected schema)
6. Smoke A/B(operator invitation WO) 인계 항목 정리

---

## 판정

`LEGACY PASSWORD AUTH RETIREMENT: READY_FOR_PHASE_A_DEPLOY / AWAITING_CONTROLLED_DEPLOY_WINDOW`

Phase A 런타임 컷오버 · 테스트 재정의 · 정적 guard · CI/E2E Google-only 재정의 · 문서 정합까지 완료했다.
남은 것은 **통제된 배포 창**(사용자 승인 + `DEPLOY_ENABLED` + environment production 승인)뿐이며,
Lecture 사유의 차단은 해제됐다(§7-1). Phase B(스키마 파괴적 제거)는 **미착수 · 별도 판정**이다(§7-3).

문서 정합: 발견 2건(MYPAGE 매트릭스 password 2행 — 정정 완료 / USER-DOMAIN-SSOT 다이어그램 password 표기 — Phase B 로 이월) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(F10 Core Freeze 본문 갱신 여부 판단)
