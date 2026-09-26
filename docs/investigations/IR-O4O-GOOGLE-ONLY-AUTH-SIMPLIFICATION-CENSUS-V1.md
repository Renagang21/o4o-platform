# IR-O4O-GOOGLE-ONLY-AUTH-SIMPLIFICATION-CENSUS-V1

> 작성일: 2026-09-26 · 갱신: 2026-09-26(결정 반영) · 상태: **조사 완료 · 결정 확정 / cleanup WO 발행**
> **코드 변경 0건 · migration 0 · production write 0**

---

## 0. 기준

```text
모든 O4O 사용자의 로그인 수단 = Google 하나
Google sub                  = external identity
users.id                    = internal identity
role / membership / relationship = 로그인 이후 authorization
```

새 기능을 만드는 조사가 아니다. **Google-only 전환 과정에서 생긴 전환용 코드 · 우회 경로 ·
중복 기능 · 사용하지 않는 OAuth/password 잔재를 찾아 제거**하기 위한 전수조사다.

판정은 `KEEP` / `REMOVE` 둘뿐이다. 증거가 부족하면 더 조사해서 둘 중 하나로 확정했다.

**이번 조사 범위 밖** (Authorization · Membership lifecycle 정책): `SELF_ROLE_REVOKE_FORBIDDEN` ·
`LAST_ADMIN_PROTECTED` · 서비스 역할 초기화 · membership 탈퇴/재활성 UI · `users.status` 정책 ·
역할 우선순위 · Store/Business Relationship.

---

## 1. 조사 방법과 그 한계

`main`(`23212304f`) 기준. git-tracked 소스만 보고 `dist` · `node_modules` · archive 는 제외했다.
각 항목마다 **문자열 검색이 아니라 실제 호출부(consumer)** 를 셌다.

**운영 DB read-only census 는 수행하지 못했다.** 이 PC 에 ADC 파일이 없고 DB 자격정보가 담긴
`.env` 도 없어 Cloud SQL Auth Proxy 를 띄울 수 없다. 따라서 아래 표의 **"데이터 존재"** 열에서
`미확인` 은 *없다는 뜻이 아니라 세지 못했다는 뜻*이다. 행 삭제가 필요한 항목은 cleanup WO
에서 DB 실측을 **선행 조건**으로 둔다.

운영 환경변수는 실측했다 (Cloud Run `o4o-core-api` env, 값은 기록하지 않음):

```text
존재:  GOOGLE_ALLOWED_CLIENT_IDS · GOOGLE_WEB_CLIENT_ID · DB_*
부재:  GOOGLE_ADMIN_BOOTSTRAP_ENABLED · GOOGLE_ADMIN_BOOTSTRAP_CODE
부재:  KAKAO_* · NAVER_* 일체
```

---

## 2. Google-only 본체 — 이미 도달해 있다

### 2-1. 서버 `auth.routes.ts` 전수 (18개)

```text
/google/config · /google/login · /google/signup · /google/bootstrap-admin
/refresh · /me · /me/profile · /logout · /logout-all
/handoff · /handoff/exchange · /services · /services/:serviceKey/join
/verify-email(POST) · /verify-email(GET) · /resend-verification
/status · /verify
```

`/login` · `/register` · `/forgot-password` · `/reset-password` 는 **이미 없다.**
password 로그인 런타임은 은퇴가 끝났다.

### 2-2. login surface 전수 (11개)

| Surface | 파일 | 로그인 수단 | 판정 |
|---|---|---|---|
| Admin Dashboard | `apps/admin-dashboard/.../auth/Login.tsx` | Google | **KEEP** |
| Neture | `web-neture/.../LoginModal.tsx` | Google | **KEEP** |
| KPA Society | `web-kpa-society/.../LoginModal.tsx` | Google | **KEEP** |
| K-Cosmetics (모달) | `web-k-cosmetics/.../common/LoginModal.tsx` | Google | **KEEP** |
| K-Cosmetics (페이지) | `web-k-cosmetics/.../auth/LoginPage.tsx` | Google | **KEEP** |
| PharmacyHub | `web-pharmacy-hub/.../LoginPage.tsx` | Google | **KEEP** |
| KPA Branch | `web-kpa-branch/.../LoginPage.tsx` | Google | **KEEP** |
| Store Workspace | `web-store/.../LoginPage.tsx` | Google | **KEEP** |
| Hospital Pharmacy | `web-hospital-pharmacy/.../LoginPanel.tsx` | Google (+ device enrollment) | **KEEP** |
| Lecture | `web-lecture/.../LoginPage.tsx` | 자체 인증 없음 · Neture 안내 1장 | **KEEP** (6줄, wrapper 아님) |
| Mobile | `mobile-app/app/(auth)/login.tsx` | 폼 없음 · 웹 안내 | **§6 참조** |

