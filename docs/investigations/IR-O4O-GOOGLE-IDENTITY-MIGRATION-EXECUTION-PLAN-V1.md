# IR-O4O-GOOGLE-IDENTITY-MIGRATION-EXECUTION-PLAN-V1

> **성격**: [`O4O-IDENTITY-ARCHITECTURE-V3`](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) Phase 2(Google Identity 전환) 의 **실행계획 확정 기록**. 기존 사용자 계정(`users.id` · `role_assignments` · `service_memberships` · 매장·분회 관계)을 잃지 않고 `email+password` → `Google sub → linked_accounts → users.id` 로 옮기는 순서와 경계를 닫는다.
> **WO**: `WO-O4O-GOOGLE-IDENTITY-MIGRATION-EXECUTION-PLAN-V1` (실행계획 전용 · 코드 · DB · migration · production data 변경 0)
> **정본**: V3 §2 · §3 · §13 REVIEW-8 · §14 · §16 Phase 2. 근거 기록물: [IR Decision Closure](IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1.md) · [CHECK RBAC/Account Baseline](../checks/CHECK-O4O-RBAC-AND-ACCOUNT-BASELINE-SNAPSHOT-MIGRATION-OWNERSHIP-FINAL-CLOSURE-V1.md)(`linked_accounts` 운영 실측)
> **조사 방식**: 저장소 코드 · 운영 schema snapshot(`canonical-schema-baseline.ts` = 2026-09-15 pg_dump) · 정본 문서 read-only 교차 확인. **프로덕션 DB 조회 0 · 개인정보 실값 조회 0.** 운영 행 수는 2026-09-14 실측 기록(CHECK 문서)을 인용한다.

---

## 0. 결론 요약

| 항목 | 결론 |
|---|---|
| Phase 2 첫 코드 변경 | **WO-2B 자동 이메일 병합 제거** — 단, 실제 첫 *커밋* 은 WO-2A 의 `linked_accounts` 계약 migration(F10 예외) + `google-auth-library` 의존성 추가. 병합 제거 자체는 **런타임 도달 불가 코드 2곳 삭제**라 기존 사용자 영향 0 |
| 자동 병합 경로 | 2곳 — `socialAuthService.handleSocialAuth`(`users.email` OR `users.provider_id` 조회 → local 계정에 `users.provider/provider_id` 덮어쓰기) · `auth-login.service.handleOAuthLogin`(`linked_accounts.providerId` miss → `users.email` 일치 시 `AccountLinkingService.linkOAuthAccount` 자동 호출, `autoLinked: true`). **둘 다 현재 호출자 0** (`passport.authenticate` 를 부르는 route 없음 · `login()` 호출자는 `provider:'email'` 뿐) |
| `linked_accounts` | 운영 **0행** · `(provider, providerId)` **unique 없음**(non-unique idx 만) · **users FK 없음** · entity drift 5종. 필요한 최소 변경 = partial unique index + FK 1건 migration(F10 예외). 컬럼 삭제는 Phase 5 |
| Google-only 가입 차단 제약 | `users.password NOT NULL`(현행 `''` sentinel 관행 존재하나 V3 Target 은 NULL) · `users.name NOT NULL DEFAULT '운영자'`(DB 기본값 = placeholder 개인정보) · `users.email NOT NULL UNIQUE`(이메일 없는 가입 + "동일 이메일·다른 사람" 신규가입 차단). Phase 2 는 앞 2개만 완화, `email` 은 Phase 5(소비처 56곳) |
| 기존 사용자 전환 | 로그인 상태 → 계정 설정 → **password 재입력** → Google ID token → `sub` 중복 확인 → `linked_accounts` insert → 세션 유지. 연결과 password 폐기는 **분리**(P2-C ↔ P2-F) |
| `service_credentials` | Phase 2-F 에서 연결 계정의 reader 무력화(password login 차단으로 의미 상실) · **물리 제거는 Phase 5** `users.password` 컬럼 제거와 동일 migration |
| `users.password` NULL | P2-F — 계정별. 선행조건 = 해당 계정 Google 로그인 성공 이력 ≥1 + 모든 진입점(web 7 · admin · mobile) Google 로그인 LIVE + `password DROP NOT NULL` migration 적용 |
| 접근 불가 사용자 복구 | 운영자 본인확인 → 1회용·단기 연결 token 발급(`linking_sessions` 신설 — 운영 테이블 **부재** · WO-2E 에서 생성) → 사용자 Google 인증 → `sub ↔ 기존 users.id`. 이메일만으로 발급 금지 |
| 이메일 동일성 | UX 힌트 한 가지 용도만: Google 로그인 `sub` miss 시 "이 이메일의 기존 계정이 있습니다 → 기존 계정 로그인 후 연결" 안내(`existingAccountByEmail: boolean` 만 노출). 자동 병합 · `linked_accounts` 생성 · password 우회 · 운영자 미승인 복구 **모두 금지** |
| 구현 WO 분할 | **8개** — 2A 선행조건 · 2B 병합 제거 · 2C 명시 연결 · 2D Google 로그인/가입(2D-web · 2D-mobile) · 2E 운영자 복구 · 2F 계정별 password 폐기 · 2G Kakao/Naver/passport 제거 · 2H 전환 검증 + 문서 정합 |
| 사용자 결정 (2026-09-17 확정) | §8 — (a) **Google ID-token-to-backend**(Web=GIS · Mobile=native · 서버 aud allowlist) · (b) 1 user : 1 Google sub · (c) `auth_time` 미도입 + **P2-C 재인증 = `users.password` 만**(`service_credentials` 금지) · (d) feature flag 롤아웃 · (e) `linking_sessions` 는 **WO-2E 에서 생성** · (f) Google email = optional profile · UNIQUE 충돌 시 가입 거부 + 연결 안내 |

---

## 1. Current Auth Flow Matrix

코드 기준 확인 결과. "도달성" = 현재 production 런타임에서 HTTP 요청으로 도달 가능한지.

