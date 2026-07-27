# IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1

> **성격:** kpa-society `/store`(내 매장) 전 구조 **읽기 전용 감사**. 코드 변경 0 / DB write 0 / 배포 0.
> **조사일:** 2026-07-27
> **범위:** kpa-society `/store` + `/store-hub` 전체 메뉴·라우트·화면·기능·권한·데이터 위치·연결
> **근거:** 코드(현행 소스) 기준. 과거 WO/문서의 "완료" 표기로 현재를 단정하지 않음. 확정/추정/추가확인필요를 구분 표기.
> **후속:** 본 IR 이후 사용자가 별도로 메뉴 구조 정비 + 매장 홈 정비를 진행. 본 문서는 그 근거 지도이며 정비 자체는 수행하지 않음.

---

## §7.1 한 줄 판정

**내 매장 실기능은 대부분 ACTIVE·정상 동작하나, 사이드바에 노출되는 canonical 메뉴(9섹션)와 실제 마운트된 60여 라우트 사이에 "숨김·중복·고아(UNREACHABLE)·PARTIAL" 층이 두껍게 쌓여 있어, 기능 결함이 아니라 IA(정보구조)·진입점 정합성 문제가 정비 핵심이다.**

- 데드링크(사이드바 항목 → 미마운트 라우트) = **0** (사이드바 항목은 전부 실 라우트로 연결)
- 기능 은폐(실기능 있는데 진입 불가) = **2 확정**(UNREACHABLE) + 다수 hidden-but-reachable
- 중복(동일 데이터/기능 2개 진입) = **2 확정**(/my-products, /settings/template)
- 미완결(PARTIAL) = **1 확정**(외국인 파트너 QR 랜딩 미연결)

---

## §7.2 메뉴 트리 (현행, 확정)

### 데스크탑 사이드바 — `KPA_SOCIETY_STORE_CONFIG`
출처: `packages/store-ui-core/src/config/storeMenuConfig.ts` (serviceKey `kpa-society`, basePath `/store`). `resolveStoreMenu(config, enabledCaps)` 로 capability 필터 후 렌더 — 현재 `MENU_CAPABILITY_MAP = { signage: 'SIGNAGE' }` 만 매핑, 나머지 주석 처리(de-mapped)라 사실상 전체 노출.

```
(홈)
  홈                              → /store

약국 상품·거래
  O4O 제품                        → /store/commerce/products
  매장 경영활용 제품               → /store/handled-products         [PharmacyOwnerOnlyGuard]
  발주 내역                        → /store/commerce/orders
  판매자 모집                      → /store/commerce/seller-recruitments
  신청·승인 현황                   → /store/commerce/recruitment-applications

약국 경영지원
  상품 설명                        → /store/marketing/product-descriptions
  블로그                          → /store/content/blog
  POP                             → /store/marketing/pop
  QR-code                         → /store/marketing/qr
  태블렛 화면 제작                 → /store/commerce/tablet-displays

약국 자료함
  콘텐츠                          → /store/library/contents
  자료                            → /store/library/resources

디지털 사이니지
  플레이리스트                     → /store/marketing/signage/playlist
  동영상                          → /store/videos
  스케줄                          → /store/schedules
  TV 재생                         → /store/player

온라인 판매
  판매 설정                        → /store/online-sales/settings
  판매 상품                        → /store/online-sales/products
  주문 관리                        → /store/online-sales/orders

판매 채널 확장
  외국인 여행객 판매지원            → /store/sales-channels/foreign-visitor

분석
  마케팅 분석                      → /store/analytics/marketing

설정
  약국 정보                        → /store/info
  매장 홈 디자인                   → /store/settings
```

### 매장 HUB 사이드바 — `PharmacyHubLayout`
`/store` 사이드바에는 없음. **크로스 진입은 글로벌 헤더 top-nav** (`config/navigation.ts:44` `내 매장`/`약국 HUB`, `visibleWhen: storeOwner`) + 모바일 하단탭. HUB→내 매장 복귀는 HUB 사이드바 footer/hero CTA(`href:'/store'`).

