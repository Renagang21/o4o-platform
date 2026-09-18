# CHECK — WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D)

> **판정:** `WO-2D GOOGLE-ONLY SIGNUP/LOGIN: PARTIAL — MOBILE PENDING`
> **일자:** 2026-09-18 · **WO:** [`WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1`](../work-orders/WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1.md)
> **범위:** 서버 endpoint 3종 · `@o4o/auth-client` · `@o4o/auth-react` · `@o4o/auth-context` · Web 5서비스 로그인 진입점 · admin-dashboard Login. Mobile(Expo)은 native dependency 가 중지 조건이라 후속 WO 로 분리.
> **프로덕션 활성화 선행조건:** `o4o-core-api` 에 `GOOGLE_ALLOWED_CLIENT_IDS`(및 선택 `GOOGLE_WEB_CLIENT_ID`) **미설정**(env 이름 read-only 확인, 값 조회 없음). 설정 전까지 모든 화면은 "Google 로그인은 준비 중입니다." 로 표시되고 password 경로만 동작한다. Client ID 발급·env 반영은 사용자 외부 서비스 승인 항목.

---

## 1. 22항목 보고

| # | 항목 | 결과 |
|---|---|---|
| 1 | endpoint | `GET /api/v1/auth/google/config` · `POST /api/v1/auth/google/login` · `POST /api/v1/auth/google/signup` — `auth.routes.ts` 등록, `GoogleAuthController` (`modules/auth/controllers/google-auth.controller.ts`) |
| 2 | 계약 | login `{ idToken, serviceKey?, includeLegacyTokens? }` · signup `{ idToken, consents:{terms,privacy,marketing?}, includeLegacyTokens? }` — `validateDto(whitelist+forbidNonWhitelisted)`: userId/email/sub/audience/role/membership 등 identity 필드 400 (`googleAuthDto.test.ts` 9건). 응답은 `/auth/login` 과 동일(쿠키 primary · cross-origin/legacy 는 body tokens · displayName null-safe · pendingPolicyAcceptances) + `isNewUser` + `serviceMembership?` |
| 3 | sub-only lookup 증빙 | `google-auth.service.ts:150` `identity.findGoogleIdentityBySub(identity.sub)` → `linked_accounts(provider='google', providerId=sub)` → `users.findOne({ id: linked.userId })`. email 로 users/linked_accounts 를 조회하는 코드 0 (`googleIdentityNoEmailMergeGuard.test.ts` AST guard G1~G7 PASS) |
| 4 | email 자동 병합 0 | 미등록 sub → `404 GOOGLE_SIGNUP_REQUIRED`(email 힌트 없음). signup 의 email UNIQUE 충돌은 사전 조회 없이 DB 23505 → `409 EMAIL_IN_USE`, 연결 0. 프런트 `<GoogleContinue />` 는 EMAIL_IN_USE 시 동의 화면에 머물고 자동 연결 UI 없음(테스트 PASS) |
| 5 | 신규 사용자 저장 PII | `users`: `email`(Google claim, 과도기 프로필 값 · `users.email NOT NULL UNIQUE` 존치) · `isEmailVerified` · `tos_accepted_at · privacy_accepted_at · marketing_accepted`. claim 없으면 `400 GOOGLE_EMAIL_MISSING`(placeholder 0). `linked_accounts`: `provider · providerId(sub) · userId · lastUsedAt` 만 — email/displayName/profileImage/providerData 스냅샷 0. `account_activities.email = null` |
| 6 | name/picture | `users.name = NULL` · `password = NULL` · picture 미저장. 프런트 null-safe 감사: `.name.(charAt|slice|split|trim…)` 사용자 객체 대상 6 surface(5 web + admin) 검색 결과 위험 0 (pharmacy-hub `MyProfilePage` 는 `profile.name ?? ''` 로 이미 안전) |
| 7 | 기본 role/membership | signup 은 `role_assignments · service_memberships · service_credentials` 생성 0 (`googleAuthService.test.ts` 15건 중 권한 0 검증 포함) |
| 8 | per-service 진입 흐름 | login 에 `serviceKey` 가 오면 `serviceMembership:{serviceKey,status}` 동봉만 · 세션은 발급 · 접근은 기존 route guard 가 판정 → 미가입은 기존 per-service join(`POST /auth/services/:serviceKey/join` · 서비스별 가입 신청)으로 안내. **password 의존 signup 화면 감사(수정 0 · 보고):** kpa-society `RegisterModal`(`/auth/register`) · neture `RegisterModal`(`/auth/register`) · k-cosmetics `RegisterPage`(`/auth/register`) · pharmacy-hub `JoinPage`(`/pharmacy-hub/join` — 가입 신청+password 동시). 4곳 모두 legacy password register 를 유지(임시). Google 신규 사용자의 계정 생성은 로그인 화면의 `<GoogleContinue />` 동의 단계가 담당하므로 차단 없음. password register 은퇴는 WO-2F 범위 |
| 9 | Web 화면 | `[ Google로 계속하기 ]` = 기본 진입, email/password = `임시 테스트 · 전환용 이메일 로그인` 구분선 + `이메일로 로그인 (임시)` 라벨: web-kpa-society `LoginModal` · web-neture `LoginModal` · web-k-cosmetics `LoginModal` + `LoginPage` · web-pharmacy-hub `LoginPage` · web-kpa-branch `LoginPage`. 공통 `<GoogleContinue />`(`@o4o/auth-react`) — 서비스명 조건문 0, 차이는 props(termsHref/privacyHref/onSuccess 라우팅/User 제네릭)만. 약관 링크: kpa-society `/policy`·`/privacy`, kpa-branch 는 법정 route 가 없어 `https://neture.co.kr/terms|/privacy` 절대 URL. web-account: 로그인 화면 없음(`HandoffPage`·`DashboardPage` 만) → 해당 없음 |
| 10 | Admin | `@o4o/auth-context` `AuthProvider`: `login` 본문을 `adoptLoginResponse` 로 분리(동작 무변경) + `loginWithGoogle(idToken, serviceKey?)` · `getGoogleAuthConfig` 추가, `AuthContextType` 확장. `apps/admin-dashboard/src/pages/auth/Login.tsx`: config → `renderGoogleButton`(`@o4o/auth-client`, 기존 dep) → `loginWithGoogle(idToken,'neture')`. **가입 미제공** — `GOOGLE_SIGNUP_REQUIRED` 는 "서비스 화면에서 먼저 계정을 만들어 주세요" 안내. 신규 dep 0 |
| 11 | Mobile | `services/mobile-app`: Google sign-in 라이브러리 없음(`package.json` 에 google/expo-auth-session 0). 추가 = dependency 변경 + per-platform Client ID/SHA/bundle config = 중지 조건 → **후속 WO 로 분리**(코드 변경 0). 서버 계약은 동일 endpoint 로 이미 준비됨 |
| 12 | Google client 설정 | `GET /auth/google/config` 는 `GOOGLE_WEB_CLIENT_ID` env 우선, 없으면 allowlist 첫 항목. 프런트 secret 0. **프로덕션 `o4o-core-api` env 에 `GOOGLE_*` 이름 0**(gcloud read-only · 이름만 확인) → 현재 `enabled=false` |
| 13 | allowlist | 서버 `GOOGLE_ALLOWED_CLIENT_IDS`(WO-2B `googleIdentityConfig`) 단일 경로. 비어 있으면 token 검증 거부 + config `enabled=false` → UI "준비 중". allowlist 상태는 클라이언트에 단일 code(`GOOGLE_ID_TOKEN_INVALID`)로만 노출 |
| 14 | 테스트 | api-server jest `src/services/auth src/modules/auth` **11 suites 94/94 PASS**(googleAuthService 15 · googleAuthDto 9 · googleIdentityNoEmailMergeGuard · googleIdentityService · refreshTokenFamily · orphanCredential · representativeEntry · servicePasswordLoginSelection · role-assignment 2 · auth-account). auth-react vitest **4 files 62/62 PASS**(useServiceAuth Google 5 · GoogleContinue 8 신규) |
| 15 | auth 회귀 | 위 11 suites 전부 PASS · api-server `tsc --noEmit` exit 0 · `@o4o/auth-client` `tsc --build` clean · `@o4o/auth-react`/`@o4o/auth-context`/admin-dashboard/5 web 서비스 `tsc --noEmit` exit 0 · eslint(수정 4파일) error 0(기존 warning 1: `AuthProvider.tsx:80` 무관) |
| 16 | guard 회귀 | jest `src/__tests__/security src/middleware` **19 suites 404 PASS / 2 skipped**(scope-guard · require-admin-contract · restricted-account-access · login-account-status-exposure · terms-acceptance-gate · cross-service 등) |
| 17 | cleanup user 로그인 | password 경로(`/auth/login`) 코드 무변경 · `servicePasswordLoginSelection` · `representativeEntryLoginContract` PASS. cleanup user 전환·삭제 0 |
| 18 | 프로덕션 신규 테스트 사용자 | 0 (Google client 미설정으로 실 signup 불가 · 생성 시도 없음) |
| 19 | migration | 0 (`git status` migrations 변경 0 · schema 변경 0) |
| 20 | PII 수동 변경 | 0 (프로덕션 DB write 0 · 조회도 env 이름만) |
| 21 | HEAD==origin/main | 커밋 §3 참조 |
| 22 | 작업트리 | 이번 WO 범위 미커밋 0 (§3) |

