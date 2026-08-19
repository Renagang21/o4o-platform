# CHECK — 내 매장 전체 공통화 최종 감사 · 종료 판정

- **WO**: `WO-O4O-MY-STORE-FINAL-COMMONIZATION-AUDIT-AND-CLOSURE-V1`
- **일자**: 2026-08-19
- **기준 커밋**: 감사 시작 `0ab13af9d` → §12 수정 반영 `28db42892`
- **작업공간**: fresh worktree `C:/tmp/o4o-mystore-final-audit` (`work/my-store-final-audit` → `origin/main` push)
- **성격**: 신규 공통화 작업이 아니라 **최종 전수 재감사 + 종료 판정**

---

## 1. 모집단 재산출 방법 (§4)

기존 CHECK/WO 목록을 모집단으로 쓰지 않았다. 각 서비스 `App.tsx` 의 내 매장 route block 을
기계적으로 파싱해 **route → 컴포넌트 심볼 → import 경로 → 파일 → LOC → `@o4o/*` 채택**을 재산출했다.

| 서비스 | route block | 산출 page/view |
|---|---|---:|
| KPA-Society | `services/web-kpa-society/src/App.tsx` 939–1083 | 44 |
| K-Cosmetics | `services/web-k-cosmetics/src/App.tsx` 787–875 | 33 |
| GlycoPharm | `services/web-glycopharm/src/App.tsx` 994–1114 | 42 |
| PharmacyHub | `services/web-pharmacy-hub/src/App.tsx` 290–317 (+`layouts/StoreOwnerShell.tsx`) | 22 |
| **합계** | | **141** |

- 미조사 = **0** (141 전부 파일·LOC·공유 import 실측)
- Neture: 매장 경영자(내 매장) route tree 없음 → **OUT_OF_SCOPE**
- supplier/seller · consumer storefront(`/store/:slug/*`) · kiosk/tablet player → **OUT_OF_SCOPE**

## 2. 공통 Architecture 채택 (§6) — route tree 실사용 기준

`import 존재`가 아니라 **각 서비스 route tree 가 실제 렌더하는 wrapper** 로 확인했다.

| 서비스 | MyStoreShell 사용처 | Store config |
|---|---|---|
| GlycoPharm | `App.tsx:454` | `GLYCOPHARM_STORE_CONFIG` |
| K-Cosmetics | `App.tsx:363` | `COSMETICS_STORE_CONFIG` |
| KPA-Society | `App.tsx:509` | `KPA_SOCIETY_STORE_CONFIG` |
| PharmacyHub | `layouts/StoreOwnerShell.tsx:40` | `PHARMACY_HUB_STORE_CONFIG` |

- **MyStoreShell 채택 4/4**, Home `StoreHomeShell` 계열 채택 **4/4**
- dead shared component 를 adoption 으로 계산한 항목 없음

## 3. 기능별 adoption (§7)

공유 View 심볼을 각 page 파일에서 실측.

| 기능 | 공통 View | KPA | KCos | GP | PH |
|---|---|:--:|:--:|:--:|:--:|
| Shell/Navigation | `MyStoreShell` + `storeMenuConfig` | O | O | O | O |
| Home | `StoreHomeShell` 계열 | O | O | O | O |
| 매장 자체 상품 | `StoreLocalProductsManager` | O | O | O | O |
| 취급 제품 | `HandledProducts*` 7종 | O | 미구현 | 미구현 | O |
| 상품 상세설명 | `StoreProductDescriptionsView` | O | O | O | 미구현 |
| 자료 제작(산출물) | `StoreProductionMaterialsView` | 별도축 | O | O | O |
| 자료함 콘텐츠/자료 | `StoreLibraryContentsView`/`ResourcesView` | `StorePageShell` | O | O | 서비스 고유 |
| POP | `StorePopComposerView` | 서비스 고유 | O | O | 서비스 고유 |
| POP(직원용) | `StorePopStaffView` | 미구현 | O | O | 미구현 |
| QR | `StoreQrConsoleView` | 서비스 고유 | O | O | 서비스 고유 |
| 사이니지 플레이리스트 등록 | `StorePlaylistCreateView` | O | O | O | 미구현 |
| 사이니지 플레이어 선택 | `SignagePlayerSelectView` | O | O | O | 미구현 |
| 태블릿 | `StoreTabletDisplaysView` / `@o4o/tablet-*` | `TabletKioskPage`+`IdlePlaylistEditor` | O | O | `TabletContentStepBuilder` |
| 판매 채널 | `StoreChannelsView` | 서비스 고유 | O | O | 미구현 |
| 블로그 | `StoreBlogManageView` / `StoreBlog*Panel` | O(패널) | O | O | 서비스 고유 |
| 주문(구매자 원장) | `BuyerOrderLedgerView` 등 | O | O | O | 서비스 고유(B2B) |
| 마케팅 분석 | `StoreMarketingAnalyticsView` | O | O | O | 미구현 |
| 제품 마케팅/POP 진입 | `ProductMarketingView`·`CANONICAL_STORE_POP_ROUTE` | O | O | O | 미구현 |
| 매장 자산 | `StoreAssetsView` | O | O | O | 미구현 |
| 채용 지원 | `StoreRecruitmentApplicationsView` | O | O | O | 미구현 |
| 외국인 관광객 | `ForeignVisitorSalesSupportPanel` | O | O | O | 미구현 |
| 공급 카탈로그 | `SupplyCatalogHub` / `SupplyProductExplorer` | 미구현 | O | O | O |
| 매장 설정/정보 | (공통 View 없음) | 미구현 | 서비스 고유 | 서비스 고유 | 서비스 고유 |

