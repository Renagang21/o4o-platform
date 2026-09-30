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
| 세션 서비스 | 요청 Origin → `resolveSessionServiceKey` 로 파생. body `serviceKey` 받지 않음 |
| 공통 UI | `@o4o/auth-react` `email/` — `EmailLoginForm` · `EmailSignupForm` · `EmailSentNotice` · `VerifyEmailView` · `ForgotPasswordForm` · `ResetPasswordForm` · `FindLoginIdForm` · `PasswordInput`(보기/숨기기) · `PasswordPolicyHints` |
| 클라이언트 | `@o4o/auth-client` `loginWithEmail` 외 6 메서드 · `useServiceAuth.loginWithEmail` |
| web-neture | 로그인 모달(이메일 폼 → "또는" → Google) · `/signup` · `/verify-email` · `/find-id` · `/forgot-password` · `/reset-password` |

비밀번호 정책: 8자 이상 + 영문자 · 숫자 · 특수기호 각 1자 이상 · 대소문자 요구 없음(보존). 가입은 계정만 생성 — 서비스 가입 · 조직 · 역할 부여 0.

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

CI(최종 HEAD) 결과는 PR #257 코멘트 · 완료 보고에 기록한다.

저장 검사(V10): 해시 경로는 `PasswordCredentialService` 테스트로 bcrypt 해시 저장 · 평문 비교 불가를 확인했다. `chk_upc_hash_len` 은 **해시 길이 하한 검사**일 뿐 해시 여부를 보장하지 않는다.

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
5. bcrypt 72바이트 초과 부분은 비교에 쓰이지 않는다.
6. `lower(email)` 조회에 함수 인덱스 없음 — 현재 규모에서는 영향 없음.
7. ~~`validateDto` 400 응답의 `value` 되돌림~~ → **보완**: 민감 필드 `value` 제외(§1 · §2).
8. 메일 링크는 항상 neture origin 으로 간다(`resolveMailLinkOrigin`).
9. `/register` 는 여전히 로그인 모달을 연다(이메일 가입 링크는 모달 안에 있다).
10. ~~migration 가드 대역 검증만~~ → **해소**: 격리 PG 15.17 실검증(§2-1). 운영 적용 로그로 최종 확인은 여전히 필요.
11. CodeQL 은 `apps/api-server/src` 만 분석한다(web · packages 미분석). PR 분석은 diff-informed.

## 5-1. CodeQL 결과 보존

repo 에 code scanning 이 켜져 있지 않아 SARIF 업로드가 실패한다(설정 · 공개 범위 · 유료 기능 변경은 범위 밖). `ci-security.yml` 에 `output: codeql-sarif` + `if: always()` artifact(`codeql-sarif-typescript`, 14일) 만 추가했다. 결과 판정은 SARIF 를 직접 읽어 기록한다 — 분석 완료만으로 보안 PASS 로 기록하지 않는다.

**`ed57dfcf1` SARIF (run 36672957743)**: 분석 성공(`executionSuccessful:true`) · step 실패 원인 = 업로드("Code scanning is not enabled") 뿐. 결과 793건 — `js/missing-rate-limiting` 757 · `incomplete-multi-character-sanitization` 14 · `incomplete-url-substring-sanitization` 6 · `double-escaping` 5 · `bad-tag-filter` 3 · `clear-text-storage-of-sensitive-data` 2 · `missing-token-validation` · `biased-cryptographic-random` · `insecure-helmet-configuration` · `sensitive-get-query` · `client-exposed-cookie` · `clear-text-cookie` 각 1.
- 이 PR 이 바꾼 api-server 파일에 걸린 것은 `auth.routes.ts` 의 `missing-rate-limiting` 12건뿐이며, 모두 **기존 route**(Google login · refresh · me · logout 등) 줄이다. PR hunk(신규 email/password route 7 + `POST /auth/password`) 안의 결과는 0 — 신규 route 는 전부 limiter 를 거친다.
- 나머지 781건은 이 PR 이 건드리지 않은 파일의 기존 결과다. 기존 결과 정리는 범위 밖 — 별도 WO 제안(특히 `missing-token-validation` · `clear-text-storage` · `insecure-helmet-configuration` 우선 triage).
- 판정: **이 PR 의 신규 결과 0 · 기존 결과 미해결** (보안 전체 PASS 아님).

## 5-2. 롤백

- `deploy-api.yml` 순서: 이미지 build/push → **Run database migrations**(`gcloud run jobs execute o4o-api-migrations --wait`, `continue-on-error` 없음) → **Deploy to Cloud Run** → 검증. migration 실패 시 step 실패로 workflow 가 멈춰 **새 revision 배포 · traffic 전환이 일어나지 않고** 기존 revision 이 계속 서비스한다. 자동 revert · `down()` 경로는 없다.
- 기본 롤백 = API · web-neture 를 직전 revision 으로 traffic 복귀(`gcloud run services update-traffic`). 추가된 컬럼(nullable) · 신규 테이블은 옛 코드와 호환된다.
- **가입 데이터가 생긴 뒤에는 migration `down()` 을 실행하지 않는다** — `user_password_credentials` · `password_reset_tokens` · 인증 토큰을 DROP 한다. 필요 시 별도 WO.

## 5-3. 후속

- `SMTP_PASS` 를 plain env 에서 Secret Manager 참조(`--update-secrets`)로 이전 — 별도 WO(비밀값 미기재).

## 6. 남은 절차

CI green · SARIF 판정 → 배포 범위 보고(API + migration 10 · 11 · web-neture · 공통 패키지 소비 서비스) → 사용자 배포 승인 → 운영 적용(직전 §3 재확인) → Google 로그인 회귀 · 실계정 가입 · 확인 메일 · 로그인 · 새로고침 유지 · handoff · 로그아웃 · 아이디 찾기 · 비밀번호 재설정 → DONE.
