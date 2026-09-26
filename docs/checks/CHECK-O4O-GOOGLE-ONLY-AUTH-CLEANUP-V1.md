# CHECK-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1

> 시작: 2026-09-26 · 상태: **`IN_PROGRESS`**
> WO: [`WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1`](../work-orders/WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1.md) ·
> 근거: [`IR-O4O-GOOGLE-ONLY-AUTH-SIMPLIFICATION-CENSUS-V1`](../investigations/IR-O4O-GOOGLE-ONLY-AUTH-SIMPLIFICATION-CENSUS-V1.md)
>
> **하나의 통합 작업이다.** 단계별로 새 WO 를 만들지 않는다. 이 문서의 TODO 가 진행·최종 보고의 기준이다.
> T5 · T6 · T7 결과가 채워지기 전에는 **DONE 으로 선언하지 않는다.**

## 0-A. 최초 목적과 확정 정책 (재개 시점 재확인 · 2026-09-26)

**목적** — Google 하나로 통일한 뒤에도 남아 있던 **전환기 · 중복 · 죽은 인증 구조**를 제거한다.
기능 추가가 아니고 로그인 동작도 바꾸지 않는다. 노린 것은 "쓰지 않기로 한 인증 방식이
다시 열릴 수 있는 입구"를 닫는 것이다(부팅마다 등록되던 Passport 전략 · clientSecret 을
응답하던 OAuth 설정 endpoint · 세션 없이 열리던 1회용 bootstrap · producer 가 없는 이메일 인증 체인).

**확정 정책 — 이번 범위에서 바꾸지 않는다**

```text
유지: localStorage 전략 · includeLegacyTokens   (웹 8개의 현행 로그인 경로)
유지: Kakao Connected Channel (contact_kakao 계열 — 로그인 축 아님)
유지: 기존 인쇄 QR 링크
금지: 인증 전략 변경(cookie 단일화) · 분회 신규 도메인 개설
```

**차단 조건** — 실측되지 않은 것을 PASS 로 적지 않는다. 미확인을 0 으로 간주하지 않는다.
인증 우회 · 비밀값 수집을 하지 않는다. 조건 미충족 시 DROP 하지 않고 사유를 남긴다.

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
| T3-1 | `tsc --noEmit` | 7개 workspace 전부 rc=0 | `[x]` |
| T3-2 | eslint | 변경 파일 0 error · new warning 0 (`account-access.policy.ts` 의 `no-control-regex` 는 **변경 전부터 있던 기존 결함** — stash 로 원본 확인, 범위 밖이라 미수정) | `[x]` |
| T3-3 | 로컬 3샤드 전수 | **356 suite · 6,120 PASS · FAIL 0** (샤드 2 는 heap 부족이라 `--max-old-space-size=6144` 로 완주) | `[x]` |
| T3-4 | CI + SonarCloud | `dc8f61a3e` 기준 **전부 green** (Jest 3샤드 포함) | `[x]` |

### T4 — 배포

| # | 항목 | 완료 조건 | 상태 |
|---|---|---|---|
| T4-1 | detector 실측 | `23212304..14587a9a` → **`global_or_unknown=true`**. 원인은 루트 2파일(`pnpm-lock.yaml`·`pnpm-workspace.yaml`) — dependency 제거로 9개 웹 이미지의 빌드 입력이 전부 바뀐다 | `[x]` |
| T4-2 | 배포 범위 명시 | API + Admin + **웹 9개**. **PR #236(RBAC 가드) 동반** — 같은 `main` 선형 이력이라 분리 불가 | `[x]` |
| T4-3 | 게이트 | 사용자가 `true` → 배포 후 제가 `false` 복구 확인 | `[x]` |
| T4-4 | 배포 3신호 | job 11개 success · revision 11개 생성 · **6개는 pinning 으로 0% 대기라 명시 `update-traffic` 실행** → 11개 전부 newest == serving 재확인 | `[x]` |

**배포 결과** (태그 `deploy/2026-09-26-google-only-auth-cleanup` · merge `14587a9ad`)

```text
o4o-core-api          03755-6zf     o4o-admin-dashboard   01315-2wn
neture-web            01660-xsx     k-cosmetics-web       01168-bqk
kpa-society-web       02000-d6n     pharmacy-hub-web      00258-nw5
lecture-web           00017-vlh     store-web             00018-cnm
kpa-branch-web        00178-sj9     hospital-pharmacy-web 00011-qnr
signage-player-web    00091-j5m
```