각 파일의 `password` 문자열은 전부 **은퇴를 설명하는 주석**이고 살아 있는 입력 폼은 없다.

> **비Google 로그인 = 0.** Google-only 의 핵심 런타임은 완료 상태다.

---

## 3. REMOVE 판정

### 3-1. Passport 계층 — **REMOVE (consumer 0 실측)**

| 항목 | runtime consumer | 판정 |
|---|---|---|
| `config/passportDynamic.ts` (Google·Kakao·Naver Strategy 등록) | **`passport.authenticate` 호출 0건** | **REMOVE** |
| `passport` · `passport-google-oauth20` · `passport-kakao` · `passport-naver-v2` | 위와 동일 | **REMOVE** (dependency 4개) |
| `/api/v1/social/{google,kakao,naver}/callback` | **라우터에 등록된 적 없음** — callbackUrl 문자열만 존재 | **REMOVE** |
| `express-session` + `passport.initialize()` | **`req.session` 사용처 0건** (세션은 OAuth 용으로만 존재) | **REMOVE** |

판정 근거가 강하다. 전략은 등록되지만 **그 전략을 쓰는 route 가 하나도 없고**, 콜백 URL 이
가리키는 경로 자체가 존재하지 않는다. verify callback 은 이미 auto-merge 제거 이후 경고만
찍고 실패하도록 남아 있다.

**제거 범위**: `config/passportDynamic.ts` · `main.ts` 의 `initializePassport` 호출 ·
`bootstrap/setup-middlewares.ts` 의 session/passport 미들웨어 · `package.json` ·
`package.production.json` 의 dependency 4개(+`express-session`) ·
`googleIdentityNoEmailMergeGuard.test.ts` 의 G4(파일 존재를 단정) **뒤집기**.

> **주의**: G4 는 "passportDynamic 의 verify callback 이 repository 를 건드리지 않는다" 를 고정한다.
> 파일을 지우면 이 테스트가 먼저 깨진다 — 지우지 말고 **"파일이 존재하지 않는다"로 뒤집어야** 한다.

### 3-2. Kakao / Naver 로그인 축 — **REMOVE**

| 항목 | 상태 | 판정 |
|---|---|---|
| `config/app.config.ts` `socialAuth.kakao/naver` FeatureStatus · 부팅 로그 · `oauth:kakao`/`oauth:naver` 플래그 | 운영 env 에 `KAKAO_*`/`NAVER_*` 부재 → 항상 `❌` | **REMOVE** |
| `controllers/settingsController.ts` 의 kakao/naver OAuth 설정 블록 | 존재하지 않는 `/api/v1/social/*` 콜백 URL 을 노출 | **REMOVE** |
| Admin `pages/settings/OAuthSettings.tsx` 의 Kakao/Naver 항목 | 화면에 남아 있으나 login 축과 무관 | **REMOVE** (Google 항목은 KEEP) |

**혼동 주의 — 지우면 안 되는 kakao**: `neture_*` 의 `contact_kakao` · `kakao_open_chat_url` ·
`kakao_channel_url` 은 **Connected Channel(연락처)** 이고 로그인 축이 아니다. **KEEP.**

### 3-3. Admin Google bootstrap — **REMOVE**

| 근거 |
|---|
| 운영 env 에 `GOOGLE_ADMIN_BOOTSTRAP_ENABLED` · `_CODE` **둘 다 없음** → fail-closed 로 이미 비활성 |
| 목적(기존 관리자 users.id 에 Google 연결)은 2026-09-22 에 **완료** |
| 대상이 super_admin 1명인 1회용 경로 — 재사용 시나리오 없음 |

