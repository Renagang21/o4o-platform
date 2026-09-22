# CHECK — WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1

> **판정:** `GOOGLE IDENTITY OPERATOR EXPLICIT LINK: IN PROGRESS — 구현·배포 완료 · 운영 smoke(§10) 사용자 대기`
> **일자:** 2026-09-18 · **WO:** [`WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1`](../work-orders/WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1.md)
> **용어:** 운영자 계정 = `sohae2100` · 테스트 계정 = `renagang21`(Google-only)
> **전제 정정(2026-09-21 · 사용자 확정):** "운영자 계정 = `sohae2100`" 은 **현재 `platform:super_admin` 을 보유한 기존 `users.id`** 를 뜻한다. 이 user 의 관리자용 내부 email 은 **`renariver21@gmail.com`** 으로 정정됐다(§3-A). 본문의 `sohae2100`·`cfd2a5e7` 은 모두 이 **동일 users.id** 다. Google Identity 는 email 과 별개(연결은 검증된 `sub` 기준 · email 일치 불요). 전환기 정책 전문은 [WO 상단 "전제 정정"](../work-orders/WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1.md).

---

## 1. 구현 (커밋 `35548dd65`)

| 계층 | 내용 |
|---|---|
| 서버 | [google-auth.service.ts](../../apps/api-server/src/services/auth/google-auth.service.ts) `link()` — 단일 트랜잭션: 세션 user(`req.user.id`) 조회 → `users.password` bcrypt 재인증(`comparePassword`, service_credentials 미사용) → `verifyGoogleIdToken` → 같은 user 의 google row 조회 → 같은 sub 면 멱등(`alreadyLinked:true`) / 다른 sub 면 `409 GOOGLE_ACCOUNT_ALREADY_LINKED` → sub 가 다른 user 에 있으면 `409 GOOGLE_IDENTITY_IN_USE` → INSERT(`userId·provider·providerId·isVerified·isPrimary·linkedAt·lastUsedAt` 만) · unique race 도 `GOOGLE_IDENTITY_IN_USE`. password NULL → `400 PASSWORD_NOT_SET` · 불일치 → `401 INVALID_PASSWORD`(loginAttempts 불변). `account_activities` `action='link_google'`, email NULL. `getLinkStatus()` → `{ linked, passwordSet }` |
| route/DTO | `POST /api/v1/auth/google/link` (`requireAuth` + `validateDto(GoogleLinkRequestDto{idToken,currentPassword})`) · `GET /api/v1/auth/google/link/status` (`requireAuth`). userId/email/sub/providerId/serviceKey 는 400 |
| 패키지 | `@o4o/auth-client` `linkGoogle(idToken,currentPassword)` · `getGoogleLinkStatus()`(실패 null) · 타입 `GoogleLinkStatus/GoogleLinkResult`. `@o4o/auth-react` [`<GoogleAccountLink />`](../../packages/auth-react/src/GoogleAccountLink.tsx) — status → (미연결·passwordSet) [Google 계정 연결] → 현재 비밀번호 → GIS 버튼 → `linkGoogle` → "Google 계정 연결됨 ✓". Google-only(passwordSet=false)는 연결됨만(비밀번호 UI 0). 실패 시 비밀번호 state 비움 · INVALID_PASSWORD 는 재입력, 그 외는 처음 상태 |
| 화면 | Neture [`/mypage/settings`](../../services/web-neture/src/pages/mypage/MySettingsPage.tsx) "로그인 방법" `SettingsSection` 카드. Google email 표시 0 |

## 2. 검증

