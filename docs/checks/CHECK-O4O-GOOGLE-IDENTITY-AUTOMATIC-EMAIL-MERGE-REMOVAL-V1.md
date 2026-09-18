# CHECK-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1

> **WO:** [`WO-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1`](../work-orders/WO-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1.md) (WO-2B)
> **선행:** WO-2A [`CHECK-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1`](CHECK-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1.md) — `COMPLETE_WITH_MANUAL_SMOKE_PENDING`
> **실행일:** 2026-09-18 · **코드 commit:** `cfab48aed` · **Core 예외:** auth-core(F10) — WO-2A/IR 승인 범위

---

## 0. 최종 판정

```text
WO-2B: COMPLETE
```

| 축 | 결과 |
|---|---|
| 자동병합 #1 (`socialAuthService.handleSocialAuth`) | **삭제** (파일 전체 dead · caller = passportDynamic strategy 3곳 · route 0) |
| 자동병합 #2 (`AuthLoginService.handleOAuthLogin`) | **삭제** · `login()` email 전용 |
| `AccountLinkingService.mergeAccounts` | **은퇴** (caller 0) |
| `googleIdentityService` 골격 | `services/auth/google-identity.service.ts` · endpoint 0 |
| audience allowlist config | `config/google-identity.config.ts` · `GOOGLE_ALLOWED_CLIENT_IDS` · 운영값 0 |
| 정적 guard (TS AST) | G1~G7 PASS · 제거 전 코드에 역적용 시 2건 검출(자기검증) |
| verifier 단위 테스트 | 11/11 PASS (WO 요구 9 이상) |
| auth 회귀 | services/auth · modules/auth · security 28 suites 471 PASS + auth 관련 46 suites 770 PASS (closure spec 1건 계약 반전 후) |
| tsc / build / eslint | PASS / PASS / 0 error |
| DB migration · 운영 데이터 | 0 · 0 |
| WO-2A 운영 200 login smoke | **여전히 PENDING** (사용자 1회 로그인 확인 대기) — WO-2C 착수 게이트 |

---

## 1. 시작 Git 상태

- 시작: `HEAD be247421c == origin/main` · 작업트리 clean (다른 세션 dirty `docs/baseline/O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md` 1건 불가침).
- 작업 중 다른 세션이 같은 체크아웃에 `415707243` · `bd6d3f02a` 를 커밋 → 본 WO 커밋의 부모 = `bd6d3f02a`. 충돌 0(경로 겹침 없음).

## 2. WO-2A manual 200 smoke 상태

`COMPLETE_WITH_MANUAL_SMOKE_PENDING` 유지. 본 WO 는 사용자 지시("문서 등록과 작업 착수는 진행")에 따라 착수했다. **WO-2C 착수 전 `POST /auth/login` 운영 200 실측 필수.** 사용자가 "운영 로그인 정상 확인" 을 알리면 WO-2A CHECK §6-C 를 닫는다.

## 3. 자동병합 #1 실제 caller (검증 A)

| 경로 | 결과 |
|---|---|
| `SocialAuthService.*` 식별자 검색 (`apps/api-server/src`) | `config/passportDynamic.ts:21,257,291,323` 뿐 — Google/Kakao/Naver strategy verify callback 3곳 |
| `passport.authenticate` route | **0** (`apps/api-server/src` 전체) |
| social callback route mount (`/auth/google|kakao|naver`, `callback`) | routes · modules/auth/routes 에 **0** |
| `completeSocialLogin` · `linkSocialAccount` · `unlinkSocialAccount` · `getLinkedAccounts` | caller **0** |
| packages/ · services/ (web) | 참조 0 |
| 테스트 | 참조 0 |

→ IR #7 (DEAD) 과 일치. **파일 전체 삭제.** `passportDynamic` 은 strategy 등록(settings 상태 endpoint `getActiveStrategies` 소비)만 남기고 verify callback 은 `done(new Error('LEGACY_SOCIAL_AUTH_DISABLED'))` — user 생성·조회·병합 0. 미사용 import(`UserRole` · `UserStatus` · `emailService`) 동반 제거.