**제거 범위**: `POST /auth/google/bootstrap-admin` route · `GoogleAuthController.bootstrapAdmin` ·
`services/auth` 의 bootstrap 서비스 · `config/google-admin-bootstrap.config.ts` ·
`authClient.bootstrapAdminGoogle` · Admin `Login.tsx` 의 연결코드 UI 와 에러 분기 ·
`googleAdminBootstrap.test.ts`(계약을 **부재**로 뒤집거나 함께 제거).

### 3-4. Account Linking 도메인 — **REMOVE**

| 항목 | runtime consumer | 판정 |
|---|---|---|
| `services/account-linking.service.ts` | **0** (테스트가 `mergeAccounts` **부재**만 단정) | **REMOVE** |
| `modules/auth/entities/LinkingSession.ts` + `linking_sessions` 테이블 | 위 서비스 외 소비처 없음 | **REMOVE** (테이블 DROP 은 데이터 실측 후) |
| `types/account-linking.ts` | `LinkedAccount` · `AccountActivity` · guest-auth 가 **`AuthProvider` 타입만** 참조 | **부분 KEEP** — 타입은 남기고 linking 전용 타입만 제거 |

`verifyEmailLinking` 은 password→Google 전환용 경로였고 지금은 도달 경로가 없다.

**혼동 주의**: `entities/LinkedAccount.ts`(= `linked_accounts`, Google sub 정본)와
`routes/auth/guest-auth.routes.ts`(`/api/v1/auth/guest`, **등록되어 살아 있음**)는 **KEEP** 이다.
이름이 비슷할 뿐 다른 축이다.

### 3-5. 이메일 인증 체인 — **REMOVE (producer 0)**

```text
POST /auth/verify-email · GET /auth/verify-email · POST /auth/resend-verification
services/emailVerificationService.ts
entities/EmailVerificationToken.ts (email_verification_tokens)
web-k-cosmetics /auth/verify-email · web-kpa-society /auth/verify-email
```

`requestEmailVerification` 의 **호출부는 resend 엔드포인트 자기 자신 하나뿐**이다.
Google 가입 경로는 이 서비스를 호출하지 않는다 — 즉 **토큰을 발급하는 주체가 없다.**
Google 이 이미 이메일을 검증하므로 O4O 가 다시 검증할 근거도 없다.

**제거 범위**: 위 3개 route + controller + service + entity + 프런트 2개 페이지/라우트.
`email_verification_tokens` 테이블 DROP 은 잔존 행 실측 후.

### 3-6. 중복 엔드포인트 `/auth/verify` — **REMOVE**

`GET /auth/verify` 와 `GET /auth/me` 가 **같은 핸들러**(`AuthAccountController.me`)다.
프런트 소비처는 0이고, 정책 allowlist(`account-access.policy.ts` · `terms-acceptance.policy.ts`)에만
경로 문자열로 남아 있다. `/me` 로 일원화한다.

**주의**: `GET /auth/status` 는 Admin `LoginDiagnostic` 이 실제로 호출한다 — **KEEP.**

### 3-7. `refresh_tokens` 테이블 — **REMOVE**

refresh token 은 JWT 로 검증한다(`token.utils.ts`). **INSERT 하는 코드가 0건**이고,
`user.controller.ts` 가 "세션 목록"을 조회하는 두 지점만 있다 — 즉 **항상 빈 목록**을 읽는다.
`O4O-IDENTITY-ARCHITECTURE-V3` 도 `refresh_tokens = DEAD_RETIRE` 로 이미 판정했다.

**제거 범위**: 세션 조회 2지점 + `RefreshToken` entity + `User.refreshTokens` 관계 + 테이블 DROP.

### 3-8. `login_attempts` — **REMOVE (freeze 절차 필요)**

password 로그인 실패를 쌓던 테이블이다. `cleanupLoginAttempts` 잡은 은퇴했고 **writer 가 0** 이다.
현재 `User.ts` 주석은 "FROZEN auth-core 소유라 유지"라고만 적혀 있는데, 그것은 *왜 남겼는지*가
아니라 *지울 때 절차가 필요하다*는 뜻이다.

**판정은 REMOVE**, 단 실행은 `auth-core` manifest 변경을 동반하므로 cleanup WO 에
**명시적 Core 변경 승인**을 함께 넣는다(CLAUDE.md §3 · §14).