migration job 정상 실행(`o4o-api-migrations-bsrgj`) · **적용 0**(이번 WO 에 migration 파일 없음 — 테이블 미삭제).
`api.neture.co.kr/health` = 200.

### T5 — 실브라우저 검증 (배포 후)

> **T5 전체 PASS 아님.** 아래 4건만 실측됐다. 나머지는 미검증으로 남긴다.

| # | surface | 근거 | 상태 |
|---|---|---|---|
| T5-1 | **Admin** Google 로그인 | 사용자 실측 — 로그인 후 활성 세션 확인 | `[x]` PASS |
| T5-2 | **Admin 설정** | 사용자 실측 — AI Services 가 첫 탭 · OAuth 탭 없음 | `[x]` PASS |
| T5-3 | **Admin 운영자 관리** | 사용자 실측 — '초대 대기' 탭 없음 · 등록 화면이 사용자 검색부터 | `[x]` PASS |
| T5-4 | **Neture** Google 로그인 | 사용자 실측 — 사용자 이름 + '내 업무 공간' 표시 | `[x]` PASS |
#### 군 A — Google 인증 후 **세션 성립** 확인 (5건)

| # | 서비스 | 진입 주소 | 상태 |
|---|---|---|---|
| T5-5 | KPA Society | `https://kpa-society.co.kr` | `[ ]` **미검증** |
| T5-6 | K-Cosmetics | `https://k-cosmetics.site` | `[ ]` **미검증** |
| T5-7 | PharmacyHub | `https://pharmacyhub.co.kr` | `[ ]` **미검증** |
| T5-8 | KPA Branch | `https://kpa-society.co.kr/kpa` | `[ ]` **미검증** |
| T5-9 | Store | `https://store.neture.co.kr` | `[ ]` **미검증** |

판정: **PASS** = 인증 후 돌아와 세션 성립(사용자 표시) / **BLOCKED** = 세션은 섰으나 그 서비스
**권한 미가입**(가입 안내·접근 제한) / **FAIL** = 돌아오지 못하거나 **로그아웃 상태로 남음**.

#### 군 B — 자체 로그인 **없음** 확인 (1건 · Google 인증 불필요)

| # | 서비스 | 진입 주소 | 확인할 것 | 상태 |
|---|---|---|---|---|
| T5-10 | Lecture | `https://study.neture.co.kr` | 자체 로그인 폼이 **없고** Neture 안내 카드가 뜨는지 | `[ ]` **미검증** |

#### 군 C — **공개 진입 + 게이트** 확인 (1건 · Google 인증 불필요)

| # | 서비스 | 진입 주소 | 확인할 것 | 상태 |
|---|---|---|---|---|
| T5-11 | Hospital Pharmacy | `https://neture.co.kr/hospital` | 공개 진입이 되는지 · **기기 등록 게이트**가 정상 표시되는지 | `[ ]` **미검증** |

진입 주소는 **배포 설정 정본**(`config/service-catalog.ts` 의 `domain` + `basePath`)에서 확인했다 — 추정하지 않았다.

> **FAIL 은 원인 조사 신호다.** FAIL 이 나왔다고 곧바로 이번 cleanup 이 원인이라고 결론짓지 않는다.
> 먼저 인증 반환 · 세션 쿠키/토큰 · 권한 · 해당 서비스 고유 게이트를 갈라 본다.

#### 내가 수행하지 못한 이유 (2026-09-26 재확인)

이 세션에 **브라우저 자동화 도구가 없다**(Claude-in-Chrome · 내장 브라우저 모두 미탑재).
`WebFetch` 는 인증 URL 을 열지 못하고, 대상이 전부 **클라이언트 렌더 SPA** 라 서버 응답에는
셸(HTML `<title>` 수준)만 온다 — 실제로 `study.neture.co.kr` 을 `WebFetch` 로 열어 확인했고
"O4O 강의 | Neture" 제목 외에 아무 것도 보이지 않았다. **군 B · 군 C 도 렌더 결과는 볼 수 없다.**

참고로 배포 번들 안의 문구는 확인했다(렌더 증명이 아니라 "무엇이 나와야 하는가" 의 근거):
`study.neture.co.kr` 의 `index-DKAKeHRh.js` 에 **"O4O 계정은 Neture에서 통합 관리합니다"** 문자열이 존재.

