# WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1

> **성격:** Phase 2-D — Google-only Signup/Login **구현**. Web/Admin 을 먼저 완결하고 Mobile 은 같은 WO 안의 별도 검증축으로 둔다(native dependency 가 중지 조건에 걸리면 모바일만 후속 WO 로 분리).
> **목적:** 신규 사용자는 Google 인증으로만 가입·로그인한다. Identity Key = Google `sub`(외부) · `users.id`(내부). email 은 Identity Key 가 아니며 **email 동일성 자동 병합 금지**.
> **선행:** WO-2A `COMPLETE`(smoke N/A 종결) · WO-2B `COMPLETE`(cfab48aed · `googleIdentityService` + AST guard) · WO-2C `COMPLETE`(09d322654 · users 58→1, cleanup user=본인 `platform:super_admin` 임시 보존)
> **후속:** WO-2E First Google Admin Bootstrap(cleanup super_admin 으로 일반 Admin UI 에서 role 부여 우선) → WO-2F Legacy Password/Auth 제거 → WO-2G Kakao/Naver/Passport 제거 → WO-2H 검증·문서 정합.
> **Core 예외:** auth-core(F10) — 본 WO 는 사용자 명시 WO 로 Google endpoint 신설을 승인한다. diff 는 최소로 유지한다.
> **중요:** 프로덕션 개인정보 실값 조회·기록 금지(count·status·date only) · DB host/password 기록 금지 · 프로덕션 UPDATE/DELETE/DDL 은 사용자 승인 필요 · schema/migration 변경 = 중지 조건 · placeholder/fake user 금지 · secret 하드코딩 금지.

---

## 1. 목표와 배경

WO-2C 로 legacy 테스트 사용자 migration 문제는 사실상 제거되었다(users=1, linked_accounts=0). 이제 신규 사용자 유입 경로를 Google 하나로 연다.

```text
Google 인증(GIS / native) → ID token → 서버 검증(googleIdentityService · allowlist)
  → Google sub → linked_accounts(provider='google', providerId=sub) → users.id → O4O 세션(canonical)
```

불변식: `Google sub = 외부 Identity Key` · `users.id = 내부 Identity Key` · `email ≠ Identity Key` · `email 동일성 자동 병합 금지`. cleanup user 는 password 로그인을 유지하며 이번 WO 에서 전환·삭제하지 않는다. 사전 orphan 3종(organization_members 2 · kpa_operator_audit_logs 163 · cms_contents.createdBy 55)은 별도 데이터 정비 대상이며 인증 작업에 섞지 않는다.

## 2. 서버 계약

### 2-1. `POST /api/v1/auth/google/login`
- 입력 `{ idToken, serviceKey? }` (+ `includeLegacyTokens?` — 기존 login 과 동일한 전송 플래그). `validateDto(whitelist+forbidNonWhitelisted)` 로 userId/email/sub/audience/role/membership 등 **클라이언트 identity 필드는 400 거절**.
- 검증은 WO-2B `googleIdentityService.verifyGoogleIdToken` 단일 경로(서명·issuer·exp·audience∈서버 allowlist·sub).
- 조회는 **`linked_accounts WHERE provider='google' AND providerId=sub` 만**. `users.email/provider/provider_id` 조회 금지(AST guard G2/G5 유지).
- 기존 linked account → status/memberships/roles/accountAccess 계산 후 canonical 세션 경로 재사용(`generateTokensWithContext` · `persistRefreshTokenFamily` · `setAuthCookies`). Google 전용 JWT 없음 · JWT `sub`=`users.id`.
- `serviceKey` 가 오면 해당 서비스 membership 상태를 응답에 **동봉만** 한다(`serviceMembership: { serviceKey, status }`). 미가입이어도 세션은 발급한다 — 서비스 접근은 기존 route guard(role_assignments · service_memberships)가 막는다(§5 per-service join 흐름으로 안내).
- 미등록 sub → `404 GOOGLE_SIGNUP_REQUIRED`(`existingAccountByEmail` 힌트는 **제공하지 않는다** — email 조회 자체를 두지 않는다).
- 차단 상태(inactive/suspended/rejected/legacy deleted) → `403 ACCOUNT_NOT_ACTIVE`(+`accountStatus` 화이트리스트 라벨, 기존 login 과 동일).