| 항목 | 결과 |
|---|---|
| jest `googleAuthService.test.ts` link 10건(Case A/B/C/D/D-race · INVALID_PASSWORD · PASSWORD_NOT_SET · token invalid · INVALID_USER · getLinkStatus) + `googleAuthDto.test.ts` link 1건 | PASS — auth 모듈·서비스 11 suites **105/105** |
| AST guard `googleIdentityNoEmailMergeGuard.test.ts` G1~G7(새 `link()` 는 `google` 파일 문맥 → where.email 0) | PASS |
| vitest `GoogleAccountLink.test.tsx` 11건(hidden/linked/google-only/idle · 흐름 · 빈 비밀번호 · disabled · 401 · 409 · 멱등 · 취소) | PASS — auth-react **76/76** |
| `apps/api-server` tsc(ai-core dist 재빌드 후) · `web-neture` tsc + vite build · eslint 변경 파일(오류 0 · 기존 warning 2) | PASS |
| CI (`35548dd65`) | CI Pipeline · Deploy API · Deploy Web · Deploy Admin · CodeQL **success**. `E2E — Auth Runtime Regression` **failure** — 09-17 05:15Z(`44101be12`) 이후 8회 연속 failure(legacy password E2E 계정이 WO-2C reset 으로 부재, "로그인 후 accessToken 미저장") = 이번 변경과 무관한 기존 red · 범위 밖(보고만) |
| 배포 | API `o4o-core-api-03713-hf6` — `GET /auth/google/link/status` 미인증 **401** · `POST /auth/google/link` 미인증 **401** · `config enabled=true` 유지. Web `neture-web-01629-fnw`(14:24Z) 번들에 `google/link/status` 포함 확인 |

## 3-A. 관리자 내부 email 정정 (2026-09-21 · 사용자 명시 승인 · production write A)

전환기 정책 확정에 따라 Google 연결(B) 전에 **기존 super_admin user 1행의 `users.email` 만** `renariver21@gmail.com` 으로 정정했다. 실행은 psql 단일 트랜잭션(대상 = handle `sohae2100` AND `platform:super_admin` 보유 · 대상 행 수 1 이 아니면 UPDATE 0 · `ON_ERROR_STOP`).

| 단계 | 결과 |
|---|---|
| 사전(read-only) | users 2 · 대상 1행 · 새 email 중복 users 0 / linked_accounts 0 · roles 11 / creds 5 / memb 5 · password set · loginAttempts 1 · 잠금 없음 · Google 연결 0 · `users.email` unique index 2개 존재 |
| UPDATE | `UPDATE users SET email='renariver21@gmail.com', "updatedAt"=now() WHERE id IN (대상)` → **`UPDATE 1`** · COMMIT |
| 사후 | 새 email 행 1 · 옛 handle 행 0 · **users.id 동일**(1) · users 2 · roles **11** · `platform:super_admin` 1 · creds **5** · memb **5** · password set 유지 · 테스트 계정(`renagang21` · password NULL) 무접촉 · linked_accounts 1(불변) |

코드 근거: 로그인 조회는 `users.email` → `user.id` → `service_credentials(user_id, service_key)` 순([auth-login.service.ts:131-199](../../apps/api-server/src/services/auth/auth-login.service.ts)) 이라 email 변경 후에도 기존 credential/password 층이 그대로 이어진다. `service_credentials` 에는 email 컬럼이 없다(`user_id`·`service_key`·`password_hash`).

**이후 로그인 식별자 = `renariver21@gmail.com`.** 비밀번호 층은 변경 없음 — `neture.co.kr`(serviceKey=neture · credential 존재) = `service_credentials(neture)` 해시, `/auth/google/link` currentPassword = `users.password`. (`admin.neture.co.kr` 도 `users.password` 라고 적었으나 **오기** — 당시 Admin Login.tsx 는 `serviceKey:'neture'` 를 보내 credential 층을 검증했다. §3-B 에서 제거해 이제 `users.password` 가 맞다.) 09-21 04:59Z admin forgot-password 로 `users.password` 만 재설정됐고(토큰 1건 사용 완료 · service_key NULL) `service_credentials` 는 정렬하지 않는다(사용자 결정: 추가 reset·정렬 중단). §3 의 "주의(WO §3)" 단락의 `PUT /users/password` 정렬 제안은 **폐기**.

## 3-B. B smoke 결함 — Admin 인증 계약 불일치 정정 (2026-09-21 · WO §8-A · 사용자 지시)

**현상:** `admin.neture.co.kr` 에서 `renariver21@gmail.com` + 09-21 재설정 `users.password` 로 로그인 → "비밀번호가 올바르지 않습니다". 같은 화면 Google 버튼은 연결 전이라 당연히 불가(관리자 users.id 에 Google sub 없음 → 어느 user 인지 찾을 수 없음).