**왜 제가 이어서 못 하는가**: 로그인 수단이 Google 하나이고 password 경로를 은퇴시켰다.
프로그램으로 Google 계정 인증을 수행할 수단이 없다 — 이 WO 가 만든 상태의 직접적 결과다.
브라우저에서 사람이 눌러야 한다.

### T5 를 대신하지는 못하지만, 같은 축에서 실측한 것

**① 운영 API 경로 계약** (`api.neture.co.kr` · 인증 불필요 구간)

| 제거한 경로 | 결과 |
|---|---|
| `POST /auth/google/bootstrap-admin` · `POST /auth/verify-email` · `POST /auth/resend-verification` | **404** |
| `GET /auth/verify-email` · `GET /auth/verify` · `GET /admin/operator-invitations` · `GET /mobile/product-drafts` | **`Cannot GET …`** = 라우터 미등록 |

| 유지한 경로 | 결과 |
|---|---|
| `GET /auth/google/config` | `200 { enabled: true, clientId … }` |
| `GET /auth/status` | `200 { authenticated:false }` |
| `GET /auth/me` · `/auth/services` | `401 AUTH_REQUIRED` (경로 살아 있음) |
| `GET /admin/operator-assignments/roles` · `/candidates` | `401` (직접 지정 경로 살아 있음) |
| `GET /auth/guest/status` | `200 { service:'guest-auth' }` |

**② 배포된 프런트 번들 실측** — 각 서비스의 `index-*.js` 를 받아 검사

| 서비스 | `auth/google/login` | `includeLegacyTokens` | 제거 대상 3종 |
|---|---|---|---|
| KPA Society · K-Cosmetics · PharmacyHub · Store · Lecture | **있음** | **있음** | **0건** |

로그인 경로와 현행 토큰 전략이 배포본에 그대로 살아 있고, 제거 대상(초대·이메일 인증·bootstrap)은
번들에서 사라졌다. **세션 확립 자체는 대체하지 못한다** — 그래서 T5-5~11 은 미검증으로 둔다.

**③ 각 서비스 응답** — `kpa-society.co.kr` · `k-cosmetics.site` · `pharmacyhub.co.kr` ·
`store.neture.co.kr` · `study.neture.co.kr` · `neture.co.kr/hospital` = **200** ·
**`kpa-society.co.kr/kpa` = 200**(분회 현행 진입) · `kpa-branch-web` run.app = 200

### ③-1. 분회 주소 정정 — 앞선 '도메인 장애' 판정 철회

앞 기록에서 `branch.kpa-society.co.kr` 무응답을 "도메인 매핑 별건"으로 적었다. **이 판정을 철회한다.**
그 주소는 **만들지 않기로 한 주소**이므로 응답하지 않는 것이 정상이고, 장애도 T5 차단 사유도 아니다.

**출처 확인 결과 — 저장소에 실재한다(내가 지어낸 이름이 아니다).**

| 위치 | 성격 | 조치 |
|---|---|---|
| `bootstrap/setup-middlewares.ts:79` | **주석 한 줄** — "공용 진입이 서브도메인(DNS 미연결)에서 `kpa-society.co.kr` 의 `/kpa` path 로 바뀌었다" 는 **경위 설명**. CORS allowlist 에 항목으로 등록돼 있지 **않다** | **유지** — 왜 서브도메인을 쓰지 않는지 설명하는 문장이다 |
| `migrations/20270305000000-SeedKpaBranchServiceAndRoles.ts:32` | `services.url` seed 값 `'https://branch.kpa-society.co.kr'` | **적용 완료된 과거 migration 은 수정하지 않는다.** 운영 DB 행 값은 T6 에서 함께 확인한다 |
| CHECK 문서 5건 | 과거 기록물 | 기록물은 고치지 않는다(§16-1) |

**현행 정본은 코드가 이미 갖고 있다** — `config/service-catalog.ts` 의 `kpa-branch` 는
`domain: 'kpa-society.co.kr'` + `basePath: '/kpa'` 이고, 실제 `https://kpa-society.co.kr/kpa` 가 **200** 이다.
따라서 T5-8 검증 주소는 **`https://kpa-society.co.kr/kpa`** 로 고정한다.
장래 구상인 `kpa.neture.co.kr/{분회}` 는 이번 작업에서 열지 않는다.