## 4. 분류 집계 (§5)

| 분류 | 건수 | 비고 |
|---|---:|---|
| FULLY_COMMON | 24 | 구현한 전 서비스가 동일 공통 View 를 채택한 축 |
| CORE_ONLY | **0** | 공통 core 만 있고 어느 서비스도 쓰지 않는 축 없음 |
| VIEW_DUPLICATED | **0** | §15 재탐색에서 in-scope 실질 중복 0 |
| SERVICE_SPECIFIC | 14 | 아래 §5 근거 표 |
| NOT_IMPLEMENTED | 12 | 메뉴·route 모두 없음(공통화 결함 아님) |
| OUT_OF_SCOPE | — | Neture / supplier / consumer storefront / kiosk player |

**종료 조건 3항 충족**: `CORE_ONLY = 0`, `VIEW_DUPLICATED = 0`, `미조사 = 0`.

## 5. SERVICE_SPECIFIC 최종 근거 (§8)

"파일명이 다름 · CSS 가 다름 · 예전에 따로 개발됨" 은 근거로 인정하지 않았다.
남은 항목의 근거는 **데이터 모델 / 백엔드 계약 / 기능 집합 차이**다.

| 항목 | 서비스 | 근거 |
|---|---|---|
| 사이니지 콘솔 | KPA vs KCos/GP | `store_playlist_items(snapshot_id)` ≠ `signage_playlist_items(mediaId)` — `O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1` KEEP-LEGACY |
| POP | KPA | 다국어 POP · `store-asset-policy-core` 정책 축 (`CHECK-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1` 명시 제외) |
| POP | PH | `store_pops` CRUD 모델 (공통 View 는 자료함 기반 조립 모델) |
| QR | KPA | 배치 인쇄 · screen-set 상태 · 다국어 축 |
| QR | PH | landing type 6종(`screen_set`/`video` 포함) + `fetchQrSources` 소스 선택 + 분석 모달. 공통 View 는 4종·수기 target 입력 |
| 자료함(자료/콘텐츠) | KPA | 제작·선택·정책 화면(`CHECK-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1` 판정 유지). 공통 `StorePageShell` 껍데기는 채택 |
| 자료함 자료 | PH | `/api/v1/pharmacy-hub/store-owner/*` 계약 + 매장 미연결(409) 상태축 |
| 태블릿 | KPA/PH | screen-set·코너 축이 화면의 절반 이상(`CHECK-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1`) |
| 판매 채널 | KPA | 자체 storefront 폐기 트랙(네이버·쿠팡 대체) — 축 자체가 다름 |
| 블로그 | PH | pharmacy-hub 블로그 계약(편집기 `RichTextEditor` 만 공용) |
| 주문 | PH | B2B 장바구니/주문 축(공통 View 는 B2C 체크아웃 상태 모델) |
| 매장 설정/정보 | KCos/GP/PH | 서비스별 설정 필드·API 상이 |

## 6. SERVICE_NEUTRAL_BACKCOMPAT 5곳 최종 판정 (§9)

핀 테스트: `apps/api-server/src/__tests__/store-owner-backcompat-servicekey.spec.ts`

