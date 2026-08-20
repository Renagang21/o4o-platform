# CHECK-O4O-GUIDE-STALE-ROUTE-AND-COPY-CONTRACT-CLEANUP-V1

- **WO**: WO-O4O-GUIDE-STALE-ROUTE-AND-COPY-CONTRACT-CLEANUP-V1
- **선행 CHECK**: [CHECK-O4O-GUIDE-CROSS-SERVICE-CENSUS-V1](CHECK-O4O-GUIDE-CROSS-SERVICE-CENSUS-V1.md)
- **일자**: 2026-08-20
- **범위**: `packages/shared-space-ui/src/guide/copy/*` (Guide copy contract) · 회귀 spec 1개 추가
- **backend / migration**: 없음 (migration 0)

---

## 1. 집계

```
조사 stale/dead 항목: 8
FIXED_ROUTE: 6
FIXED_COPY: 2
REMOVED_OBSOLETE_GUIDE: 1
DEFERRED_TO_LANDING: 2
미조사: 0
```

> `FIXED_ROUTE` / `FIXED_COPY` / `REMOVED_OBSOLETE_GUIDE` 합이 7을 넘는 것은 항목 #1(GP B2C)이
> **CTA 1건 제거 + 인접 설명 문구 1건 교정**으로 두 조치를 동시에 받았기 때문이다.

---

## 2. 재확인 결과 — WO 지정 5건 + sweep 발견 2건

WO §2 지시대로 **과거 CHECK 문자열을 그대로 쓰지 않고 현재 main 에서 route definition · consumer 를 다시 확인**했다.
route 표는 각 서비스 `src/**/*.tsx` 의 `<Route>` 트리를 중첩 포함해 정적 파싱해 만들었다
(KPA `/operator/*` 는 `services/web-kpa-society/src/routes/OperatorRoutes.tsx` 로 위임되므로 별도 확장).

### #1 GlycoPharm — `B2C 가격 설정` → `/store/commerce/products/b2c`

| 항목 | 값 |
|---|---|
| service | GlycoPharm |
| guide source | `copy/glycopharm.ts` L526 (features item, 실제 `<Link>`) · L338-341 (usage step 01 detail) |
| 현재 표시 문구 | `B2C 가격 설정` / `B2C 탭(/store/commerce/products/b2c)에서 소매가를 입력하고 노출 토글을 켭니다.` |
| 현재 target route | `/store/commerce/products/b2c` |
| canonical feature·route | **없음.** GP 에는 소매가/B2C 진열 화면이 존재하지 않는다. 진열 canonical = `/store/channels` (`StoreChannelsPage` — "채널 중심 진열 실행 콘솔") |
| 실제 consumer | 0건. GP `src` 전체에서 `b2c` 는 operator 측 channel_type 라벨(`B2C: '온라인 스토어'`)뿐 |
| production 재현 | 재현됨. literal route 는 없으나 **`/store/:pharmacyId/products/:productId` 에 param 흡수**되어 오류 화면(ErrorBoundary "문제가 발생했습니다")으로 떨어진다 → 404 가 아니라 깨진 화면이라 census 단계에서 dead link 로 관측됐다 |
| 조치 | **REMOVED_OBSOLETE_GUIDE** — features CTA item 삭제 (형제 item `채널 진열 /store/channels` 가 GP canonical 업무를 이미 커버). 추가로 usage step 01 의 `소매가 설정 및 활성화` item 을 `채널 노출 활성화 (/store/channels)` 로 교정하고 step description 의 "소매가를 설정하고" 문구도 함께 정정 (**FIXED_COPY**) |

WO §3 3분기 중 **"기능 자체 제거됨 → Guide 해당 CTA/문구 제거"** 적용. route alias 신규 생성 없음.

### #2 K-Cosmetics — signage CTA `/store/signage/playlist`

| 항목 | 값 |
|---|---|
| service | K-Cosmetics |
| guide source | `copy/k-cosmetics.ts` L438 `routeLabel` · L517 `primaryRoute` · L846 `primaryAction.to`(실제 `<Link>`) · L854 `routeLabel` · L857 detail · L14 헤더 주석 |
| 현재 target route | `/store/signage/playlist` |
| canonical feature·route | `/store/marketing/signage/playlist` (`services/web-k-cosmetics/src/App.tsx:828`) |
| 실제 consumer | `/store/signage/playlist` 는 **살아있는 legacy redirect alias** (`App.tsx:879` → `<Navigate to="/store/marketing/signage/playlist" replace />`). App.tsx 주석: *"북마크 / 외부 링크 호환을 위해 유지. 신규 코드는 nested canonical 을 사용한다."* |
| production 재현 | **dead link 아님.** redirect 로 정상 진입한다. census 의 "dead link" 판정은 **과대 판정**이었고, 실제 결함은 *Guide 가 legacy alias 를 canonical 인 것처럼 안내* 하는 stale contract |
| 조치 | **FIXED_ROUTE** ×4 (+ detail · 헤더 주석 정정) — 전부 `/store/marketing/signage/playlist` 로 교정. backend 변경 없음 |