### 2-2. `POST /api/v1/auth/google/signup`
- 입력 `{ idToken, consents: { terms, privacy, marketing? } }` (+ `includeLegacyTokens?`). name/phone/address/license 폼 없음.
- 단일 트랜잭션: (토큰 재검증 →) sub 중복 확인 → `users` 생성 → `linked_accounts` 생성 → 동의 기록 → commit → 세션. 실패 시 orphan users/linked_accounts 0.
- 신규 users 최소값: `id · status='active' · created_at · updated_at` + `users.email NOT NULL UNIQUE` 가 남아 있어 **Google email claim 을 과도기 프로필 값**으로 저장한다(`isEmailVerified` = Google `email_verified`). email claim 이 없으면 `400 GOOGLE_EMAIL_MISSING` — **placeholder email 금지**.
- email UNIQUE 충돌(cleanup user 포함) → `409 EMAIL_IN_USE`. 자동 연결 금지. 사전 email 조회 없이 **DB unique violation(23505) 매핑**으로 처리한다(조회 경로 자체를 두지 않음).
- sub 중복 → `409 GOOGLE_ALREADY_REGISTERED`.
- `name = NULL` · `picture 저장하지 않음` · `password = NULL` · `service_credentials` 생성 없음.
- 동의 기록 = `users.tos_accepted_at · privacy_accepted_at · marketing_accepted`(가입 시점 스냅샷 — 기존 register writer 와 동일 컬럼). 서비스별 이용약관 승낙(`user_policy_acceptances`)은 service_key 축이므로 서비스 가입 시 기존 `pendingPolicyAcceptances` 게이트가 담당한다.

### 2-3. `GET /api/v1/auth/google/config`
- `{ enabled, clientId }` — web 이 GIS 초기화에 쓰는 **공개 Client ID**(secret 아님). `GOOGLE_WEB_CLIENT_ID` env 우선, 없으면 `GOOGLE_ALLOWED_CLIENT_IDS` 첫 항목. allowlist 가 비어 있으면 `enabled=false` → 프런트는 Google 버튼을 "준비 중" 으로 표시한다.

## 3. 권한·membership
- Google signup 은 service_memberships · store_owner · pharmacist · operator · admin 을 **부여하지 않는다**. 기본 role 개념을 새로 만들지 않는다(`role_assignments` 0행).
- membership 없는 Google 사용자는 기존 per-service join/approval 흐름(`POST /auth/services/:serviceKey/join` · 서비스별 가입 신청)을 탄다. password 요구 없음.
- 서비스별 signup 화면의 password 의존은 감사만 하고 최소 수정(§6 보고).

## 4. Web/Admin UI
- `@o4o/auth-client`: `loginWithGoogle` · `signupWithGoogle` · `getGoogleAuthConfig` + GIS 스크립트 로더(`google-identity.ts`). 401 자동 refresh 제외 목록에 `/auth/google/` 추가.
- `@o4o/auth-react`: `useServiceAuth` 에 `loginWithGoogle` · `signupWithGoogle` 추가 + 공통 `<GoogleContinue />`(Google 버튼 → 미등록이면 약관/개인정보/마케팅 동의 → 계정 생성 → 세션). 서비스명 조건문 없음.
- 실 로그인 진입점 전부에 `[ Google로 계속하기 ]`: web-kpa-society LoginModal · web-neture LoginModal · web-k-cosmetics LoginModal/LoginPage · web-pharmacy-hub LoginPage · web-kpa-branch LoginPage · admin-dashboard Login(`@o4o/auth-context` 는 admin 전용 계층이라 최소 `loginWithGoogle` 추가).
- legacy email/password UI 는 임시 유지하되 라벨: Google=기본 · password=임시 테스트/전환.

## 5. Mobile(Expo) 검증축
- Native Google Sign-In → ID token → **동일 endpoint**. 별도 서버 계약 없음.
- 중지 조건 발생 시(패키지 dependency 추가 · Google Cloud Console per-platform Client ID · SHA cert · bundle config) 모바일만 후속 WO 로 분리하고 Web/Admin 완결을 막지 않는다.

## 6. 검증 기준
- 단위: 로그인(등록 sub OK · 미등록 sub → signup required · email 일치+미등록 sub → 병합 0 · 차단 사용자 → accountAccess 정책), 가입(신규 sub → users+linked_accounts · 중복 sub 실패 · email 충돌 실패/병합 0 · 트랜잭션 실패 orphan 0 · name 없음 OK · picture 미저장 · password NULL), 권한(admin/operator/store_owner/pharmacist 0), 보안 negative(서명/만료/issuer/audience/sub 없음/allowlist 비어 있음), AST guard G1~G7 유지.
- 회귀: 기존 auth 테스트 · `tsc` build · cleanup user password 로그인 경로 무변경.
- 중지 조건: schema/migration 필요 · package.json/lockfile 변경 필요 · 실제 Google Client ID 등록(사용자 외부 서비스 승인) · 프로덕션 데이터 수동 변경.

## 7. 완료 보고
22항목(§13 원문: 1 endpoint · 2 계약 · 3 sub-only lookup 증빙 · 4 email 자동 병합 0 · 5 신규 사용자 저장 PII · 6 name/picture · 7 기본 role/membership · 8 per-service 진입 흐름 · 9 Web 화면 · 10 Admin · 11 Mobile · 12 Google client 설정 · 13 allowlist · 14 테스트 · 15 auth 회귀 · 16 guard 회귀 · 17 cleanup user 로그인 · 18 프로덕션 신규 테스트 사용자 · 19 migration 0 · 20 PII 수동 변경 0 · 21 HEAD==origin/main · 22 작업트리) + 판정 `WO-2D GOOGLE-ONLY SIGNUP/LOGIN: COMPLETE | PARTIAL — MOBILE PENDING | BLOCKED` + `문서 정합:` 한 줄.
