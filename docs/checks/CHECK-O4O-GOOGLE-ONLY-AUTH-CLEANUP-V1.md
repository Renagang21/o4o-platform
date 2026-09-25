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
| A1 | Passport 계층 제거 | `passportDynamic.ts` 삭제 · `initializePassport` 호출 0 · passport/session 미들웨어 0 | `[x]` |
| A2 | dependency 5종 | 위 5종 + `@types/passport*`·`@types/express-session`. 두 manifest 동시 | `[x]` **lockfile 갱신 남음** |
| A3 | Kakao/Naver 로그인 설정 | `socialAuthConfig` 전체 + OAuth 설정 endpoint 2 + Admin `OAuthSettings` 화면 제거 | `[x]` |
| A4 | Admin Google bootstrap | route·controller·service·config·limiter·client·Admin Login UI 제거 | `[x]` |
| A5 | Account linking | service·entity·등록 해제 · 타입 파일은 소비되는 6종만 남김 | `[x]` |
| A6 | 이메일 인증 체인 | route 3·controller·service·entity·**프런트 3** 페이지/라우트·메일 템플릿 2 | `[x]` |
| A7 | 중복 `/auth/verify` | route + policy allowlist 2곳 (**`/auth/status` 유지**) | `[x]` |
| A8 | `refresh_tokens` 소비 | 세션 조회 2지점(라우트 미연결)·entity·`User.refreshTokens` | `[x]` |
| A9 | mobile-app + 전용 백엔드 | git-tracked 23파일 · route·controller·service·entity·workspace 예외 | `[x]` **node_modules 미삭제** |
| A10 | 운영자 이메일 초대 | entity·service·accept controller·route 2·assignment controller 의 초대 endpoint 4·프런트 accept·Admin 초대 UI·limiter·메일 | `[x]` |
| A11 | 주석 현행화 | Admin `Login.tsx` 거짓 서술 삭제 · `auth-client` 전략 주석 정정 | `[x]` |

### T2 — 테스트 (지우지 않고 **뒤집는다**)

| # | 항목 | 완료 조건 | 상태 |
|---|---|---|---|
| T2-1 | `googleIdentityNoEmailMergeGuard` G4·G6 | 파일 **부재** + passport/session import 0 로 반전 · 9 PASS | `[x]` |
| T2-2 | `googleAdminBootstrap.test.ts` | 296줄 런타임 테스트를 **부재 계약**으로 반전 · 6 PASS | `[x]` |
| T2-3 | 신규 `google-only-auth-cleanup.spec.ts` | 제거 9축 부재 + **살아 있어야 하는 것 6축** 동시 고정 · 17 PASS | `[x]` |
| T2-4 | 제거 도메인 참조 테스트 정리 | `legacy-password-auth-retirement` allowlist · admin 2건 반전 | `[x]` |

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

| 커밋 | 내용 |
|---|---|
| `e1ac10708` | A1 Passport 계층 · A2 dependency · A3 OAuth 설정 |
| `76d0016ce` | A4 bootstrap backend |
| (admin) | A4 bootstrap UI · A11 Admin 주석 |
| `2651cce19` | A5 account-linking · A6 이메일 인증 · A7 `/auth/verify` · A8 refresh_tokens |
| `7595e6d27` | A9 mobile-app + 전용 백엔드 |
| `c316ff46f` | A10 운영자 이메일 초대 |
| `dcd72e256` | A11 auth-client 전략 이름 정정 · T2-1/T2-2 guard 반전 |

## 3. 작업 중 발견 (TODO 에 없던 것 — 모두 이번 범위에서 처리)

| # | 발견 | 처리 |
|---|---|---|
| D1 | **`req.user` 타입 증강의 출처가 `@types/passport`** 였다. passport 를 지우자 `Request.user` 가 사라져 8개 파일이 컴파일 실패 | `types/express.d.ts` 로 **소유권 이전** — 외부 타입 패키지에 의존하지 않는다 |
| D2 | `GET /api/settings/oauth/admin` 이 **`clientSecret` 을 응답에 실어 보내고** 있었다. PUT 은 저장조차 하지 않는 안내였다 | 기능 제거가 **secret 노출면도 함께 닫는다** |
| D3 | IR 은 `VerifyEmailPage` 를 2개로 셌으나 **실제 3개**(web-neture 누락) | 3개 모두 제거 |
| D4 | 이메일 인증 메일 템플릿 2종(`email-verification` · `verification`)이 mail-core 에 남아 있었다 | 함께 제거(발송 경로 0) |
| D5 | `securityMiddleware` 의 SQL injection 예외 allowlist 에 **등록된 적 없는** `/api/v1/social/*` 3개가 남아 있었다 | 죽은 예외 제거 |
| D6 | `resend-verification` 경로가 정책 allowlist 2곳에 남아 있었다 | 제거 |
| D7 | `OperatorAssignmentController` 가 초대 endpoint 4종(list·create·resend·cancel)을 함께 갖고 있었다 — IR 의 888 LOC 집계 밖 | 직접 지정만 남기고 제거 |
| D8 | `services/mobile-app/node_modules` 재귀 삭제는 **과거 사고 패턴**(junction 추적 삭제) | `git rm -r` 로 tracked 파일만 제거. **node_modules 는 남겨 둠 — 사용자가 정리** |
| D9 | **로컬 full jest 가 heap OOM 으로 완주 불가** — CI 3샤드가 정본임을 재확인 | 판정은 CI 로 대체. 섞인 로컬 결과를 PASS 로 올리지 않음 |
| D10 | CI 가 **테스트 5개 파일**을 잡았다 — `OPERATOR_INVITATION_REQUIRED` 3곳 · `RefreshToken` 정본 목록 · `account-linking` 계약 | 전부 **반전**(코드 변경 아님). 타깃 실행만으로는 못 찾았을 구간 |

## 4. 미완료 항목과 이유

(마감 시 작성 — 막힌 항목도 근거를 남겨 다음 작업자가 이어갈 수 있게 한다)