## 4. 자동병합 #2 caller

| 경로 | 결과 |
|---|---|
| `handleOAuthLogin` 호출 | `AuthLoginService.login()` 내부 1곳뿐 |
| `login()` 운영 caller | `modules/auth/controllers/auth-login.controller.ts:67` → `authenticationService.login({ provider: 'email', credentials: { email, password, serviceKey? } })` — **provider 'email' 고정** 확인 |
| `authentication.service.ts:60` | 단순 위임 |
| 테스트 caller | `representativeEntryLoginContract` · `orphanCredentialLoginContract` — 모두 `provider: 'email'` |
| `linkOAuthAccount` caller | `handleOAuthLogin` 1곳 (삭제 후 0 · WO-2C 골격으로 메서드 유지) |
| `oauthProfile` · `autoLinked` · `OAuthProfile` 소비처 | packages/ 0 · api-server 는 위 경로뿐 → 타입 제거 |

→ IR #8 (DEAD) 과 일치.

## 5. `mergeAccounts` caller

정의 1곳(`account-linking.service.ts:496`) 외 호출 **0** (src · tests · packages). `AccountMergeRequest` · `AccountMergeResult` 타입 소비처 = 이 메서드뿐 → 함께 제거. `roleAssignmentService` import 는 이 메서드만 쓰던 것이라 제거. → IR #9 와 일치.

## 6. 제거한 파일/코드

| 대상 | 내용 |
|---|---|
| `services/socialAuthService.ts` | **파일 삭제** (230줄 · handleSocialAuth/completeSocialLogin/linkSocialAccount/unlinkSocialAccount/getLinkedAccounts) |
| `config/passportDynamic.ts` | strategy verify callback 3곳 → 거절 고정 · `SocialAuthService` import 제거 |
| `services/auth/auth-login.service.ts` | `handleOAuthLogin` 삭제(약 200줄) · `login()` → `provider !== 'email' || !credentials` 면 `InvalidCredentialsError` · 미사용 import(`OAuthProfile` · `hashPassword` · `generateRandomToken` · `UserRole` · `UserStatus` · `persistRefreshTokenFamily`) 제거 |
| `services/account-linking.service.ts` | `mergeAccounts` 삭제 · 은퇴 주석 |
| `types/account-linking.ts` | `AccountMergeRequest` · `AccountMergeResult` · `OAuthProfile` · `UnifiedLoginRequest.oauthProfile` · `UnifiedLoginResponse.autoLinked` 제거 |
| `__tests__/auth-runtime-and-legacy-package-final-closure.spec.ts` | "다른 identity field 병합은 유지된다" → "mergeAccounts 경로 없음" 으로 계약 반전 (WO-2B 명시 은퇴) |

## 7. 유지한 legacy auth 코드

- `passportDynamic.ts` strategy 등록 · `passport.initialize()`(setup-middlewares) · `initializePassport`(main.ts) · `reloadPassportStrategies` · `getActiveStrategies` — passport 제거는 WO-2G.
- `app.config.ts socialAuthConfig` · `settingsController` OAuthProviderConfig — 상태 표시용, 런타임 인증 아님.
- `AccountLinkingService.linkOAuthAccount`(WO-2C 골격) · `linkEmailAccount` · `verifyEmailLinking` · `unlinkAccount` · `getMergedProfile`(login 응답) · `canLinkAccount`.
- email 로그인 경로의 `linkedAccountRepository.findOne({ email, provider: 'email' })` fallback 및 `user.linkedAccounts` email row `lastUsedAt` 갱신 — legacy email-provider row(운영 0행) 처리이며 Google 과 무관.
- `service_credentials` dual-read · `users.provider/provider_id` 컬럼 · `linked_accounts` 스냅샷 컬럼 · `LinkingSession` entity · Kakao Public Contact Channel(`users.kakao_*`).
- `AuthProvider` union(`'google' | 'kakao' | 'naver' | 'service'`) — `logLoginAttempt` 타입 · LinkedAccount.provider 타입으로 유지.