### T6 — 운영 DB 실측 `[!] 미확인 (차단)`

**2026-09-26 재시도 결과**: ADC 파일 부재(`application_default_credentials.json` 없음) ·
`gcloud auth application-default print-access-token` 실패. `gcloud` 사용자 계정(`sohae2100@…`)은
로그인돼 있으나 Cloud SQL Auth Proxy 는 **ADC 를 요구**한다. 채널이 열리지 않았다.

| # | 대상 | 필요 값 | 상태 |
|---|---|---|---|
| T6-1 | `operator_invitations` | 행 수 · 데이터 성격 | **미확인** |
| T6-2 | `linking_sessions` | 행 수 | **미확인** |
| T6-3 | `email_verification_tokens` | 행 수 | **미확인** |
| T6-4 | `refresh_tokens` | 행 수 | **미확인** |
| T6-5 | `mobile_product_drafts` | 행 수 · 보존 필요성 | **미확인** |
| T6-6 | `login_attempts` | 행 수 | **미확인** |
| T6-7 | `user_activity_logs` PASSWORD_* | 값별 행 수 | **미확인** |
| T6-8 | `services` 행의 `kpa-branch` **url 값** | seed 의 `branch.kpa-society.co.kr` 가 운영 행에 남아 있는지 | **미확인** (§③-1 에서 파생) |

> **미확인은 0행이 아니다.** 이 표의 어떤 칸도 "없다" 는 뜻으로 읽지 않는다.
>
> **차단 해제 — 정확히 한 단계**: 이 PC 에서 `gcloud auth application-default login` 1회 실행.
> 그 뒤는 `SETUP.md` 절차(Cloud SQL Auth Proxy v2 · 포트 5442)로 read-only 조회한다.
> DB 자격정보가 필요하면 **Secret Manager 경로만** 알려주면 된다 — 값을 이 문서에 남기지 않는다.

### T7 — 테이블별 처분 (**T6 수치 대기**)

판정틀만 고정한다. **수치가 없으면 판정하지 않는다** — 빈 칸을 REMOVE 로 채우지 않는다.

| 테이블 | 코드 참조 | 행 수 | 판정 | 판정 규칙 |
|---|---|---|---|---|
| `operator_invitations` | **0**(제거 완료·배포됨) | 미확인 | **보류** | 0행 → REMOVE / 행 있으면 성격 확인 후 HOLD |
| `linking_sessions` | **0** | 미확인 | **보류** | 동일 |
| `email_verification_tokens` | **0** | 미확인 | **보류** | 동일 |
| `refresh_tokens` | **0** | 미확인 | **보류** | writer 가 0이었으므로 0행 예상 — 확인 전 단정 금지 |
| `mobile_product_drafts` | **0** | 미확인 | **보류** | 행 있으면 **업무 데이터**다. 보존·이관 판단 선행 |
| `login_attempts` | **0** | 미확인 | **보류** | + **auth-core manifest 변경 명시 승인** 필요(CLAUDE.md §3·§14). 승인 없으면 REMOVE 대상에서 제외하고 사유 기록 |
| `user_activity_logs` PASSWORD_* enum | 값 미사용 | 미확인 | **보류** | 과거 로그 행이 있으면 enum 유지 |

**전제 — 이미 충족**: 코드 제거가 운영에 반영됐다(11개 서비스 배포 · 제거 경로 404 실측 · §①).
따라서 DROP 은 "코드가 아직 읽는 테이블을 지우는" 위험이 아니다.

**실행 조건(전부 충족 시에만)**

```text
1. T6 수치 확보          → 0행 또는 보존 불필요 판정
2. login_attempts        → auth-core manifest 변경 승인 (별도)
3. migration + manifest + expected-schema-states 를 같은 커밋
   fingerprint 는 격리 PostgreSQL 15 에서 생성 (운영에서 복사 금지)
4. **별도 통제 배포 창** — 코드 배포와 섞지 않는다
   (deploy-api 가 migration job 을 새 revision 보다 먼저 실행한다)
5. 적용 전후 스키마·서비스 상태 검증 → 게이트 즉시 false 복구
```

조건 미충족 시 **DROP 하지 않고 차단 사유를 이 표에 남긴다.**

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
