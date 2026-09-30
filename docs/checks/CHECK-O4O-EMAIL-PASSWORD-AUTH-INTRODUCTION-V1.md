# CHECK-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1

> 대상 WO: [`WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1`](../work-orders/WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1.md)
> 작성: 2026-09-30 · 상태: **구현 · 로컬 검증 완료 / CI · 운영 적용 · 실계정 확인 전 (DONE 아님)**

---

## 1. 구현 범위

| 층 | 내용 |
|---|---|
| DB | migration `1790683000000-CreateEmailPasswordAuthTables` — `user_password_credentials` · `email_verification_tokens` · `password_reset_tokens` (§5 승인 1의 3 테이블만). CI 자동 적용 대상 |
| API | `EmailAuthService` · `PasswordCredentialService`(bcryptjs cost 12 · bcrypt 사용 파일은 이것 하나) · `email-auth.controller` — `POST /auth/email/{signup,verify,resend-verification,login,forgot-password,reset-password,find-id}` |
| 세션 경계 | 토큰 claim `authMethod:'password'` · `password-session.policy` 가 login · refresh · middleware · handoff 4지점에서 Admin · `platform:*` 역할 거부 (V12) |
| 세션 서비스 | 요청 Origin → `resolveSessionServiceKey` 로 파생. body `serviceKey` 받지 않음 |
| 공통 UI | `@o4o/auth-react` `email/` — `EmailLoginForm` · `EmailSignupForm` · `EmailSentNotice` · `VerifyEmailView` · `ForgotPasswordForm` · `ResetPasswordForm` · `FindLoginIdForm` · `PasswordInput`(보기/숨기기) · `PasswordPolicyHints` |
| 클라이언트 | `@o4o/auth-client` `loginWithEmail` 외 6 메서드 · `useServiceAuth.loginWithEmail` |
| web-neture | 로그인 모달(이메일 폼 → "또는" → Google) · `/signup` · `/verify-email` · `/find-id` · `/forgot-password` · `/reset-password` |

비밀번호 정책: 8자 이상 + 영문자 · 숫자 · 특수기호 각 1자 이상 · 대소문자 요구 없음(보존). 가입은 계정만 생성 — 서비스 가입 · 조직 · 역할 부여 0.

## 2. 로컬 검증 결과 (2026-09-30)

| 항목 | 결과 |
|---|---|
| api-server `type-check` | PASS |
| api-server Jest (auth 관련 15 suites · legacy/google-only guard spec 포함) | PASS 241/241 |
| auth-react vitest | PASS 98/98 |
| auth-client vitest | PASS 15/15 |
| auth-utils vitest | PASS 23/23 |
| web-neture vitest | PASS 280/280 |
| auth-react 소비처 tsc (web-k-cosmetics · web-kpa-branch · web-kpa-society · web-lecture · web-pharmacy-hub · web-store · admin-dashboard · web-neture) | PASS (exit 0) |
| web-neture `vite build` | PASS |
| CI (PR #257 · `2d29ee338`) | Jest 3 shard · Code Quality · Guard Static · admin-dashboard build · SonarCloud **PASS**. `Analyze (typescript)`(CodeQL) **FAIL** — 분석은 완료, SARIF 업로드가 "Code scanning is not enabled for this repository" 로 거절(저장소 설정 · 코드 무관 · 필수 check 아님). 1차 실행의 Jest 2 spec(handoff 대역) · SonarCloud S2245 실패는 `2d29ee338` 로 수정 |
| 운영 적용 · 실계정 가입/로그인 | **미실시** — 배포 승인 필요 |

V1~V12 는 서비스 단위 테스트로 고정했고(`emailAuthService.test.ts` · `passwordCredentialService.test.ts` · `passwordSessionBoundary.test.ts`), **실환경 확인은 운영 적용 후** 이 문서에 추가한다.

저장 검사(V10): 해시 경로는 `PasswordCredentialService` 테스트로 bcrypt 해시 저장 · 평문 비교 불가를 확인했다. `chk_upc_hash_len` 은 **해시 길이 하한 검사**일 뿐 해시 여부를 보장하지 않는다.

Guard spec: `google-only-auth-cleanup.spec` · `legacy-password-auth-retirement.spec` 는 이 WO 의 새 구조를 허용하도록 갱신했고, `service_credentials` · 서비스별 password 구조 · `users.password` 부활은 계속 차단한다.

## 3. 편차 (보고 대상)

- **auth-utils 규칙 미러.** api-server 에 `@o4o/auth-utils` 의존이 없어(의존 추가 = 중지 조건) 서버 쪽 `common/auth/email-credential.rules.ts` 에 정책 규칙을 복제하고 parity 테스트(`emailCredentialRulesParity.test.ts`)로 두 쪽 일치를 고정했다. 의존 추가 승인 시 미러 제거 가능.

## 4. 알려진 한계

1. 아이디 찾기는 가린 이메일 힌트를 준다 — 가입 여부의 완전한 은닉은 목표가 아니다(WO §2-3).
2. 두 수단을 모두 가진 사용자가 handoff 하면 대상 서비스에서 수단 표식이 유지되지 않을 수 있다(경계 판정은 역할 기준이라 Admin 거부는 유지).
3. 재설정 후 기존 access token 은 만료(15분)까지 유효 — refresh 는 즉시 무효.
4. 횟수 제한은 인스턴스별 메모리 limiter — Cloud Run 다중 인스턴스에서 합산되지 않는다.
5. bcrypt 72바이트 초과 부분은 비교에 쓰이지 않는다.
6. `lower(email)` 조회에 함수 인덱스 없음 — 현재 규모에서는 영향 없음.
7. 공통 `validateDto` 의 400 응답은 실패 필드의 `value` 를 요청자에게 되돌려 준다. 비밀번호 필드는 `IsString · IsNotEmpty · MaxLength(200)` 만 DTO 에서 검사하므로(정책 검사는 서비스 층) 200자 초과 · 비문자열 입력일 때만 해당하며, 요청자 본인에게만 돌아가고 저장 · 로그 대상은 아니다. 공통 미들웨어 수정은 범위 밖(별도 WO 후보).
8. 메일 링크는 항상 neture origin 으로 간다(`resolveMailLinkOrigin`).
9. `/register` 는 여전히 로그인 모달을 연다(이메일 가입 링크는 모달 안에 있다).

## 5. 남은 절차

CI green → 배포 범위 보고(API + migration · web-neture · 공통 패키지 소비 서비스) → 사용자 배포 승인 → 운영 적용 → 실계정 가입 · 확인 메일 · 로그인 · 새로고침 유지 · handoff · 로그아웃 · Google 회귀 확인 → DONE.
