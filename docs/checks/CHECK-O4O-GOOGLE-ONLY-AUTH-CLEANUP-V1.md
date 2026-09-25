# CHECK-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1

> 시작: 2026-09-26 · 상태: **`IN_PROGRESS`**
> WO: [`WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1`](../work-orders/WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1.md) ·
> 근거: [`IR-O4O-GOOGLE-ONLY-AUTH-SIMPLIFICATION-CENSUS-V1`](../investigations/IR-O4O-GOOGLE-ONLY-AUTH-SIMPLIFICATION-CENSUS-V1.md)
>
> **하나의 통합 작업이다.** 단계별로 새 WO 를 만들지 않는다. 이 문서의 TODO 가 진행·최종 보고의 기준이다.

---

## 0. 착수 전 대조 (2026-09-26 · 코드 수정 전에 수행)

| 축 | 실측 |
|---|---|
| `origin/main` | `23212304f` (Merge PR #236) |
| 배포된 API revision | `o4o-core-api-03754-cgv` · traffic 100% · 이미지 `sha256:5910c58…` |
| 그 revision 의 소스 | `3c0a62665` (Merge PR #235 · membership termination) |
| **미배포 커밋** | `864fe579d` + `23212304f` — **PR #236(RBAC 자기역할 해제 가드)** |
| **⚠ 배포 범위 결론** | 이번 WO 의 API 배포는 **PR #236 을 함께 싣는다.** 분리 불가(같은 `main` 선형 이력) |
| `DEPLOY_ENABLED` | `false` — **임의로 바꾸지 않는다.** 사용자만 변경 |
| 운영 DB 채널 | **닫힘** — ADC 파일 없음 · DB 자격정보 없음 |

IR 작성 시점과 `main` 이 동일(`23212304f`)하므로 **판정 drift 없음.**

---

## 1. 전체 TODO

> 범례: `[ ]` 미착수 · `[~]` 진행 · `[x]` 완료 · `[!]` 차단
> 작업 중 발견한 누락은 **이 표에 추가**한다(하단 §3 발견 기록과 연결).

### T0 — 준비

| # | 항목 | 완료 조건 | 상태 |
|---|---|---|---|
| T0-1 | 배포 상태 · main · IR 대조 | 미배포 커밋과 배포 범위 확정 | `[x]` §0 |
| T0-2 | 전체 TODO 작성 | 이 표 | `[x]` |

### T1 — 코드 제거 (WO 단계 A · migration 0)

| # | 항목 | 완료 조건 | 상태 |
|---|---|---|---|
| A1 | Passport 계층 제거 | `passportDynamic.ts` 삭제 · `initializePassport` 호출 0 · passport/session 미들웨어 0 | `[ ]` |
| A2 | dependency 5종 | `passport`·`-google-oauth20`·`-kakao`·`-naver-v2`·`express-session` 을 `package.json` **+ `package.production.json`** 동시 제거 | `[ ]` |
| A3 | Kakao/Naver 로그인 설정 | `app.config.ts` FeatureStatus·부팅로그·`oauth:*` · `settingsController.ts` 블록 · Admin `OAuthSettings` 항목 (**Google 유지**) | `[ ]` |
| A4 | Admin Google bootstrap | route·controller·service·config·`authClient.bootstrapAdminGoogle`·Admin Login UI 제거 | `[ ]` |
| A5 | Account linking | `account-linking.service.ts`·`LinkingSession`·linking 전용 타입 (**`AuthProvider` 유지**) | `[ ]` |
| A6 | 이메일 인증 체인 | route 3·controller·service·entity·프런트 2 페이지/라우트 | `[ ]` |
| A7 | 중복 `/auth/verify` | route + policy allowlist 2곳 (**`/auth/status` 유지**) | `[ ]` |
| A8 | `refresh_tokens` 소비 | 세션 조회 2지점·entity·`User.refreshTokens` | `[ ]` |
| A9 | mobile-app + 전용 백엔드 | `services/mobile-app` 전체 · `/api/v1/mobile/product-drafts` 등록·controller·service·entity | `[ ]` |
| A10 | 운영자 이메일 초대 | entity·service·accept controller·route 2·프런트 accept·Admin 초대 탭·rate limiter·메일 템플릿 | `[ ]` |
| A11 | 주석 현행화 | Admin `Login.tsx` 의 거짓 서술 삭제 · `auth-client` 의 `'localStorage' = legacy` → **현행**으로 정정 | `[ ]` |

### T2 — 테스트 (지우지 않고 **뒤집는다**)

| # | 항목 | 완료 조건 | 상태 |
|---|---|---|---|
| T2-1 | `googleIdentityNoEmailMergeGuard` G4 | `passportDynamic.ts` **부재**를 단정하도록 반전 | `[ ]` |
| T2-2 | `googleAdminBootstrap.test.ts` | bootstrap 경로 **부재** 단정으로 반전 | `[ ]` |
| T2-3 | 신규 정적 가드 | `passport`·`express-session` import 0 · `/api/v1/social` 0 · `passport.authenticate` 0 · 제거 도메인 재등장 0 | `[ ]` |
| T2-4 | 제거 도메인 참조 테스트 정리 | 초대·mobile·email verification 테스트를 계약 반전 또는 제거 | `[ ]` |

### T3 — 검증

| # | 항목 | 완료 조건 | 상태 |
|---|---|---|---|
| T3-1 | `tsc --noEmit` | api-server + 영향 패키지 rc=0 | `[ ]` |
| T3-2 | eslint | 변경 파일 0 error · new warning 0 | `[ ]` |
| T3-3 | 로컬 affected suite | 관련 suite 전부 PASS | `[ ]` |
| T3-4 | CI + SonarCloud | 새 HEAD 기준 전부 green | `[ ]` |

### T4 — 배포

| # | 항목 | 완료 조건 | 상태 |
|---|---|---|---|
| T4-1 | detector 실측 | merge SHA 기준 affected 목록 확정 | `[ ]` |
| T4-2 | 배포 범위 명시 | **PR #236 동반 사실** 포함해 보고 | `[ ]` |
| T4-3 | 게이트 | `DEPLOY_ENABLED` 는 **사용자만** 변경. 대기 | `[!]` |
| T4-4 | 배포 3신호 | job 실행 · revision 생성 · **traffic 전환** | `[ ]` |

### T5 — 실브라우저 검증 (배포 후)

| # | surface | 완료 조건 | 상태 |
|---|---|---|---|
| T5-1~8 | Neture · KPA Society · K-Cosmetics · PharmacyHub · KPA Branch · Store · Lecture(안내) · Admin | Google 로그인 성공 · 콘솔 0 이 아니라 **세션 확립까지** 확인 · 전략 변경 없음 | `[ ]` |

### T6 — 운영 DB 실측 `[!] 차단`

| # | 테이블 | 필요 값 | 상태 |
|---|---|---|---|
| T6-1 | `operator_invitations` | 행 수 | `[!]` |
| T6-2 | `linking_sessions` | 행 수 | `[!]` |
| T6-3 | `email_verification_tokens` | 행 수 | `[!]` |
| T6-4 | `refresh_tokens` | 행 수 | `[!]` |
| T6-5 | `mobile_product_drafts` | 행 수 | `[!]` |
| T6-6 | `login_attempts` | 행 수 | `[!]` |
| T6-7 | `user_activity_logs` PASSWORD_* | 값별 행 수 | `[!]` |

> **차단 해제에 필요한 것 — 정확히 하나**: 이 PC 에서 `gcloud auth application-default login` 1회 실행.
> 그 뒤는 `SETUP.md` 절차(Cloud SQL Auth Proxy v2 · 포트 5442)로 제가 read-only 조회합니다.
> DB 비밀번호가 필요하면 Secret Manager 경로만 알려주시면 되고, 값을 알려주실 필요는 없습니다.

### T7 — 스키마 처분 (WO 단계 B · **실측 후**)

| # | 항목 | 완료 조건 | 상태 |
|---|---|---|---|
| T7-1 | DROP 대상 확정 | 행 수 0 확인된 테이블만 | `[ ]` |
| T7-2 | migration 작성 | migration + `manifest.ts` + `expected-schema-states.ts` **같은 커밋** · fingerprint 는 격리 PG15 에서 생성 | `[ ]` |
| T7-3 | `login_attempts` | **auth-core manifest 변경 명시 승인** 없으면 제외하고 그대로 기록 | `[ ]` |
| T7-4 | 배포 창 분리 | 코드 배포와 **같은 창에 섞지 않는다**(migration job 이 revision 보다 먼저 실행됨) | `[ ]` |

### T8 — 마감

| # | 항목 | 완료 조건 | 상태 |
|---|---|---|---|
| T8-1 | CHECK 마감 | 수행 결과 + **미완료 항목과 그 이유**를 이 문서 하나에 기록 | `[ ]` |
| T8-2 | Git | 범위 내 미커밋 0 · `HEAD == origin/main` | `[ ]` |

---

## 2. 진행 기록

(단계 완료 시마다 추가)

## 3. 작업 중 발견 (누락 추가)

(발견 시 TODO 에 항목을 추가하고 여기에 근거를 적는다)

## 4. 미완료 항목과 이유

(마감 시 작성 — 막힌 항목도 근거를 남겨 다음 작업자가 이어갈 수 있게 한다)