### 3-9. 문서 · 주석 drift — **REMOVE / 현행화**

| 위치 | 내용 | 조치 |
|---|---|---|
| `apps/admin-dashboard/src/pages/auth/Login.tsx:6-7`, `239-240` | "서버의 password 로그인 경로 자체는 다른 surface 를 위해 남아 있고" — **지금은 거짓**(경로 은퇴 완료) | 문구 삭제 |
| `entities/UserActivityLog.ts` `PASSWORD_CHANGE` · `PASSWORD_RESET_REQUEST` · `PASSWORD_RESET_COMPLETE` | 새로 기록될 일이 없는 enum 값 | **과거 로그 행 조회를 깨뜨릴 수 있어** 데이터 실측 후 결정 — 행이 없으면 REMOVE |

---

## 4. KEEP 판정

| Component | consumer | 판정 |
|---|---|---|
| Google ID token 검증 · `/google/config` · `/google/login` · `/google/signup` | 전 surface | **KEEP — 본체** |
| `linked_accounts` (provider + providerId = Google sub) | Identity 정본 | **KEEP** |
| email auto-merge **제거** 상태와 그 guard 테스트 | — | **KEEP** (되돌리지 않는다) |
| `/refresh` · `/me` · `/me/profile` · `/logout` · `/logout-all` · `/status` | 전 surface | **KEEP** |
| `/handoff` · `/handoff/exchange` · `/services` · `/services/:key/join` | 서비스 간 이동 | **KEEP** |
| `/api/v1/auth/guest` (guest-auth) | 라우터 등록 · 병원약국 device 축 | **KEEP** |
| 운영자 **직접 지정**(`OperatorAssignmentController`) | Admin 운영자 관리 · Smoke A 로 실증 | **KEEP** |
| membership 종료가 Global Identity 를 죽이지 않게 한 수정 | correctness fix | **KEEP** |
| 한 서비스 종료 요청이 다른 서비스를 끊지 않게 한 수정 | correctness fix | **KEEP** |

---

## 5. `includeLegacyTokens` / localStorage 전략 — **KEEP (이름이 오해를 부른다)**

조사 전 가설은 "legacy 면 제거" 였다. **실측 결과는 반대다.**

```text
strategy: 'localStorage'  →  8개 서비스가 현재 이것을 쓴다
  web-neture · web-k-cosmetics · web-kpa-society · web-pharmacy-hub
  web-kpa-branch · web-store · web-lecture · web-hospital-pharmacy

strategy: 'cookie'        →  admin-dashboard 1개
```

`includeLegacyTokens` 는 localStorage 전략이 **body 로 토큰을 받기 위해 보내는 플래그**이고,
그 전략이 프런트 8개의 현행 동작이다. 지금 제거하면 **Admin 을 제외한 전 서비스 로그인이 깨진다.**

**판정: KEEP.** 다만 `'legacy'` 라는 이름과 주석("legacy, for specific use cases")이 사실과
반대여서 이런 오판을 유발한다. cleanup WO 에서 **이름·주석만 현행화**한다(동작 변경 0).

> cookie 단일화는 별도 트랙이다. 이번 Google-only 정리의 완료 조건이 아니다.

---

## 6. 사업 결정이 필요했던 2건 — **2026-09-26 확정**

| 항목 | 결정 | 실행 기준 |
|---|---|---|
| 운영자 이메일 초대 | **REMOVE** | 가입 전 대상에게 초대 메일을 보내는 흐름은 유지하지 않는다. Google 로그인 후 관리자가 직접 지정한다. 초대 코드 · 메일 템플릿 · Admin 탭 · 테이블은 **소비처와 운영 DB 확인 후** 제거 |
| `mobile-app` | **네이티브 Google 로그인 구현 보류** | 배포 워크플로 0건만으로 즉시 삭제하지 않는다. 배포 · 설치 · 사용 여부를 조사해 처분을 먼저 판정하고, **사용 근거가 없으면 앱과 전용 인증 코드를 함께 은퇴** |

아래는 그 결정의 근거가 된 조사와, 결정 이후 추가로 실측한 내용이다.

### 6-1. 운영자 이메일 초대 — **REMOVE 권고** (사업 확인 1줄 필요)