| # | 경로 | 판정 | 근거 |
|---|---|---|---|
| 1 | `modules/store/store-library.routes.ts` | **VALID_SERVICE_NEUTRAL** | KPA/KCos/GP 프론트가 소비 |
| 2 | `routes/o4o-store/controllers/store-product-library.controller.ts` | **VALID_SERVICE_NEUTRAL** | KPA/GP 등 다수 소비 |
| 3 | `routes/platform/store-tablet.routes.ts` | **VALID_SERVICE_NEUTRAL** | KPA/KCos/GP 태블릿 API 공용, PH 는 자체 `withStoreAuth` seam |
| 4 | `modules/neture/controllers/seller.controller.ts` | **OUT_OF_SCOPE** | Neture 판매자(공급) 축 — 내 매장 화면군 아님 |
| 5 | `modules/store-ai/controllers/product-ai-recommendation.controller.ts` | **DEAD · RETIRE_CANDIDATE** | `GET /api/v1/products/recommend/store` 프론트 소비처 **0건** |

5번은 **기술부채로만 기록**한다(대규모 API 정비 금지 — §9).

## 7. Backend boundary (§10)

`apps/api-server` jest 6 suite / **76 test PASS**
(store-owner backcompat serviceKey · service-scoped organization · local-products service-scoped ·
handled-products dedupe · store-policy ownership axis · store-slug canonical contract)

## 8. Route/Menu 정합 (§11)

4개 `StoreDashboardConfig`(`packages/store-ui-core/src/config/storeMenuConfig.ts:97/182/248/329`)의
메뉴 경로를 route tree 와 대조.

- dead menu **0** · dead route **0** · unexpected 404 **0**

## 9. Production browser smoke (§12·§13)

Desktop 1440×900 / Mobile 390×844, 실제 프로덕션 도메인 로그인 후 전 메뉴 순회.

| 서비스 | 도메인 | 측정 row |
|---|---|---:|
| KPA-Society | `https://kpa-society.co.kr` | 58 |
| K-Cosmetics | `https://k-cosmetics-web-3e3aws7zqa-du.a.run.app` | 50 |
| GlycoPharm | `https://glycopharm.co.kr` | 56 |
| PharmacyHub | `https://pharmacyhub.co.kr` | 36 |
| **합계** | | **200** |

### 9-1. 1차 결과 (기준 `0ab13af9d`)

- white screen **0** · JS exception **0** · dead link **0** · mobile navigation inaccessible **0**
- **모바일 가로 overflow 8건 검출** → 9-2 에서 수정
- 데이터/권한 상태로 분류된 항목(화면 오류 아님)
  - PH `/store-owner/tablets`·`/store-owner/handled-products` → 409 + "연결된 매장이 없습니다" 안내 = **BLOCKED_DATA**
  - KCos `/store/content/blog` → 403 + "이 매장의 경영자만 접근할 수 있습니다" = 권한 상태 정상 표기
  - GP `/store/content/blog` → 404(해당 매장 블로그 미개설) = **BLOCKED_DATA**
  - KPA 사이니지 동영상/스케줄 → `GET /api/signage/kpa-society/{media,schedules,playlists}` **403**.
    화면은 "데이터를 불러오지 못했습니다 / 다시 시도" 로 표기하여 조회 실패를 0건으로 위장하지 않음(load-error 계약 준수).
    → **권한 계약 갭(별도 WO)**. 본 WO 는 RBAC 변경 금지(§18).

### 9-2. 가로 overflow 8건 · 최소 수정 (커밋 `28db42892`)

| # | 화면 | overflow | 원인 | 수정 |
|---|---|---:|---|---|
| 1 | KPA `/store/marketing/product-descriptions` | 145px | 공통 View 고정 grid `280px 1fr` + grid item `min-width:auto` | `StoreProductDescriptionsView` 모바일 1열 + `minWidth:0` |
| 2 | KCos `/store/library/product-descriptions` | 50px | 동일(공통 View) | 동일 |
| 3 | GP `/store/library/product-descriptions` | 49px | 동일(공통 View) | 동일 |
| 4 | KPA `/store/analytics/marketing` | 213px | KPI 4열 고정 · 2단 섹션 고정 | `StoreMarketingAnalyticsView` 모바일 2열/1열 |
| 5 | KPA `/store/marketing/qr` | 221px | 헤더 액션 3개 `flexShrink:0` | 헤더·액션행 `flex-wrap` |
| 6 | GP `/store` | 39px | `@o4o/hub-core` `HubSection` 카드 3열 고정 | 모바일 1열 |
| 7 | GP `/store/settings` | 100px | `lg:grid-cols-4` 자식 `min-width:auto` | 양쪽 컬럼 `min-w-0` |
| 8 | PH `/store-owner/handled-products` | 45px | 공통 `HandledProductsToolbar` 검색 폼 non-wrap | `flex-wrap` 허용 |