```
약국 HUB
  HUB 홈                          → /store-hub
  B2B 카탈로그                     → /store-hub/b2b
  콘텐츠 라이브러리                → /store-hub/content
  블로그 라이브러리                → /store-hub/blog
  POP 라이브러리                   → /store-hub/pop
  QR 라이브러리                    → /store-hub/qr
  동영상 라이브러리                → /store-hub/video
  화면세트 라이브러리              → /store-hub/screen-set
  사이니지 라이브러리              → /store-hub/signage
  다국어 상품콘텐츠 라이브러리      → /store-hub/multilingual-product-contents
    └ 내가 가져온 것              → /store-hub/multilingual-product-contents/my
  이벤트 오퍼                      → /store-hub/event-offers        [PharmacyOwnerOnlyGuard]
  장바구니                        → /store-hub/cart                [PharmacyOwnerOnlyGuard]
```

### 모바일
`MobileBottomNav` = 커뮤니티 / 약국 경영(→`/mobile/pharmacy`) / 알림 / 내정보. `MobilePharmacyPage` = **얇은 런처**(내 약국→/store, 약국 HUB→/store-hub) — 독립 메뉴 트리 아님(중복 아님).

### 프로필 드롭다운 (`KpaUserMenuItems`)
강의 대시보드(instructor) / 관리자 대시보드(admin→/admin) / 운영 대시보드(operator→/operator) / **내 매장(store_owner→/store)** / 마이페이지 / 프로필 / 설정.

---

## §7.3 라우트 트리 (현행, 확정) — App.tsx 마운트 실측

범례: **[S]** 사이드바 노출 · **[H]** hidden-but-reachable(인바운드 링크 있음) · **[U] UNREACHABLE**(인바운드 0) · **[R]** 리다이렉트 · **[deep]** 파라미터/딥링크