### #3 K-Cosmetics — `/store/requests` 표기

| 항목 | 값 |
|---|---|
| service | K-Cosmetics |
| guide source | `copy/k-cosmetics.ts` L396 `routeLabel` (usage step 04 "고객 대응", 링크 아님) |
| 현재 target route | `/store/requests` |
| canonical feature·route | **`/store/interest-requests`** (`App.tsx:839` → `InterestRequestsPage` — "Staff Interest Request Management", 5초 폴링 · 확인(acknowledge) → 완료(complete) / 취소(cancel)) |
| 실제 consumer | KCos 에 `/store/requests` route 없음 (**MISSING**, redirect alias 도 없음) |
| production 재현 | 표기 전용 badge 라 클릭 불가 → 화면 오류는 발생하지 않으나 안내한 경로로 가면 아무 화면도 없다 |
| 조치 | **FIXED_ROUTE** — `/store/interest-requests` 로 교정. **기능 자체는 존재하며 Guide 본문 설명(확인/완료/취소 3액션 · 5초 자동 갱신)은 실제 화면과 정확히 일치**하므로 문구 · step 은 보존 |

> 참고: GlycoPharm 은 `/store/requests` 가 실재한다 (`App.tsx:1074` `CustomerRequestsPage`). 같은 문자열이라도 서비스마다 판정이 다르다.

### #4 GlycoPharm — `/tablet/:slug` 표기

| 항목 | 값 |
|---|---|
| service | GlycoPharm |
| guide source | `copy/glycopharm.ts` L389 `routeLabel` · L550 features item `route` |
| 현재 target route | `/tablet/:slug` |
| canonical feature·route | **`/store/:pharmacyId/tablet`** (`App.tsx:967` `TabletLayout`) |
| 실제 consumer | GP 에 `/tablet/:slug` route 없음 (**MISSING**). KPA · KCos 에는 실재하므로 서비스별 판정이 갈린다 |
| production 재현 | features item 은 `:` 포함 route 라 렌더러가 `group.linkTo`(`/store/marketing/qr`)로 fallback 한다 (`GuideFeaturesPage.tsx:124`) → **링크는 정상, 표시 문자열만 잘못됨** |
| 조치 | **FIXED_ROUTE** ×2 — 표시 문자열을 canonical `/store/:pharmacyId/tablet` 으로 교정. 링크 동작은 기존과 동일(변경 없음) |

### #5 KPA-Society — `B2C 판매` stale feature copy

| 항목 | 값 |
|---|---|
| service | KPA-Society |
| guide source | `copy/kpa.ts` L1733 (role guide step 04 description) |
| 현재 표시 문구 | `취급 상품 정보를 정리하고 B2B 발주 · B2C 판매를 한 곳에서 관리합니다.` |
| canonical feature·route | `/store/commerce/products/b2c` = `PharmacySellPage`, **화면 title = "상품 진열 관리"**, 메뉴 / 링크 라벨 = "진열 관리" (`PharmacyB2BPage.tsx:343`) |
| 실제 consumer | route · 화면 모두 실재 (**KPA 유일 진열 화면**). 결함은 route 가 아니라 **용어** |
| production 재현 | 화면은 정상. Guide 만 "B2C 판매" 라는 폐기된 표현 사용 — KPA 자체 storefront 는 은퇴 트랙에서 폐기되었고 canonical 업무 용어는 "매장 진열" 이다 |
| 조치 | **FIXED_COPY** — `B2B 발주 · 매장 진열을 한 곳에서 관리합니다.` 로 교정. 같은 블록의 item 라벨은 이미 `진열 관리` 라 정합. **기능명 전역 rename 은 하지 않았다** (WO §7) |

### #6 (sweep 발견) K-Cosmetics — `/store/qr` 표기

