# IR-O4O-GOOGLE-AND-ID-AUTH-FINAL-STATUS-AUDIT-V1

> **유형**: 조사 전용 (Investigation Report)
> **조사일**: 2026-10-01
> **결과**: `INVESTIGATION COMPLETE` · `CODE CHANGE = 0` · `DB WRITE = 0` · `DEPLOY = 0` · `AUTH CONFIG CHANGE = 0`
> **관련**: [WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1](../work-orders/WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1.md) · PR #256 · PR #257 · PR #259

---

## 0. 결론 요약

| 축 | 판정 |
|---|---|
| DESIGN (정책 · WO) | **COMPLETE** — PR #256 이 main 에 병합됨 |
| IMPLEMENTATION | **COMPLETE_ON_PR** — PR #257 에만 있음. 이 PR 이 만든 테스트 실패는 0건 |
| MAIN_ADOPTION | **PENDING** — PR #257 은 OPEN 이며 main 에 병합되지 않음 |
| PRODUCTION_ADOPTION | **PENDING** — 운영 DB 는 state 9, 운영 API 와 neture-web 은 PR #257 이전 SHA |
| SERVICE_UI_ADOPTION | **PARTIAL** — web-neture 1곳만 연결. 나머지 로그인 서비스 5곳은 미적용 |
| LEGACY_CLEANUP | **runtime COMPLETE** — 옛 password · social 로그인 runtime 은 0건. 설정 예시 · 주석 · 문서에만 남음 |
| SECURITY_BLOCKER | **1건 (판단 필요)** — Google 미인증 이메일과 비밀번호 재설정의 결합 (§12-1) |
| DOCS | **DRIFT 4건** — CANONICAL-INDEX · MYPAGE-CANONICAL 은 PR #257 이 다루지 않음 |

용어 확정: **사용자가 말하는 "아이디 로그인"은 현재 구현상 "이메일 주소 + 비밀번호 로그인"이다.** 별도 username 이나 login_id 는 없다(§2).

---

## 1. 기준점 (실측)

| 항목 | 값 |
|---|---|
| main HEAD | `40539413efb685ae84a146b7cdf7e428d99e612f` |
| PR #256 (WO 문서) | **MERGED** 2026-09-29T13:41:58Z · merge commit `bfa48c13534a7555d2288d416a2b13dad552d939` |
| PR #257 (구현) | **OPEN** · MERGEABLE · head `647336c1d73b9acec79b5da7c8ebc995e4d9bf20` · 65 files · base main |
| PR #257 merge-base | `bfa48c135`. main 이 그 뒤로 27 commit 앞서 있음 |
| PR #259 (CodeQL `upload: never`) | **OPEN** |
| PR #257 의 main 포함 여부 | 포함 안 됨 (`merge-base --is-ancestor` false) |

PR #257 의 최신 commit `647336c1d`("가입 화면을 확정 흐름대로 — /signup 에 Google 병행 · /register 를 그 화면으로")는 이 조사 직전에 다른 세션이 push 한 것이다.

> PR 을 main 과 two-dot 으로 diff 하면 main 에서 나중에 들어간 변경까지 "삭제"로 보인다. 이 문서의 PR 범위 판단은 모두 merge-base 기준(three-dot)이다.

---

## 2. "아이디 로그인"의 실제 의미