**원인(코드 확인):** [`Login.tsx`](../../apps/admin-dashboard/src/pages/auth/Login.tsx) 이메일 로그인이 `login({ email, password, serviceKey: 'neture' })` 로 호출 → 서버 dual-read([`auth-login.service.ts`](../../apps/api-server/src/services/auth/auth-login.service.ts))는 serviceKey + credential 존재 시 **`service_credentials(neture)` 해시**를 검증하고 `users.password` 는 보지 않는다. 사용자 입력 오류가 아니라 Admin(platform surface)이 Neture 서비스 credential 을 인증 근거로 쓰던 계약 불일치. 추가 로그인 시도 · password 재설정 · credential 정렬은 하지 않았다(재시도 금지 원칙).

**정정(프론트만 · 서버 변경 0 · DB 변경 0):**

| 변경 | 내용 |
|---|---|
| `apps/admin-dashboard/src/pages/auth/Login.tsx` | 이메일 로그인 `serviceKey:'neture'` 제거 → 서버 V1 fallback = `users.password`. Google 로그인 경로는 불변 |
| `apps/admin-dashboard/src/pages/settings/MyAccountSettings.tsx` (신규) | 내 계정 › 로그인 방법 — 기존 `<GoogleAccountLink />`(`@o4o/auth-react`) 재사용 · `authClient.getGoogleAuthConfig/getGoogleLinkStatus/linkGoogle` 그대로. Admin 전용 연결 로직 0 |
| `Settings.tsx` · `AdminHeader.tsx` | 탭 `/settings/my-account` 추가 · 헤더 드롭다운 "계정 설정" → 해당 탭 이동(기존 빈 핸들러) |
| `apps/admin-dashboard/package.json` · `pnpm-lock.yaml` | `@o4o/auth-react: workspace:*` 1줄(importer link 만 · 사용자 승인). auth-react 는 auth-client(기존 의존)+React 만 필요 · source 해석 패키지라 빌드 단계 추가 0 · Dockerfile 변경 0 |

검증: admin-dashboard `tsc --noEmit` 0 에러 · `vite build` 성공. 서버 API · `service_credentials` · role/membership · users · 테스트 계정 무접촉.

## 3-C. 로그인 잠금(lockout) 계약 결함 — read-only 원인 확정 + 정정 (2026-09-22 · WO §8-B · 사용자 지시)

**현상:** §3-B 배포(9/21 07:08Z 완료) 후 B smoke 1회차 — 사용자가 admin 에서 로그인 1회 → "비밀번호가 올바르지 않습니다", 곧이어 1회 더 → 계정 잠금.

**read-only 실측(production · 2026-09-22 05:43Z 기준 · 개인정보 실값 없음):**

- 관리자 행(`cfd2a5e7…`): `loginAttempts = 5` · `lockedUntil = 2026-09-22 05:01:54Z` · **lock_active = false(이미 만료)** · `lastLoginAt = 2026-09-21 01:07:09Z` · status active.
- 9/21 reset 이후 `login_email` activity ↔ Cloud Run `/auth/login` 요청 로그 **1:1 대조(전 건 일치 · 누락/중복 0)**:

| # | 시각(UTC) | reason | Origin(Referer) | User-Agent | 비고 |
|---|---|---|---|---|---|
| 0 | 09-21 01:05:29 / 01:07:09 | account_not_found → **success** | (없음) | Python-urllib | reset 검증 스크립트(다른 세션 · 성공으로 attempts 0) |
| 1 | 09-21 05:01:44 | invalid_password | `neture.co.kr` | Chrome/153 | serviceKey='neture' 경로(Neture credential 층) · attempts 1 |
| — | 09-21 05:02:48 | service_not_member | `neture.co.kr` | Chrome/153 | 테스트 계정(`f707c74e…`) · 관리자 아님 |
| 2~4 | 09-21 06:48:31 · 06:49:14 · 06:49:31 | invalid_password ×3 | `admin.neture.co.kr` | Chrome/153 | §3-B 배포 **전** 구 번들(serviceKey 'neture') · attempts 4 |
| — | 09-22 00:16:22 | service_not_member | (없음) | curl/8.12 | 테스트 계정 · 관리자 아님 |
| 5 | **09-22 04:31:54** | invalid_password | `admin.neture.co.kr` | Chrome/153 | §3-B 배포 **후** · **5회째 → lockedUntil = 05:01:54** |
| 6 | 09-22 04:32:11 | account_locked(403) | `admin.neture.co.kr` | Chrome/153 | 잠금 중 재클릭 |