## 8. `googleIdentityService` 위치/책임

`apps/api-server/src/services/auth/google-identity.service.ts` — `GoogleIdentityService` 클래스 + `googleIdentityService` 싱글턴.

| 메서드 | 책임 |
|---|---|
| `verifyGoogleIdToken(idToken)` | ID token 검증 → `{ sub, audience, issuer, expiresAt, email?, emailVerified? }`. 실패 = `GoogleIdTokenError(reason)` (`code: GOOGLE_ID_TOKEN_INVALID`) |
| `findGoogleIdentityBySub(sub)` | `linked_accounts.findOne({ where: { provider: 'google', providerId: sub } })` · miss = `null` |

의존 주입: `verifier`(기본 `google-auth-library` `OAuth2Client`) · `config` · `linkedAccountRepository`. **endpoint · 세션 발급 · users 생성 · linked_accounts insert 없음.**

## 9. token verification 규칙

1. allowlist 비어 있으면 검증기 호출 전에 `ALLOWLIST_EMPTY` (fail-closed).
2. 빈 토큰 `TOKEN_EMPTY`.
3. `OAuth2Client.verifyIdToken({ idToken, audience: <서버 allowlist 배열> })` — 서명(Google 공개키) · issuer(`accounts.google.com` · `https://accounts.google.com`) · 만료 · audience 를 라이브러리가 검증. 라이브러리 오류를 `TOKEN_EXPIRED` / `ISSUER_MISMATCH` / `AUDIENCE_NOT_ALLOWED` / `SIGNATURE_INVALID` 로 분류.
4. 검증기 통과 후 서버 규칙 재검증: `iss ∈ ISSUERS` · `aud ∈ allowlist` · `exp > now` · `sub` 존재 — 주입 검증기가 느슨해도 통과 불가.
5. 클라이언트가 보낸 audience 는 어디서도 읽지 않는다(입력은 `idToken` 하나).
6. Identity Key = `sub`. `email` 은 payload 에 있을 때 그대로 전달만(저장 · 조회 0).

## 10. audience allowlist config 구조

`apps/api-server/src/config/google-identity.config.ts`
- env `GOOGLE_ALLOWED_CLIENT_IDS` — 쉼표 구분 · trim · 중복 제거 · 빈 값 무시 → `allowedClientIds: string[]`.
- `loadGoogleIdentityConfig(env)` (테스트 주입용) · `googleIdentityConfig` (process.env 기반 싱글턴) · `isConfigured()`.
- `GOOGLE_CLIENT_ID/SECRET`(legacy passport) 와 **분리** — ID token allowlist 로 재사용하지 않는다.
- `.env.example` 에 빈 placeholder 1줄 추가. 운영 Client ID · secret 입력 0 (WO-2D 체크리스트).

## 11. email 미사용 근거

- `google-identity.service.ts` 의 repository 조회는 `findGoogleIdentityBySub` 1곳 · where = `{ provider, providerId }` — guard G5 가 `email` · `provider_id` 키 · `User` entity import 를 AST 로 차단.
- 단위 테스트 #9: email 이 있는 payload 로 verify 해도 repository 호출 0 · findBySub where 키에 `email` 없음. #8: email 없는 payload 도 sub 로 resolve.
- auth 모듈 전체: OAuth/Google/social/link/merge 문맥의 `findOne/findOneBy/find/...` where 에 `email` 키 0 (guard G2). 같은 로직을 제거 전 코드에 돌리면 `old auth-login.service.ts handleOAuthLogin:388` · `socialAuthService.ts handleSocialAuth:31` 2건 검출 → guard 유효성 확인.

## 12. `users.provider/provider_id` 비정본 근거