| 항목 | 사실 (PR #257) |
|---|---|
| 별도 username / login_id 필드 · 엔티티 | **없음** |
| 로그인 식별자 | `users.email` 이며 `normalizeLoginEmail` 로 trim 후 소문자 처리 (`packages/auth-utils/src/emailCredential.ts:23-25`) |
| 조회 | `lower(email)=$1 LIMIT 2`. 2건이면 모호한 것으로 보고 null 처리 (`email-auth.service.ts:281-293`) |
| `POST /auth/account/find-id` | 입력은 **이름 + 휴대폰번호**(`^01\d{8,9}$`). `user_password_credentials` 를 가진 사용자 중 정확히 1명이 맞으면 **마스킹한 이메일**(`r***@g***.com`)을 반환. 메일은 보내지 않음. Google 전용 사용자는 제외 (`email-auth.service.ts:538-555`) |

| 사용자 표현 | 현재 구현 | 별도 ID |
|---|---|---|
| 아이디 로그인 | **이메일 주소 + 비밀번호** | 없음 |
| 아이디 찾기 | 이름과 휴대폰번호로 **로그인 이메일을 마스킹해 안내** | 해당 없음 |

별도 로그인 ID 를 둘지는 이 조사 범위가 아니며 구현하지 않았다. 필요하면 정책 결정 후 별도 WO 로 진행한다.

---

## 3. Identity 흐름

```text
Google:   ID token(sub) → linked_accounts(provider='google', providerId=sub) → users.id
Password: 정규화된 email → users(lower(email)) ↔ user_password_credentials(user_id PK) → users.id
```

- 두 수단 모두 같은 `users.id` 로 수렴한다. 인증수단은 `users` 와 분리된 별도 테이블에 둔다.
- `user_password_credentials` 는 `users.id` 당 1행이다. 서비스별 credential 이 아니다.
- 권한은 두 수단 모두 `role_assignments` 에서 읽는다. 가입은 role 과 membership 을 만들지 않는다.

| 테이블 | main 코드 | PR #257 | 운영 DB (2026-10-01) |
|---|---|---|---|
| users | ✓ (password 계열 컬럼 없음) | ✓ | password · reset · username · login_id 컬럼 **0** |
| linked_accounts | ✓ | ✓ | 존재 · provider=google 만 |
| user_password_credentials | — | migration 10 | **없음** |
| password_reset_tokens | — | migration 10 | **없음** |
| email_verification_tokens | 고아 테이블(옛 평문 형태) | migration 10 이 guard 후 DROP 하고 해시 형태로 재생성 | **옛 형태로 존재** (`token`, `usedAt` …) · **0행** |
| handoff_tokens.source_auth_method | — | migration 11 | **컬럼 없음** |
| service_credentials | 없음 | 없음 | **없음** |
| role_assignments / service_memberships | 변경 없음 | 변경 없음 | — |

---

## 4. Google 로그인 (main = PR, PR 은 Google runtime 파일을 바꾸지 않음)

| 항목 | 상태 | 근거 |
|---|---|---|
| GIS 프론트엔드 | 팝업 모드에서 ID token 만 서버로 보냄 | `packages/auth-client/src/google-identity.ts:49-126` |
| 서버 검증 | `google-auth-library` `OAuth2Client`, 검증기는 1개뿐. 라이브러리 검증 뒤 iss · aud · exp · sub 를 다시 확인하고, allowlist 가 비면 거부(fail-closed) | `google-identity.service.ts:108-159` |
| `GOOGLE_ALLOWED_CLIENT_IDS` | 서버 allowlist 만 신뢰. 운영 env 에 설정됨(값은 기록하지 않음) | `config/google-identity.config.ts:15-44` · `deploy-api.yml:646-647` |
| `GET /api/v1/auth/google/config` | `{enabled, clientId}` | `google-auth.controller.ts:42-48` |
| identity 기준 | Google sub. `UNIQUE(provider, providerId)` · `UNIQUE(userId) WHERE provider='google'` | `entities/LinkedAccount.ts:19-20` |
| 이메일로 자동 병합 | **없음.** 모르는 sub 로 로그인하면 `GOOGLE_SIGNUP_REQUIRED`. 가입 시 이메일이 겹치면 DB unique 오류를 `EMAIL_IN_USE`(409)로 반환 | `google-auth.service.ts:194-197, 280-288` · guard `googleIdentityNoEmailMergeGuard.test.ts` |
| 가입 transaction | 약관 동의를 확인한 뒤 `users` 와 `linked_accounts` 를 한 transaction 으로 저장. 세션은 commit 뒤 발급 | `google-auth.service.ts:231-311` |

**계정 연결 기능 분류**

| 대상 | 분류 |
|---|---|
| `POST /auth/google/link` · `GET /auth/google/link/status` | **DEAD (제거됨)** — tombstone 주석만 남음 · guard spec 으로 재등장 차단 |
| `GoogleAccountLink` 컴포넌트 | **DEAD (제거됨)** |
| `/auth/google/bootstrap-admin` | **DEAD (제거됨)** |
| PR `POST /auth/password` (Google 사용자가 비밀번호 추가) | **REPLACED → ACTIVE (PR)** — 같은 `users.id` 에 수단을 추가. platform 역할은 거부 |
| 이메일 사용자가 Google 을 추가하는 경로 | **없음** — Google 가입 시 `EMAIL_IN_USE` (비대칭, §12 후속) |

---

## 5. Legacy 잔재 census

### 5-1. Google · social legacy (main)

| 대상 | runtime | 비고 |
|---|---|---|
| passport · express-session · Kakao/Naver OAuth · social callback | **0** | package.json 의존성 0. tombstone 과 guard spec 만 남음 |
| `GOOGLE_CLIENT_SECRET` 을 요구하는 runtime 경로 | **0** | |
| 중복 Google 구현 | **0** | |
| 비 runtime 잔재 (후속 정리) | — | `.env.example`·`env.example`·`.env.apiserver.example` 의 social 키, `tsup.config.ts:80-87` 의 passport externals(build 인프라), `packages/ui` `SocialLoginButtons`(소비처 0), API 문서 · postman, admin `unified-client.ts:291,293` 의 은퇴 endpoint 호출, `google-auth.service.ts` 의 옛 주석 · 에러코드 |

로그인 기능이 아니므로 제외한 것: `users.kakao_open_chat_url` · `kakao_channel_url`, 공급자 Kakao 연락처, NAVER 블로그 파서, local-agent 의 Kakao 등록 항목.

### 5-2. 옛 password 구조와 새 구조

| 구분 | 대상 | 상태 |
|---|---|---|
| 옛 구조 | `users.password` · `reset_password_*` · `loginAttempts` · `lockedUntil` · `service_credentials` · 옛 `password_reset_tokens` · 서비스별 password route | **되살아나지 않음.** incremental #5 `DropLegacyPasswordAuthSchema1790251584623` 가 DROP 했고 운영에서 0. guard `legacy-password-auth-retirement.spec.ts` P1~P6 |
| 옛 구조 잔존 | `email_verification_tokens` (옛 평문 고아 테이블) | main 과 운영에 존재하며 0행. PR migration 10 이 정리 |
| 새 구조 | `user_password_credentials` · 해시 토큰 2종 · 공통 `auth-token-session` | PR #257 에만 있음 |

guard 의 한계: migration 이 `service_credentials` 나 `users.password` 를 다시 만드는 것을 직접 막는 정적 검사는 없다. schema fingerprint 로만 잡힌다(§12 후속).

---

## 6. Password backend (PR #257)

### 6-1. Endpoint

모든 route 는 `requireJsonBody`(415) → rate limiter → `validateDto`(forbidNonWhitelisted) → handler 순서로 처리된다. 정의 위치는 `modules/auth/routes/auth.routes.ts`, handler 는 `email-auth.controller.ts`, 로직은 `services/auth/email-auth.service.ts`, DTO 는 `modules/auth/dto/email-auth.dto.ts` 이다.

| Endpoint | limiter | 세션 발급 | 주요 응답 |
|---|---|---|---|
| `POST /auth/email/signup` | 1h/10 | 없음 | 409 `EMAIL_IN_USE` · `EMAIL_PENDING_VERIFICATION`, 400 정책 위반 |
| `POST /auth/email/verify` | 15m/30 | 없음 | 400 `INVALID_OR_EXPIRED_TOKEN` |
| `POST /auth/email/resend` | 1h/10 | 없음 | 항상 200 (존재 여부를 드러내지 않음) |
| `POST /auth/email/login` | 15m/20 | **있음** (`generateTokensWithContext(..., 'password')` + cookie) | 401 `INVALID_CREDENTIALS`, 403 `EMAIL_NOT_VERIFIED` · `PASSWORD_SESSION_NOT_ALLOWED` |
| `POST /auth/password/forgot` | 1h/10 | 없음 | 항상 200 |
| `POST /auth/password/reset` | 15m/30 | 없음 (전체 세션 폐기) | 400 토큰 · 정책 |
| `POST /auth/account/find-id` | 1h/10 | 없음 | 200 `{found, maskedEmail, message}` |
| `POST /auth/password` (로그인 상태) | `requireAuth` + 15m/30 | 없음 | 400 `CURRENT_PASSWORD_REQUIRED` · `MISMATCH`, 403 platform |

테스트는 모두 mock 단위 테스트다(`emailAuthService` V1-V12, `passwordCredentialService` H1-H6, `passwordSessionBoundary` B1-B5, `refreshTokenFamilyContract` P1-P4, `require-json-body`, `validation-sensitive-echo`, migration guard). HTTP 통합 테스트는 없다(§12 후속).

### 6-2. 비밀번호 저장 · 정책

| 항목 | 구현 | 문서와 일치 |
|---|---|---|
| 해시 | bcryptjs cost 12. runtime 에서 bcrypt 를 쓰는 파일은 `password-credential.service.ts` 1개 (guard P3) | ✓ |
| 정책 | `@o4o/auth-utils` `checkPasswordPolicy`: 8자 이상 · UTF-8 72바이트 이하 · 영문자 · 숫자 · Unicode P/S 기호 각 1개 이상 · 대소문자 요구 없음. 프론트엔드와 서버가 **같은 함수**를 씀 | ✓ |
| 72바이트 | 정책 · 화면 · `setPassword`(`PasswordTooLongError`) · `verifyPassword`(불일치 + dummy compare) | ✓ |
| 평문 | 저장 · 로그 · 응답 echo 경로 0 | ✓ |

### 6-3. 이메일 정규화

| 단계 | trim + lowercase |
|---|---|
| password 가입 · 저장 · 중복 검사 · 로그인 · resend · forgot · verify | ✓ |
| find-id | 이메일은 입력값이 아님 (이름 + 휴대폰) |
| **Google 가입** | **✗ — claim 이메일을 그대로 저장.** 충돌 판정은 대소문자를 구분하는 `IDX_users_email` 에만 의존 (§12 후속) |

운영 실측(read-only): 정규화되지 않은 `users.email` **0건**, `lower(email)` 중복 **0건**.

### 6-4. 토큰

| 항목 | 구현 |
|---|---|
| 저장 | SHA-256 해시만 저장. 원문은 32바이트 랜덤(base64url) |
| 1회용 | `consumed_at IS NULL AND expires_at > now()` 조건의 원자적 UPDATE … RETURNING |
| 만료 | 이메일 확인 **24h** · 재설정 **30m** (설계와 일치) |
| 재발급 | 이전에 소비되지 않은 토큰을 무효화 (마지막 링크만 유효) |
| 재설정 후 세션 | `logoutAll`(refresh family 폐기)을 저장보다 **먼저** 실행. `sessionEpoch` 는 올리지 않으므로 기존 access token 은 최대 15분 남음 (§12 후속) |

### 6-5. 가입 transaction

| 흐름 | transaction 경계 | partial state |
|---|---|---|
| password 가입 | `users`(약관 동의 컬럼 포함)와 credential 을 한 transaction 으로 저장. 동시 가입으로 unique 위반이 나면 `EMAIL_IN_USE` | 토큰 발급 · 메일은 commit 뒤. 실패하면 미인증 상태로 남고 resend 로 복구 가능 (`mailSent:false`) |
| Google 가입 | `users` 와 `linked_accounts` 를 한 transaction 으로 저장 | 세션 발급은 commit 뒤. 다음 로그인으로 복구 가능 |

두 흐름 모두 `policy_acceptances` 행은 쓰지 않는다. 동의는 users 컬럼에 기록된다.

---

## 7. Session · authMethod · handoff

| 경로 | 동작 | 판정 |
|---|---|---|
| 세션 발급 | Google 과 password 가 같은 `generateTokensWithContext` · refresh family · sessionEpoch · cookie 를 씀. 별도 세션 체계 없음 | ✓ |
| claim | password 세션은 `authMethod:'password'`. Google 은 claim 이 없으면 google 로 본다 | ✓ |
| login | 자격 확인 전과 토큰 발급 뒤 두 번 경계를 확인 | ✓ |
| refresh | claim 을 유지하고, 허용되지 않는 password 세션은 401 `PASSWORD_SESSION_NOT_ALLOWED` 와 함께 cookie 삭제 | ✓ |
| middleware | `requireAuth` · `requirePlatformUser` 에서 DB 의 역할로 확인(fail-closed). `optionalAuth` 에서는 익명으로 처리 | ✓ |
| handoff issue | 검증된 token 의 claim 에서 `handoff_tokens.source_auth_method` 에 기록 | ✓ |
| handoff exchange | 기록된 값을 이어받음. NULL 이면 password 로 봄. 교환 시점의 역할로 경계를 다시 확인(403) | ✓ |
| password → google 승격 경로 | 없음 (`generateTokens` 호출자 3곳 확인) | ✓ |
| logout / logout-all | 기존 공통 경로 | ✓ |

배포 시 주의: 구 revision 과 신 revision 이 동시에 traffic 을 받으면 구 `verifyRefreshToken` 이 claim 을 버린다. 그러면 password 세션이 refresh 에서 표시를 잃는 fail-open 구간이 생긴다. **traffic 을 나누지 말고 한 번에 전환한다.** 배포 전에 발급된 handoff 는 NULL 을 password 로 읽어 Google 세션이 하향되는데, 이쪽은 안전한 방향이다.

---

## 8. Admin Google-only 경계 · RBAC

| 시나리오 | 결과 (PR #257) |
|---|---|
| password 세션 + `platform:*` 역할 | **차단** — login · refresh · middleware · handoff exchange · forgot(조용히 무시) · reset · set |
| password 세션 + admin-dashboard origin | **차단** — Origin 으로 판정 (`utils/session-origin.ts:31-51`: admin · dev-admin) |
| refresh 후 · handoff 후 | **차단 유지** |
| `supplier:admin` · `neture:admin` 같은 서비스 `:admin` | **허용** (테스트 P3 · B2b) |
| admin-dashboard 화면 | Google 버튼만 있음 · PR 변경 0 파일 |
| `service-access.middleware` | 우회 아님 — platform user token(`tokenType 'user'`)을 먼저 거부 |

정책 파일은 `common/auth/password-session.policy.ts` 이다. cookie domain 이 `.neture.co.kr` 이므로 password cookie 도 admin 호스트에 도달한다. 안전한 근거는 admin 진입에 `platform:super_admin` 이 필요하다는 점이다. 이 의존 관계는 문서로 남겨 둔다.

RBAC: `authMethod` 는 **거부에만** 쓰인다. PR diff 에서 `roles[0]` · `user.role` · email · loginMethod 로 권한을 주는 신규 코드는 없다. 역할의 정본은 계속 `role_assignments` 이다. 운영의 `platform:*` 활성 사용자는 1명이다(정체는 기록하지 않음).

---

## 9. 같은 사람이 두 수단을 가지는 경우

| 시나리오 | 현재 동작 (PR #257) |
|---|---|
| A. password 사용자가 이후 Google 연결 | **불가** — Google 로그인은 `GOOGLE_SIGNUP_REQUIRED`, Google 가입은 `EMAIL_IN_USE` (대소문자가 정확히 같을 때) |
| B. Google 사용자가 이후 password 설정 | ① 로그인 상태에서 `POST /auth/password` (기존 수단이 없으면 현재 비밀번호 불필요) ② `/password/forgot` → reset 으로 같은 `users.id` 에 credential 생성 + `isEmailVerified=true` (테스트 V8, 의도된 동작 — **조사 시점 기록. 2026-10-01 정책 변경으로 ② 폐지**: forgot/reset 은 기존 수단 복구 전용, 첫 추가는 ① 뿐. 테스트 V8 · S1-P2 반전) |
| C. 같은 이메일의 다른 Google 계정 | `EMAIL_IN_USE` 409 — 자동 병합 없음 |
| D. Google 이메일 = password 이메일 | 먼저 가입한 쪽이 이메일을 점유. 뒤에 오는 쪽은 409 |
| E. Google sub 는 다르고 이메일이 같음 | C 와 같음 |

"이메일만으로 동일인으로 추정하지 않는다"는 원칙은 **가입 단계에서는 지켜진다.** 단 B-② 는 "메일함 소유 = 해당 users.id 의 소유자"로 본다. 이 가정이 깨지는 조건이 §12-1 이다.

> **2026-10-01 정책 변경 (사후 주석 · 본문은 조사 시점 기록으로 보존)**: B-② 자체를 폐지했다 — 메일함 소유만으로 새 로그인 수단을 만들지 않는다. 현행 계약은 [IDENTITY-V3 §3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) 「인증 수단 추가 경계」.

---

## 10. 서비스별 UI census (fresh, `deploy-*.yml` 기준)

| 서비스 (app · host) | Google | Password | 가입 | 비번찾기 | ID찾기 | 상태 |
|---|---|---|---|---|---|---|
| web-neture (neture · supplier · funding · community) | ✓ GoogleContinue | main ✗ / **PR ✓** 로그인 모달: 이메일 → 또는 → Google | PR `/signup` (이메일 + Google) · `/register`→`/signup` · `/verify-email` | PR `/forgot-password` · `/reset-password` | PR `/find-id` | **B. IMPLEMENTED_NOT_CANONICAL** |
| web-k-cosmetics (retail) | ✓ | ✗ | Google 만 | `/login` 으로 redirect | ✗ | D. MISSING_OR_REMAINS |
| web-kpa-society (pharmacy) | ✓ | ✗ | Google 만 | `/login` 으로 redirect | ✗ | D |
| web-kpa-branch (kpa-society.co.kr/kpa) | ✓ | ✗ | Google (`/join`) | reset → `/login` | ✗ | D |
| web-pharmacy-hub (pharmacyhub.co.kr) | ✓ | ✗ | Google (`/join`) | `/login` 으로 redirect | ✗ | D |
| web-store (store) | ✓ | ✗ | 없음 (Neture 에서 관리한다고 안내) | ✗ | ✗ | D (우선순위 낮음) |
| web-lecture (study) | 자체 로그인 없음 (handoff) | — | — | — | — | N/A |
| web-hospital-pharmacy | 무로그인 업무 앱 | — | — | — | — | N/A |
| signage-player-web | 로그인 없음 | — | — | — | — | N/A |
| admin-dashboard (admin) | ✓ `renderGoogleButton` | **✗ (의도)** | — | — | — | Google-only 유지 ✓ |

**공통 UI 재사용성** — `@o4o/auth-react` `email/` 은 service-neutral 이다(서비스명 · URL 하드코딩 0). 다른 서비스에 붙이려면 서비스가 다음을 제공해야 한다: `api`(auth-client), `links`(경로), `termsHref` · `privacyHref`, query 의 `token`, AuthContext 의 `loginWithEmail`.

다른 서비스로 확산할 때의 backend 제약 2가지:
1. **메일 링크가 항상 neture.co.kr 로 간다.** `email-auth.service.ts:180-189` 의 `SERVICES_WITH_EMAIL_AUTH_PAGES = {'neture'}` 때문이다.
2. **이메일 가입은 서비스 membership 을 만들지 않는다.** `POST /auth/services/:serviceKey/join` 를 따로 거쳐야 한다. 계정 생성과 서비스 이용 신청은 별개라는 원칙과 일치한다.

---

## 11. 운영 상태 (read-only, 2026-10-01)

### 11-1. Runtime

| 서비스 | 현재 revision (traffic 100%) | 생성 | 배포 SHA | PR #257 포함 |
|---|---|---|---|---|
| o4o-core-api | `o4o-core-api-03774-qeq` | 2026-09-30 13:49Z | `e2e1be6cc` (deploy/2026-09-30-pending-delta-release) | **✗** |
| neture-web | `neture-web-01666-qam` | 2026-09-30 13:08Z | `e2e1be6cc` | **✗** |

- PR #257 설명에 적힌 롤백 기준(`o4o-core-api-03758-wdt` · `neture-web-01664-t5r`)은 **이미 지난 값**이다. 배포 직전에 다시 확인해야 한다.
- main 에 DEPLOY_FREEZE cutover(`WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1`, `Deploy Auto (risk-gated)`)가 들어왔다. PR #257 의 배포 계획에 쓰인 "`DEPLOY_ENABLED` 를 켰다가 끄기" 절차는 **더 이상 맞지 않을 수 있다.** 배포 WO 에서 새 절차를 기준으로 다시 정한다.
- API env 에는 Google client 설정 2종과 SMTP 설정 7종이 있다(값은 기록하지 않음). `SMTP_PASS` 는 secretRef 가 아니라 평문 env value 다(§12 후속).

### 11-2. DB

| 항목 | 값 |
|---|---|
| `typeorm_migrations` | 693행 · 마지막 `AlterHandoffTokensSourceSessionEpoch1790400000003` = **state 9** |
| migration 10 `CreateEmailPasswordAuthTables` / 11 `AddHandoffTokenSourceAuthMethod` | **미적용** |
| `user_password_credentials` · `password_reset_tokens` | 없음 |
| `email_verification_tokens` | 옛 형태 · 0행 (migration 10 guard 통과 조건 충족) |
| `handoff_tokens.source_auth_method` | 없음 |
| `users` | 3행 · `linked_accounts` 는 google 3행 · 정규화되지 않은 이메일 0 · 미인증 0 |

### 11-3. Google OAuth JavaScript origins

**UNVERIFIED** — Google Console 의 현재 설정은 읽을 수 있는 승인 채널이 없어 확인하지 못했다.

- 마지막 기록은 [CHECK-O4O-URL-FIRST-CENSUS-V1](../checks/CHECK-O4O-URL-FIRST-CENSUS-V1.md) §1216-1227 의 `checkOrigin` probe 다(과거 시점).
  - `valid:true`: neture.co.kr · kpa-society.co.kr · k-cosmetics.site · pharmacyhub.co.kr · admin.neture.co.kr
  - **`valid:false`: supplier · funding · community · pharmacy · retail · kpa · store `.neture.co.kr`**, 그리고 www.neture.co.kr · study
- 코드가 GIS 버튼을 띄우는 호스트에는 위 `valid:false` 호스트 다수가 포함된다(§10).
- PR #257 은 새 GIS origin 을 추가하지 않는다. 메일 링크는 neture.co.kr 만 쓴다. 따라서 이 항목은 **password 전환을 막지 않는다.** 다만 해당 호스트의 Google 로그인 smoke 는 막는다.

### 11-4. Production smoke

**미실시.** PR #257 이 배포되지 않았다. 이 조사에서는 계정 생성, reset 실행, 실사용자 변경을 하지 않았다.

---

## 12. 보안 · 결함 분류

### 12-1. BLOCKER_FOR_AUTH_CUTOVER (병합 · 배포 전 판단 필요)

| # | 내용 | 근거 | 운영 데이터 |
|---|---|---|---|
| **S1** | **Google 미인증 이메일과 비밀번호 재설정이 결합된다.** main 은 `email_verified=false` 인 Google 가입을 허용하고 claim 이메일을 `users.email` 로 저장한다(`isEmailVerified=false`). PR 의 `/password/forgot` 은 credential 이 없는 Google 전용 사용자에게도 그 주소로 재설정 메일을 보낸다. reset 하면 같은 `users.id` 에 비밀번호가 생기고 `isEmailVerified=true` 가 된다. 결과적으로 **Google sub 소유자와 그 이메일 주소의 실제 메일함 소유자가 서로 다른 사람인데도 한 계정을 공유**할 수 있다. | `google-auth.service.ts:236-276` · PR `email-auth.service.ts:461-506` | 미인증 사용자 **0건** (현재 실현된 사례 없음) |

처리 후보 (결정은 사용자): ① Google 가입 시 `email_verified !== true` 이면 거절 ② forgot 은 credential 이 있는 사용자이거나 `isEmailVerified=true` 인 경우에만 메일 발송. 둘 다 적용하는 것이 가장 단순하다. 이 조사에서는 수정하지 않았다.

> **처리 기록**: ① · ② 모두 S1 수정(`61a44a337`)으로 적용됐다. 이후 2026-10-01 정책 변경으로 ② 의 "또는 `isEmailVerified=true`" 는 폐지 — forgot 은 credential 보유 사용자에게만 발송한다.

### 12-2. 판단 필요 (전환을 막지는 않지만 정책 결정 대상)

| # | 내용 |
|---|---|
| P1 | **미인증 이메일 가입이 주소를 점유한다.** 진짜 소유자의 Google 가입이 `EMAIL_IN_USE` 로 막힌다. 소유자는 forgot 으로 복구할 수 있지만, 그러면 점유자가 넣은 이름 · 휴대폰 · 동의 기록을 그대로 물려받는다. 미인증 계정의 만료나 정리 장치가 없다. |
| P2 | **계정 존재 여부가 드러난다.** signup 의 409 와 find-id 의 마스킹 힌트로 존재를 알 수 있다. 둘 다 rate limit 은 있다. |

### 12-3. SECURITY_FOLLOWUP (전환 뒤 별도 개선)

| # | 내용 |
|---|---|
| F1 | Google 가입 이메일이 정규화되지 않고, `IDX_users_email` 이 대소문자를 구분한다. 대소문자만 다른 중복이 생기면 password 로그인 · forgot 이 모호하다고 거부된다. 해법은 정규화 + `lower(email)` unique 이며 운영 실측 0건이다. |
| F2 | reset 이 `sessionEpoch` 를 올리지 않아 access token 이 최대 15분 남는다. `POST /auth/password` 는 세션을 폐기하지 않는다. |
| F3 | rate limiter 가 Cloud Run 인스턴스별 메모리에 저장되어, 실제 한도가 인스턴스 수만큼 늘어난다. |
| F4 | HTTP 통합 테스트(supertest)가 없다. |
| F5 | `logoutAll` 이 행 전체를 save 해서 last-write-wins 위험이 있다. |
| F6 | migration 이 legacy 구조를 다시 만드는 것을 직접 막는 정적 guard 가 없다(fingerprint 의존). |
| F7 | `SMTP_PASS` 가 Cloud Run 평문 env 다. secretRef 로 옮길 후보다. |
| F8 | email+password 사용자가 Google 을 추가하는 경로가 없다(비대칭). Google 사용자의 `users.email` 은 가입 시점 snapshot 이다. 관리자가 이메일을 수정해도 `isEmailVerified` 가 초기화되지 않는다. |
| F9 | 비 runtime legacy 정리(§5-1). `tsup` externals 는 build 인프라 변경이다. |
| F10 | CodeQL 저장소 전체 기존 결과 791건(main 기준)은 이번 인증 전환의 blocker 가 아니다. PR #259 는 업로드 실패만 해소한다. |

---

## 13. 문서 정합

| 문서 | 현재 main 의 서술 | PR #257 처리 | 판정 |
|---|---|---|---|
| [O4O-IDENTITY-ARCHITECTURE-V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) | `:17` `:38` `:50` `:72` `:76` "Google 단일 로그인" · `:64-65` password DROP | 정책 변경 블록과 §0 요약 줄을 추가했지만 본문 줄은 그대로 | PR 병합 시 부분 해소 |
| [USER-DOMAIN-SSOT-V1](../baseline/USER-DOMAIN-SSOT-V1.md) | `:13` · `:20-29` "users.email 은 인증 키가 아니다" · `:54-56` | `:33` 뒤에 블록 추가 · 본문 그대로 | PR 병합 시 부분 해소 |
| [CANONICAL-INDEX](../CANONICAL-INDEX.md) | `:81` "users.email 은 프로필 필드이며 인증 키 아님" · `:82` "Google 단일 로그인" | **다루지 않음** | **DRIFT** — 행 변경은 §16-4 에 따라 별도 WO |
| [O4O-MYPAGE-CANONICAL-V1](../baseline/O4O-MYPAGE-CANONICAL-V1.md) | `:45-46` `:107` 비밀번호 변경 · 재설정 은퇴, "로그인 수단은 Google 계정 하나" | **다루지 않음** | **DRIFT** — PR 의 `POST /auth/password` · forgot/reset 과 정면으로 충돌 |
| CLAUDE.md · AGENTS.md · docs/rbac · docs/platform · docs/rules | 해당 서술 없음 | — | 정합 |

이 조사에서는 위 문서를 수정하지 않았다.

---

## 14. 테스트 결과 (PR #257 HEAD `647336c1d`, 2026-10-01 실행)

| 대상 | 결과 |
|---|---|
| auth-utils (vitest) | 29/29 PASS |
| auth-react (vitest) | 99/99 PASS |
| auth-client (vitest) | 15/15 PASS |
| api-server jest (auth · session · refresh · handoff · rbac · guard · migration 59개 파일) | 58 파일 PASS · 1 파일 skip · 테스트 1014 PASS · 2 skip · **실패 0**. skip 은 `terms-acceptance-isolated-pg.spec.ts` 로, 격리 PG env 가 없어서다 |
| web-neture 전체 (vitest) | 32 파일 · 281/281 PASS (`RegisterRedirect` · `LoginModal.email` 포함) |
| tsc api-server · web-neture · auth-utils · auth-client | 0 errors |
| tsc auth-react | **FAIL 2 (TS2352)** · `useServiceAuth.test.tsx:141,153`. 파일이 main 과 바이트 단위로 같아 **PR 이전부터 있던 오류**다. main 에서 직접 tsc 를 돌리지는 않았으므로 판단 근거는 파일 동일성이다 |
| `check-typeorm-entities` · `check-unsafe-routes` | PASS |
| `check-forbidden-tables` | **FAIL 2** (`PlatformPayment.entity.ts:21` `o4o_payments`, `neture-settlement-order.entity.ts:20`). PR 범위 밖 파일이다. PR migration 10 · 11 은 위반이 아니다 |
| CI (PR #257 이전 HEAD `ac9411795`) | CodeQL Analyze 는 업로드 단계에서만 실패했고 나머지는 PASS. 최신 HEAD 에서는 CI 를 다시 확인하지 않았다 |

---

## 15. 최종 판정표

| 영역 | Main | PR #257 | Production | 판정 | 남은 작업 |
|---|---|---|---|---|---|
| Google Identity | ✓ sub 기준 · 병합 없음 | 변경 없음 | ✓ 운영 중 | **A. COMPLETE** | §12-1 S1 의 `email_verified` 처리 |
| Password backend | ✗ | ✓ 8 endpoint · 테스트 PASS | ✗ | **B** | S1 해소 → 병합 → 배포 |
| Password DB schema | ✗ | migration 10 · 11 | state 9 · 미적용 | **B** | 배포 시 CI 가 자동 적용 |
| Password UI (공통) | ✗ | `@o4o/auth-react/email` | ✗ | **B** | — |
| Neture (+supplier · funding · community 호스트) | Google 만 | Google + 이메일 | Google 만 | **B** | 병합 · 배포 · smoke |
| Supplier | Neture 와 같은 app | 같음 | Google 만 | **B** | 위와 같음. 단 GIS origin 은 UNVERIFIED |
| Store | Google 만 | 변경 없음 | Google 만 | **D** | 이메일 UI 를 붙일지 결정 (우선순위 낮음) |
| KPA (society · branch) | Google 만 | 변경 없음 | Google 만 | **D** | UI 연결 + 메일 링크 origin 허용 목록 |
| 기타 (k-cosmetics · pharmacy-hub) | Google 만 | 변경 없음 | Google 만 | **D** | 위와 같음 |
| Session | ✓ | authMethod 추가 | 구 버전 | **B** | 배포 시 traffic 을 나누지 않고 한 번에 전환 |
| Handoff | ✓ | source_auth_method | 컬럼 없음 | **B** | migration 11 |
| Admin Google-only | ✓ (password 자체가 없음) | ✓ 4경로 차단 | ✓ (password 자체가 없음) | **B** | 배포 뒤 경계 smoke |
| RBAC | ✓ role_assignments | 변경 없음 · 거부만 | ✓ | **A** | — |
| Legacy cleanup | runtime 0 · 비 runtime 잔재 | 고아 `email_verification_tokens` 정리 | 고아 테이블 0행 | **A** (runtime) / D (비 runtime) | §5-1 · F9 정리 WO |
| Docs | V3 · USER-DOMAIN · INDEX · MYPAGE 가 Google-only | V3 · USER-DOMAIN 에 블록만 추가 | — | **D** | CANONICAL-INDEX · MYPAGE 정정 WO |
| Production smoke | — | — | 미실시 | **D** | 배포 뒤 테스트 계정으로 smoke |

---

## 16. 후속 작업 (우선순위 순, 필요한 것만)

1. **S1 보완 (PR #257 안에서)** — Google 가입 시 `email_verified` 를 요구하고, forgot 발송 조건(credential 보유 또는 인증된 이메일)을 정한다. 방향은 사용자가 결정한다.
2. **PR #259 병합 → PR #257 에 main 반영** — 겹치는 SARIF 설정을 한 벌로 정리하고 최신 HEAD 에서 CI 를 다시 확인한다. merge-base 가 27 commit 뒤처져 있다.
3. **문서 정정** — CANONICAL-INDEX `:81-82` 와 O4O-MYPAGE-CANONICAL-V1 을 PR #257 정책에 맞춘다. 같은 PR 에 넣거나 직후 WO 로 진행한다. 정본 행 변경이므로 명시적 지시가 필요하다.
4. **PR #257 병합 (사용자)**
5. **배포 WO** — 새 DEPLOY_FREEZE · risk-gated 절차로 `o4o-core-api`(migration 10 · 11)와 `neture-web` 만 배포한다. 롤백 revision 은 배포 직전에 다시 확인한다(현재 03774 · 01666). traffic 은 한 번에 전환한다.
6. **운영 smoke** — 테스트 계정으로 가입 · 메일 확인 · 로그인 · 아이디 찾기 · 비밀번호 재설정 · admin 차단을 검증한다. 테스트 계정 준비는 사용자가 한다.
7. **Google OAuth origin 확인 · 등록** (Console 작업은 사용자) — supplier · funding · community · pharmacy · retail · store 등. 이메일 전환과는 별개로, 해당 호스트의 Google 로그인 smoke 선행 조건이다.
8. **(선택) 다른 서비스 확산 WO** — KPA · k-cosmetics · pharmacy-hub · store. 메일 링크 origin 허용 목록과 서비스별 화면이 필요하다.
9. **SECURITY_FOLLOWUP (F1~F10)** · **비 runtime legacy 정리** — 전환 뒤 별도 WO.

---

*이 조사는 코드 · DB · 배포 · 인증 설정을 변경하지 않았다. 운영 DB 조회는 `SET default_transaction_read_only = on` 아래에서 COUNT · schema 조회만 했다. 개인정보 · UUID · 자격정보는 기록하지 않았다.*
