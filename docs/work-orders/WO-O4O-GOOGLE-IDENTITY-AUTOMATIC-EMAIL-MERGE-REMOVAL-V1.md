# WO-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1

> **성격:** Phase 2-B — Google Identity 를 **실제로 켜기 전에 위험한 자동 병합 경로를 제거**하고, Google ID token 검증 골격만 준비한다.
> **목적:** "이메일이 같으면 같은 사람" 이라는 legacy 가정을 코드에서 제거하고, Identity Key = Google `sub` 만 남긴다. Google 로그인/가입/연결 endpoint 는 만들지 않는다.
> **선행:** [`O4O-IDENTITY-ARCHITECTURE-V3`](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) · [`IR-O4O-GOOGLE-IDENTITY-MIGRATION-EXECUTION-PLAN-V1`](../investigations/IR-O4O-GOOGLE-IDENTITY-MIGRATION-EXECUTION-PLAN-V1.md)(#7 · #8 · #9 · §9-1) · [`WO-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1`](WO-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1.md)(WO-2A · `COMPLETE_WITH_MANUAL_SMOKE_PENDING`)
> **후속:** WO-2C Google Explicit Account Linking
> **Core 예외:** auth-core(F10) — WO-2A/IR 이 Phase 2 auth 파일 수정을 F10 예외로 승인. 본 WO 의 Core(auth) 파일 수정은 그 범위 안이다.
> **중요:** WO-2A 의 운영 email/password 200 login smoke 는 아직 PENDING 이다. 본 WO 착수는 가능하나, **WO-2C 착수 전에는 반드시 닫는다.**

---

## 1. 목표와 배경

현행 코드에는 Google/OAuth 프로필의 **이메일**로 기존 `users` 를 찾아 자동으로 붙이는 경로가 두 곳 있다.

| # | 위치 | 동작 | IR 판정 |
|---|---|---|---|
| 자동병합 #1 | `services/socialAuthService.ts` `handleSocialAuth` | `users` 를 `email` OR `(provider, provider_id)` 로 조회 → local 계정이면 `users.provider/provider_id` 를 덮어씀 | DEAD (passportDynamic strategy 만 호출 · `passport.authenticate` route 0) |
| 자동병합 #2 | `services/auth/auth-login.service.ts` `handleOAuthLogin` | `providerId` miss → `users.email` 조회 → `AccountLinkingService.linkOAuthAccount` → `autoLinked: true` | DEAD (`login()` 운영 caller 는 `provider: 'email'` 뿐) |

두 경로 모두 V3 §3 "이메일로 Identity 를 판정하지 않는다 · 자동 병합 금지" 와 충돌한다. 실제 트래픽은 없지만 **코드가 남아 있는 한 미래 WO 가 재활용할 위험**이 있으므로 Google 기능 구현 전에 제거한다.

### 확정 정책

- Identity Key = Google `sub`. 이메일은 조회 키가 아니다(로그 · 표시용 스냅샷도 저장하지 않는다).
- `users.provider/provider_id` 는 Google Identity 정본이 아니다. 정본은 `linked_accounts(provider='google', providerId=sub)`.
- `service_credentials.password_hash` 는 Google 연결의 재인증 증거가 아니다(제거하지는 않는다 — dual-read 유지).
- 이번 WO 는 **제거 + 골격** 이다. 새 endpoint · UI · 병합 기능 · migration 을 만들지 않는다.

---

## 2. 승인 범위

### 2-1. 자동병합 #1 제거 — `socialAuthService.handleSocialAuth`
- caller 교차 확인 후 서비스 전체가 dead 이면 **파일 삭제**. `passportDynamic` 의 Google/Kakao/Naver strategy verify callback 은 `handleSocialAuth` 연결을 해제하고 어떤 경우에도 user 를 생성 · 병합하지 않는다(passport 자체 제거는 WO-2G).
- Kakao Public Contact Channel(`users.kakao_*`) 코드는 대상이 아니다.

### 2-2. 자동병합 #2 제거 — `AuthLoginService.handleOAuthLogin`
- `handleOAuthLogin` 삭제. `login()` 은 `provider: 'email'` 전용으로 축소하고 그 외 provider 는 `InvalidCredentialsError` 로 거절한다.
- `POST /auth/login` email/password 계약(요청 · 응답 · 에러코드 · 쿠키 · serviceKey · service credential dual-read)은 변경하지 않는다.
- `UnifiedLoginRequest.oauthProfile` · `UnifiedLoginResponse.autoLinked` · `OAuthProfile` 타입은 소비처 0 확인 후 함께 제거한다.

### 2-3. `AccountLinkingService.mergeAccounts` 은퇴
- caller 0 교차 확인 후 메서드와 전용 타입(`AccountMergeRequest` · `AccountMergeResult`)을 삭제. `linkOAuthAccount`(WO-2C 골격) · `getMergedProfile`(login 응답 사용) · `canLinkAccount` 는 유지.

### 2-4. `googleIdentityService` 최소 골격 (endpoint 없음)
- 위치: `services/auth/google-identity.service.ts`.
- `verifyGoogleIdToken(idToken)` — `google-auth-library` `OAuth2Client.verifyIdToken` 으로 서명 · issuer · 만료 검증. `aud` 는 **서버 allowlist** 와 대조하며 클라이언트가 보낸 audience 값은 신뢰하지 않는다. 결과의 Identity Key = `sub` (email 은 반환 payload 에 있어도 lookup 에 쓰지 않는다).
- `findGoogleIdentityBySub(sub)` — `linked_accounts` 를 `(provider='google', providerId=sub)` 로만 조회. 결과 없음 = `null` (email fallback 없음).
- 검증기는 주입 가능하게 두어 단위 테스트에서 실제 Google 네트워크 없이 검증한다.

### 2-5. audience allowlist config 골격
- `config/google-identity.config.ts` · env `GOOGLE_ALLOWED_CLIENT_IDS`(쉼표 구분 · 여러 Client ID). 운영 Client ID 값 입력 · secret 등록은 하지 않는다. 미설정 시 검증은 fail-closed 로 거절한다.

### 금지 규칙
1. `Google email → users.email lookup → 자동 로그인`
2. `Google email → existing user → linked_accounts 자동 insert`
3. `users.provider/provider_id → Google Identity 정본`
4. `service_credentials.password_hash → Google 계정 연결의 재인증 증거`

---

## 3. 회귀 보장

email/password login · service credential dual-read · password reset · register · refresh · logout · handoff · service membership guard · role guard · admin login 은 그대로 동작해야 한다.

---

## 4. 제외 범위

Google login/signup/explicit link endpoint(`/auth/google/*`) · 계정 설정 UI · Google 버튼 · 모바일 Google sign-in · `users.password` 값 변경 · password login 차단 · `service_credentials` 제거 · Kakao/Naver/passport 전체 제거 · `linked_accounts` 컬럼 삭제 · `users.provider/provider_id` 컬럼 삭제 · `linking_sessions` 생성 · 운영자 recovery flow · production 개인정보 수정 · DB migration.

---

## 5. 검증 기준

- **A. caller 교차 확인** — `handleSocialAuth` · `handleOAuthLogin` · `mergeAccounts` · `passport.authenticate` · social callback route mount 를 IR 과 다른 경로(import graph · route 등록 · 테스트)로 재확인. IR 과 다르면 삭제 전 중지.
- **B. 정적 guard** — auth 모듈 안에서 OAuth/Google 흐름이 `users.email` lookup 으로 link/merge/login 하는 코드가 재도입되면 실패하는 테스트(TypeScript AST 기반 · 단순 grep 아님).
- **C. Google verifier 단위 테스트 ≥ 9** — 정상 · 서명 불량 · 만료 · issuer 불일치 · audience allowlist 불일치 · allowlist 일치 성공 · Identity key = `sub` · email 없어도 resolve · email 있어도 user lookup 미사용.
- **D. auth 회귀** — WO-2A 수준 이상(auth jest 전량 · contract 테스트) · `POST /auth/login` email/password 경로 불변 증명 · `tsc` · build.

---

## 6. 중지 조건

- A 교차 확인 결과가 IR(#7 · #8 · #9) 과 다를 때
- `package.json` · lockfile · migration · CI 인프라 변경이 필요할 때
- 범위 밖 파일(다른 세션 dirty/untracked 포함) 수정이 필요할 때
- 현재 변경과 무관한 build/test 실패

---

## 7. 완료 보고 (20항목)

1 시작 Git 상태 · 2 WO-2A manual 200 smoke 상태 · 3 자동병합 #1 실제 caller · 4 #2 caller · 5 mergeAccounts caller · 6 제거한 파일/코드 · 7 유지한 legacy auth 코드 · 8 googleIdentityService 위치/책임 · 9 token verification 규칙 · 10 audience allowlist config 구조 · 11 email 미사용 근거 · 12 users.provider/provider_id 비정본 근거 · 13 unit test 결과 · 14 auth regression · 15 typecheck/build · 16 production data 변경 0 · 17 DB migration 0 · 18 후속 · 19 HEAD==origin/main · 20 작업트리.

판정: `WO-2B: COMPLETE` 또는 `WO-2B: BLOCKED`. 기록: [`CHECK-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1`](../checks/CHECK-O4O-GOOGLE-IDENTITY-AUTOMATIC-EMAIL-MERGE-REMOVAL-V1.md).

---

## 후속 — WO-2C Google Explicit Account Linking

착수 조건: 본 WO `COMPLETE` **그리고** WO-2A 운영 email/password 200 login smoke PASS. 내용: 로그인 상태 + `users.password` 재확인 + Google ID token → `sub` → `linked_accounts` 명시 insert. 이메일 동일성은 어떤 경우에도 승인 근거가 아니다.