| 항목 | 값 |
|---|---|
| guide source | `copy/k-cosmetics.ts` L375 `routeLabel` (usage step 03 "고객 유입") |
| canonical | `/store/marketing/qr` (`App.tsx:858`) · `/store/qr` 는 legacy redirect alias (`App.tsx:885`) |
| 조치 | **FIXED_ROUTE** — #2 와 동일 유형(legacy alias 노출), WO §9 허용 범위에서 함께 마감 |

### #7 (sweep 발견) KPA-Society — `/operator/content-hub` 표기

| 항목 | 값 |
|---|---|
| guide source | `copy/kpa.ts` L1806 item detail (`콘텐츠 작성·HUB 게시`) |
| canonical | **`/operator/docs`** (`OperatorRoutes.tsx:142` `OperatorContentHubPage`). `/operator/content-hub` 는 상세 route(`content-hub/:id`)만 존재하고 목록 진입점이 아니다 |
| 조치 | **FIXED_ROUTE** — `/operator/docs` 로 교정 |

---

## 3. 수정 전 / 후 요약

| # | 파일 | 전 | 후 | 분류 |
|---|---|---|---|---|
| 1 | `copy/glycopharm.ts` | `{ label: 'B2C 가격 설정', route: '/store/commerce/products/b2c' }` | (item 삭제) | REMOVED_OBSOLETE_GUIDE |
| 1 | `copy/glycopharm.ts` | `소매가 설정 및 활성화` / `B2C 탭(/store/commerce/products/b2c)에서 소매가를 입력하고 노출 토글을 켭니다.` | `채널 노출 활성화` / `채널 진열(/store/channels)에서 노출할 채널을 고르고 진열을 활성화합니다.` | FIXED_COPY |
| 2 | `copy/k-cosmetics.ts` | `/store/signage/playlist` ×4 (+ detail, 헤더 주석) | `/store/marketing/signage/playlist` | FIXED_ROUTE |
| 3 | `copy/k-cosmetics.ts` | `routeLabel: '/store/requests'` | `routeLabel: '/store/interest-requests'` | FIXED_ROUTE |
| 4 | `copy/glycopharm.ts` | `/tablet/:slug` ×2 | `/store/:pharmacyId/tablet` | FIXED_ROUTE |
| 5 | `copy/kpa.ts` | `B2B 발주 · B2C 판매` | `B2B 발주 · 매장 진열` | FIXED_COPY |
| 6 | `copy/k-cosmetics.ts` | `routeLabel: '/store/qr'` | `routeLabel: '/store/marketing/qr'` | FIXED_ROUTE |
| 7 | `copy/kpa.ts` | `/operator/content-hub — …` | `/operator/docs — …` | FIXED_ROUTE |

---

## 4. 추가 stale sweep (WO §9)

**방법**: Guide copy 4개 파일 + 서비스 Guide 래퍼 페이지(`services/*/src/pages/guide/**`)에서
`/` 로 시작하는 내부 경로 토큰을 **전수 추출**하고, 서비스별 실제 route 표와 대조했다.
`/store/` `/operator/` `/forum` `/content` `/resources` `/lms` `/education` `/tablet` `/signage` 를 모두 포함한다.

판정 3분류: `EXACT`(literal 일치) · `PARAM_ABSORBED`(param route 에 삼켜져 오류 화면) · `MISSING`.

| 대상 | route 수 | Guide 참조 수 | 수정 전 이슈 | 수정 후 이슈 |
|---|---:|---:|---:|---:|
| KPA-Society | 283 (+ operator sub-router) | 108 | 2 (`/operator/content-hub`, `B2C 판매` 용어) | 0 |
| K-Cosmetics | 182 | 33 | 3 (`/store/requests`, `/store/signage/playlist`, `/store/qr`) | 0 |
| GlycoPharm | 238 | 37 | 3 (`/store/commerce/products/b2c`, `/tablet/:slug` ×2 위치) | 0 |
| Neture | 291 | 49 | 0 | 0 |
| Guide 공통 컴포넌트 `packages/shared-space-ui/src/guide/*.tsx` | — | 0 (하드코딩 경로 없음) | 0 | 0 |
| Neture Guide 래퍼 페이지 | — | 34 | 0 | 0 |
| KPA Guide 래퍼 페이지 | — | 0 (순수 wrapper) | 0 | 0 |

**대규모 구조 변경이 필요해 기록만 한 항목**: 아래 §5 (`/guide` 진입 단절).

**잔존 stale / dead Guide 참조: 0**

---