```
/store  [PharmacyGuard → KpaStoreLayoutWrapper: KpaGlobalHeader + StoreDashboardLayout + MobileBottomNav]
  (index)                                     StoreHomePage                        [S]
  dashboard                          [R]→ /store
  info                                        PharmacyInfoPage                     [S]
  ─ 상품·거래
  commerce/products                           PharmacyB2BPage                      [S]
  commerce/products/b2c                       PharmacySellPage                     [H] (진열·채널 편집 유일 UI)
  handled-products         [OwnerOnly]        StoreHandledProductsPage             [S]
  my-products              [OwnerOnly]        StoreProductsManagerPage             [H/DUPLICATE]
  commerce/local-products                     StoreLocalProductsPage               [H] (store_local_products 유일 관리)
  products/multilingual/:kind/:id [OwnerOnly] StoreProductMultilingualContentPage  [U]
  commerce/products/:id/marketing             ProductMarketingPage                 [H][deep]
  commerce/products/:id/pop                   ProductPopBuilderPage                [H][deep]
  commerce/orders                             StoreOrdersPage(buyer)               [S]
  commerce/order-worktable                    StoreOrderWorktablePage              [H]
  commerce/orderable                 [R]→ /store-hub/b2b
  commerce/seller-recruitments                SellerRecruitmentsBrowsePage         [S]
  commerce/recruitment-applications           StoreRecruitmentApplicationsPage     [S]
  ─ 경영지원 콘텐츠
  marketing/product-descriptions              StoreProductDescriptionsPage         [S]
  marketing/qr                                StoreQRPage                          [S]
  marketing/qr/ai-description                 StoreQrAiDescriptionPage             [H]
  marketing/pop                               StorePopPage                         [S]
  content/blog                                PharmacyBlogPage                     [S]
  content/pop                                 PharmacyPopPage                      [H] (가져온 사본 관리, create 없음)
  content/video                               PharmacyVideoPage                    [H] (가져온 사본 관리)
  content                                     StoreAssetsPage                      [H] (사이드바 없음)
  content/direct/:id                          StoreDirectContentPage               [H][deep]
  content/:snapshotId/edit                    StoreContentEditPage                 [H][deep]
  execution/product-info                      StoreProductInfoCreatorPage          [U] (App 주석 "placeholder"=stale)
  ─ 자료함
  library/contents                            StoreLibraryContentsPage             [S]
  library/resources                           StoreLibraryResourcesPage            [S]
  library/production-materials                StoreProductionMaterialsPage         [H] (list 고아, 서브라우트만 live)
  library/production-materials/new            ProductionMaterialEditorPage         [H]
  library/production-materials/:id/edit       ProductionMaterialEditorPage         [H]
  ─ 사이니지 (1 컴포넌트 route-branch)
  marketing/signage          [R]→ playlist
  marketing/signage/playlist                  StoreSignagePage(playlist tab)       [S]
  marketing/signage/playlist/new              StorePlaylistCreatePage              [H] (KEEP-LEGACY)
  videos                                      StoreSignagePage(videos tab)         [S]
  schedules                                   StoreSignagePage(schedules tab)      [S]
  player                                      SignagePlayerSelectPage              [S]
  ─ 태블릿
  commerce/tablet-displays                    StoreTabletDisplaysPage              [S]
  requests                                    TabletRequestsPage                   [H] (알림 metadata + 홈 Live Signals)
  ─ 온라인 판매 (1 컴포넌트 section prop)
  online-sales/settings                       StoreChannelsPage(settings)          [S]
  online-sales/products                       StoreChannelsPage(products)          [S]
  online-sales/orders                         OnlineSalesOrdersPage(seller)        [S]
  online-sales/orders/:orderId                OnlineSalesOrderDetailPage           [H][deep]
  channels                   [R]→ online-sales/settings                            [LEGACY]
  channels/tablet            [R]→ /store/requests                                  [LEGACY]
  ─ 판매 채널 확장
  sales-channels/foreign-visitor              ForeignVisitorSalesSupportPage       [S]
  partners                                    ForeignVisitorPartnersPage           [H]
  partners/:partnerId/qr-codes                ForeignVisitorPartnerQrCodesPage     [H/PARTIAL]
  payment/success · payment/fail              (Toss 결제 콜백)                      [H]
  ─ 분석 / 설정
  analytics/marketing                         MarketingAnalyticsPage               [S]
  settings                                    PharmacyStorePage                    [S]
  settings/template                           PharmacyTemplatePage                 [H/DUPLICATE]
  settings/layout            [R]→ settings
  ─ legacy 단축 redirect
  qr/pop/signage/analytics/products/products-b2c/orders  [R]→ 각 canonical

/store/marketing/signage/play/:playlistId    SignagePlaybackPage   [PharmacyGuard only, 최상위 격리 재생]

/store-hub  [HubGuard → PharmacyHubLayout]   (§7.2 HUB 트리 참조 — 15 화면 전부 ACTIVE)
```

---

## §7.4 기능 영역별 상태 표

### A. 상품 (products)
| 화면 | 라우트 | 상태 | 데이터 |
|------|--------|:----:|--------|
| PharmacyB2BPage (O4O 제품/주문가능 통합) | commerce/products | ACTIVE | organization_product_listings + offers |
| PharmacySellPage (진열·채널 편집 **유일 UI**) | commerce/products/b2c | ACTIVE(H) | OPL + channel settings |
| StoreHandledProductsPage (매장 경영활용) | handled-products | ACTIVE | OPL (source='listing') |
| StoreProductsManagerPage | my-products | **DUPLICATE**(H) | 동일 OPL |
| StoreLocalProductsPage (**store_local_products 유일 관리**) | commerce/local-products | ACTIVE(H) | store_local_products |
| StoreProductMultilingualContentPage | products/multilingual/:kind/:id | **UNREACHABLE** | store_multilingual_* |
| ProductMarketingPage | .../:id/marketing | ACTIVE(H,deep) | 상품↔마케팅자산 링크 |
| ProductPopBuilderPage | .../:id/pop | ACTIVE(H,deep) | product_ai_contents |
| SellerRecruitmentsBrowsePage | commerce/seller-recruitments | ACTIVE | seller_recruitments + partner_applications |
| StoreRecruitmentApplicationsPage | commerce/recruitment-applications | ACTIVE | partner_applications(mine) |