- 사용자 마지막 클릭 = **POST 1건**(OPTIONS preflight 1 + POST 1 · 중복 전송 없음). 5회 실패는 9/21 05:01 ~ 9/22 04:31 사이 **브라우저 5회 누적**이며, 9/21 4회는 serviceKey='neture' 구 계약(§3-B 원인) 시절이다.
- reset 이후 E2E/자동화 호출: 관리자 대상 **0건**(Python-urllib 는 reset 직후 검증 1회 · curl 은 테스트 계정 대상). 공격 트래픽 흔적 0.
- `users.password` 와 `service_credentials` 해시는 모두 `$2a…`(bcrypt) 라 hashPrefix 로는 어느 층을 비교했는지 구분 불가 — 계약(serviceKey 유무)으로 판정.

**원인(코드 확인 · [`auth-login.service.ts`](../../apps/api-server/src/services/auth/auth-login.service.ts)):** `handleFailedLogin` 은 `loginAttempts++` 후 `>=5` 면 `lockedUntil=now+30m`. 잠금 검사는 `lockedUntil > now` 만 보며, **만료돼도 `loginAttempts` 를 되돌리는 코드가 없다**(0 reset 은 성공 로그인 · password reset 뿐). 따라서 현재 관리자 행(5 · 만료)은 다음 실패 1회에 6 → 즉시 재잠금되는 상태였다 — 사용자 진단과 일치.

**정정(서버 1파일 + 테스트 1파일 · DB 변경 0 · API contract 변경 0):**

| 변경 | 내용 |
|---|---|
| `apps/api-server/src/services/auth/auth-login.service.ts` | `lockedUntil` 미래 → `ACCOUNT_LOCKED`(카운터 불변). `lockedUntil` 과거(stale) → `clearStaleLock()` 으로 `loginAttempts=0` · `lockedUntil=NULL` 저장 후 인증 진행. 5회 실패→30분 · 성공→0 reset 종전 유지 |
| `apps/api-server/src/services/auth/__tests__/loginLockoutStaleLockContract.test.ts` (신규) | 계약 6 케이스: 미래 잠금 차단·카운터 불변 / stale+정답 → 정상화 후 성공 / stale+오답 → 실패 1회(재잠금 아님) / 7회 잔존+45분 경과 오답 → 1회 / 5회째 → now+30m±1m 후 ACCOUNT_LOCKED / 성공 → 0·NULL |

검증: 신규 6 + 기존 login 계약 3 suites(orphan · representative · servicePasswordLoginSelection) = **29/29 PASS** · `tsc --noEmit` 0 · eslint 0(변경 파일). ※ 메인 체크아웃은 다른 세션이 `packages/action-log-core/*` 를 삭제해 둔 상태라 HEAD 클린 임시 worktree 에서 실행.

**배포 후 관리자 행 처리:** 현재 `lockedUntil` 은 이미 **과거**(stale) 이므로 정정 코드 배포 후 첫 로그인 시도가 자동으로 0/NULL 정상화한다. **production DB write 0** (승인 요청 사항 없음). 배포 후 read-only 재확인은 §3 smoke 재개 시 함께 기록.

## 3-D. Admin password reset 링크 origin 결함 — 정정 (2026-09-22 · WO §8-C · 사용자 지시)

**현상(2026-09-22 06:57Z · 사용자 forgot-password 1회):** 사용자가 `admin.neture.co.kr/forgot-password` 에서 재설정을 진행했으나 read-only 확인 결과 신규 `password_reset_tokens` 1건은 **테스트 계정(`f707c74e…` · renagang21)** 대상(발급 06:57:54Z · 사용 06:58:45Z · `service_key` NULL). 관리자 행(`cfd2a5e7…`)은 신규 token 0 · `updatedAt` 불변 · password 미변경. 결과적으로 **테스트 계정 `users.password` 가 NULL → set** 됐다(Claude Code DB write 0 · 브라우저 동선에서 발생). counts users 2 / linked 1 / roles 11 / creds 5 / service_memberships 5 불변.