## 5. `/service-guide` ↔ `/guide` (WO §8 — 조사 전용, 구조 변경 없음)

| 항목 | 결과 |
|---|---|
| `/service-guide` 목적 | **공개 마케팅형 "서비스 안내"** 단일 진입 페이지. 이용 대상(매장 경영자 / 운영 담당자 / 공급·제휴 사업자) 소개 + `/contact` 문의 연결. KPA `pages/service-guide/ServiceGuidePage.tsx`, KCos · GP `pages/ServiceGuidePage.tsx` |
| `/guide` 목적 | **기능 사용 설명서**(intro 5면 / usage / features index / feature 상세). `@o4o/shared-space-ui` Guide 템플릿 소비 |
| 중복 여부 | **중복 아님.** 목적 · 대상 · 정보 밀도가 다르다 |
| redirect 여부 | **없음.** 어느 쪽에서도 서로를 redirect 하지 않는다 |
| navigation 연결 | `/service-guide` — KPA · KCos · GP 모두 **글로벌 헤더 nav + Footer** 연결 (`config/navigation.ts`, `Footer.tsx`).<br>`/guide` — **bare `/guide` route 는 Neture 에만 존재** (`GuideHomePage`, nav "이용 안내"). KPA 는 Footer 에서 `/guide/intro` 로만 진입. **KCos · GP 는 `/guide/*` 로 가는 navigation 진입점이 0건 — Guide 전면이 orphan 상태**. `/service-guide` 페이지에서 `/guide/*` 로 나가는 링크도 3서비스 모두 0건 |

**DEFERRED_TO_LANDING: 2**

1. KCos · GP `/guide` 랜딩 부재 + navigation 진입점 0 (KPA 는 `/guide/intro` 부분 연결) — 3서비스 진입 경로 통일 필요
2. `/service-guide` ↔ `/guide` 상호 연결 부재 — 공개 안내에서 사용 설명서로 넘어가는 동선 없음

→ 후속 `Guide 진입 · 랜딩 공통화` WO 입력으로 넘긴다.

---

## 6. 테스트 (WO §10)

신규: `packages/shared-space-ui/src/guide/__tests__/guideRouteContract.test.ts` — **Guide route contract spec 1개로 고정**.

- 서비스 `src/**/*.tsx` 의 `<Route>` 트리를 중첩 포함해 정적 파싱 (`element={<X />}` 속성 때문에 `>` 단순 검색이 깨지므로 중괄호 깊이 기반 tag 종료 탐지). KPA `/operator/*` 는 `OperatorRoutes.tsx` 를 prefix 확장해 합류
- **param 흡수를 "존재"로 인정하지 않는다** — param 위치가 서로 같을 때만 매칭. GP `/store/commerce/products/b2c` 가 `/store/:pharmacyId/products/:productId` 에 삼켜지는 회귀를 정확히 잡는다
- 주석(파일 경로 · 폐기 메모)은 사용자 노출 대상이 아니므로 참조 추출에서 제외
- 케이스: 4서비스 참조 전수 매칭 / GP dead `/store/commerce/products/b2c` 참조 0 / GP `/tablet/:slug` 0 + canonical 존재 / KCos legacy alias(`'/store/signage/playlist'` · `'/store/qr'`) · `/store/requests` 참조 0 + canonical 3종 존재 / KPA `B2C 판매` 0

```
npx vitest run --config packages/shared-space-ui/vitest.config.mjs
→ Test Files 4 passed (4) · Tests 35 passed (35)   (신규 8 포함)
```

---

## 7. Typecheck / Build (WO §11)

| 대상 | 결과 |
|---|---|
| `@o4o/shared-space-ui` `tsc --noEmit` | PASS |
| `@o4o/web-kpa-society` `tsc -b` | PASS |
| `@o4o/web-k-cosmetics` `tsc -b` | PASS |
| `glycopharm-web` `type-check` (`tsc -b`) | PASS |
| build (KPA · K-Cosmetics · GlycoPharm) | PASS |

backend 변경 없음 → api-server 전체 검증 미실시 (WO §11 명시). **migration 0.**

---

## 8. Production browser smoke (WO §12)

배포 후 desktop + mobile 로 확인한다. 기준: dead navigation 0 / white screen 0 / JS exception 0 / 신규 404 · 500 0 / mobile overflow 0.