## 2. 범위 내 부수 정리 — CLAUDE.md §15 자격증명 하드코딩 제거

로그인 화면 4곳에 박혀 있던 "체험용 계정" 자동입력 버튼(실 email + password 문자열)을 제거했다: web-kpa-society `LoginModal` · web-neture `LoginModal` · web-k-cosmetics `LoginModal` · web-pharmacy-hub `LoginPage`(`DEMO_ACCOUNT` 상수). 해당 계정은 WO-2C 에서 이미 삭제된 legacy 계정이다. `apps/api-server/src/database/migrations/*` 의 과거 seed 문자열은 기록물로 미변경(보고만).

## 3. Git

| 커밋 | 범위 |
|---|---|
| `8df41b1b8` | 서버 endpoint 3종 + DTO + service + tests · WO 문서 |
| `1a139385b` | `@o4o/auth-client` · `@o4o/auth-react`(GoogleContinue + tests) · `@o4o/auth-context` |
| `883db772d` | 5 web 서비스 로그인 진입점 + AuthContext · admin-dashboard Login · 하드코딩 자격증명 4곳 제거 |
| `999fa5101` | 본 CHECK (git 표는 후속 커밋으로 갱신) |

## 4. 후속

- **Google Client ID 발급 + `GOOGLE_ALLOWED_CLIENT_IDS`(·`GOOGLE_WEB_CLIENT_ID`) env 반영** — 사용자 외부 서비스 승인 후 별도 배포 변경(CI env). 반영 전 실 브라우저 smoke 불가.
- **WO-2D-M(Mobile)**: Expo Google Sign-In dependency + per-platform Client ID → 동일 endpoint. 후속 WO.
- WO-2E First Google Admin Bootstrap → WO-2F Legacy Password/Auth 제거(password register 4곳 은퇴 포함) → WO-2G → WO-2H.

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(Mobile 분리)
