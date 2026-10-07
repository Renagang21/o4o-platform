# WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1

> 발행: 2026-09-26 · 상태: **접수(미실행)**
> 근거: [`IR-O4O-GOOGLE-ONLY-AUTH-SIMPLIFICATION-CENSUS-V1`](../investigations/IR-O4O-GOOGLE-ONLY-AUTH-SIMPLIFICATION-CENSUS-V1.md)
> 조사에서 확정한 **REMOVE 판정을 실행**하는 단일 WO 다. 새 판정을 여기서 만들지 않는다.

---

## 0. 한 줄

Google-only 전환이 끝난 뒤 남은 **전환용 · 중복 · 죽은 인증 코드**를 제거한다.
로그인 동작은 **단 한 줄도 바뀌지 않는다.**

## 1. 절대 건드리지 않을 것

```text
Google ID token 검증 · /auth/google/config · /login · /signup
linked_accounts (Google sub 정본) · users.id
/auth/refresh · /me · /me/profile · /logout · /logout-all · /status
/auth/handoff · /handoff/exchange · /services · /services/:key/join
/api/v1/auth/guest (guest-auth)
운영자 직접 지정 (OperatorAssignmentController)

includeLegacyTokens · AuthClient strategy:'localStorage'
  → 8개 서비스의 현행 로그인 경로다. 이름·주석만 고치고 동작은 그대로 둔다.

contact_kakao · kakao_open_chat_url · kakao_channel_url
  → Connected Channel(연락처)이다. 로그인 축이 아니다.

membership 종료가 Global Identity 를 죽이지 않게 한 수정
한 서비스 종료가 다른 서비스를 끊지 않게 한 수정
  → correctness fix. 되돌리지 않는다.
```

**범위 밖(별도 트랙)**: `SELF_ROLE_REVOKE_FORBIDDEN` · `LAST_ADMIN_PROTECTED` ·
서비스 역할 초기화(PR #236 미배포 상태 유지) · membership lifecycle · `users.status` 정책 ·
인증 전략(cookie 단일화) 변경.

---

## 2. 단계 — contract-last 순서를 지킨다

> `deploy-api.yml` 은 migration job 을 **새 revision 보다 먼저** 실행한다.
> 코드 제거와 테이블 DROP 을 **한 배포 창에 섞지 않는다.**

### 단계 A — 코드 제거 (migration 0 · 배포 1회)

| # | 대상 | 제거 범위 |
|---|---|---|
| A1 | Passport 계층 | `config/passportDynamic.ts` · `main.ts` 의 `initializePassport` · `setup-middlewares.ts` 의 passport/session 미들웨어 |
| A2 | dependency | `passport` · `passport-google-oauth20` · `passport-kakao` · `passport-naver-v2` · `express-session` — **`package.json` + `package.production.json` 동시** |
| A3 | Kakao/Naver 로그인 설정 | `config/app.config.ts` FeatureStatus·부팅로그·`oauth:*` 플래그 · `controllers/settingsController.ts` 블록 · Admin `OAuthSettings.tsx` 항목(Google 은 유지) |
| A4 | Admin Google bootstrap | route · `GoogleAuthController.bootstrapAdmin` · bootstrap 서비스 · `config/google-admin-bootstrap.config.ts` · `authClient.bootstrapAdminGoogle` · Admin `Login.tsx` 연결코드 UI/에러분기 |
| A5 | Account linking | `services/account-linking.service.ts` · `LinkingSession` entity · `types/account-linking.ts` 의 linking 전용 타입(`AuthProvider` 는 유지) |
| A6 | 이메일 인증 체인 | route 3 · `verification.controller.ts` · `emailVerificationService.ts` · `EmailVerificationToken` entity · 프런트 `VerifyEmailPage` 2개와 라우트 |
| A7 | 중복 `/auth/verify` | route + `account-access.policy.ts` · `terms-acceptance.policy.ts` 의 경로 문자열 |
| A8 | `refresh_tokens` 소비 | `user.controller.ts` 세션 조회 2지점 · `RefreshToken` entity · `User.refreshTokens` 관계 |
| A9 | mobile-app | `services/mobile-app` 전체 · `/api/v1/mobile/product-drafts` 등록 · controller · service · `MobileProductDraft.entity.ts` |
| A10 | 운영자 이메일 초대 | entity · service · accept controller · route 2 · 프런트 accept 페이지/라우트 · Admin `OperatorsPage` 초대 탭 · rate limiter 설정 · 메일 템플릿 |
| A11 | 주석 현행화 | Admin `Login.tsx` 의 "password 경로가 남아 있다" 서술 삭제 · `auth-client` 의 `'localStorage' = legacy` 주석을 **현행**으로 정정 |

### 단계 B — 스키마 제거 (실측 후 · 배포 1회)

| 테이블 | 선행 조건 |
|---|---|
| `linking_sessions` · `email_verification_tokens` · `refresh_tokens` · `mobile_product_drafts` · `operator_invitations` | **행 수 read-only 실측.** 0 이면 DROP. 0 이 아니면 처리 방법을 먼저 정하고 보고 |
| `login_attempts` | 위 + **auth-core manifest 변경 명시 승인**(CLAUDE.md §3 · §14) |
| `users` 의 `UserActivityLog` PASSWORD_* enum 값 3 | 해당 값의 행 수 실측. 0 이면 enum 정리 |

**실측 채널**: `gcloud auth application-default login` → Cloud SQL Auth Proxy v2
(`SETUP.md` 가 정본 · 포트 5442). **현재 이 PC 에 ADC 가 없어 채널이 닫혀 있다.**

---

## 3. 테스트 원칙

**guard 테스트는 지우지 않고 뒤집는다.** 되살아나면 테스트가 먼저 깨져야 한다.

| 테스트 | 조치 |
|---|---|
| `googleIdentityNoEmailMergeGuard.test.ts` **G4** (passportDynamic 존재 단정) | "파일이 **존재하지 않는다**" 로 뒤집기 |
| `googleAdminBootstrap.test.ts` | bootstrap 경로 **부재** 단정으로 뒤집거나 함께 제거 |
| 신규 | `passport` · `express-session` import 0 · `/api/v1/social` 문자열 0 · `passport.authenticate` 0 을 고정하는 정적 가드 |

## 4. 중지 조건

- 실측 행 수가 0 이 아닌 테이블의 DROP 이 필요할 때
- `login_attempts` 의 auth-core manifest 변경 승인이 없을 때
- dependency 제거가 Docker 빌드에 영향을 줄 때(`package.production.json` 누락 = Rollup 실패)
- 제거 대상이 `IR` 에 없는 파일로 번질 때
- 로그인 동작이 바뀔 가능성이 보일 때 — **이 WO 는 동작을 바꾸지 않는다**

## 5. 완료 기준

```text
[ ] 단계 A 코드 제거 · tsc rc=0 · 변경 파일 eslint 0 error
[ ] guard 테스트 뒤집기 + 신규 정적 가드 PASS
[ ] CI 전체 green + SonarCloud PASS
[ ] detector 실측 → 대상 배포 (job 실행 · revision 생성 · traffic 전환 3단계 확인)
[ ] 배포 후 실브라우저: 8개 surface Google 로그인 PASS (전략 변경 없음 확인)
[ ] 단계 B 는 실측 후 별도 창
[ ] CHECK 작성 · HEAD == origin/main · 범위 내 미커밋 0
```

## 6. 산출물

`docs/checks/CHECK-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1.md` — 제거한 항목별
(consumer 근거 · 제거 범위 · 대체 경로 · 검증 결과), 실측하지 못한 것은 그대로 기록한다.