**원인(코드 확인):** [`ForgotPassword.tsx`](../../apps/admin-dashboard/src/pages/auth/ForgotPassword.tsx) 가 `POST /auth/forgot-password` 에 `{ email }` 만 보낸다. 서버 [`password.controller.ts`](../../apps/api-server/src/modules/auth/controllers/password.controller.ts) 는 `serviceUrl` 을 `ALLOWED_ORIGINS`(service-catalog origins + `https://admin.neture.co.kr` + localhost) 로 검증해 넘기고, [`passwordResetService.ts`](../../apps/api-server/src/services/passwordResetService.ts) 는 `serviceUrl ?? (serviceKey ? origin : undefined)` → 둘 다 없으면 [`mail-core`](../../packages/mail-core/src/mail.service.ts) fallback = `PASSWORD_RESET_DEFAULT_URL` → `ADMIN_URL` → **production 기본 `https://neture.co.kr`**. `o4o-core-api` 에는 두 env 가 없다(env 이름 확인 · 값 미기록). 즉 Admin 에서 요청한 reset 메일 링크가 `https://neture.co.kr/reset-password?token=…` 로 발송돼 플랫폼 관리자 reset 동선이 Neture 화면으로 새어 나간다. 플랫폼 관리자 reset 은 forgot → 메일 → `admin.neture.co.kr/reset-password` → `admin.neture.co.kr/login` 까지 전부 Admin origin 이어야 한다.

**정정(프론트 1파일 · 서버 계약 변경 0 · DB 변경 0):**

| 변경 | 내용 |
|---|---|
| `apps/admin-dashboard/src/pages/auth/ForgotPassword.tsx` | 요청 body 에 `serviceUrl: window.location.origin` 추가. `serviceKey` 는 보내지 않는다(Admin = `users.password` reset · 토큰 `service_key` NULL 유지). 서버 whitelist 에 `https://admin.neture.co.kr` 이 이미 있어 신규 계약 없음 |
| `ResetPassword.tsx` | 변경 없음 — 성공 후 기존 `navigate('/login')` 이 Admin 로그인으로 복귀 |

검증: admin-dashboard `tsc --noEmit` 0 · `vite build` PASS. 운영 검증(배포 후 · §3 smoke 0단계): 요청 payload = email + serviceUrl(admin origin) · serviceKey 없음 → 발급 token `service_key IS NULL` · 메일 링크 host = `admin.neture.co.kr` · reset 후 `admin.neture.co.kr/login`.

**테스트 계정 password 복원(production write · 사용자 승인 B-(ii)):** `renagang21` 은 Google-only 테스트 계정이므로 오입력으로 생긴 `users.password` 를 **NULL 로 복원**한다 — 배포 후 사용자 승인 하에 정확히 1행 `UPDATE users SET password = NULL WHERE id LIKE 'f707c74e%' AND password IS NOT NULL`. 실행 결과는 아래에 기록. **PENDING**

## 3. 운영 Smoke (§10 · WO §8-A 정정판 · 사용자 브라우저 + read-only count) — PENDING (§3-D 정정 배포 · 테스트 계정 password 복원 · 관리자 reset 후 재개)

baseline(2026-09-21 3-A 이후): users 2 · linked_accounts 1(테스트 계정) · 관리자 email renariver21 · password set · service_credentials 5 · service_memberships 5 · role_assignments 11.

| # | Smoke | 기대 | 결과 |
|---|---|---|---|
| 1 | `admin.neture.co.kr` 이메일 로그인 `renariver21@gmail.com` + **`users.password`(09-21 재설정 값)** | 200 · Admin 진입(serviceKey 없음 → users.password 검증) | PENDING |
| 2 | 헤더 "계정 설정" → `/settings/my-account` → [Google 계정 연결] → 현재 비밀번호 = 같은 `users.password` → Google `sohae2100` 선택 | "Google 계정 연결됨 ✓" · users **2 유지** · linked_accounts 1→**2** · 관리자 users.id/password/creds 5/memb 5/roles 11 불변 · `link_google` activity 1건 | PENDING |
| 3 | 로그아웃 → [Google로 계속하기] → 같은 Google 계정 | signup 화면 없음 → **기존 admin users.id** · `platform:super_admin` 유지 · Admin 정상 진입 · `login_google` +1 | PENDING |
| 4 | 로그아웃 → 이메일 로그인 1회 더(1과 동일) | 200 · password 로그인 병행 유지 | PENDING |
| N | (선택) 잘못된 비밀번호 1회 | `INVALID_PASSWORD` · row 0 | PENDING |

