# CHECK-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1

> **WO**: `WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1`
> **선행 IR**: `IR-O4O-NETURE-UNIFIED-ENTRY-AUTH-SERVICE-MEMBERSHIP-ROUTING-AUDIT-V1` (판정 `UI_FIRST_WITH_MINIMAL_FIX`)
> **상태**: 구현 + 정적 · 단위 검증 = **PASS** · 프로덕션 실 화면 검증 = **PASS_WITH_UNVERIFIED** (§7 — 결함 1건 발견 · 수정 · 재배포, 계정 부재 항목은 미검증 명시)
> **커밋**: `2464f2494`(구현) · 후속 1건(KPA Society 수신 페이지 문구 — §7-10)
> **작성일**: 2026-09-14
> **성격**: Neture 대표 홈(`/`) 로그인 후 개인화 + 서비스 이동(handoff) 수신 정합 + 대표 진입 로그인 예외(로그인 허용만). 새 SSO · 범용 권한 엔진 · DB migration · 회원 데이터 변경 **0**.

---

## 0. 한 줄 요약

`neture.co.kr` 홈이 로그인 사용자에게 **접근 가능한 업무 화면 · 이용 중 서비스 · 가입/이용 상태 · 가입 가능 서비스**를 보여주고, 다른 서비스로는 **기존 세션 인계(`POST /auth/handoff`)** 로 이동한다. 다른 O4O 서비스 회원은 Neture 가입 없이도 대표 홈에 **로그인만** 할 수 있다(권한 · 가입 부여 없음). 수신 측 `/handoff` 가 없던 PharmacyHub · KPA 분회에 추가하고, Neture · K-Cosmetics 수신 페이지의 토큰 저장 · 응답 처리 결함을 고쳤다.

---

## 1. 변경 파일

