# CHECK-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1

> 대상 WO: [`WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1`](../work-orders/WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1.md)
> 작성: 2026-09-30 · 갱신: 2026-09-30 (PR #257 병합·배포 전 보완 1~6 · 배포 전 최종 보완 1~4) · 상태: **구현 · 로컬 검증 완료 / 운영 적용 · 실계정 확인 전 (DONE 아님)**

---

## 1. 구현 범위

| 층 | 내용 |
|---|---|
| DB | migration `1790683000000-CreateEmailPasswordAuthTables` — **신규 CREATE 2** (`user_password_credentials` · `password_reset_tokens`) + **DROP 후 재생성 1** (`email_verification_tokens`: 기존 고아 테이블 · 평문 `token` · camelCase → `token_hash` 형태). DROP 직전 **가드**: 행이 1개라도 있거나 예상한 옛 형태가 아니면 migration 실패(트랜잭션 `each` 로 전체 롤백 · DROP 미실행). CI 자동 적용 대상 |
| API | `EmailAuthService` · `PasswordCredentialService`(bcryptjs cost 12 · bcrypt 사용 파일은 이것 하나) · `email-auth.controller` — `POST /auth/email/{signup,verify,resend,login}` · `POST /auth/password/{forgot,reset}` · `POST /auth/account/find-id` · 로그인 사용자 `/auth/password` |
| 규칙 정본 | 이메일 정규화 · 형태 · 비밀번호 정책 · 안내 문구 · 가림 = `@o4o/auth-utils` 하나(화면 · 서버 공용 · tsup 이 번들에 인라인). 휴대전화 형태만 서버 `common/auth/phone-shape` |
| 세션 경계 | 토큰 claim `authMethod:'password'` · `password-session.policy` 가 login · refresh · middleware 에서 Admin 화면 · `platform:*` 역할 거부. 서비스 `:admin`(`supplier:admin` · `neture:admin` 등)은 거부 대상 아님 |
| handoff | **원장이 출발 세션의 실제 수단을 보관한다** — migration `1790684000000-AddHandoffTokenSourceAuthMethod` 로 `handoff_tokens.source_auth_method`(varchar(16) · nullable · CHECK google/password) 추가. 발급 시 수단은 **서버가 검증한 access token claim 에서만** 파생(claim `password` → password · 검증된 토큰에 claim 없음 → google · 검증 불가 → password). body · Origin · Google 연결 여부는 쓰지 않는다. 교환 세션은 원장 값을 승계(`google` 외 값 · NULL → password)하고, password 이면 교환 시점의 새 역할로 `isPasswordSessionAllowed` 를 다시 적용(`platform:*` → 403 `PASSWORD_SESSION_NOT_ALLOWED`). 이전 보완의 "Google 연결 계정의 비밀번호 세션 handoff 403"은 **제거** — 정상적인 서비스 이동을 막지 않는다 |
| 입력 오류 응답 | 공통 `validateDto` · `validateQuery` · `validateParams` 400 응답이 민감 필드(password · passwordConfirm · currentPassword · newPassword · token · refreshToken 등)의 `value` 를 싣지 않는다. 그 밖의 값은 `redactSensitive` 경유 |
| 교차 사이트 요청 | 신규 route 8개(`/auth/email/*` · `/auth/password/{forgot,reset}` · `/auth/account/find-id` · `POST /auth/password`)는 `requireJsonBody` — JSON 외 본문은 415 `UNSUPPORTED_MEDIA_TYPE`(§5-1) |
| 횟수 제한 | `rateLimiter.ts` 메모리 limiter · 키 = 신뢰 클라이언트 IP. **로그인 = WO §2-1 `strictLimiter` 축: 15분 · 실패 5회 · 성공 미산입**(2026-10-01 Codex 재리뷰 P2 보완 — 종전 15분 20회 · 성공 포함은 WO 불일치). 실패 = status ≥ 400. 성공은 앞선 실패를 지우지 않고 창 끝까지 유지(`strictLimiter` 와 같은 정책). `strictLimiter` 인스턴스 자체는 키가 기본 `req.ip` · 429 본문이 문자열이라 같은 설정의 전용 인스턴스(`createEmailLoginLimiter`)로 둔다 — Google 로그인 경로(limiter 없음) 무영향. 테스트 `middleware/__tests__/email-login-limiter.test.ts`. 아이디 찾기만 **IP · 입력값 두 limiter 독립 적용**(WO §2-3, 2026-10-01 Codex 재리뷰 지적 보완): IP 당 1시간 10회 + 이름·전화 조합당 1시간 5회. 입력값 키 = `findid:` + sha256(이름 trim · 전화 숫자만 — `findLoginId` 대조 규칙과 같음) — 원문 미저장. 계정 유무와 무관하게 모두 센다(429 가 가입 단서가 되지 않음) · 응답 계약 불변. 테스트 `middleware/__tests__/find-login-id-limiter.test.ts` |
| 이메일 대소문자 정규화 (Google 가입) | `createGoogleUser` 도 `normalizeLoginEmail()`(trim · 소문자)로 저장하고, 저장 전 `lower(email) = $1` 로 대소문자만 다른 기존 users 를 확인해 있으면 **`EMAIL_IN_USE` 로 거절만** 한다 — 그 users 를 반환 · 연결 · 병합하지 않는다(Identity = Google sub 유지)(2026-10-01 Codex 재리뷰 P2 (a) 보완, #257 병합 blocker). 종전에는 원문 저장이라 `A@x.com`(Google) + `a@x.com`(비밀번호) 두 행이 생기고 `findUserByLoginEmail()` 이 모호 → 비밀번호 로그인 불능. 정규화 저장으로 동시 가입 경쟁은 기존 `users.email` UNIQUE 가 마지막으로 막는다. DB schema · migration · `lower(email)` unique index 추가 없음(운영 read-only 2026-10-01: users 3행 · `email <> lower(btrim(email))` 0 · 대소문자 중복 그룹 0 → 데이터 정리 불요). 기존 Google sub 로그인 · 저장된 주소는 재기록하지 않음. 테스트 `googleAuthService.test.ts` "이메일 대소문자 정규화" 6건 |
| 메일 링크 토큰 위치 | 확인 · 재설정 링크는 **`/verify-email#token=…` · `/reset-password#token=…`** — query(`?token=`) 아님(2026-10-01 Codex 재리뷰 P1 보완). fragment 는 HTTP 요청에 실리지 않아 `neture-web` 등 웹 서버 · Cloud Run 요청 로그에 토큰이 남지 않는다. 화면(`EmailAuthPages.tsx` `useOneTimeToken`)은 fragment 에서 토큰을 읽어 state(메모리)에 두고, **API 응답을 기다리지 않고** `useLayoutEffect` 에서 `history.replaceState` 로 주소창 · history 의 fragment 를 지운다(하위 화면의 API 호출보다 먼저). API 는 기존대로 JSON body(`/auth/email/verify` `{token}` · `/auth/password/reset` `{token,newPassword}`) — 계약 불변. query 토큰 fallback 없음(운영 미배포라 호환 대상 없음) |
| 세션 서비스 | 요청 Origin → `resolveSessionServiceKey` 로 파생. body `serviceKey` 받지 않음 |
| 공통 UI | `@o4o/auth-react` `email/` — `EmailLoginForm` · `EmailSignupForm` · `EmailSentNotice` · `VerifyEmailView` · `ForgotPasswordForm` · `ResetPasswordForm` · `FindLoginIdForm` · `PasswordInput`(보기/숨기기) · `PasswordPolicyHints` |
| 클라이언트 | `@o4o/auth-client` `loginWithEmail` 외 6 메서드 · `useServiceAuth.loginWithEmail` |
| web-neture | 로그인 모달(이메일 폼 → "또는" → Google) · **`/signup` = 가입 화면 정본(이메일 + Google 병행)** · `/register` → `/signup` · `/verify-email` · `/find-id` · `/forgot-password` · `/reset-password` |

비밀번호 정책: 8자 이상 · **UTF-8 72바이트 이하** + 영문자 · 숫자 · 특수기호 각 1자 이상 · 대소문자 요구 없음(보존). 특수기호 = Unicode 문장부호(P) · 기호(S) — 한글 등 일반 문자는 특수기호가 아니다. 72바이트 상한은 공통 검사(`checkPasswordPolicy` `too_long`) · 화면 안내 · 저장(`setPassword` 거절) · 검증(`verifyPassword` 불일치)에 모두 적용된다. 가입은 계정만 생성 — 서비스 가입 · 조직 · 역할 부여 0.

## 2. 검증 결과 (2026-09-30)

| 항목 | 결과 |
|---|---|
| api-server `type-check` | PASS |
| api-server `build:api`(tsup) | PASS — `dist/main.js` 에 `@o4o/auth-utils` 외부 import 0(인라인) |
| api-server Jest (auth 관련 18 suites) | PASS |
| — `validation-sensitive-echo.test.ts` (신규) | 비정상 입력 9종(200자 초과 · 비문자열 password · 허용 밖 `passwordConfirm` · verify/reset token · newPassword · currentPassword · refreshToken) → 400, 응답 본문에 입력 표식 0 · `value` 키 0. 일반 필드 값은 유지 · 중첩 token 은 `[REDACTED]` |
| — `refreshTokenFamilyContract.test.ts` P1~P4 (추가) | refresh 회전 후 `authMethod` 유지 · 나중에 붙은 `platform:*` 역할은 refresh 거부 · `supplier:admin`/`neture:admin` 허용 · Google 세션은 platform 역할이어도 회전 |
| — `unified-store-workspace-handoff.spec.ts` C-2 · D (재작성) | 발급: 3경로 × 비밀번호 세션 → 200 · 원장 `password` · `linked_accounts` 조회 0 / Google 세션 → `google` / 위조 토큰 + body 주장 → `password`. 교환: 원장 password → 대상 세션 password(교환 시 Google 연결돼 있어도) · NULL → password · password + 발급 뒤 `platform:*` 추가 → 403 · 토큰 발급 0 · password + `kpa-society:admin` → 허용 · google + `platform:super_admin` → Google 세션(claim 없음) |
| — `email-password-auth-migration-guard.spec.ts` (신규) | 0행 · 옛 형태 → DROP 후 재생성 / 행 존재 · 예상 밖 형태 2종 → DROP 전 실패 (QueryRunner 대역). 실 PostgreSQL 검증은 §2-1 |
| — 기존 리뷰 2건 회귀 (추가) | `abcdef1가` → `no_symbol` 거절 · `abcdef1!` 통과 · ASCII 기호 32개 전부 인정 / ASCII 72바이트 통과 · 73 거절 · 한글 `a1!`+23자(72바이트) 통과 · +24자(75) 거절 · 71바이트 뒤 ASCII 1자 통과 · 한글 1자 거절 / 저장 경로 73바이트 · 한글 초과 → `PasswordTooLongError` · 해시 미저장 / 앞 72바이트 같은 `+tail` → 검증 false(bcrypt 원형은 true 임을 함께 단언) · compare 1회 유지 / signup · reset · setPassword 모두 `PASSWORD_POLICY_VIOLATION` / 가입 화면 `72바이트 이하 ✕` · 제출 불가 |
| 계약 검사 `scripts/db/check-migration-contract.mjs` | 21 pass / 0 fail (baseline + incremental 11 state 등록) |

### 2-1. 격리 PostgreSQL 실검증 (2026-09-30)

운영 DB 가 아닌 로컬 docker `postgres:15.17`(운영 15.18 과 같은 major) · loopback 전용 포트 · 임시 DB · 무작위 비밀번호(미기록). 실제 `migrate.ts`(`transaction:'each'` · 사전/사후 fingerprint 단언)로 실행했다.

| 시나리오 | 결과 |
|---|---|
| S1 신규 bootstrap + incremental 11 | exit 0 · POST PASS (state 11 = `a110d335…` / 5927 lines) |
| S4 운영 경로: state 9(운영 현재)에서 10 · 11 적용 | exit 0 · PRE PASS(state 9) · POST PASS |
| S2 state 9 + `email_verification_tokens` 1행 | exit 1 "has 1 row(s) — refusing to DROP". 이후 `typeorm_migrations` 9행 그대로 · 신규 테이블 없음 · 행 보존 · `source_auth_method` 없음(11 미실행) · fingerprint 불변 → **전체 롤백** |
| S3a 예상 밖 형태(`token_hash` 컬럼 추가) · `migrate.ts` | 사전 단언 FAILED `UNKNOWN_PARTIAL` → migration 하나도 실행 안 함 |
| S3b · S3c 가드 직접 실행(`token_hash` 존재 · `token` 이름 변경) | "not the expected legacy shape — refusing to DROP" |
| S5 재실행(S1 · S4 뒤) | pending 0 · PRE/POST PASS |
| `down()` 11 → 10 → 9 | 정확히 state 10(`914406ef…`/5924) · state 9(`7fdd328f…`/5895) 복귀 |
| CHECK 제약 | google · password · NULL 삽입 OK · `'GOOGLE'` → check violation |

발견 · 수정 1건: email migration `down()` 이 옛 `email_verification_tokens` 를 PK · UNIQUE · 인덱스 · FK 없이 재생성하고 있었다(5889 ≠ 5895). baseline 이름 그대로 복원하도록 고쳤다(운영 미적용 migration 이라 수정 가능). 적용된 migration 은 수정하지 않았다.
| — `emailAuthService.test.ts` (추가) | 발송 실패(`success:false` · 예외) → `mailSent:false` · 계정 유지 · 재발송 링크로 확인 완료 |
| auth-react · auth-client · auth-utils · web-neture vitest | PASS (이전 실행, 이번 보완에서 해당 코드 무변경) |
| 운영 적용 · 실계정 가입/로그인 | **미실시** — 배포 승인 필요 |

CI(코드 최종 HEAD `ac9411795`): API Server Jest 1/3 · 2/3 · 3/3 · Code Quality · Guard Static Analysis · admin-dashboard build · Detect ×2 · Size Labels · SonarCloud **통과** / Admin Fast · Docs Fast 조건부 skip / **CodeQL Analyze 실패** — 분석 완료(1711/1711 TS 파일) · SARIF artifact 793건 · 이번 수정 파일 경유 0건, 실패 원인은 SARIF 업로드("Code scanning is not enabled")뿐. **"CI 전체 통과" 가 아니다.** 이 저장소는 개인 계정 private 이라 code scanning 을 켤 수 없다(공개 저장소 또는 조직 + 유료 Code Security 필요) — 해소는 `ci-security.yml` `upload: never` 등 별도 CI WO.

저장 검사(V10): 해시 경로는 `PasswordCredentialService` 테스트로 bcrypt 해시 저장 · 평문 비교 불가를 확인했다. `chk_upc_hash_len` 은 **해시 길이 하한 검사**일 뿐 해시 여부를 보장하지 않는다.

URL · 로그 토큰 노출(V10, 2026-10-01 재확인 · fragment 보완 뒤):
- 생성 링크: `email-auth.service.ts` 의 확인 · 재설정 링크 2곳 모두 `#token=` — `?token=` 생성 0건. `emailAuthService.test.ts` "링크 토큰 위치" 2건이 `URL.search === ''` · `hash` 형식 · 메일 전체(`data` · `html`)에 `?token=` 없음을 고정.
- 화면: `EmailAuthPages.token.test.tsx` 8건(실제 `window.location` + `BrowserRouter`) — hash 토큰 읽기 · 렌더 직후 주소창 fragment 0 · **API 호출 시점에 이미 fragment 0** · verify body 전달 · reset body 전달 · `?token=` 무시 · 토큰 없음 · 잘못된 토큰 회귀.
- 서버 로그: email-auth service · controller 의 `logger` 호출은 고정 문구 + 오류 메시지 · 이름 · 코드뿐 — 토큰 · 링크 URL · body 미포함. API 요청 URL 을 남기는 `[SlowRequest]`(`req.originalUrl`)는 토큰 소비가 POST body 라 URL 에 토큰이 없다. mail-core 는 EmailLog 에 수신자 · 제목 · 상태 · template 만 기록(본문 · 링크 미기록), 개발용 `jsonTransport` 는 출력하지 않는다.
- 화면 쪽 console · 오류 메시지에 토큰 · 비밀번호를 넣는 경로 없음(추가 0).

Guard spec: `google-only-auth-cleanup.spec` · `legacy-password-auth-retirement.spec` 는 이 WO 의 새 구조를 허용하도록 갱신했고, `service_credentials` · 서비스별 password 구조 · `users.password` 부활은 계속 차단한다.

## 3. 운영 사전 확인 (read-only · 2026-09-30)

| 항목 | 결과 |
|---|---|
| `email_verification_tokens` 행 수 | 0 |
| 컬럼 | `id,token,userId,expiresAt,email,usedAt,createdAt` (가드가 기대하는 옛 형태) |
| 이 테이블을 참조하는 FK · view · 사용자 trigger | 0 · 0 · 0 |
| `user_password_credentials` · `password_reset_tokens` 존재 | 없음 |
| 이 migration 적용 이력 | 없음 |
| 코드 소비처 | 이 PR 의 신규 코드 · 테스트 · migration · baseline 만. 기존 런타임 0 |

누적 통계(`pg_stat_user_tables`)에 과거 insert/delete 기록이 있으나 현재 0행이며, 소비처는 Google-only 정리에서 제거됐다. 적용 시점에 조건이 달라지면 migration 가드가 DROP 없이 실패한다.

## 4. 메일 준비 상태 (배포 전 · 비밀값 미기재)

| 항목 | 상태 |
|---|---|
| 운영 설정 | `EMAIL_SERVICE_ENABLED=true` · SMTP host/port/user/pass 설정됨 · 현재 revision 기동 로그 "Email service initialized and verified successfully" |
| 발신자 | `EMAIL_FROM` 미설정 → `SMTP_USER`(gmail.com 계정)가 From. 표시 이름은 `EMAIL_FROM_NAME` |
| 템플릿 | 확인 메일 = 파일 템플릿 `email-verification.html`(`{{verifyUrl}}` · `{{year}}`, deploy-api 가 이미지에 복사) · 재설정 메일 = 서비스 내 HTML |
| 링크 origin | `https://neture.co.kr` (`resolveMailLinkOrigin` → service-catalog) · `/verify-email` · `/reset-password` 는 web-neture 에 있음 → **web-neture 동시 배포 필요** |
| 발송 실패 후 | 계정 · 수단은 커밋된 채 `mailSent:false` 응답 → 가입 안내 화면과 로그인(`EMAIL_NOT_VERIFIED`)에 "확인 메일 다시 보내기". 재발송은 새 토큰 발급 · 이전 토큰 무효(테스트 고정) |
| 관찰 사항 | ① `SMTP_PASS` 가 Secret Manager 참조가 아닌 plain env ② Gmail SMTP 일일 발송 한도 · 개인 계정 발신 — 설정 변경은 범위 밖(보고만) |
| 실수신 · 링크 사용 | **운영 적용 후 사용자 계정으로 확인** |

## 5. 알려진 한계

1. 아이디 찾기는 가린 이메일 힌트를 준다 — 가입 여부의 완전한 은닉은 목표가 아니다(WO §2-3).
2. ~~handoff 수단 표식 미유지~~ → **해소**: 원장 `source_auth_method` 승계(§1). 발급과 교환 사이에 Google 이 연결되거나 역할이 바뀌어도 password 가 google 로 승격되지 않는다. 배포 창 주의: migration 적용 ~ 새 revision traffic 전환 사이(약 1분)에 옛 코드가 발급한 handoff 는 NULL → password 로 교환된다(fail-closed). 이 창에 handoff 하는 `platform:*` Google 사용자는 403 을 받고 다시 시도하면 된다.
3. 재설정 후 기존 access token 은 만료(15분)까지 유효 — refresh 는 즉시 무효.
4. 횟수 제한은 인스턴스별 메모리 limiter — Cloud Run 다중 인스턴스에서 합산되지 않는다.
5. ~~bcrypt 72바이트 초과 부분은 비교에 쓰이지 않는다~~ → **해소**: UTF-8 72바이트 상한을 정책 · 화면 · 저장 · 검증에 적용(§1 · §2). 잘라 인증하지 않는다.
6. `lower(email)` 조회에 함수 인덱스 없음 — 현재 규모에서는 영향 없음.
7. ~~`validateDto` 400 응답의 `value` 되돌림~~ → **보완**: 민감 필드 `value` 제외(§1 · §2).
8. 메일 링크는 항상 neture origin 으로 간다(`resolveMailLinkOrigin`).
9. ~~`/register` 는 여전히 로그인 모달을 연다~~ → **해소**: `/signup` 을 **가입 화면 정본**으로 만들고
   (이메일 폼 → "또는" → 「Google 로 계속하기」 · 로그인 모달과 같은 순서·구분선) `/register` 는 그
   화면으로 보낸다. WO 「확정된 사용자 흐름」의 "가입 화면은 두 방식을 함께 제공한다" 를 충족하고,
   가입 진입점이 모달과 `/signup` 두 곳으로 갈라지던 상태를 없앤다. 로그인 상태 판정은 그대로
   유지한다(로그인 사용자는 홈 · 세션 복구 중 이동 보류 — 루프 방지 계약 불변).
10. ~~migration 가드 대역 검증만~~ → **해소**: 격리 PG 15.17 실검증(§2-1). 운영 적용 로그로 최종 확인은 여전히 필요.
11. CodeQL 은 `apps/api-server/src` 만 분석한다(web · packages 미분석). PR 실행도 결과는 저장소 전체(793)다.

## 5-1. CodeQL 결과 보존

repo 에 code scanning 이 켜져 있지 않아 SARIF 업로드가 실패한다(설정 · 공개 범위 · 유료 기능 변경은 범위 밖). `ci-security.yml` 에 `output: codeql-sarif` + `if: always()` artifact(`codeql-sarif-typescript`, 14일) 만 추가했다. 결과 판정은 SARIF 를 직접 읽어 기록한다 — 분석 완료만으로 보안 PASS 로 기록하지 않는다.

**수치 정합** (`727fb78f6` 기준. `requireJsonBody` 보완 커밋 이후 SARIF 재확인은 PR #257 코멘트 · 완료 보고)

`727fb78f6` SARIF(run 36673875507): 분석 성공(`executionSuccessful:true`) · step 실패 원인 = 업로드("Code scanning is not enabled") 뿐. 결과 **793건**(PR 전체 저장소 결과 — diff 로 좁혀지지 않았다) — `js/missing-rate-limiting` 757 · `incomplete-multi-character-sanitization` 14 · `incomplete-url-substring-sanitization` 6 · `double-escaping` 5 · `bad-tag-filter` 3 · `clear-text-storage-of-sensitive-data` 2 · `missing-token-validation` · `biased-cryptographic-random` · `insecure-helmet-configuration` · `sensitive-get-query` · `client-exposed-cookie` · `clear-text-cookie` 각 1.

- 비교 기준: 병합 기준점 `bfa48c135`(main 분기점 = 현 운영 API · web-neture 이미지) ↔ PR HEAD 의 `git diff -U0` 변경 줄. main 에는 SARIF 보존 step 이 없어 **SARIF 대 SARIF 비교는 불가** — 위치 대조로 판정한다.
- 판정 방법: 각 결과의 **대표 위치 + relatedLocations + codeFlows 전 위치**를 변경 줄과 대조한다.
- 793 = **12**(대표 위치가 PR 이 바꾼 파일 `auth.routes.ts` 에 있으나 변경되지 않은 기존 route 줄 — `missing-rate-limiting`, 관련 위치도 변경 줄 밖) + **781**(대표 위치가 PR 이 바꾸지 않은 파일).
- 대표 위치가 PR 변경 줄에 있는 결과 = 0. **그러나 관련 위치 · 흐름이 PR 변경 줄을 지나는 결과 3건**이 있다 — 이전 보고의 "신규 0"은 대표 위치만 본 판정이라 정정한다. 3건 모두 대표 위치는 변경되지 않은 파일(기존 결과)이며, 이 PR 이 새 경로를 보탰다.

| 결과 | 대표 위치 | PR 관련 위치 | 판정 |
|---|---|---|---|
| `js/missing-token-validation` (CSRF) | `bootstrap/setup-middlewares.ts:247` `cookieParser()` | 관련 handler 1140 중 신규 route 8(`auth.routes.ts` 100~106 · `/password`) | **관련 · 보완함**. 쿠키는 운영 `SameSite=None` · `express.urlencoded` 활성 → 교차 사이트 form 이 쿠키를 싣고 도착 가능. 1차 방어 = CORS(비허용 Origin 은 `callback(new Error)` → handler 전 중단). 특히 `POST /auth/password` 는 비밀번호 없는 계정에 현재 비밀번호 없이 첫 비밀번호를 설정하므로 2차 방어로 `requireJsonBody`(JSON 외 415 · handler 미실행) 를 신규 route 8개에 적용 → 교차 출처 요청은 반드시 preflight(CORS 거부)를 거친다. 테스트 `middleware/__tests__/require-json-body.test.ts` 13. 전역 CSRF token 도입은 전 서비스 계약 변경이라 범위 밖 — CodeQL 규칙은 token middleware 만 인정하므로 이 결과 자체는 남는다 |
| `js/clear-text-storage-of-sensitive-data` ×2 | `utils/cookie.utils.ts:86` · `:92` (`setAuthCookies` 의 access · refresh 쿠키) | 흐름: `email-auth.service.ts:248` `generateTokensWithContext` → `:439` · `:455` → `email-auth.controller.ts:94~95` | **관련 · 설계상 유지**. 저장되는 값은 비밀번호가 아니라 세션 토큰이며, Google 로그인과 같은 sink(기존 결과). 쿠키는 `httpOnly:true` · 운영 `secure:true`. 비밀번호 원문 · 해시는 흐름에 없다. 토큰을 쿠키에 두는 세션 구조 변경은 범위 밖 |
| `js/insecure-helmet-configuration` | `src/server.ts:25` | 없음 | **무관**. `server.ts` 는 tsup entry 가 아니고 import 하는 곳 0 → 운영 번들 밖. 게다가 production 에서는 CSP 켜짐(`undefined`). 운영 진입점 `main.ts` → `setupMiddlewares` 는 CSP directive · `frameAncestors 'none'` · `frameguard deny`. API 는 JSON 만 응답 — 신규 화면(`/signup` 등)은 web-neture 컨테이너가 서빙 |

기존 결과 전체 정비(781 + 위 3건의 전역 측면)는 후속 보안 작업.

## 5-2. 롤백

- `deploy-api.yml` 순서: 이미지 build/push → **Run database migrations**(`gcloud run jobs execute o4o-api-migrations --wait`, `continue-on-error` 없음) → **Deploy to Cloud Run** → 검증. migration 실패 시 step 실패로 workflow 가 멈춰 **새 revision 배포 · traffic 전환이 일어나지 않고** 기존 revision 이 계속 서비스한다. 자동 revert · `down()` 경로는 없다.
- 기본 롤백 = API · web-neture 를 직전 revision 으로 traffic 복귀(`gcloud run services update-traffic`). 추가된 컬럼(nullable) · 신규 테이블은 옛 코드와 호환된다.
- **가입 데이터가 생긴 뒤에는 migration `down()` 을 실행하지 않는다** — `user_password_credentials` · `password_reset_tokens` · 인증 토큰을 DROP 한다. 필요 시 별도 WO.

## 5-2-1. 배포 대상 (서비스명 확정)

`DEPLOY_ENABLED=false` 인 채로 병합하면 push 기반 배포는 모두 보류된다. 배포는 **서비스 지정 수동 실행**으로만 한다 — detector 는 `@o4o/auth-react` · `@o4o/auth-client` 소비처 8개(web 7 + admin)를 영향으로 판정하므로 자동 전체 배포를 쓰지 않는다.

| 대상 | 재배포 | 근거 |
|---|---|---|
| `o4o-core-api` (+ job `o4o-api-migrations`: incremental 10 `CreateEmailPasswordAuthTables1790683000000` · 11 `AddHandoffTokenSourceAuthMethod1790684000000`) | **필요** | 신규 route · 세션 정책 · handoff 원장. `@o4o/auth-utils` 는 번들에 인라인 |
| `neture-web` | **필요** | 이메일 로그인 모달 · `/signup` · `/verify-email` · `/find-id` · `/forgot-password` · `/reset-password` (메일 링크 origin = neture.co.kr) |
| `kpa-society-web` · `k-cosmetics-web` · `pharmacy-hub-web` · `lecture-web` · `store-web` · `kpa-branch-web` | 불필요 | 공통 패키지 변경은 추가형(새 컴포넌트 · 선택 메서드 `loginWithEmail?`). 이 서비스들은 이메일 로그인 화면이 없다. 비밀번호 세션은 handoff 로만 도착하며 교환 · refresh · `/me` 응답 형태는 변경 없음(`authMethod` 는 JWT claim 안에만). 비밀번호 세션 refresh 는 claim 을 유지하며 회전(P1 테스트) |
| `o4o-admin-dashboard` | 불필요 | 비밀번호 세션은 Admin 화면에서 교환 403 · middleware 403 — 옛 화면도 서버 판정으로 막힌다(의도) |
| `hospital-pharmacy-web` · `signage-player-web` · `glucoseview-web` | 불필요 | 공통 인증 패키지 비소비 또는 무관 |

현 운영(2026-09-30 read-only): `o4o-core-api-03758-wdt` 100% · `neture-web-01664-t5r` 100% · migration job 이미지 `bfa48c135` (= PR 병합 기준점). 운영 DB: `typeorm_migrations` 693(= KEEP 684 + incremental 9) · `email_verification_tokens` 0행 · 옛 형태 컬럼 · 참조 FK 0 · 신규 테이블 0 · `handoff_tokens.source_auth_method` 없음.

배포 순서: ① 직전 read-only 재확인(위 항목) ② `DEPLOY_ENABLED=true` → `deploy-api` 수동 실행(migration 10 · 11 → 새 revision → 100%) ③ 확인 후 `deploy-web-services` `service=neture` ④ `DEPLOY_ENABLED=false` 복귀. 게이트가 열린 동안의 다른 main push 는 자동 배포 대상이 될 수 있으므로 창을 짧게 둔다.

## 5-3. 후속

- 이메일 로그인 화면을 web-neture 외 서비스(kpa-society · kpa-branch · k-cosmetics · pharmacy-hub · store)에도 연결 — 별도 WO(2026-10-01 Codex 재리뷰 P1, 비차단 · Demo 계정 작업 전 검토).
- 로그인 상태 비밀번호 추가 · 변경(`POST /auth/password`)의 `auth-client` 메서드 · `AccountSecuritySettings` UI — 별도 WO(같은 리뷰 P2, 비차단). 그 전까지 V2 는 운영 화면으로 검증할 수 없다.
- **Token Lifecycle Hardening (별도 WO 1건으로 묶음 · #257 병합 blocker 아님)** — 토큰의 발급 · 소비 · 트랜잭션 원자성. 아래 3건:
  - 같은 사용자 동시 forgot · 재발송 시 미소비 토큰 2개가 살 수 있음 — 새 토큰 발급 시(또는 소비 시) 같은 사용자 · 같은 목적의 미소비 토큰 전부 무효화. 보안 hardening 별도 WO(2026-10-01 Codex 재리뷰 P2 #2, 비차단 — 두 링크 모두 같은 확인된 메일함으로만 간다).
  - 재설정 도중 일시 장애 시 토큰이 이미 소비돼 같은 링크로 재시도 불가 — reliability/UX 별도 WO(같은 리뷰 P2 #3, 비차단 — 선소비는 보안상 보수적).
  - 확인(verify) 도중 일시 장애 시 토큰이 이미 소비돼 같은 링크로 재시도 불가 — 사용자 · 이메일 검증 · `isEmailVerified` 갱신 · 최종 소비를 한 트랜잭션으로(2026-10-01 Codex 재리뷰 P2 (b), 비차단 — 확인 메일 재발송으로 복구 가능).
- `SMTP_PASS` 를 plain env 에서 Secret Manager 참조(`--update-secrets`)로 이전 — 별도 WO(비밀값 미기재).

## 6. 남은 절차

CI(CodeQL 업로드 실패 1건 기록 · 나머지 통과) · SARIF 판정 → 배포 범위 보고(§5-2-1: `o4o-core-api` + migration 10 · 11 · `neture-web` 만) → 사용자 배포 승인 → 운영 적용(직전 §3 재확인) → Google 로그인 회귀 · 실계정 가입 · 확인 메일 · 로그인 · 새로고침 유지 · handoff · 로그아웃 · 아이디 찾기 · 비밀번호 재설정 → DONE.