| 축 | 실측 |
|---|---|
| 규모 | 약 **888 LOC** — entity 74 · service 427 · accept controller 82 · route 24+17 · 프런트 accept 페이지 264 |
| 부수 | `operator_invitations` 테이블 + migration + `expected-schema-states` 항목 + rate limiter 설정 + 메일 템플릿(`@o4o/mail-core`) + Admin `OperatorsPage` 초대 탭 |
| 대체 경로 | **직접 지정이 이미 있고 Smoke A 로 실증됐다** — 관리자가 사용자 검색 → 서비스 선택 → Operator 지정 |
| 데이터 | `operator_invitations` 행 수 **미확인**(DB 채널 없음). Smoke B 에서 최소 1건 생성됨 |

기술적으로 **대체 가능하다** — "운영자가 될 사람에게 먼저 Google 로 가입을 요청하고 관리자가
지정한다" 로 충분하다.

> **결정(2026-09-26): REMOVE.** 가입 전 대상에게 초대 메일을 보내는 흐름은 사업상 유지하지 않는다.

제거 순서는 **소비처 제거 → 테이블 DROP** 이고, 테이블 DROP 은 `operator_invitations` 잔존 행
실측을 선행 조건으로 둔다(§8-1). Smoke B 의 검증 기록 자체는 CHECK 문서로 **보존**한다.

### 6-2. Mobile App — 네이티브 Google 로그인 **보류**, 처분은 **은퇴 권고**

결정에 따라 "배포 워크플로 0건" 에서 멈추지 않고 **배포 · 설치 · 사용 여부**를 더 조사했다.

| 축 | 실측 | 판독 |
|---|---|---|
| 규모 | git-tracked **23 파일** — 화면 10 · API 클라이언트 2 · AuthContext 1 | 소규모 shell |
| 용도 | 제품 수집(collect · drafts) 전용 — `app/(app)/collect/*` · `drafts/*` | 업무 앱 1종 |
| 빌드 설정 | `app.json` 만 존재 · **`eas.json` 없음** · Android 전용 · `version 0.1.0` | **빌드 파이프라인 미구성** |
| 배포 | 워크플로 **0건** · APK/AAB/스토어 참조 **0건**(코드 · 문서 · CI 전수) | **배포된 적 없음** |
| 전용 백엔드 | `/api/v1/mobile/product-drafts` (controller · service · entity · `mobile_product_drafts` 테이블) · **웹 소비처 0** | 앱이 유일한 소비자 |
| **운영 트래픽** | Cloud Run 로그 30일: `/api/v1/mobile/*` 요청 **0건**. 같은 필터로 `/auth/google/login` 은 정상 조회됨(쿼리 유효성 대조군) | **실사용 0** |
| 네이티브 UA | 30일간 `okhttp` 요청 4건 — 전부 `favicon.ico/png` 404(크롤러) | 앱 트래픽 아님 |
| 이력 | 최초 2026-05-08 · 마지막 기능 커밋 2026-09-23(Expo SDK 54 업그레이드) | 유지보수만 발생 |

> **판정: 사용 근거 없음 → 앱과 전용 인증 코드를 함께 은퇴(REMOVE).**
> 네이티브 Google 로그인은 **구현하지 않는다**(결정).

**제거 범위**: `services/mobile-app` 전체 · `/api/v1/mobile/product-drafts` route 등록 ·
`mobile-product-draft.controller.ts` · `.service.ts` · `MobileProductDraft.entity.ts` ·
`mobile_product_drafts` 테이블(잔존 행 실측 후).

**남은 확인 1건**: `mobile_product_drafts` 행 수. 운영 DB 채널이 열리면 0 인지 확인하고,
0 이 아니면 데이터 처리 방법을 먼저 정한 뒤 DROP 한다(§8-1).

---

## 7. 최종 판정표