| # | Flow | 현재 방식 (파일) | 도달성 | Target | 구현 Phase | 위험 |
|---|---|---|---|---|---|---|
| 1 | email/password login | `POST /auth/login` → `AuthLoginService.handleEmailLogin` — `users.email` 조회(miss 시 `linked_accounts.provider='email'` fallback) → serviceKey membership 검증 → `service_credentials` dual-read → `users.password` fallback → `generateTokensWithContext` → `refreshTokenFamily` | LIVE | 전환기간 유지 → P2-F 연결 계정부터 차단 → P2-G 이후 제거 | P2-F / P5 | 진입점 하나라도 Google 미지원 상태에서 차단하면 락아웃 |
| 2 | register | `POST /auth/register|signup` → `AuthRegisterController.register` — 기존 email 존재 시 **본인확인 없이** membership(pending) + `service_credentials` upsert(새 password) / 신규는 `users`+membership+credential | LIVE | 신규 = Google 가입(P2-D) · 기존 사용자 서비스 가입 = 로그인 상태에서 **각 서비스의 가입 신청 흐름**(register 기존-사용자 분기에서 password/credential 제거 · pharmacy-hub `/join` 등 서비스별 신청 route). `auth/services/:key/join` 은 instant-active 우회가 제거된 상태(`82a92fe61`)라 대체 경로가 아니다 | P2-D / P5 | ⚠️ 현행: 이메일만 알면 타 서비스 credential 생성 가능(WO `…PASSWORD-REQUIREMENT-REMOVE-V1` 에서 명시적 trade-off). Google 전환이 이 구멍을 닫는다 |
| 3 | check-email | `POST /auth/check-email` — 존재 여부 + 가입 서비스 목록 반환 | LIVE | 유지(§2-7 힌트 근거). 응답의 서비스 목록 노출 범위는 P2-D 에서 재검토 | P2-D | 열거 공격 표면(기존과 동일) |
| 4 | password reset | `forgot-password` / `reset-password` — `password_reset_tokens` · serviceKey 있으면 credential, 없으면 `users.password` 갱신. `find-id` = phone 으로 이메일 마스킹 반환 | LIVE | P2-G 까지 유지(전환기 복구 수단) → P5 제거. `find-id` 는 P2-F 와 함께 은퇴 후보 | P5 | 제거 시점 이르면 Legacy 사용자 복구 수단 소실 |
| 5 | email verification | `verify-email`(POST/GET) · `resend-verification` — `email_verification_tokens`; 로그인 gate 는 `REQUIRE_EMAIL_VERIFICATION` env 조건부 | LIVE | 로그인과 분리(Google 가입은 `email_verified` claim). 프로필 이메일 검증 용도로 존속 여부 P5 판단 | P5 | 없음 |
| 6 | Google passport strategy | `config/passportDynamic.ts` — DB `settings.oauth_settings` 또는 env 로 Google/Kakao/Naver strategy 등록, callback `/api/v1/social/{p}/callback` | **DEAD** — `passport.authenticate` 호출 route 0 · `/api/v1/social/*` 라우터 0 (`securityMiddleware` 예외 목록에만 존재) | Google 인증 진입점을 새 `googleIdentityService` 로 단일화. passport Google 재사용 여부 §8(a) | P2-B / P2-G | 없음(미동작) |
| 7 | `socialAuthService.handleSocialAuth` | `users` 를 `email` **OR** `(provider, provider_id)` 로 조회 → local 계정이면 `users.provider/provider_id` 덮어쓰기(자동 병합 #1) → 신규면 `password: ''` 로 생성 | DEAD(#6 경유만) | **삭제** (자동 병합 제거 대상 #1) | **P2-B** | 없음 |
| 8 | `auth-login.service.handleOAuthLogin` | `linked_accounts.providerId` 조회(**provider 조건 없음** — 잠재 오매칭) → miss 시 `users.email` 일치면 `AccountLinkingService.linkOAuthAccount` 자동 호출(자동 병합 #2) → 없으면 random password 로 신규 user | DEAD(`login()` 호출자 = `provider:'email'` 1곳) | **삭제** (자동 병합 제거 대상 #2). `login()` 은 email 전용으로 축소 | **P2-B** | 없음 |
| 9 | `AccountLinkingService` | `linkOAuthAccount`(sub 타 user 연결 검사 있음 · email 스냅샷 저장) · `linkEmailAccount`/`verifyEmailLinking`(`linking_sessions` 사용 — 운영 테이블 **부재**) · `unlinkAccount`(password 검증 · 마지막 provider 보호) · `mergeAccounts`(source user **삭제**) · `getMergedProfile`(login 응답용 LIVE) | link/unlink/merge = 미노출(route 0) · getMergedProfile = LIVE | `linkOAuthAccount` 골격을 P2-C 에 재사용(email/displayName/profileImage 저장 제거) · `mergeAccounts` **은퇴**(V3 "users.id 불변" 위배 위험) | P2-B / P2-C | `mergeAccounts` 잔존 시 향후 오용 |
| 10 | `linked_accounts` | 운영 0행 · 컬럼 18 · PK 만 · idx(provider,providerId) non-unique · idx(userId) · FK 없음 | 테이블 존재 | §3 계약 — partial unique + FK | **P2-A**(migration) | 없음(0행) |
| 11 | `service_credentials.password_hash` | reader: `auth-login`(login dual-read) · `user.controller`(PUT /users/password) · `passwordResetService` · `admin-password-reset-scope` · `AdminUserController` · `BranchServiceMembershipController`(has_credential 표시) / writer: `auth-register` ×2 · `user.controller` · `passwordResetService` · `AdminUserController` ×2 | LIVE | P2-F 연결 계정 = 의미 상실 · P5 물리 제거 | P2-F / P5 | §5 |
| 12 | `users.password` | NOT NULL · `''` = social-only sentinel(`!user.password` → `SocialLoginRequiredError`) | LIVE | P2-F 계정별 NULL → P5 컬럼 제거 | P2-F / P5 | NULL 은 `DROP NOT NULL` migration 선행 |
| 13 | `users.provider` / `provider_id` | nullable · #7 만 write · reader 는 sanitizer 제외 목록뿐 | 잔존 컬럼 | Identity 판정에 **사용 금지**(상태 원천 아님). P5 제거 | P5 | 운영 값 분포 미확인 → WO-2A read-only census |
| 14 | refresh / handoff / session family | `auth-session.controller` · `handoff.controller` · `auth-token-session.service` — `users.refreshTokenFamily` 단일 슬롯 · password/provider 무관 | LIVE | **불변**. Google 로그인도 `generateTokensWithContext` → `persistRefreshTokenFamily` → `setAuthCookies` 동일 경로 | — | 없음 |
| 15 | logout / logout-all | family null 처리 | LIVE | 불변 | — | 없음 |
| 16 | `/me` · `requireAuth` | `authentication.middleware` 가 매 요청 `relations: ['linkedAccounts']` 로드(사용처 없음) | LIVE | `/me` 계약 불변. Google 연결 상태는 **별도 `GET /auth/identity`** 로 노출(계약 추가 최소화). middleware 의 linkedAccounts eager load 는 P2-C 에서 제거 검토(Google row 생기면 매 요청 JOIN) | P2-C | 성능(경미) |
| 17 | frontend AuthContext | `packages/auth-context`(`login({email,password,serviceKey})`) · `packages/auth-react` `useServiceAuth` · 서비스 로컬 `AuthContext`(kpa-branch · pharmacy-hub · mobile-app) | LIVE | `loginWithGoogle(idToken)` 추가, `login` 은 전환기 유지 | P2-D | 공용 패키지 = 소비처 전수 식별(SHARED-MODULE-PROTOCOL) |
| 18 | 서비스별 login 화면 | web-neture `LoginModal` · web-kpa-society `LoginModal` · web-kpa-branch `LoginPage` · web-pharmacy-hub `LoginPage` · web-k-cosmetics `LoginModal`+`LoginPage` · admin-dashboard `auth/Login`(serviceKey neture) — **7 진입점**. web-account · web-glucoseview · signage-player-web = 자체 로그인 폼 없음(handoff) | LIVE | Google 버튼 추가(P2-D-web) → P2-G password 폼 제거 | P2-D / P5 | 진입점 누락 = P2-F 락아웃 |
| 19 | mobile / PWA | `services/mobile-app/app/(auth)/login.tsx` — email/password · `includeLegacyTokens:true` 계약. Google 네이티브 sign-in 라이브러리 없음 | LIVE | 네이티브 Google ID token → 동일 `POST /auth/google/login` | **P2-D-mobile** | 의존성 추가(중지 조건) · 스토어 재배포 |
| 20 | Kakao / Naver | passport strategy(#6) + admin `settings/OAuthSettings` + `settings.oauth_settings` + `package.json` `passport-kakao` · `passport-naver-v2` | DEAD(전략 등록만) | 전면 제거(V3 §3 · §9) | **P2-G** | dependency · `package.production.json` 동기 변경 |
| 21 | 운영자 password write | `AdminUserController`(platform-accounts password · credential upsert) · operator members password(`MembersConsoleClient.updatePassword`) · `admin-password-reset-scope` · `scripts/reset-admin-password.ts` | LIVE | P2-G 까지 유지 → P5 제거 | P5 | 없음 |

---

## 2. Existing User Migration Matrix

계정 상태는 **신규 컬럼 없이** `linked_accounts(provider='google')` 존재 여부 × `users.password` 값으로 파생한다(§4-2).

| # | 사용자 상태 | 현재 로그인 | Google 상태 | 전환 방법 | password 처리 |
|---|---|---|---|---|---|
| U1 | **Legacy 활성** — password 있음 · Google row 없음 | email/password (모든 서비스 공통 또는 서비스 credential) | 미연결 | 로그인 → 계정 설정 → [Google 연결] → password 재입력 → Google 인증 → insert (P2-C) | 유지 → P2-F 에서 NULL |
| U2 | Legacy + Google 이메일 동일 | 동일 | 미연결 · Google 로그인 시도 시 `sub` miss | Google 로그인 화면에서 힌트("기존 계정 있음 → 기존 로그인 후 연결") → U1 경로. **자동 연결 없음** | U1 과 동일 |
| U3 | Legacy · password 분실 · 이메일 수신 가능 | 불가 | 미연결 | P2-G 이전: `forgot-password` 로 복구 → U1. P2-G 이후: U4 | — |
| U4 | Legacy · password 분실 · 이메일 수신 불가 / 계정 접근 전면 불가 | 불가 | 미연결 | **운영자 복구**(P2-E): 본인확인 → 1회용 연결 token → 사용자 Google 인증 → `sub ↔ users.id` | 복구 완료 후 P2-F 규칙 적용 |
| U5 | Social-legacy — `users.password=''` · `users.provider∈{google,kakao,naver}`(존재 여부 미확인 → WO-2A census) | 불가(`SocialLoginRequiredError`) · 소셜 route 도 없음 → **현재 완전 접근 불가** | Google row 없음(`linked_accounts` 0행) | U4 경로(운영자 복구). `users.provider_id` 를 자동 연결 근거로 **쓰지 않는다**(검증 불가 값) | 이미 `''` → P2-F 에서 NULL 정규화 |
| U6 | 다중 서비스 회원 — 1 user · N `service_memberships` · N `service_credentials` | 서비스별 password 상이 가능 | 미연결 | Google 연결 **1회**로 전 서비스 로그인 통합(handoff 는 그대로) | P2-F 에서 `users.password` NULL + 해당 user 의 `service_credentials` 전 row 의미 상실 |
| U7 | Transitioned — Google row 있음 · password 있음 | 둘 다 가능 | 연결 | 없음(완료) | P2-F: Google 로그인 성공 이력 ≥1 확인 후 password login 차단 → NULL |
| U8 | Google-only(신규) | Google | 연결 | 해당 없음 | 처음부터 NULL(P2-A migration 전이면 `''` 금지 — P2-D 는 migration 선행) |
| U9 | platform:super_admin · 서비스 operator | email/password(admin-dashboard 는 `serviceKey:'neture'`) | 미연결 | **파일럿 코호트** — P2-C 배포 직후 운영자부터 연결. admin-dashboard Google 로그인은 P2-D-web 포함 | P2-F 1차 대상(운영자) → 일반 사용자 |
| U10 | status pending / rejected / suspended | `resolveAccountAccess` 로 제한/차단 | 무관 | Google 로그인도 **동일 status 정책** 적용(`handleOAuthLogin` 의 blocked 검사 유지) | 상태 무관 |
| U11 | 중복 users — 같은 사람 · 다른 이메일 · 다른 `users.id` | 각각 | 각각 별도 `sub` 연결 가능(같은 Google 계정은 **하나의 user 에만**) | **병합하지 않는다**(Phase 2 범위 밖 · `mergeAccounts` 은퇴). 사용자가 어느 계정에 Google 을 붙일지 선택 | 각 계정 규칙대로 |

---

## 3. Google Identity Contract (`linked_accounts`)

운영 물리(2026-09-15 snapshot) · entity(`entities/LinkedAccount.ts`) · Target 비교.

| 항목 | 현재 (운영 물리) | 현재 (entity) | Target | Phase |
|---|---|---|---|---|
| `userId` | uuid NOT NULL · **FK 없음** | varchar · `ManyToOne('User', CASCADE)` | uuid NOT NULL · **FK users(id) ON DELETE CASCADE** 추가 | **P2-A** migration |
| `provider` | varchar(50) NOT NULL | enum `email|google|kakao|naver` | varchar 유지 · Phase 2 runtime write = `'google'` 고정. enum 선언은 entity 만 정정(DDL 불변) | P2-A(entity) |
| `providerId` | varchar(255) NULL | nullable | = Google `sub`. Google row 는 NOT NULL 을 **runtime 검증**(DDL 은 legacy email row 호환 위해 nullable 유지) | P2-A |
| `(provider, providerId)` unique | **없음** — non-unique `IDX_linked_accounts_provider` | `@Unique(['userId','provider','providerId'])`(운영 없음) | **`CREATE UNIQUE INDEX … ON linked_accounts(provider, "providerId") WHERE "providerId" IS NOT NULL`** — 1 sub = 1 user 의 DB 보장(race 방어) | **P2-A** |
| 1 user 당 Google 수 | 제약 없음 | `@Unique(userId,provider,providerId)` 는 다중 허용 | **1 user : 1 Google sub** (partial unique `(userId) WHERE provider='google'`) — §8(b) 확정. 양방향 unique 로 sub→user · user→sub 모두 봉쇄 | P2-A |
| `email` | varchar NULL | **NOT NULL** + `@Index(['email'])`(운영 없음) | Google row 에 **저장하지 않음**(V3 §3 자동 병합 유혹 제거). entity NOT NULL → nullable 정정. 컬럼 삭제는 P5 | P2-A(entity) / P5 |
| `displayName` · `profileImage` · `providerData` | NULL | nullable | 저장하지 않음 → P5 삭제 | P5 |
| `accessToken` · `refreshToken` · `expiresAt` · `profile` | 운영 잉여 4컬럼(entity 없음) | — | 사용 금지 → P5 삭제 | P5 |
| `isPrimary` · `isVerified` | boolean default false | 존재 | 의미 없음(Google 단일) → 쓰지 않음 · P5 삭제 | P5 |
| `status` | 없음 | 없음 | **신설하지 않음** — row 존재 = 활성 · 해제 = row 삭제 + `account_activities(type='unlinked_google')` 감사 | — |
| `linkedAt` / `lastUsedAt` | NULL default now / NULL | `@CreateDateColumn` / nullable | `linkedAt` = insert 시 · `lastUsedAt` = Google 로그인 성공마다 갱신 | P2-C / P2-D |
| `createdAt` | NOT NULL(운영 잉여) | 없음 | entity 에 반영(둘 다 채움) | P2-A(entity) |
| legacy rows(email/kakao/naver) | 0행 | — | 생성 경로 없음(P2-B 에서 코드 제거). 존재 시 P5 정리 | — |
| 테이블명 | `linked_accounts` | — | rename 없음(V3 §3) | — |

**P2-A migration 최소 변경(F10 예외 승인 대상)** — incremental migration 1건:
1. `ALTER TABLE linked_accounts ADD CONSTRAINT FK_linked_accounts_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE`
2. partial unique `(provider, "providerId") WHERE "providerId" IS NOT NULL`
3. partial unique `("userId") WHERE provider = 'google'` (§8(b) 확정)
4. `ALTER TABLE users ALTER COLUMN password DROP NOT NULL` · `ALTER COLUMN name DROP NOT NULL, ALTER COLUMN name DROP DEFAULT` (§6 Q5)
~~5. `CREATE TABLE linking_sessions`~~ — **P2-A 에서 제외**(§8(e) 확정). 실제 복구 기능을 구현하는 WO-2E 의 migration 으로 생성한다(사용하지 않는 인증 구조를 미리 만들지 않는다)

주의(메모리 `project_phase1_same_run_ci_red_migration_blocked`): incremental migration 추가 시 `expected-schema-states` · ledger spec · agent 테스트를 **같은 커밋**에 포함한다. `linked_accounts` 는 `BaselineRbacAndAccountTables` 의 assertion 대상(구조 불일치 → deploy 중지)이므로 baseline assertion 도 함께 갱신해야 한다.

---

## 4. 기존 사용자 명시 연결 Flow (P2-C)

### 4-1. Target 흐름

```text
기존 email/password 로그인 (어느 서비스든)
        ↓
/mypage/settings (4 service) · admin 계정 설정
        ↓
[Google 계정 연결]
        ↓
password 재입력 — **users.password 만** 검증 (service_credentials 는 재인증 증거로 사용 금지 · §8-1)
        ↓
Google Identity Services → ID token (aud = 해당 origin 의 client_id)
        ↓
POST /api/v1/auth/google/link { idToken, password }   (requireAuth)
        ↓
서버: ID token 검증(서명 · iss · exp · **aud ∈ 서버 allowlist{web, admin, mobile client_id}** — 클라이언트가 보낸 aud 를 신뢰하지 않음) → sub 추출
        ↓
sub 조회 — 다른 user 에 연결됨 → 409 GOOGLE_SUB_ALREADY_LINKED (병합 없음)
        ↓
linked_accounts INSERT (userId, provider='google', providerId=sub, linkedAt)
        ↓
account_activities(type='linked_google') 기록 → 200 { linked: true }
        ↓
기존 세션 유지 (JWT sub = users.id 불변 · 재발급 불필요)
```

### 4-2. 결정 사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 연결 직전 password 재입력 | **필수 · `users.password` 만 인정**. `service_credentials.password_hash` 는 전환기 동안 재인증 증거로 **사용 금지**(§8-1). `users.password` 가 `''`/NULL 이거나 기억 못하면 → reset 가능 기간엔 `forgot-password`, 아니면 U4 운영자 복구 | 계정 탈취 세션이 Google 을 붙여 영구화하는 것을 막는다. 현행 register 가 이메일만으로 credential 을 만들 수 있으므로 credential 은 소유 증거가 아니다 |
| 최근 인증 세션을 재인증으로 인정할 시간 | **미도입(확정)** — JWT 에 `auth_time` 이 없고 refresh 로 `iat` 가 갱신되어 "최근 로그인" 판별 불가. 도입 = 토큰 계약 변경(중지 조건) → Phase 4 Claim 작업으로 이월. 이 재인증 정책은 password 소멸과 함께 소멸하는 **전환기 전용 장치** | §8(c) |
| 동일 sub 가 다른 user 에 연결 | 409 거부 · 메시지 "이 Google 계정은 이미 다른 O4O 계정에 연결되어 있습니다" · 해제는 그 계정에서만 · 감사 로그 | 자동 병합 금지 |
| Google 인증 취소 / 팝업 닫힘 | 서버 상태 변화 0(ID token 방식은 최종 POST 전까지 stateless) · 설정 화면 복귀 | — |
| 연결 중 브라우저 종료 | 동일 — 잔존 상태 없음 | — |
| callback / POST 재시도 | 멱등 — 같은 `(userId, sub)` 재요청 = 200 `ALREADY_LINKED`(성공 취급) | — |
| duplicate insert race | DB partial unique 가 최종 방어 → `23505` catch → 소유자 동일이면 멱등 성공, 다르면 409 | §3 |
| 연결 성공 후 기존 session | **유지** · 토큰 재발급 없음 | JWT sub 불변 |
| 연결 직후 password NULL | **하지 않음** — P2-F 별도 단계 | 연결 안정화 우선(WO §2-4 기본 방향) |
| 연결 해제 | P2-F 이전: password 보유 시 허용(마지막 로그인 수단 보호 = 현행 `unlinkAccount` 규칙) · P2-F 이후(password NULL): **불가**(교체만 — 새 Google 로 재연결 후 이전 row 삭제, 단일 트랜잭션) | 락아웃 방지 |
| 연결 상태 노출 | `GET /api/v1/auth/identity` → `{ google: { linked, linkedAt, lastUsedAt }, password: { present } }` — sub 값은 노출하지 않음 · `/me` 계약 불변 | 최소 계약 변경 |

---

## 5. Password Retirement Matrix

| 대상 | 현재 사용 | 제거 조건 | 제거 Phase |
|---|---|---|---|
| `POST /auth/login` password 검증(연결 계정) | 모든 계정 | 계정이 Google row 보유 + Google 로그인 성공 ≥1 + 전 진입점 Google LIVE + feature flag(`PASSWORD_LOGIN_RETIRED_FOR_LINKED`) on → `GOOGLE_LOGIN_REQUIRED` 반환 | **P2-F** |
| `users.password` 값 | 전 계정 | 위 차단 30일 무이슈 후 계정별 배치 NULL(청크 · snapshot 선커밋 · `DROP NOT NULL` 선행) | **P2-F** |
| `users.password` 컬럼 | — | P2-G 완료 기준 충족 | P5(F10 예외) |
| `service_credentials` reader(login dual-read · change-password · reset · admin scope · branch has_credential) | LIVE | 연결 계정 = P2-F 차단으로 자동 무력화. 코드 제거는 P2-G 이후 | P2-G 이후 / P5 |
| `service_credentials` writer(register ×2 · change-password · reset · admin ×2) | LIVE | P2-D 에서 Google 가입이 기본이 되면 register writer 은퇴 시작 · 나머지는 P2-G | P2-D ~ P2-G |
| `service_credentials` 테이블 | 물리 존재 | `users.password` 컬럼 제거와 **동일 migration** | P5 |
| `password_reset_tokens` · `forgot/reset-password` route · 이메일 템플릿 | LIVE | P2-G 완료(Legacy 계정 0 또는 전부 dispositioned) | P5 |
| `find-id`(phone → email) | LIVE | P2-F 와 함께 은퇴 후보(개인정보 조회 표면) | P2-F 검토 / P5 |
| `email_verification_tokens` · verify-email | LIVE | 로그인 gate 용도 소멸. 프로필 이메일 검증 존속 여부 판단 | P5 |
| `login_attempts` · `LoginSecurityService` · `loginAttempts/lockedUntil` | LIVE | password 로그인 제거 시 의미 소멸(Google 은 IdP 측 방어) | P5 |
| `password-policy.ts` · `password.dto` · `change-password.dto` · `RegisterRequestDto.password` | LIVE | register/password route 제거와 동시 | P5 |
| frontend password 폼(7 진입점 · 4 mypage settings · admin/operator PasswordModal) | LIVE | P2-G 완료 | P5 |
| password 관련 테스트(`servicePasswordLoginSelection` · `orphanCredentialLogin` · `passwordContract` ×3 · `password-policy`) | CI | 각 코드 제거 커밋에 동반 | P2-F ~ P5 |
| 운영자 password write(`AdminUserController` · operator members · `reset-admin-password.ts`) | LIVE | P2-G | P5 |
| `users.provider` · `provider_id` · `reset_password_token/expires` | 잔존 컬럼 | Identity 판정에 사용 금지(즉시) · 물리 제거 | P5 |
| Kakao/Naver passport · `oauth_settings` · admin OAuthSettings · `passport-kakao` · `passport-naver-v2` | DEAD | 의존 0 확인 후 제거 | **P2-G** |
| `passport` · `passport-google-oauth20` | DEAD | §8(a) GIS 채택 시 함께 제거 | P2-G |

---

## 6. Failure / Recovery Matrix

| 상황 | 탐지 | 처리 | 데이터 영향 |
|---|---|---|---|
| Google ID token 검증 실패 / 만료 / aud 불일치 | 서버 verify | 401 `GOOGLE_TOKEN_INVALID` · 상태 변화 0 · 재시도 | 0 |
| Google callback / 팝업 실패(네트워크 · 취소) | 클라이언트 | 화면 복귀 · 서버 무상태 | 0 |
| `sub` 중복 — 다른 user 에 이미 연결 | `linked_accounts` 조회 + unique | 409 · 병합 없음 · 감사 로그 · 안내(해당 계정에서 해제 후 재시도 또는 운영자 문의) | 0 |
| `sub` 중복 — 같은 user 재요청 | 동일 | 멱등 200 | 0 |
| 기존 계정 접근 불가(U4 · U5) | 사용자 신고 | **P2-E 운영자 복구**: (1) 본인확인 — 이름 · 전화 · 약사면허 정보(`kpa_pharmacist_profiles`) · 서비스 membership · 분회/사업장 관계 중 **2개 이상 대조** (2) `linking_sessions` insert(WO-2E 에서 테이블 생성 · userId · provider='google' · status=pending · verificationToken 무작위 32B · expiresAt = 발급 +15분 · metadata = {issuedBy 운영자 id, reason}) (3) 사용자에게 token URL 전달(이메일만으로 발급 금지 — 전화 등 2차 채널 확인) (4) 사용자 Google 인증 → `POST /auth/google/link/recover {token, idToken}` → token single-use 소모 → insert (5) `account_activities(type='linked_google_recovered')` + action_log | `linking_sessions` 1행 · `linked_accounts` 1행 |
| email 동일 · sub 미연결(U2) | `POST /auth/google/login` 에서 sub miss → `users.email` 존재 여부만 조회 | 404 `GOOGLE_NOT_LINKED` + `{ existingAccountByEmail: true }` → UI 힌트. 연결 · 로그인 · 토큰 발급 **없음** | 0 |
| email 동일 · 다른 사람이 신규가입 시도 | `users.email UNIQUE` 충돌 | Phase 2: 409 `EMAIL_IN_USE` + 동일 힌트(가입 불가 · 기존 계정 소유자면 로그인 후 연결 · 아니면 운영자 문의). Phase 5 `email` 제약 완화 후 해소 | 0 |
| 중복 users(U11) | 운영자 인지 | Phase 2 병합 없음 · 사용자가 하나를 선택해 연결 · 나머지 계정 처리는 보유기간 정책 | 0 |
| 연결 직후 rollback 필요(사용자 착오 · 오연결) | 사용자/운영자 | P2-F 이전: 사용자 해제(password 검증) · P2-F 이후: 운영자 복구 경로로 재연결(교체) · 모든 경우 `account_activities` 감사 | `linked_accounts` 1행 삭제 |
| password 제거 후 Google 접근 문제(Google 계정 분실 · 정지) | 사용자 신고 | 운영자 복구(P2-E)로 **새 Google sub** 재연결 — password 재부여 없음 | 1행 교체 |
| P2-F 차단 후 특정 진입점(예: mobile 구버전) 락아웃 | 로그인 실패 급증(`account_activities` reason=`google_login_required`) | feature flag off → 즉시 원복(password 값은 아직 존재) · 진입점 보완 후 재개 | 0 |
| P2-A migration 실패(baseline assertion 불일치) | deploy Job 실패 | deploy 중지(자동 ALTER 없음) · assertion 동반 갱신 후 재배포 | 0 |
| Google OAuth client 설정 오류(origin 미등록) | 클라이언트 오류 | 서비스 도메인 3축(`.neture.co.kr` · `.kpa-society.co.kr` · `.k-cosmetics.site`) + admin + mobile 의 client_id/origin 등록 체크리스트(WO-2A) | 0 |

---

## 7. Documentation Drift Matrix

분류: **A** 역사적 설명(유지) · **B** 현재 구현상 사실(Phase 2 까지 유지) · **C** 앞으로도 지켜야 할 규칙으로 V2/password 참조(정정 대상). Frozen 문서는 인라인 수정하지 않는다(§16-4).

| 문서 | 충돌 내용 | 분류 | 처리 방식 | Phase |
|---|---|---|---|---|
| [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md) §5-A (F10) | "`service_credentials` 신설 필수 · `users.password` deprecation" 을 V2 예외 항목으로 규정 · 예외 절차 예시 WO 명 V2 | **C** | 별도 문서 WO — §5-A 를 "V3 구현 WO 예외 항목(REVIEW-8 · REVIEW-11 · 자동 병합 제거 · Google 연결)" 으로 교체. V3 §14 가 이미 예고 | WO-2H(문서) |
| [`USER-OPERATOR-FREEZE-V1`](../architecture/USER-OPERATOR-FREEZE-V1.md) §10 (F11) | L2 = `service_credentials` 해석 · 3축 무결성 검증 항목이 `service_credentials` 기준 | **C** | 별도 문서 WO — L2 = `linked_accounts`(신규 테이블 없음) 로 교체 | WO-2H(문서) |
| [`O4O-MYPAGE-CANONICAL-V1`](../baseline/O4O-MYPAGE-CANONICAL-V1.md) §2 · §4 · §6 | "비밀번호 변경 = L2 서비스별 · web-account 비밀번호 UI 금지 근거 = `service_credentials`" 를 canonical 규칙으로 기술 | **C**(규칙) / **B**(runtime) | Phase 2: `[Google 계정 연결]` 위치를 각 service `/mypage/settings` 로 추가하는 정정(V3 §14 "Phase 2 실행계획 WO 에 포함") · password 절은 P2-G 후 삭제 | WO-2C(추가) / WO-2H |
| [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) §3-3 | "비밀번호는 서비스별로 독립 · 저장소 `service_credentials`" 근거 Canonical = V2 | **C** | 근거 링크 V3 로 교체 + "Google 전환 완료 후 소멸" 배너 → P2-G 후 절 삭제 | WO-2H |
| [`USER-DOMAIN-SSOT-V1`](../baseline/USER-DOMAIN-SSOT-V1.md) §1 · §2 | `users` 컬럼 나열에 `password · provider · provider_id` 포함 | **B** | P5 컬럼 제거 후 정정 | P5 |
| [`USER-STRUCTURE-V1`](../architecture/USER-STRUCTURE-V1.md) | "플랫폼 공통 계정 = 이메일·비밀번호·이름" · 가입 흐름 "이메일·비밀번호·이름·전화번호 입력" | **B/C** | P2-D 후 Google 가입 흐름으로 정정(별도 문서 WO) | WO-2H |
| [`O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1`](../platform/operator/O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1.md) | 회원 관리 기능에 "비밀번호 변경(PasswordModal)" · `PUT /operator/members/:userId`(비밀번호 포함) | **B** | P5 운영자 password write 제거와 동시 | P5 |
| [`O4O-PRIVACY-POLICY-V1.0`](../baseline/O4O-PRIVACY-POLICY-V1.0.md) | 수집 항목 "비밀번호 등 인증정보" · 이메일 용도 "비밀번호 재설정" | **B**(게시 정책) | password 제거 시 **정책 버전 bump + 재동의**(V3 §10 consent 이력) — Phase 5 법률 검토 항목 | P5 |
| [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) | 비밀번호 재설정 메일 발송 기록 1년 | **A/B** | 유지(발송 사실 기록은 잔존 데이터 보유기간) | — |
| [`O4O-IDENTITY-ARCHITECTURE-V2`](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md) · [`V1`](../architecture/O4O-IDENTITY-ARCHITECTURE-V1.md) | 본문이 password/서비스별 credential 모델 | **A** | SUPERSEDED 배너 이미 존재 · 본문 불변 | — |
| `docs/CANONICAL-INDEX.md` | — | 정합(V3 ACTIVE · V2/V1 SUPERSEDED 명시) | 없음 | — |
| 코드 주석(`ServiceCredential.ts` 헤더 "F10 §5-A.2 / F11 §10.4 Identity V2 예외" · `auth-login.service` "Identity V2 dual-read" 등) | V2 근거 인용 | B(코드) | 해당 코드 제거 시 소멸 | P2-F ~ P5 |

**문서 정합(본 WO)**: 발견 8건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(WO-2H 문서 정합 축 — F10 · F11 · MYPAGE · OPERATOR-DASHBOARD · USER-STRUCTURE 5건 묶음). 인라인 수정 0.

---

## 8. 사용자 결정 — 확정 (2026-09-17)

| # | 항목 | IR 권고 | **확정** | 판정 |
|---|---|---|---|---|
| (a) | Google 인증 방식 | GIS ID token → 서버 검증 | **Google ID-token-to-backend** 를 정본 개념으로. Web = Google Identity Services → ID token → O4O API · Mobile = Native Google Sign-In → ID token → **같은 O4O API**. 서버는 `google-auth-library` 로 서명 · issuer · audience · expiration 검증, **aud 는 서버 설정 allowlist(Web · Admin · Mobile client ID)** 로 판정하고 클라이언트가 보낸 aud 를 신뢰하지 않는다. Identity Key = `sub` 만 (이메일 아님) | 채택 |
| (b) | 1 user 당 Google sub | 1개 | **1개** — `(provider, providerId)` unique + `(userId) WHERE provider='google'` unique 양방향. 업무용/개인용 동시 연결 요구가 실제로 생기면 그때 완화 | 채택 |
| (c) | 재인증 | `auth_time` 미도입 · password 재입력(users.password 또는 credential) | **`auth_time` 미도입 + P2-C 재인증은 `users.password` 재확인만 인정.** `service_credentials.password_hash` 는 재인증 증거로 사용 금지(§8-1). password 없음/분실 → reset 가능 기간엔 reset, 아니면 P2-E 운영자 복구. 전환기 전용 장치 | **수정 채택** |
| (d) | P2-F 차단 방식 | feature flag 롤아웃 | Google 연결 → Google 로그인 실제 성공 확인 → 운영자 코호트 차단 → 관찰 → 전체 확대 → 30일 안정 → NULL. **NULL 전까지 flag OFF 로 즉시 rollback 가능** — 차단 테스트 기간 ≠ password 데이터 삭제 시점 | 채택 |
| (e) | `linking_sessions` 생성 시점 | WO-2A migration 에 포함 | **WO-2E(Operator Recovery) 에서 migration 과 함께 생성.** 원칙: 실제 사용하지 않는 인증 구조를 미리 만들지 않는다. F10 예외 1회 추가 비용 < dead auth table 선생성 비용 | **변경** |
| (f) | Google 가입 시 `users.email` | optional profile 저장 · UNIQUE 충돌 시 거부 + 힌트 | Google email = Identity Key ✗ · 자동병합 기준 ✗ · 계정소유 증명 ✗ / optional profile ○ · 연락/표시 ○ · 기존계정 안내 힌트 ○. UNIQUE 충돌 → `409 EMAIL_IN_USE` · 신규 user 생성 없음 · "기존 O4O 계정이 있을 수 있으므로 계정 연결 절차를 이용하십시오" 안내. `email 같음 → 기존 user 자동 선택` 절대 금지. email 완전 optional 은 Phase 5 | 채택 |

### 8-1. 보안 메모 — legacy `service_credentials` writer 격리

현행 경로(§1 #2):

```text
기존 users.email 존재 → register → 본인확인 없이 service_credentials 생성/갱신
```

- P2-B 에서 **즉시 제거하지 않는다** — 기존 사용자의 새 서비스 가입 경로가 사라진다.
- 원칙: **이 경로가 살아 있는 동안 생성된 service credential 은 Google Identity 연결의 본인 재인증 수단으로 사용하지 않는다.** (→ §4-2 · §8(c))
- P2-D 에서 각 서비스의 가입 신청 경로를 Google 사용자 기준으로 정리하면서 이 legacy writer 를 제거한다. 기능 공백 없이 위험을 격리한다.

## 9. 완료 보고 — 12개 질문

1. **Phase 2 의 첫 코드 변경** — WO-2B: `socialAuthService.handleSocialAuth` 의 `email OR provider_id` 조회·`users.provider` 덮어쓰기와 `auth-login.service.handleOAuthLogin` 의 `existingUserByEmail → linkOAuthAccount(autoLinked)` 분기 삭제, `AccountLinkingService.mergeAccounts` 은퇴, `passportDynamic` Google strategy 의 `handleSocialAuth` 연결 해제. 두 경로 모두 현재 **호출자 0** 이므로 기존 사용자 로그인 영향 0. 단, 커밋 순서상 WO-2A(계약 migration + 의존성)가 먼저다.
2. **자동 병합 제거 전 선행조건** — (i) 본 IR 의 "도달 불가" 판정 유지 확인(`passport.authenticate` route 0 · `login(provider≠email)` 호출자 0 을 CI grep 게이트로 고정) (ii) WO-2A read-only census: `users.provider IS NOT NULL` 분포 · `password=''` 계정 수 · `linked_accounts` 0행 재확인 (iii) 제거 후 Google 진입점이 없는 공백 기간에도 email/password 로그인이 그대로이므로 사용자 접근 단절 없음.
3. **기존 사용자 Google 연결 흐름** — §4-1. 로그인 → `/mypage/settings` → [Google 계정 연결] → `users.password` 재입력(credential 불인정) → Google ID token → `POST /auth/google/link {idToken, password}` → verify → sub 중복 검사(409) → `linked_accounts` insert → 감사 로그 → 세션 유지 → `GET /auth/identity` 로 상태 표시.
4. **신규 사용자 생성 데이터** — `users(id, status='active', created_at, updated_at, email=Google claim[optional], name=Google name claim[optional])` + `linked_accounts(userId, 'google', sub, linkedAt)` + `role_assignments(user)` + 동의 3컬럼(`tos/privacy/marketing`). 사용자 타이핑 개인정보 0. 서비스 가입은 별도 — 각 서비스의 가입 신청 흐름(승인제 · password 없음).
5. **Google-only 가입을 막는 DB 제약** — ① `users.password NOT NULL`(현행 `''` sentinel 로 우회 가능하나 V3 Target 은 NULL → `DROP NOT NULL`) ② `users.name NOT NULL DEFAULT '운영자'`(DB 기본값이 placeholder 개인정보 → `DROP NOT NULL · DROP DEFAULT`) ③ `users.email NOT NULL UNIQUE`(이메일 없는 가입 · 동일 이메일 다른 사람 가입 차단 → Phase 5, 소비처 56곳 census 후). ①②는 WO-2A F10 예외 migration.
6. **`linked_accounts` 최소 변경** — §3: FK users + partial unique `(provider, providerId)` + partial unique `(userId) WHERE provider='google'` + entity drift 정정(userId uuid · provider varchar · email nullable · `@Unique` 제거 · createdAt 반영). 컬럼 삭제 0.
7. **`service_credentials.password_hash` 폐기 시점** — 의미 상실 = P2-F(연결 계정 password login 차단) · reader/writer 코드 제거 = P2-G 이후 · **물리 제거 = Phase 5, `users.password` 컬럼 제거와 동일 migration**. 전환기 fallback(dual-read)은 P2-F 까지 유지.
8. **`users.password` NULL 시점** — P2-F, 계정별. 조건 = Google row 보유 ∧ Google 로그인 성공 이력 ≥1 ∧ flag 차단 30일 무이슈 ∧ `DROP NOT NULL` 적용. 청크 배치 · snapshot 선커밋(대량 update = 사용자 승인).
9. **password login 완전 제거 완료조건(P2-G)** — (i) 7 web + admin + mobile 전 진입점 Google 로그인 smoke PASS (ii) 최근 90일 로그인 계정의 Google row 100% 또는 잔여 Legacy 계정 전건 disposition(복구 · 휴면 통지 · 보유기간 만료) (iii) `account_activities` `login_email` 성공 0건 **연속 30일** (iv) 운영자 복구 경로 실사용 ≥1건 검증 (v) `service_credentials` reader/writer 0 · `users.password` 참조 route 0 (vi) 개인정보처리방침 버전 bump 준비 완료.
10. **계정 접근 불가 사용자 복구** — §6 U4 행: 운영자 본인확인(2요소 이상 대조) → `linking_sessions`(WO-2E 생성) single-use 15분 token(발급자 · 사유 기록) → 이메일 외 채널로 전달 → 사용자 Google 인증 → `POST /auth/google/link/recover` → sub ↔ 기존 `users.id`. 이메일만으로 발급 금지 · 자동 병합 없음.
11. **email 동일성 활용 범위** — `sub` miss 시 `existingAccountByEmail: boolean` 힌트 1가지뿐(§6). 자동 병합 · `linked_accounts` 생성 · password 없는 `users.id` 접근 · 운영자 미승인 복구에 **사용 금지**. 부수 발견: 현행 register 의 "기존 email → 본인확인 없이 credential 생성" 경로가 이 원칙에 반하며 P2-D 에서 자연 소멸.
12. **Phase 2 구현 WO 수** — **8개**(§10). WO 예시의 2A~2G 에 "운영자 복구(2E)" 를 독립시키고 검증+문서 정합을 2H 로 묶었다.

---

## 10. 구현 WO 제안(의존순)

| WO | 범위 | 선행 | 중지 조건 접촉 |
|---|---|---|---|
| **WO-2A** Google Identity prerequisites | (1) read-only census(`users.provider` 분포 · `password=''` 수 · `linked_accounts` 0행) (2) `google-auth-library` 추가(`package.json` + `package.production.json`) (3) F10 예외 migration 1건: `linked_accounts` FK + partial unique ×2 · `users.password DROP NOT NULL` · `users.name DROP NOT NULL/DEFAULT` — **`linking_sessions` 제외** — expected-schema-states · ledger · baseline assertion 동반 (4) Google Cloud OAuth client(Web · Admin · Mobile) 등록 + 서버 aud allowlist 설정 체크리스트 | 본 IR 사용자 검토 | dependency · migration · 외부 서비스 승인 · F10 |
| **WO-2B** Dead automatic email merge removal | §9-1 삭제 + `login()` email 전용 축소 + `googleIdentityService` 골격(verifyIdToken · aud allowlist · findBySub) + CI grep 게이트 | 2A | Core(auth) 파일 수정 = F10 예외 범위 안 |
| **WO-2C** Existing user explicit Google link | `POST /auth/google/link`(**`users.password` 재인증만**) · `DELETE /auth/google/link`(password 보유 시) · `GET /auth/identity` · 4 service `/mypage/settings` + admin 계정 설정 UI · `account_activities` 감사 · middleware linkedAccounts eager load 제거 검토 · 운영자 파일럿 연결 | 2B | route/API 계약 추가 · 공용 패키지(auth-context) 소비처 전수 |
| **WO-2D-web** Google login / signup (web) | `POST /auth/google/login`(sub hit → 세션 · miss → 힌트) · `POST /auth/google/signup`(동의 수집 · users+linked+role) · 7 진입점 Google 버튼 · `loginWithGoogle` 공용화 · Google 사용자 서비스 가입 = 각 서비스 가입 신청 흐름의 password 의존 제거(register 기존-사용자 분기 · 서비스별 신청 route) · **legacy `service_credentials` writer 정리(§8-1)** | 2C | route · 공용 패키지 |
| **WO-2D-mobile** Google login (Expo) | 네이티브 Google sign-in → 동일 API · `includeLegacyTokens` 계약 유지 · 스토어 배포 | 2D-web | dependency(mobile) |
| **WO-2E** Operator recovery | **`linking_sessions` 생성 migration(F10 예외)** · 발급 API(platform:super_admin · 사유 필수 · 15분 · single-use) · `POST /auth/google/link/recover` · 본인확인 체크리스트 · 감사 | 2C | migration · 권한 · route |
| **WO-2F** Legacy password retirement per account | feature flag 차단(`GOOGLE_LOGIN_REQUIRED`) 운영자 코호트 → 전체 · 30일 관찰 · `users.password` NULL 청크 배치(snapshot 선커밋) · `service_credentials` dual-read 무력화 · `find-id` 은퇴 검토 | 2D-web · 2D-mobile · 2E 전부 LIVE | 대량 update(사용자 승인) |
| **WO-2G** Kakao/Naver · passport legacy removal | `passportDynamic` · `socialAuthService` 잔여 · admin OAuthSettings · `settings.oauth_settings` · `passport*` 4 의존성 · `securityMiddleware` 예외 · `LinkedAccount` enum | 2D | dependency |
| **WO-2H** Phase 2 transition verification + doc alignment | P2-G 완료조건(§9-9) 실측 · 문서 정합 5건(F10 §5-A · F11 §10 · MYPAGE · OPERATOR-DASHBOARD §3-3 · USER-STRUCTURE) · Phase 5 입력(REVIEW-8 잔여 = `email` 제약 · `users.password`/`service_credentials`/`provider*` 컬럼 제거 · 개인정보처리방침 버전) | 2F · 2G | Frozen 문서 본문 수정 = 별도 승인 |

병합 가능: 2B+2C(같은 auth-core 파일군 · 소규모) · 2G 를 2D 직후로 당겨도 무방. 분리 필수: 2A(migration 승인) · 2E(migration 승인) · 2F(대량 update 승인) · 2H(Frozen 문서).

**사용자 승인(2026-09-17)** — §8 6개 결정으로 Phase 2 실행계획 승인. 다음 작업 = **WO-2A**(`linking_sessions` 제외). 각 WO 는 별도 문서로 범위를 확정한 뒤 착수한다.

---

*작성: 2026-09-17 · 상태: APPROVED — 실행계획 확정 · 사용자 승인 2026-09-17(§8 수정 채택 2건: (c) users.password 만 · (e) linking_sessions → 2E) · 코드 0 · migration 0 · production 조회 0 · 문서 인라인 수정 0*