### B. 콘텐츠·QR·POP·블로그 (content)
| 화면 | 라우트 | 상태 | 데이터 |
|------|--------|:----:|--------|
| StoreQRPage | marketing/qr | ACTIVE | pharmacy_qr_codes |
| StoreQrAiDescriptionPage | marketing/qr/ai-description | ACTIVE(H) | kpa_store_contents/direct + qr |
| StorePopPage | marketing/pop | ACTIVE | store_execution_assets + store_pops |
| StoreProductDescriptionsPage | marketing/product-descriptions | ACTIVE | ProductAiContent + store_local_products |
| PharmacyBlogPage | content/blog | ACTIVE | staff blog posts |
| PharmacyPopPage (가져온 사본, create 없음) | content/pop | ACTIVE(H) | store_pops(author_role=store) |
| PharmacyVideoPage (가져온 사본) | content/video | ACTIVE(H) | video staff copies |
| StoreAssetsPage (사이드바 없음) | content | ACTIVE(H) | o4o_asset_snapshots + publish_status |
| StoreDirectContentPage | content/direct/:id | ACTIVE(H) | kpa_store_contents/direct |
| StoreContentEditPage | content/:snapshotId/edit | ACTIVE(H) | kpa_store_contents(snapshot) |
| StoreLibraryContentsPage | library/contents | ACTIVE | o4o_asset_snapshots + kpa_store_contents |
| StoreLibraryResourcesPage | library/resources | ACTIVE | store_execution_assets + snapshots(resource) |
| StoreProductionMaterialsPage (list 고아) | library/production-materials | ACTIVE(H) | merged(contents+assets+qr+blog) |
| ProductionMaterialEditorPage | .../new · .../:id/edit | ACTIVE(H) | kpa_store_contents/execution_assets |
| StoreProductInfoCreatorPage | execution/product-info | **UNREACHABLE** | store_execution_assets(product-info) |

### C. 진열·태블릿·사이니지 (display)
| 화면 | 라우트 | 상태 | 데이터 |
|------|--------|:----:|--------|
| StoreSignagePage (playlist/videos/schedules — 1 컴포넌트 3탭) | marketing/signage/playlist · videos · schedules | ACTIVE ×3 | store_playlists / store_assets / schedules |
| SignagePlayerSelectPage | player | ACTIVE | — |
| StorePlaylistCreatePage (KEEP-LEGACY) | .../playlist/new | ACTIVE(H) | store_playlists |
| SignagePlaybackPage (격리 재생) | .../signage/play/:id | ACTIVE | dual-mode UUID/_schedule |
| StoreTabletDisplaysPage | commerce/tablet-displays | ACTIVE | store tablets/idle/screen-set |

### D. 주문·판매·채널 (sales)
| 화면 | 라우트 | 상태 | 데이터 |
|------|--------|:----:|--------|
| StoreOrdersPage (구매자) | commerce/orders | ACTIVE | checkout/orders (buyerId) |
| StoreOrderWorktablePage | commerce/order-worktable | ACTIVE(H) | createOrder→checkout |
| StoreChannelsPage (settings/products — 1 컴포넌트) | online-sales/settings · products | ACTIVE ×2 | B2C channel + channelProducts |
| OnlineSalesOrdersPage (판매자) | online-sales/orders | ACTIVE | checkout/store-orders (sellerOrgId) + kpi |
| OnlineSalesOrderDetailPage | online-sales/orders/:id | ACTIVE(H) | store-orders(read-only) |
| channels · channels/tablet | (redirect) | LEGACY(R) | — |