| Component | 실제 consumer | 현재 필요 | 판정 | 제거 범위 |
|---|---:|---:|---|---|
| Google ID token verify · login/signup | 전 surface | 필요 | **KEEP** | — |
| `linked_accounts` · sub 정본 | 다수 | 필요 | **KEEP** | — |
| `/refresh` `/me` `/logout` `/status` `/handoff` `/services` | 전 surface | 필요 | **KEEP** | — |
| guest-auth (`/auth/guest`) | 등록됨 | 필요 | **KEEP** | — |
| Operator 직접 지정 | Admin | 필요 | **KEEP** | — |
| `includeLegacyTokens` · localStorage 전략 | **8 서비스** | **필요** | **KEEP** | 이름·주석만 현행화 |
| Passport Google/Kakao/Naver 전략 | **0** | 불필요 | **REMOVE** | code + dep 4 + session |
| `express-session` | **0** (`req.session` 0) | 불필요 | **REMOVE** | middleware + dep |
| `/api/v1/social/*` callback | **없는 경로** | 불필요 | **REMOVE** | config 문자열 |
| Kakao/Naver OAuth 설정(app.config · settingsController · Admin UI) | 0 | 불필요 | **REMOVE** | code + UI 항목 |
| Admin Google bootstrap | 운영 비활성 | 전환 완료 | **REMOVE** | route + service + config + UI + test |
| Account linking service · `LinkingSession` | **0** | 불필요 | **REMOVE** | code + 테이블(실측 후) |
| 이메일 인증 체인 | **producer 0** | 불필요 | **REMOVE** | route 3 + service + entity + 프런트 2 |
| `GET /auth/verify` | 0 (중복) | 불필요 | **REMOVE** | route + policy 항목 |
| `refresh_tokens` | **writer 0** | 불필요 | **REMOVE** | 조회 2지점 + entity + 테이블 |
| `login_attempts` | **writer 0** | 불필요 | **REMOVE** | entity + 테이블 (**auth-core freeze 승인 필요**) |
| Admin Login.tsx password 주석 | — | 거짓 서술 | **REMOVE** | 주석 2곳 |
| `UserActivityLog` PASSWORD_* enum | — | 미확인 | **데이터 실측 후 REMOVE** | enum 값 3 |
| 운영자 이메일 초대 | 존재 | 불필요(**결정 확정**) | **REMOVE** | domain 전체 ≈888 LOC + 테이블 |
| Mobile App | **운영 트래픽 30일 0건** | 불필요(**사용 근거 없음**) | **REMOVE** | 앱 전체 + `/api/v1/mobile/*` + 테이블 |
| Membership termination acceptance fixture | — | Google-only 와 무관 | **REMOVE FROM SCOPE** | 완료조건에서 제외 |

---

## 8. cleanup WO 로 넘길 때의 순서와 함정

1. **DB 실측 선행** — `operator_invitations` · `linking_sessions` · `email_verification_tokens` ·
   `refresh_tokens` · `login_attempts` · `mobile_product_drafts` 행 수.
   테이블 DROP 은 이것 없이 하지 않는다. 채널은 `gcloud auth application-default login` →
   Cloud SQL Auth Proxy(SETUP.md).
2. **코드 제거 → 스키마 제거 2단계** (contract-last). 런타임이 먼저 끊긴 뒤 테이블을 지운다.
   `deploy-api.yml` 이 migration job 을 새 revision 보다 **먼저** 돌리므로 한 창에 섞지 않는다.
3. **guard 테스트는 지우지 말고 뒤집는다** — `googleIdentityNoEmailMergeGuard` G4(passportDynamic
   존재 단정)가 대표적이다. 되살아나면 테스트가 먼저 깨지게 둔다.
4. **dependency 제거는 중지 조건**(CLAUDE.md) — passport 4개 + express-session 제거는 WO 에
   명시적으로 승인을 받는다. `package.production.json` 동기화를 빠뜨리면 Docker 빌드가 깨진다.
5. **`login_attempts` 는 Core freeze** 대상이다 — auth-core manifest 변경 승인을 함께 받는다.
6. `includeLegacyTokens` 를 "legacy 니까" 지우지 않는다 — §5 참조. 8개 서비스가 이것으로 로그인한다.

## 9. 이번 조사에서 하지 않은 것

새 인증 기능 · 새 role 기능 · 새 membership lifecycle · 새 recovery flow · 새 관리자 예외를
만들지 않았다. "혹시 필요할지 모른다" 를 이유로 남긴 항목도 없다 — 남긴 것은 전부 **현재
호출부가 있거나 운영에 필요하다는 근거**를 위 표에 적었다.