공통 View 는 inline style 이라 media query 를 쓸 수 없어 `useIsNarrowViewport`(≤768px) 훅을
`@o4o/store-ui-core` · `@o4o/hub-core` 에 추가했다. **데스크톱(≥769px) 레이아웃은 변경 없음.**

### 9-3. 재검증 (배포 후)

9-2 수정 배포 후 **동일 harness 전수 재측정**(4서비스 × Desktop 1440×900 / Mobile 390×844).

| 항목 | 결과 |
|---|---|
| 측정 행 수 | 184 (page × viewport) |
| white screen | 0 |
| JS exception | 0 |
| dead link | 0 |
| **가로 overflow** | **0** |
| mobile navigation inaccessible | 0 |
| editor·preview clipping | 0 |
| flagged rows | **0 / 184** |

GP `/store/settings`(9-2 표 7번)만 1차 수정 후에도 76px 이 남아 3차까지 좁혀 마감했다.

| 회차 | 조치 | 잔여 overflow(390px) |
|---|---|---|
| 1 | 좌/우 컬럼 `min-w-0` | 100 → 76 |
| 2 | 매장 URL 행 `min-w-0` + prefix `shrink-0` | 76 |
| 3 | 폼 grid 3곳 `[&>*]:min-w-0` | **0** |

원인은 입력 요소가 아니라 **필드 wrapper(grid item)의 `min-width:auto`(automatic minimum)** 였다.
필드 자체에 `min-w-0` 를 줘도 wrapper 의 자동 최소폭이 트랙(310px)을 넘겨 426px 로 유지된다.
브라우저에서 grid item 12개에 `min-width:0` 을 강제 주입했을 때 overflow 가 76 → 0 으로 떨어지는 것으로
원인을 확정한 뒤 소스에 반영했다(`385261b7e`).

## 10. Desktop / Mobile 구조 (§14)

- 두 폭 모두 동일 route tree·동일 메뉴 집합. 모바일은 `MyStoreShell` 이 사이드바를 상단 네비로 전환하여 접근 가능(inaccessible 0).
- 9-2 수정 후 두 폭 모두 페이지 레벨 가로 스크롤 없음.

## 11. 중복 재탐색 (§15)

최신 코드 기준 재스캔 결과 서비스 간 실질 중복은 **얇은 어댑터(공통 View 호출 + API/색/명사 주입)** 뿐이다.
byte-identical 한 유일 쌍은 `StoreBlogPage`/`StoreBlogPostPage`(KCos↔GP)이며 공개 storefront
`/store/:slug/blog` = **OUT_OF_SCOPE**.

## 12. NOT_IMPLEMENTED (§16)

메뉴·route 가 모두 없어 "미구현"으로 판정한 축(공통화 결함 아님):
KCos/GP 취급 제품 · PH 상품 상세설명 / 마케팅 분석 / 채용 지원 / 외국인 관광객 / 매장 자산 /
판매 채널 / 사이니지 플레이리스트·플레이어 선택 · KPA 공급 카탈로그.

## 13. BLOCKING / NON_BLOCKING (§17)

**BLOCKING: 0** (9-2 의 8건은 본 WO 에서 수정 완료)

**NON_BLOCKING_TECH_DEBT**

1. KPA 매장 사이니지 동영상/스케줄 — canonical signage API 403(매장 경영자 권한 갭) → RBAC 축 별도 WO
2. `product-ai-recommendation.controller.ts` — 소비처 0, 은퇴 후보
3. PH QR/POP/자료함 — 기능 상위집합. 향후 canonical 후보는 **PH 의 소스 선택 모델**
4. KPA 자료함/POP/QR 다국어·정책 축 — 공통 View 수렴은 모델 정합 이후

## 14. 최종 판정 (§19)

**PASS**

| 종료 조건 | 기준 | 실측 | 판정 |
|---|---|---|---|
| 미조사 | 0 | 0 (141 page 전수) | PASS |
| CORE_ONLY | 0 | 0 | PASS |
| VIEW_DUPLICATED | 0 | 0 | PASS |
| 공통 셸 adoption | 4서비스 | 4 / 4 (route tree 실사용) | PASS |
| dead menu / dead route / white screen / unexpected 404 | 0 | 0 | PASS |
| production smoke (Desktop+Mobile) | 전 항목 0 | 184행 flagged 0 | PASS |
| BLOCKING | 0 | 0 | PASS |

→ **내 매장 전체 공통화 완료**를 선언한다.
NON_BLOCKING_TECH_DEBT 4건(13절)은 본 트랙의 종료 조건이 아니며 별도 축에서 다룬다.

## 15. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(13-1, 13-2)