### E. 고객 요청·알림·외국인·분석 (requests)
| 화면 | 라우트 | 상태 | 데이터 |
|------|--------|:----:|--------|
| TabletRequestsPage | requests | ACTIVE(H) | /store/interest/* (5s polling) |
| ForeignVisitorSalesSupportPage | sales-channels/foreign-visitor | ACTIVE | store-entitlements (Toss 구독) |
| ForeignVisitorPartnersPage | partners | ACTIVE(H) | foreign-visitor/partners CRUD |
| ForeignVisitorPartnerQrCodesPage | partners/:id/qr-codes | **PARTIAL**(H) | CRUD+SVG live, 제휴 랜딩 미연결 |
| MarketingAnalyticsPage | analytics/marketing | ACTIVE | /pharmacy/analytics/marketing (real) |
| payment success/fail | payment/* | ACTIVE(H) | Toss 콜백 |

### F. 매장 관리·정보·홈·HUB (management)
| 화면 | 라우트 | 상태 | 데이터 |
|------|--------|:----:|--------|
| PharmacyInfoPage | info | ACTIVE | organizations(SSOT) |
| PharmacyStorePage (매장 홈 디자인) | settings | ACTIVE | storefront_config/blocks(추정) |
| PharmacyTemplatePage | settings/template | **DUPLICATE**(H) | 동일 template — settings에 내장됨 |
| StoreHubPage 외 HUB 15화면 | /store-hub/* | ACTIVE (전부) | 각 라이브러리 → snapshot/import copy |

---

## §7.5 문제 목록 (P0–P3)

### 유형 분류 (WO §6)
- **6.1 메뉴↔기능 불일치**: 홈 CTA 라벨이 사이드바 라벨과 상이("상품 관리"≠"O4O 제품"), 홈 "채널 관리"→`/store/channels`(리다이렉트 홉). 사이드바 없는 실기능 다수(hidden).
- **6.2 권한 불일치**: 이미 `/store` 전체가 PharmacyGuard(매장경영자)로 게이팅된 상태에서 일부만 추가 `PharmacyOwnerOnlyGuard`(my-products/handled-products/products·multilingual/hub event-offers·cart) — 적용 기준이 불균등(예: local-products·b2c 진열편집은 OwnerOnly 아님).
- **6.3 저장↔반영 불일치**: StoreAssetsPage publish 토글 실패를 조용히 삼킴(`StoreAssetsPage.tsx:62-64`); StoreRecruitmentApplicationsPage 로드 에러 `catch{setRows([])}`; ProductMarketingPage fetch/unlink 에러 silent `catch{}`; PharmacySellPage 로드 에러 콘솔만(재시도 UI 없음).
- **6.4 워크플로 단절**: ForeignVisitorPartnerQrCodes 제휴 랜딩 미연결(코드 주석 "다음 단계"); ProductionMaterialEditor 저장 후 이동 대상 불일치(문서 주석=production-materials, 코드=library/contents).
- **6.5 정책·표기 불일치**: App.tsx:1006 `execution/product-info` "placeholder" 주석이 stale(실제 동작 CRUD); production-materials 사이드바 제거(WO-...-QR-POP-RESULT-SCOPE)로 list 진입점 소실.

### 우선순위
| # | 우선 | 문제 | 유형 | 근거 |
|---|:---:|------|:----:|------|
| 1 | **P1** | `products/multilingual/:kind/:id`(StoreProductMultilingualContentPage) 인바운드 0 — 매장 자체 다국어 저작 화면이 진입 불가 | 6.1 은폐 | grep 결과 App.tsx:989 + 자기 주석뿐 |
| 2 | **P1** | `execution/product-info`(StoreProductInfoCreatorPage) 인바운드 0 — 완전 동작 CRUD인데 고아 | 6.1 은폐 | ProductionTypeSelectorModal:24가 명시 제외 |
| 3 | **P1** | 외국인 파트너 QR 제휴 랜딩 미연결(PARTIAL) — QR 스캔 후 랜딩 없음 | 6.4 단절 | QrCodes.tsx:336 "다음 단계에서 연결" |
| 4 | **P2** | `/my-products`(StoreProductsManagerPage) = handled-products와 동일 OPL 관리 중복 | 6.1 중복 | storeMenuConfig:274-275 "흡수" 주석 |
| 5 | **P2** | `/settings/template`(PharmacyTemplatePage) = /settings 내장 템플릿 선택과 중복 | 6.1 중복 | PharmacyStorePage TEMPLATES L50-55 |
| 6 | **P2** | 저장/조회 실패 silent swallow 4곳(반영 여부 사용자 인지 불가) | 6.3 | StoreAssetsPage:62-64 등 |
| 7 | **P2** | 홈 CTA 라벨·경로가 사이드바와 상이 + 리다이렉트 홉(`/store/channels`) | 6.1 | StoreHomePage 실행흐름 3-step |
| 8 | **P3** | production-materials list 진입점 소실(사이드바 제거, list 인바운드 0, 서브라우트만 live) | 6.5 | storeMenuConfig:307-310 |
| 9 | **P3** | App.tsx:1006 "placeholder" 주석 stale · ProductionMaterialEditor 이동대상 문서≠코드 | 6.5 | 코드 대조 |
| 10 | **P3** | `channels`·`channels/tablet` legacy 리다이렉트 잔존 | 6.5 | App.tsx:1056-1057 |

> P0(운영 차단 결함) = **없음**. 실기능 화면은 전부 동작. 문제는 IA·진입점·표기 정합성 계층에 집중.

---

## §7.6 권장 메뉴 트리 (제안, 확정 아님 — 정비 WO에서 판단)

원칙: 기능이 많다고 합치지 않음 / route 없는 메뉴 노출 금지 / route 있는 실기능 은폐 금지 / 공통(store-ui-core) vs KPA 전용 구분 유지.

```
홈                → /store

상품·거래
  O4O 제품(카탈로그·주문가능)      → /store/commerce/products
  매장 경영활용 제품               → /store/handled-products
    └ 진열·채널 설정 (deep)       → /store/commerce/products/b2c   ← 은폐 해소: "진열 설정" 진입 명시
  매장 자체 상품(local)           → /store/commerce/local-products ← 사이드바 승격 검토(현재 유일 관리 UI인데 hidden)
  발주 내역                        → /store/commerce/orders
  판매자 모집 / 신청·승인 현황      → (현행 유지)

경영지원 콘텐츠
  상품 설명 / 블로그 / POP / QR-code / 태블렛 화면 제작   → (현행 유지)
  다국어 상품콘텐츠(매장 저작)      → products/multilingual 진입점 신설 검토 ← P1-1 해소

자료함
  콘텐츠 / 자료 → (현행)
  제작 자료(production-materials)   → list 진입점 복원 여부 결정 ← P3-8

디지털 사이니지 / 온라인 판매 / 판매 채널 확장 / 분석 → (현행 유지)

설정
  약국 정보 → /store/info
  매장 홈 디자인 → /store/settings   (템플릿 선택은 여기 내장 → /settings/template 정리 ← P2-5)
```

**중복 정리 후보:** `/my-products`(→handled-products로 통합·라우트는 딥링크 보존) · `/settings/template`(→settings 내장으로 흡수).
**은폐 해소 후보:** local-products / products·multilingual / product-info(용도 확정 후 진입점 부여 또는 폐기).

---

## §7.7 후속 정비 그룹 (G1–G10)

| 그룹 | 내용 | 대상 화면/라우트 | 우선 |
|------|------|------------------|:----:|
| **G1** | UNREACHABLE 실기능 처리(진입점 부여 or 폐기 결정) | products/multilingual, execution/product-info | P1 |
| **G2** | 외국인 파트너 QR 제휴 랜딩 연결(PARTIAL 완결) | partners/:id/qr-codes | P1 |
| **G3** | 상품 화면 중복 통합 | my-products → handled-products | P2 |
| **G4** | 설정 화면 중복 정리 | settings/template → settings 내장 | P2 |
| **G5** | 저장/조회 실패 UX 표준화(silent catch 제거·재시도 노출) | StoreAssetsPage, RecruitmentApplications, ProductMarketing, PharmacySell | P2 |
| **G6** | 홈 CTA ↔ 사이드바 라벨/경로 정합 + 리다이렉트 홉 제거 | StoreHomePage, /store/channels | P2 |
| **G7** | local-products / production-materials 진입점 정책 확정(승격 or 딥링크 명문화) | local-products, production-materials(list) | P3 |
| **G8** | stale 주석·문서↔코드 이동대상 정정 | App.tsx:1006, ProductionMaterialEditor nav | P3 |
| **G9** | legacy redirect 정리(유지/폐기 판정) | channels, channels/tablet, 기타 legacy 단축 | P3 |
| **G10** | PharmacyOwnerOnlyGuard 적용 기준 일관화(공통 정책 판단 — store-ui-core 소비처 전수 영향) | OwnerOnly 4곳 vs 미적용 편집화면 | P3 |

> **G10 주의:** 가드/메뉴 config는 `@o4o/store-ui-core` 공통 모듈이므로 KPA 단독 변경 금지 — Shared Module Change Protocol 대상(GlycoPharm/K-Cosmetics 동시 영향 확인 필수).

---

## §8~§10 조사 원칙·금지·정지조건 준수 기록

- **코드 기준 조사**: 전 화면 status를 App.tsx 마운트 + 컴포넌트 소스 + 인바운드 grep으로 판정. 과거 WO "완료"를 현재 근거로 삼지 않음.
- **공통 vs KPA 전용 구분**: 사이드바 config·가드·StoreDashboardLayout·resolveStoreMenu = 공통(store-ui-core). StoreChannelsPage(section prop)·StoreSignagePage(3탭)는 1 컴포넌트 다중 라우트 — "중복 아님"으로 명시.
- **금지 준수**: 코드 수정 0 / DB write 0 / migration 0 / 메뉴·route 변경 0 / 리팩터링 0 / 공통 컴포넌트 추출 0 / API 수정 0 / 배포 0 / 브라우저 데이터 변경 0 / 테스트 데이터 생성 0. **본 문서 1개만 생성.**
- **불확실 표기**: storefront 백엔드 테이블(`/stores/:slug/settings|template`)은 프론트에서 미노출 → **추가확인필요(백엔드)**. StoreLibraryContents 명시적 empty text → **추가확인필요**. 그 외 상태는 **확정**(코드 근거 명시).

## §11 완료 보고
- 감사 대상: kpa-society `/store`(60여 라우트) + `/store-hub`(15 화면) 전수.
- 방식: 직접 읽기(라우트/사이드바/가드/홈/모바일/top-nav/프로필) + Explore 6 병렬 영역감사(A~F) 종합.
- 산출: 본 IR (§7.1 판정 / §7.2 메뉴 / §7.3 라우트 / §7.4 상태표 / §7.5 문제 P0-P3 / §7.6 권장 / §7.7 G1-G10).
- 데드링크 0 / UNREACHABLE 2 / DUPLICATE 2 / PARTIAL 1 / silent-swallow 4.
- 코드·DB·배포 변경 0.

---

*코드 기준 read-only 전 구조 감사 · 정비 자체는 후속 WO에서 수행*