- 유일한 writer 였던 `socialAuthService`(handleSocialAuth/linkSocialAccount/unlinkSocialAccount) 삭제 · `handleOAuthLogin` 신규 사용자 생성 시 `provider/provider_id` 기록 경로 삭제 → auth 모듈 안에서 `users.provider/provider_id` 를 Google Identity 로 읽거나 쓰는 코드 0.
- `googleIdentityService` 는 `User` entity 를 import 하지 않는다(G5). 정본 = `linked_accounts(provider='google', providerId=sub)` · partial unique 2종(WO-2A).
- 컬럼 물리 제거는 제외 범위(Phase 5).

## 13. unit test 결과

`googleIdentityService.test.ts` — **13 PASS** (verifier 11 + config 1 + findBySub 1):
정상 · 서명 불량 · 만료(검증기 throw + exp 재검증) · issuer 불일치(2경로) · audience 불일치(2경로) · 다중 allowlist 2번째 성공 + allowlist 전체 전달 · sub 없음=SUB_MISSING(email 대체 없음) · email 없어도 resolve · email 있어도 lookup 0 · allowlist 비어 있음 fail-closed · 빈 토큰.
`googleIdentityNoEmailMergeGuard.test.ts` — **8 PASS** (스캔 대상 존재 + G1~G7).

## 14. auth regression

| 묶음 | 결과 |
|---|---|
| `src/services/auth` · `src/modules/auth` · `src/services/__tests__` · `src/__tests__/security` | 28 suites · **471 PASS** (2 skipped 기존) |
| auth·login·logout·refresh·password·membership·handoff·scope·account 경로 패턴 46 suites | **770 PASS** (`auth-runtime-and-legacy-package-final-closure.spec.ts` 1건은 mergeAccounts 유지 계약 → WO-2B 은퇴 계약으로 반전 후 17/17) |
| `POST /auth/login` email/password 불변 | `representativeEntryLoginContract` · `orphanCredentialLoginContract` · `servicePasswordLoginSelection` · `refreshTokenFamilyContract` · `login-account-status-exposure` · `restricted-account-access` PASS — `handleEmailLogin` 본문 diff 0(dispatch 만 email 전용) |
| 운영 200 login 실측 | WO-2A §6-C 와 동일하게 사용자 확인 PENDING (본 WO 는 email 경로 코드 불변) |

## 15. typecheck / build

- `tsc --noEmit -p tsconfig.json` PASS · `pnpm run build`(tsc -p tsconfig.build.json) PASS.
- eslint 변경 파일 0 error(기존 warning 잔존 · 본 WO 유발 unused import 2건은 제거).

## 16. production data 변경 0

운영 DB 접속 0 · 쿼리 0 · 개인정보 실값 조회 0.

## 17. DB migration 0

migration · manifest · expected state · entity 컬럼 변경 0. `package.json` · lockfile 변경 0(`google-auth-library@11.1.0` 은 WO-2A 에서 이미 추가).

## 18. 후속

- **WO-2C Google Explicit Account Linking** — 착수 조건: 본 WO COMPLETE **+ WO-2A 운영 200 login smoke PASS**. 내용: 로그인 상태 + `users.password` 재확인 + Google ID token(`verifyGoogleIdToken`) → `sub` → `linked_accounts` 명시 insert(`linkOAuthAccount` 골격 재사용 · email 동일성은 승인 근거 아님).
- IR §9-1 의 "CI grep 게이트" 는 CI 인프라 변경(중지 조건) 대신 jest AST guard 로 충족 — CI 의 api-server jest 단계에서 실행된다.
- 잔존(범위 밖): `account-linking.service.ts` 기존 unused import(`LinkAccountRequest` · `EntityManager`) · passportDynamic catch 변수 warning · `service-token-boundary.spec.ts` 의 `provider: 'google'` 요청 fixture(404 계약 검증용 · 영향 0).

## 19. HEAD == origin/main

commit 후 push 로 확인 (보고 §19).

## 20. 작업트리

본 WO 범위 미커밋 0. 다른 세션 파일 접촉 0.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