### Backend (`apps/api-server`)
| 파일 | 변경 |
|---|---|
| `src/config/service-catalog.ts` | `REPRESENTATIVE_ENTRY_SERVICE_KEY = 'neture'` 추가 · 헤더 주석의 "(향후)" handoff 표기 갱신 |
| `src/services/auth/auth-login.service.ts` | serviceKey 가 대표 진입(neture)이고 neture membership 이 없어도 **다른 서비스 membership row 가 하나라도 있으면** 로그인 허용. membership · role 생성 없음. 비밀번호는 기존 dual-read(neture credential 없음 → `users.password`) 그대로 — 복사 · 별도 저장 없음 |
| `src/modules/auth/controllers/handoff.controller.ts` | `generateHandoff` 에 `returnPath`(상대 경로 · 1~512자 · `//`·`/\`·제어문자 거부, 위반 시 400 `VALIDATION_ERROR`) → `targetUrl` 에 `&returnTo=` 부가. `getServices` 응답에 `nameKo` · `basePath` 추가(additive) |
| `src/routes/neture/controllers/neture-home-entry.controller.ts` (신규) | `GET /api/v1/neture/home/entry` — `requireAuth` 만. 요청자 본인의 active membership + `{prefix}:store_owner` role + 기존 `findStoreOrganizationCandidates` 로 **매장 전부 나열**(자동 선택 없음) · `branch_memberships(active)⋈kpa_organizations` 로 내 분회(slug · name) |
| `src/routes/neture/neture.routes.ts` | `router.use('/home', …)` 배선 |
| `src/services/auth/__tests__/representativeEntryLoginContract.test.ts` (신규) | 대표 진입 로그인 계약 6 케이스 |

### Frontend
| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/home-entry.ts` (신규) | `useHomeEntry`(`/auth/services` + `/neture/home/entry` 병렬 조회 · 실패 시 error) · `openServiceEntry`(handoff → `targetUrl` 이동) · `buildHomeEntryModel`(주요 업무 / 이용 서비스 / 상태 / 가입 가능 판정) |
| `services/web-neture/src/components/home/HomeEntryPanel.tsx` (신규) | 로그인 후 개인화 영역 UI (로딩 · 오류+재시도 · 정상 · 빈 상태) |
| `services/web-neture/src/pages/O4OHomePage.tsx` | 로그인 후 pill → `HomeEntryPanel`. 로그인 전 O4O 소개 문구 + 로그인 · 회원가입 버튼 + 공개 안내 pill 유지. AI 입력 · 작업 수행 영역 불변 |
| `services/web-neture/src/pages/HandoffPage.tsx` | 응답 body 토큰을 `storeTokens`(localStorage SSOT key)로 저장 · `returnTo` 처리 · 오류 코드별 문구 |
| `services/web-k-cosmetics/src/pages/HandoffPage.tsx` | 동일 (응답 처리 결함 수정) |
| `services/web-pharmacy-hub/src/pages/HandoffPage.tsx` (신규) + `App.tsx` `/handoff` route | 수신 페이지 신설 |
| `services/web-kpa-branch/src/pages/HandoffPage.tsx` (신규) + `App.tsx` `/handoff` route (custom-domain · platform 양쪽) | 수신 페이지 신설 · `detectBasename()` 으로 `/kpa` prefix 처리 |
| `services/web-kpa-society/src/pages/HandoffPage.tsx` | `returnTo` 처리 추가 (기존 fetch · 저장 로직 유지) · **실 화면 결함 수정**: 만료 토큰 시 API 원문(영문 `Handoff token is invalid or expired`)이 그대로 보여 다른 수신 페이지와 같은 코드→문구 표 적용 |

**미변경(의도)**: 각 서비스의 서버 guard · RoleGuard · 회원 데이터 · 로그인 API contract(serviceKey 필수 유지) · 기존 서비스 화면/도메인.

---

## 2. Neture 대표 진입 로그인 처리 (§4 제약 대조)

| 제약 | 처리 |
|---|---|
| 로그인 허가를 다른 서비스 승인에 묶지 않는다 | 다른 서비스 membership **row 존재**만 본다(status 무관 — 기존 서비스 로그인의 row 규칙과 동일). 승인(active) 여부는 각 서비스 guard 가 판정 |
| 공급자 · 파트너 · 운영자 role 자동 부여 금지 | 로그인 경로에서 `assignRole` · membership `save` 호출 0 (테스트 6 으로 고정) |
| 기존 비밀번호 복사 · 별도 저장 금지 | neture credential 이 없으면 기존 dual-read 가 `users.password`(identity password)로 검증. 다른 서비스의 서비스 전용 비밀번호는 사용되지 않음(테스트 2) |
| 인증 검사를 단순 제거하지 않는다 | `SERVICE_NOT_MEMBER` 규칙은 유지, **neture 에 한해** "다른 O4O 서비스 회원" 조건이 추가된 것 |
| 새 SSO · 범용 권한 엔진 · 대규모 회원 데이터 변경 금지 | 없음 |

---

## 3. "가입 가능" 판정 근거 (§3)

`joinEnabled=true` 만으로 노출하지 않는다. 아래 세 조건을 모두 만족할 때만 "가입 가능한 서비스" 에 나열한다.

1. 해당 서비스 membership row 가 **없음** (`/auth/services` `membership === null`)
2. `joinEnabled === true`
3. 프론트에 **가입 경로가 확인된 서비스** — Neture `/register`, KPA `/register`, PharmacyHub `/join`, K-Cosmetics `/register`

`kpa-branch`(joinEnabled=false, 분회 운영자 승인 경로만) · `cafe24-b2b`(O4O 로그인 회원 대상 아님) 는 노출하지 않는다. 가입 링크는 서비스별 기존 경로로 가는 **공개 링크**(handoff 없음)다.

## 4. 주요 업무 · 상태 매핑

| 항목 | 노출 조건 | 이동 |
|---|---|---|
| 커뮤니티 | Neture(항상, 공개) · KPA · PharmacyHub(active) | Neture `/community` 내부 / 타서비스 handoff `returnPath=/` |
| 매장 HUB · 내 매장 | 서비스 active + `{prefix}:store_owner` + 매장 후보 존재 | handoff `/store-hub` · KPA `/store` · PH `/store-owner` · KCos `/store`. **복수 매장은 이름을 전부 나열하고 선택은 서비스 화면에 맡긴다** |
| 공급자 · 파트너 | Neture active(또는 platform:super_admin) + `SUPPLIER_ACCESS_ROLES` / `PARTNER_ONLY_ROLES` | `/supplier/dashboard` · `/partner/dashboard` (RoleGuard 와 같은 상수) |
| 서비스 운영자 화면 | `{prefix}:operator|admin` + 해당 서비스 active · platform:super_admin → Neture `/admin` · 분회 운영자 → `/{slug}/operator/site` | 내부 Link / handoff |
| 내가 이용하는 서비스 | `active` membership | handoff (분회 회원은 자기 분회 `/{slug}`, slug 없으면 `/me`) |
| 가입 · 이용 상태 | `pending · suspended · rejected · withdrawn` | 문구 + 허용된 안내 링크만(Neture pending → `/register/pending`, PH pending/rejected → 공개 `/join/status`, rejected+가입 경로 → 재신청). suspended · withdrawn 은 링크 없음 |
| 조회 실패 | `/auth/services` 또는 `/neture/home/entry` 실패 | **미가입으로 표시하지 않음** — 오류 문구 + "다시 불러오기" + 공개 안내 pill 대체 |

---

## 5. 정적 · 단위 검증

| 항목 | 결과 |
|---|---|
| `apps/api-server` `npx tsc --noEmit` | PASS (exit 0) |
| `apps/api-server` `npx jest src/services/auth/__tests__` | **4 suites / 29 tests PASS** (신규 6 포함) |
| `services/web-neture` `npx tsc --noEmit` | PASS |
| `services/web-neture` `npx vite build` | PASS (chunk 크기 경고는 기존과 동일) |
| `services/web-neture` eslint (변경 4 파일) | 경고 · 오류 0 |
| `web-k-cosmetics` · `web-pharmacy-hub` · `web-kpa-branch` · `web-kpa-society` `npx tsc --noEmit` | PASS |

신규 테스트 `representativeEntryLoginContract.test.ts` 가 고정하는 사실:
1. neture membership 없음 + kpa-society 회원 → neture 로그인 성공 (identity password)
2. 다른 서비스 전용 비밀번호는 neture 로그인에 쓰이지 않음 (`INVALID_CREDENTIALS`, credential 조회는 `neture` 만)
3. 아무 membership 도 없음 → `SERVICE_NOT_MEMBER`
4. 다른 서비스 membership 이 pending / withdrawn 이어도 row 가 있으면 로그인 허용
5. 예외는 neture 에만 — neture 만 가입된 계정의 kpa-society 로그인은 `SERVICE_NOT_MEMBER`
6. 예외 경로에서 membership save · assignRole 호출 0

---

## 6. 보안 · 데이터 원칙 대조

- 토큰 · 개인정보 로그 출력: 신규 코드에 없음 (HandoffPage · home-entry · controller 모두).
- `returnPath` 는 상대 경로만 허용(서버 검증 + 수신 페이지 `resolveReturnTo` 이중) → open redirect 차단.
- `GET /neture/home/entry` 는 요청자 본인 데이터만(`user.id` 파생). GET 으로 상태 변경 없음.
- 운영 회원 상태 · 역할 임의 변경: 없음.

---

## 7. 프로덕션 실 화면 검증

> 2026-09-14, `2464f2494` 배포(Deploy API Server `34817728071` · Deploy Web Services `34817728081` 모두 success) 후 Playwright 실 브라우저로 확인. 계정은 `docs/local/TEST-ACCOUNTS.local.md` 로스터만 사용했고 **회원 상태 · 역할은 변경하지 않았다.** 캡처: `neture-home-anon.png` · `neture-home-store-owner.png` · `neture-home-operator.png` · `neture-home-mobile.png` (Playwright 출력 디렉터리, 저장소 미포함).

| # | 시나리오 (WO §7) | 결과 |
|---|---|---|
| 1 | 비로그인 홈 (소개 · 안내 pill · 로그인/회원가입) | **PASS** — 세션 복구(401→refresh 401) 완료 후 O4O 소개 문구 + 로그인 · 회원가입 버튼 + 공개 안내 pill 6개(약국 · 약국 경영 · 화장품 · 공급자 · 파트너 · 커뮤니티). 안내 pill 은 handoff 없이 공개 URL 로 연다 |
| 2 | PharmacyHub 만 승인된 회원 | **미검증** — 로스터에 PharmacyHub 단독 회원이 없다(매장 계정은 KPA · KCos · Neture 도 회원). 동일 계정으로 PharmacyHub 매장 HUB 이동은 #9 에서 확인 |
| 3 | PharmacyHub + KPA + 분회 승인 회원 | **PASS** — 운영자 로스터 계정: 주요 업무에 커뮤니티(Neture · KPA · 파머시 허브) · 매장 HUB/내 매장(Sohae 약국) · 서비스 운영자 화면(Neture 관리자 · `O4O 파일럿 테스트분회 운영자` · 파머시 허브 운영자/관리자 · K-Cosmetics 관리자/운영자 · KPA Society 관리자/운영자), 내가 이용하는 서비스에 `약사회 분회 · O4O 파일럿 테스트분회` 표시. 분회 운영자 버튼 → `kpa-society.co.kr/kpa/o4o-pilot/operator/site` 도착(운영 메뉴 렌더) |
| 4 | 화장품 매장 회원 | **PASS** — 매장 로스터 계정: `K-Cosmetics 매장 HUB` / `K-Cosmetics 내 매장`(테스트 뷰티샵) 표시. 내 매장 → `k-cosmetics.site/store` 도착(내 매장 홈 · 테스트 뷰티샵 · 운영중) |
| 5 | 서비스 운영자 | **PASS** — 파머시 허브 운영자 → `pharmacyhub.co.kr/operator`(운영자 대시보드) · K-Cosmetics 운영자 → `k-cosmetics.site/operator` · Neture 관리자는 내부 `/admin` Link. 운영자 화면은 `서비스 운영자 화면` 절에만 노출되고 일반 회원 화면에는 나타나지 않음(#4 계정에서 부재 확인) |
| 6 | 신청 중 · 정지 · 미가입 상태 | **부분** — 미가입(가입 가능한 서비스 절): 두 계정 모두 모든 joinEnabled 서비스에 membership row 가 있어 절이 비어 **미노출 자체는 정상**이나 노출 케이스는 **미검증**. 신청 중 · 정지: 로스터에 pending/suspended 계정 없음 → **미검증**. 판정 로직은 §3 · 단위 검증으로만 고정 |
| 7 | 매장 없음 · 복수 매장 | **부분** — 매장 없음: 운영자 계정은 KCos · PH 매장이 없어 해당 서비스의 매장 HUB/내 매장 버튼이 나타나지 않음(**PASS**). 복수 매장(한 서비스 2개 이상): 로스터 계정 없음 → **미검증**(코드는 전체 매장명 나열 + 서비스 화면에서 선택 안내, 자동 선택 없음) |
| 8 | 다른 서비스 회원의 Neture 홈 로그인 | **미검증(실 화면)** — 로스터 계정이 전부 Neture membership 을 보유해 예외 경로를 실계정으로 태울 수 없다. 운영 회원 데이터 변경 금지 원칙상 계정을 만들지 않았다. 계약은 `representativeEntryLoginContract.test.ts` 6건으로 고정(§5) |
| 9 | handoff 이동 후 세션 유지 · 도착 화면 | **PASS** — 매장 계정: 파머시 허브 매장 HUB → `pharmacyhub.co.kr/store-hub`(약국 경영자 헤더 · 로그인 상태), KPA Society 내 매장 → `kpa-society.co.kr/handoff?token=…&returnTo=%2Fstore` → `/store`(테스트 약국 매장 홈), K-Cosmetics 내 매장 → `/store`, 약사회 분회 → `kpa-society.co.kr/kpa/me`(내 분회). 운영자 계정: 분회 운영자 · PH 운영자 · KCos 운영자 도착 확인(#3 · #5). 이동 후 Neture 로 돌아와도 Neture 세션 유지 |
| 10 | 만료 · 실패 handoff 문구 | **결함 1건 → 수정** — 사용 완료 토큰 재사용 시 PharmacyHub · K-Cosmetics · Neture 수신 페이지는 `이동 링크가 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.` + 로그인 링크(**PASS**, 기존 세션 미손상). **KPA Society 는 API 원문 영문 그대로 노출** → `HandoffPage.tsx` 에 코드→문구 표 적용(후속 커밋). 분회 수신 페이지 실패 문구는 동일 템플릿이나 실 화면 **미검증** |
| 11 | 직접 URL · API 권한(서버 최종 판정) | **PASS** — 비로그인 `GET /api/v1/neture/home/entry` → 401 `AUTH_REQUIRED`, 비로그인 `POST /auth/handoff` → 401. 화면 버튼은 안내일 뿐 최종 판정은 각 서비스 guard(도착 화면이 서버 응답으로 렌더됨을 #9 로 확인) |
| 12 | 데스크톱 · 모바일 | **PASS** — 1280px · 390px(모바일) 모두 pill 이 줄바꿈되며 가로 스크롤 없음. 모바일에서 AI 입력 · 개인화 절 · 푸터 정상 |
| 13 | 로딩 · 오류 · 빈 상태 | **부분** — 로딩: 세션 복구 중 개인화 절 미노출 · 로그인 직후 "이용 중인 서비스를 확인하는 중" 경유 후 렌더(**PASS**). 오류(조회 실패 → 재시도 + 공개 안내 대체) · 빈 상태: 프로덕션에서 재현 수단 없음 → **미검증**(정적 검증만) |
| 14 | 공급자 · 파트너 · 운영자 · AI 입력 회귀 | **PASS** — 공급자 계정 홈에 `공급자 업무` → `/supplier/dashboard` Link, 마이페이지 `공급자 대시보드` 정상. AI 입력창 · 이미지 첨부 · 작업 수행 · 전송 버튼 로그인 전후 동일. 운영자 `/admin` Link 노출. 파트너: 로스터에 파트너 계정 없음 → **미검증** |

**미검증 요약**: #2(PH 단독 회원) · #6(신청 중 · 정지 · 가입 가능 노출) · #7 복수 매장 · #8 실계정 · #10 분회 실패 문구 · #13 오류/빈 상태 · #14 파트너 — 전부 **로스터 계정 부재**가 원인이며 운영 회원 데이터를 변경하지 않기 위해 계정을 만들지 않았다.

---

## 8. 범위 밖 발견 (보고만)

- `docs/rbac` RBAC 카탈로그에 GlycoPharm 잔재 (IR 에서 기록) — 별도 WO 후보.
- web-kpa-branch 에 `operator` index route 가 없어 분회 운영자 진입은 `operator/site` 로 보냈다. index route 신설은 분회 IA 영역이라 이번 범위 밖.

---

*문서 정합: 발견 1건(service-catalog 헤더 주석 "(향후)" — 코드 주석이라 인라인 갱신) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
