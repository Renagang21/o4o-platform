# CHECK-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1

> 대상 WO: [`WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1`](../work-orders/WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1.md)
> 작성: 2026-09-30 · 갱신: 2026-09-30 (PR #257 병합·배포 전 보완 1~6) · 상태: **구현 · 로컬 검증 완료 / 운영 적용 · 실계정 확인 전 (DONE 아님)**

---

## 1. 구현 범위

| 층 | 내용 |
|---|---|
| DB | migration `1790683000000-CreateEmailPasswordAuthTables` — **신규 CREATE 2** (`user_password_credentials` · `password_reset_tokens`) + **DROP 후 재생성 1** (`email_verification_tokens`: 기존 고아 테이블 · 평문 `token` · camelCase → `token_hash` 형태). DROP 직전 **가드**: 행이 1개라도 있거나 예상한 옛 형태가 아니면 migration 실패(트랜잭션 `each` 로 전체 롤백 · DROP 미실행). CI 자동 적용 대상 |
| API | `EmailAuthService` · `PasswordCredentialService`(bcryptjs cost 12 · bcrypt 사용 파일은 이것 하나) · `email-auth.controller` — `POST /auth/email/{signup,verify,resend,login}` · `POST /auth/password/{forgot,reset}` · `POST /auth/account/find-id` · 로그인 사용자 `/auth/password` |
| 규칙 정본 | 이메일 정규화 · 형태 · 비밀번호 정책 · 안내 문구 · 가림 = `@o4o/auth-utils` 하나(화면 · 서버 공용 · tsup 이 번들에 인라인). 휴대전화 형태만 서버 `common/auth/phone-shape` |
| 세션 경계 | 토큰 claim `authMethod:'password'` · `password-session.policy` 가 login · refresh · middleware 에서 Admin 화면 · `platform:*` 역할 거부. 서비스 `:admin`(`supplier:admin` · `neture:admin` 등)은 거부 대상 아님 |
| handoff | 비밀번호 세션이면서 Google 이 연결된 계정은 handoff **생성 단계에서 403** `HANDOFF_PASSWORD_SESSION_NOT_ALLOWED` (service · workspace · 대표 진입 3경로). 비밀번호만 가진 계정 · Google 세션은 종전대로 발급 |
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
| — `unified-store-workspace-handoff.spec.ts` C-2 (추가) | 3경로 × Google 연결 비밀번호 세션 → 403 · INSERT 0 / 비밀번호 전용 · Google 세션 → 발급 |
| — `email-password-auth-migration-guard.spec.ts` (신규) | 0행 · 옛 형태 → DROP 후 재생성 / 행 존재 · 예상 밖 형태 2종 → DROP 전 실패. **QueryRunner 대역** — 실 PostgreSQL 왕복 아님(격리 PG 기동이 권한으로 거부됨) |
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
2. ~~handoff 수단 표식 미유지~~ → **보완**: Google 연결 계정의 비밀번호 세션은 handoff 생성 거부. 남은 창: 생성과 교환 사이(60초) 에 Google 이 새로 연결되면 교환 측은 Google 세션으로 추정한다(`handoff_tokens` 에 수단 컬럼 추가 = 스키마 변경이라 하지 않음).
3. 재설정 후 기존 access token 은 만료(15분)까지 유효 — refresh 는 즉시 무효.
4. 횟수 제한은 인스턴스별 메모리 limiter — Cloud Run 다중 인스턴스에서 합산되지 않는다.
5. bcrypt 72바이트 초과 부분은 비교에 쓰이지 않는다.
6. `lower(email)` 조회에 함수 인덱스 없음 — 현재 규모에서는 영향 없음.
7. ~~`validateDto` 400 응답의 `value` 되돌림~~ → **보완**: 민감 필드 `value` 제외(§1 · §2).
8. 메일 링크는 항상 neture origin 으로 간다(`resolveMailLinkOrigin`).
9. `/register` 는 여전히 로그인 모달을 연다(이메일 가입 링크는 모달 안에 있다).
10. migration 가드는 실 PostgreSQL 이 아니라 대역으로 검증했다 — 운영 적용 로그로 최종 확인.

## 6. 남은 절차

CI green → 배포 범위 보고(API + migration · web-neture · 공통 패키지 소비 서비스) → 사용자 배포 승인 → 운영 적용(직전 §3 재확인) → Google 로그인 회귀 · 실계정 가입 · 확인 메일 · 로그인 · 새로고침 유지 · handoff · 로그아웃 · 아이디 찾기 · 비밀번호 재설정 → DONE.