| 대상 (desktop 1440×900 · mobile 390×844) | 확인 항목 | 결과 |
|---|---|---|
| GlycoPharm `/guide/features` | `B2C 가격 설정` CTA 제거 · `/store/commerce/products/b2c` · `/tablet/:slug` 노출 0 · `/store/channels` · `/store/:pharmacyId/tablet` 노출 | PASS (desktop · mobile) |
| GlycoPharm `/guide/usage` | `소매가 설정 및 활성화` 제거 → `채널 노출 활성화` · `/store/:pharmacyId/tablet` 표기 · GP `/store/requests` 유지(실재 route) | PASS (desktop · mobile) |
| K-Cosmetics `/guide/features/signage` | `/store/signage/playlist` 노출 0 · `/store/marketing/signage/playlist` 노출 | PASS (desktop · mobile) |
| K-Cosmetics `/guide/features` | legacy `/store/signage/playlist` 노출 0 | PASS (desktop · mobile) |
| K-Cosmetics `/guide/usage` | `/store/requests` · `/store/qr` 노출 0 · `/store/interest-requests` · `/store/marketing/qr` · `/store/marketing/signage/playlist` 노출 | PASS (desktop · mobile) |
| KPA `/guide/for/store-owner` | `B2C 판매` 노출 0 | PASS (desktop · mobile) |
| KPA `/guide/for/operator` | `B2C 판매` · `/operator/content-hub` 노출 0 | PASS (desktop · mobile) |
| KPA `/guide/features` · `/guide/usage` | `B2C 판매` · `/operator/content-hub` 노출 0 | PASS (desktop · mobile) |

전 대상 공통 측정값: HTTP status 200 · body text 1,200자 이상(white screen 0) ·
`document.documentElement.scrollWidth - clientWidth = 0` (mobile overflow 0) ·
`pageerror` 0 (JS exception 0) · 신규 4xx/5xx 응답 0 · dead navigation 0.

smoke 러너: standalone Playwright(`chromium.launch()` · isolated context) 로 desktop/mobile 2 viewport × 9 URL 실행(FAILURES=0),
페이지 innerText 와 모든 `<a href>` 를 합쳐 stale 문자열 부재 / canonical 문자열 존재를 동시 판정.

> **smoke 중 추가 발견 · 동일 유형 마감(WO §9)**: KPA `/guide/for/operator` step 02 의
> `routeLabel: '/operator/{content-hub, resources, guide-contents, ai-report}'` 이 남아 있었다.
> bare `/operator/content-hub` route 는 존재하지 않고 canonical 은 `/operator/docs` 이다
> (`OperatorRoutes.tsx:142` `docs` · `:144` `content-hub/:id` 만 존재).
> → `/operator/{docs, resources, guide-contents, ai-report}` 로 교정.
> 묶음 routeLabel 이 검사에서 빠지던 구멍도 함께 막았다 — 계약 테스트에 `expandBraces()` 를 추가해
> `{a, b}` 형태를 개별 경로로 펼쳐 검증한다. 4 서비스 brace-expanded 미해결 참조 **0건**.
> 이 교정 배포(`8c2199743`) 후 KPA 4 페이지를 재-smoke 해 `content-hub` 문자열 노출 0 · `/operator/docs` 노출을 확인했다.

**CTA 실제 진입 확인(WO §4)** — K-Cosmetics `/guide/features/signage` 의 CTA `href` 실측값은
`/store/marketing/signage/playlist` (legacy `/store/signage/playlist` 아님). 클릭 이동 시 비로그인 상태에서는
`/login` 권한 게이트로 정상 전환되며 404 · 오류 화면 · JS exception 0. (로그인 게이트는 기존 정책 동작.)

---

## 9. 문서 정합

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

선행 CHECK(`CHECK-O4O-GUIDE-CROSS-SERVICE-CENSUS-V1`)는 `docs/investigations/` 기록물이므로
CLAUDE.md §16-1 에 따라 소급 수정하지 않는다. 다만 본 CHECK §2 에서 census 의 판정 2건
(#2 KCos signage "dead link" → 실제로는 legacy alias redirect / #3 KCos `/store/requests` "기능 부재" → 실제로는 `/store/interest-requests` 로 존재)을 **현재 main 기준으로 정정 기록**했다.

---

## 10. 제외 범위 (WO §13 — 손대지 않음)

ServiceGuidePage 공통화 · `/guide` landing 신설 / 개편 · `/service-guide` redirect · PharmacyHub Guide 도입 ·
coverage gap 28건 해소 · screenshot 제작 · Guide 디자인 변경 · 기능 rename / refactor · 신규 route / backend API · DB migration