실패 시 재시도하지 않는다(잘못된 비밀번호 시도는 전체 1회 이하 · `loginAttempts` 누적 방지). `service_credentials` 재설정 · password 재설정은 하지 않는다.

**⚠️ 발견(2026-09-18 21:55Z read-only · 범위 밖 · 보고만):** 운영자 계정(`cfd2a5e7`)이 **E2E Auth Runtime 워크플로에 의해 push 마다 잠긴다.** `account_activities` `login_email` 실패가 09-17 05:00Z 이후 매 시간대 33~39건씩 묶여 있고(총 10회), 각 묶음이 `e2e-auth-runtime.yml` 실행 시각(09-17 05:15·06:57·13:42Z, 09-18 02:07·04:52·05:51·14:22Z)과 일치한다. 워크플로는 `packages/auth-client/src/**`·`auth-react/src/**` 변경 push 에 자동 실행되며 `E2E_{KPA|KCOS|NETURE}_ADMIN_*` secret(WO-2C reset 이후 stale)으로 3 서비스 × 반복 로그인 → 같은 users row 에 `loginAttempts` 누적 → 5회 이상에서 **30분 잠금**(`handleFailedLogin`). 이번 커밋 `35548dd65` 도 auth 패키지를 건드려 14:22~14:28Z 잠금을 유발했다. 14:04:54Z 의 `invalid_password` 1건 + 14:05Z `account_locked` 4건은 사용자 시도로 보인다. 현재: `lockedUntil` 14:34:54Z 만료(잠금 해제) · **`loginAttempts=8` 잔존 → 다음 password 실패 1회에 즉시 30분 재잠금**, 성공 로그인 시 0 리셋. **제안(별도 승인):** ① `e2e-auth-runtime.yml` push 트리거 제거 또는 워크플로 비활성(WO-2F 에서 Google 경로 기준 재정의 전까지) — CI 변경 = 중지 조건 · ② `loginAttempts` 1행 리셋은 UPDATE 이므로 사용자 명시 승인 시에만.

**조치(2026-09-19 · 사용자 승인 2건):** ① `f51d5a362` — `e2e-auth-runtime.yml` `on.push` 블록만 제거, `workflow_dispatch` 유지 · secret 미삭제 · 이 push 에서 E2E 미실행 확인(CI Pipeline · CodeQL 만). 직전 21:55:58Z 에 다른 PC 의 PR #223 merge(`3e56425b7`)가 마지막으로 한 번 더 실행돼 34회 실패 추가(잠금 23:15Z 까지 · loginAttempts 10). ② 22:58Z 운영자 1행 `UPDATE users SET "loginAttempts"=0, "lockedUntil"=NULL WHERE id=(SELECT … password IS NOT NULL AND id LIKE 'cfd2a5e7%')` — `UPDATE 1` · after: loginAttempts 0 · lockedUntil NULL · password/status 불변 · counts users 2 / linked 1 / creds 5 / memb 5 / roles 11 불변 · 테스트 계정 무접촉. 이후 auth 패키지 push 로 인한 재잠금 경로는 닫혔다.

**주의(정정 2026-09-21):** 위 문단의 `PUT /users/password` 정렬 제안은 폐기. Admin 은 serviceKey 없이 `users.password` 로 로그인하도록 계약을 정정했다(§3-B).

## 4. Git

| 커밋 | 범위 |
|---|---|
| `5a07042cf` | WO 접수 · 선행 CHECK COMPLETE |
| `35548dd65` | 서버 · 패키지 · neture 화면 · 테스트 |
| `706f82108` | CHECK 초안 |
| `d5be1eb31` | 잠금 원인 기록 |
| `f51d5a362` | e2e-auth-runtime push 트리거 제거 |
| `237ffd3df` | 잠금 reset 기록 · 3-A email 정정 · 전제 정정 |
| `2744ea809` | §3-B Admin 인증 계약 정정 + Admin Google 연결 UI(WO §8-A) |
| `58f655218` | §3-C lockout 계약 정정(stale lock 정상화) + 계약 테스트 6(WO §8-B) |
| (본 커밋) | §3-D Admin forgot-password `serviceUrl` 정정(WO §8-C) · CHECK 중복 블록(58f655218 삽입 오류) 정리 |

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(E2E Auth Runtime 워크플로 Google-only 재정의 = WO-2F · push 트리거는 제거 완료)
