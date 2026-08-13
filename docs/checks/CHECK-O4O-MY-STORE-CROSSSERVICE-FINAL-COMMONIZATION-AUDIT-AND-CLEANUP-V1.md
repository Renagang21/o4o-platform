# CHECK-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1

- **WO**: WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1
- **작업일**: 2026-08-13
- **작업 위치**: worktree `C:\tmp\o4o-common-my-store` · 로컬 branch `work/commonization-my-store` → 원격 `work/commonization-my-store-shell-parts`
- **main 병합 없음**

---

## 1. census 방법

### 1-1. 모집단 산출 기준

기존 WO/CHECK 의 항목 목록을 모집단으로 쓰지 않았다. 각 서비스 `src/App.tsx` 의 **내 매장 route 트리를 직접 파싱**해서
실제로 렌더되는 **page component 소비처**를 모집단 단위로 삼았다.

- 단위 = `(서비스 × 실제 렌더되는 page component)` 1건. shell/layout 은 서비스당 1건으로 별도 계상.
- `<Navigate>` · `ParamRedirect` alias route 는 화면이 아니므로 **항목이 아니다** (KCos 12 · GP 15 · KPA 12 alias 확인).
- 주석 처리된 route(GP `StoreApplyPage`)는 dead 이므로 제외.
- guard 로 감싸진 element(`<PharmacyOwnerOnlyGuard><X/>`)도 별도 grep 으로 회수해 누락 0.

### 1-2. 조사 대상 route 블록

| 서비스 | route 블록 | 파일 |
|---|---|---|
| K-Cosmetics | `/store/*` | `services/web-k-cosmetics/src/App.tsx` L786-872 |
| GlycoPharm | `/store/*` (+ `/store/marketing/signage/play/:playlistId` top-level) | `services/web-glycopharm/src/App.tsx` L977-1101 |
| KPA-Society | `/store/*` (+ `/store/marketing/signage/play/:playlistId` top-level) | `services/web-kpa-society/src/App.tsx` L938-1085 |
| Pharmacy-Hub | `/store-owner/*` (+ `/store-owner/payment/*`) | `services/web-pharmacy-hub/src/App.tsx` L176-215 |
| Neture | `/store/manage/*`, `/store/my-products` | `services/web-neture/src/App.tsx` L957-961 |

### 1-3. OUT_OF_SCOPE 경계 (모집단에서 제외한 route 군)

WO §6 에 따라 아래는 "내 매장(매장 운영자 화면)" 이 아니므로 census 단위로 세지 않았다.

- 소비자 storefront / kiosk / tablet 공개 화면 — GP `/store/:pharmacyId{,/kiosk,/tablet}`, KCos `/tablet/:slug`, KPA `/tablet/:slug` · `/store/:slug/products/:id`, Neture `/store/product/*` · `/store/cart` · `/store/payment/*` · `/store/orders*`
- 매장 HUB(`/store-hub/*`) — 매장이 자료를 **받는** 축. 이번 WO 의 "내 매장" 축과 다르다.
- operator / admin / platform 영역의 store 관련 화면(`/operator/stores`, `/admin/store-approvals` 등)
- 공개 블로그·QR 랜딩(`/store/:slug/blog`, `/qr/:slug`)

### 1-4. 판정 기준

| 판정 | 기준 |
|---|---|
| `FULLY_COMMON` | 화면 본체가 공통 패키지에 있고 서비스 파일은 adapter/config 만. 또는 서비스 3곳 이상이 같은 공통 컴포넌트를 소비 |
| `CORE_ONLY` | 공통 Core 는 존재하나 실제 소비처가 없거나 1곳뿐이라 공통화 효과가 없는 상태 |
| `VIEW_DUPLICATED` | 같은 화면의 본체가 2개 이상 서비스에 **각각** 존재(문구·accent·endpoint 만 다름) |
| `SERVICE_SPECIFIC` | 업무 모델·데이터 모델·기능 집합이 실제로 다름(단일 서비스 전용 포함) |
| `NOT_IMPLEMENTED` | route 는 있으나 화면이 없음 |
| `OUT_OF_SCOPE` | §1-3 경계 |

**WO §3 준수**: route 존재 / build PASS / dead code 0 은 판정 근거로 쓰지 않았다.
`FULLY_COMMON` 은 전부 "본체가 공통 패키지에 있음"을 파일 실측(LOC + import)으로 확인했고,
`VIEW_DUPLICATED` 는 전부 서비스 간 `diff` 실측 라인수를 근거로 판정했다.

---

## 2. 전체 모집단

**총 138건** (KCos 30 · GP 37 · KPA 43 · PH 25 · Neture 3)

alias/redirect route 39건, OUT_OF_SCOPE route 군은 위 기준대로 항목에서 제외했다.

---

## 3. 항목별 판정

LOC = 서비스 파일 라인수. `CORE` = `@o4o/store-ui-core` 소비.

### 3-1. K-Cosmetics (30)

| # | 항목 | LOC | 판정 |
|---|---|---|---|
| 1 | StoreDashboardLayout (shell) | — | FULLY_COMMON |
| 2 | StoreCockpitPage (홈) | 676 CORE | FULLY_COMMON |
| 3 | StoreProductsManagerPage | `@o4o/store-products-ui` | FULLY_COMMON |
| 4 | StoreCommerceProductsPage | 40 CORE | FULLY_COMMON |
| 5 | StoreLocalProductsPage | 24 CORE | FULLY_COMMON |
| 6 | StoreTabletDisplaysPage | 43 CORE | FULLY_COMMON |
| 7 | StoreOrdersPage | 421 CORE | FULLY_COMMON |
| 8 | StoreRecruitmentApplicationsPage | 63 CORE | FULLY_COMMON |
| 9 | ForeignVisitorSalesSupportPage | 27 CORE | FULLY_COMMON |
| 10 | StoreSignagePage | 394 CORE | FULLY_COMMON |
| 11 | StorePlaylistCreatePage | 59 | FULLY_COMMON (`SignagePlaylistCreateShell`) |
| 12 | SignagePlayerSelectPage | 23 CORE | FULLY_COMMON (이번 WO) |
| 13 | SignagePlaybackPage | 38 CORE | FULLY_COMMON (이번 WO) |
| 14 | StoreAssetsPage | 94 | FULLY_COMMON (`@o4o/store-asset-policy-core`) |
| 15 | StoreLibraryContentsPage | 68 CORE | FULLY_COMMON |
| 16 | StoreLibraryResourcesPage | 31 CORE | FULLY_COMMON |
| 17 | StoreProductionMaterialsPage | 73 CORE | FULLY_COMMON |
| 18 | ProductionMaterialEditorPage | 56 CORE | FULLY_COMMON |
| 19 | StorePopPage | 83 CORE | FULLY_COMMON |
| 20 | StorePopStaffPage | 46 CORE | FULLY_COMMON (이번 WO) |
| 21 | StoreProductDescriptionsPage | 47 CORE | FULLY_COMMON (이번 WO) |
| 22 | StoreMarketingAnalyticsPage | 22 CORE | FULLY_COMMON (이번 WO) |
| 23 | ProductMarketingPage | 24 CORE | FULLY_COMMON (이번 WO) |
| 24 | ProductPopBuilderPage | 33 CORE | FULLY_COMMON |
| 25 | **StoreChannelsPage** | 1130 | **VIEW_DUPLICATED** (GP 1139 과 diff 67줄) |
| 26 | **StoreQrPage** | 550 | **VIEW_DUPLICATED** (GP 654 와 diff 178줄) |
| 27 | **StoreBlogManagePage** | 602 | **VIEW_DUPLICATED** (GP 629 와 diff 75줄) |
| 28 | InterestRequestsPage | 188 | SERVICE_SPECIFIC (KCos 관심요청 모델 전용) |
| 29 | StoreRevenueSummaryPage | 301 | SERVICE_SPECIFIC (KCos 정산/수익 모델) |
| 30 | StoreSettingsPage | 725 | SERVICE_SPECIFIC (KCos 매장 설정 항목 집합) |

### 3-2. GlycoPharm (37)

| # | 항목 | LOC | 판정 |
|---|---|---|---|
| 1 | StoreDashboardLayout (shell) | — | FULLY_COMMON |
| 2 | StoreOverviewPage (홈) | 263 CORE | FULLY_COMMON |
| 3 | PharmacyB2BProducts | 41 CORE | FULLY_COMMON |
| 4 | StoreLocalProductsPage | 24 CORE | FULLY_COMMON |
| 5 | StoreTabletDisplaysPage | 110 CORE | FULLY_COMMON |
| 6 | StoreRecruitmentApplicationsPage | 63 CORE | FULLY_COMMON |
| 7 | ForeignVisitorSalesSupportPage | 27 CORE | FULLY_COMMON |
| 8 | StoreSignageMainPage | 1830 CORE | FULLY_COMMON (GP 사이니지 본체 — KCos 와 모델 상이, 공통 primitive 소비) |
| 9 | StorePlaylistCreatePage | 59 | FULLY_COMMON |
| 10 | SignagePlayerSelectPage | 23 CORE | FULLY_COMMON (이번 WO) |
| 11 | SignagePlaybackPage | 38 CORE | FULLY_COMMON (이번 WO) |
| 12 | StoreAssetsPage | 93 | FULLY_COMMON |
| 13 | StoreLibraryContentsPage | 68 CORE | FULLY_COMMON |
| 14 | StoreLibraryResourcesPage | 44 CORE | FULLY_COMMON |
| 15 | StoreProductionMaterialsPage | 73 CORE | FULLY_COMMON |
| 16 | ProductionMaterialEditorPage | 56 CORE | FULLY_COMMON |
| 17 | StorePopPage | 85 CORE | FULLY_COMMON |
| 18 | StorePopStaffPage | 46 CORE | FULLY_COMMON (이번 WO) |
| 19 | StoreProductDescriptionsPage | 47 CORE | FULLY_COMMON (이번 WO) |
| 20 | StoreMarketingAnalyticsPage | 22 CORE | FULLY_COMMON (이번 WO) |
| 21 | ProductMarketingPage | 24 CORE | FULLY_COMMON (이번 WO) |
| 22 | ProductPopBuilderPage | 33 CORE | FULLY_COMMON |
| 23 | **StoreChannelsPage** | 1139 | **VIEW_DUPLICATED** |
| 24 | **StoreQrPage** | 654 | **VIEW_DUPLICATED** |
| 25 | **PharmacyBlogPage** | 629 | **VIEW_DUPLICATED** |
| 26 | StoreMainPage (identity) | 743 | SERVICE_SPECIFIC |
| 27 | PharmacySettings | 925 | SERVICE_SPECIFIC |
| 28 | PharmacyManagement | 365 | SERVICE_SPECIFIC |
| 29 | PharmacyOrders | 343 | SERVICE_SPECIFIC |
| 30 | B2BOrderPage | 695 | SERVICE_SPECIFIC (GP B2B 주문 모델) |
| 31 | StoreBillingPage | 154 | SERVICE_SPECIFIC |
| 32 | CustomerRequestsPage | 742 | SERVICE_SPECIFIC |
| 33 | FunnelPage | 315 | SERVICE_SPECIFIC |
| 34 | signage/ContentLibraryPage | 335 | SERVICE_SPECIFIC (GP 사이니지 미디어 라이브러리) |
| 35 | signage/PlaylistDetailPage | 220 | SERVICE_SPECIFIC |
| 36 | signage/MediaDetailPage | 190 | SERVICE_SPECIFIC |
| 37 | signage/SignagePreviewPage | 82 | SERVICE_SPECIFIC |

### 3-3. KPA-Society (43)

| # | 항목 | LOC | 판정 |
|---|---|---|---|
| 1 | KpaStoreLayoutWrapper (shell) | — | FULLY_COMMON (`StoreDashboardLayout`) |
| 2 | StoreHomePage | 391 CORE | FULLY_COMMON (`StoreHomeShell`) |
| 3 | StoreProductsManagerPage | `@o4o/store-products-ui` | FULLY_COMMON |
| 4 | StoreHandledProductsPage | 484 CORE | FULLY_COMMON |
| 5 | StoreLocalProductsPage | 533 CORE | FULLY_COMMON |
| 6 | StoreOrdersPage | 359 CORE | FULLY_COMMON |
| 7 | StoreRecruitmentApplicationsPage | 127 CORE | FULLY_COMMON |
| 8 | ForeignVisitorSalesSupportPage | 108 CORE | FULLY_COMMON |
| 9 | MarketingAnalyticsPage | 25 CORE | FULLY_COMMON (이번 WO) |
| 10 | OnlineSalesOrdersPage | 328 CORE | FULLY_COMMON |
| 11 | OnlineSalesOrderDetailPage | 324 CORE | FULLY_COMMON |
| 12 | StoreLibraryContentsPage | 251 CORE | FULLY_COMMON |
| 13 | ProductMarketingPage | 607 CORE | FULLY_COMMON |
| 14 | ProductPopBuilderPage | 36 CORE | FULLY_COMMON |
| 15 | StorePlaylistCreatePage | 65 | FULLY_COMMON |
| 16 | **StoreProductDescriptionsPage** | 702 | **VIEW_DUPLICATED** (KCos/GP 는 공통 View 채택, KPA 만 사본 잔존) |
| 17 | StoreChannelsPage | 1521 | SERVICE_SPECIFIC (KPA 채널 superset) |
| 18 | StoreQRPage | 2067 CORE | SERVICE_SPECIFIC (다국어·AI 설명 연동 superset) |
| 19 | StoreQrAiDescriptionPage | 657 | SERVICE_SPECIFIC (KPA 전용 AI 설명) |
| 20 | StorePopPage | 1085 CORE | SERVICE_SPECIFIC (KPA POP 고급 편집 superset) |
| 21 | PharmacyPopPage | 522 | SERVICE_SPECIFIC |
| 22 | StoreSignagePage | 2289 CORE | SERVICE_SPECIFIC |
| 23 | SignagePlayerSelectPage | 213 | SERVICE_SPECIFIC (스케줄·player-key 선택 superset) |
| 24 | SignagePlaybackPage | 529 | SERVICE_SPECIFIC (스케줄 재생·organizationId 축) |
| 25 | StoreTabletDisplaysPage | 1877 | SERVICE_SPECIFIC (screen-set·코너 모델 superset) |
| 26 | TabletRequestsPage | 413 | SERVICE_SPECIFIC |
| 27 | StoreLibraryResourcesPage | 929 | SERVICE_SPECIFIC (서버 pagination·검색·업로드·삭제 superset) |
| 28 | ProductionMaterialEditorPage | 490 | SERVICE_SPECIFIC (`:id/edit` 편집 모드 — 공통 Shell 미지원) |
| 29 | StoreProductMultilingualContentPage | 423 | SERVICE_SPECIFIC (KPA 다국어 축) |
| 30 | PharmacyB2BPage | 680 | SERVICE_SPECIFIC |
| 31 | PharmacySellPage | 755 | SERVICE_SPECIFIC (KPA 유일 B2C 진열) |
| 32 | StoreOrderWorktablePage | 1060 | SERVICE_SPECIFIC |
| 33 | SellerRecruitmentsBrowsePage | 337 | SERVICE_SPECIFIC |
| 34 | PharmacyInfoPage | 687 | SERVICE_SPECIFIC |
| 35 | PharmacyBlogPage | 928 CORE | SERVICE_SPECIFIC (KCos/GP 대비 superset, diff 679줄) |
| 36 | PharmacyVideoPage | 514 | SERVICE_SPECIFIC |
| 37 | StoreAssetsPage | 154 | SERVICE_SPECIFIC (KPA 자산 정책 확장) |
| 38 | StoreContentEditPage | 464 | SERVICE_SPECIFIC |
| 39 | StoreDirectContentPage | 406 | SERVICE_SPECIFIC |
| 40 | ForeignVisitorPartnersPage | 401 | SERVICE_SPECIFIC |
| 41 | ForeignVisitorPartnerQrCodesPage | 354 | SERVICE_SPECIFIC |
| 42 | ForeignVisitorSalesSupportPaymentSuccessPage | 133 | SERVICE_SPECIFIC |
| 43 | ForeignVisitorSalesSupportPaymentFailPage | (동일 파일) | SERVICE_SPECIFIC |

### 3-4. Pharmacy-Hub (25)

PH 는 공급/enrollment · B2B 장바구니 · 결제라는 **다른 업무 모델**이다. 화면은 KPA 사본이 아니라
공통 backend 테이블(`store_pops` · `store_qr_codes` · `store_playlists` · `kpa_store_contents` · `store_execution_assets`)
위에 독립 설계됐고, 공유 편집기가 있는 곳(`TabletContentStepBuilder`)은 그대로 주입해 쓴다. WO §6 에 따라 강제 통합하지 않았다.

| # | 항목 | LOC | 판정 |
|---|---|---|---|
| 1 | StoreOwnerShell (shell) | 88 CORE | FULLY_COMMON |
| 2 | HomePage | 350 CORE | FULLY_COMMON |
| 3 | HandledProductsPage | 437 CORE | FULLY_COMMON |
| 4 | LocalProductsPage | 104 CORE | FULLY_COMMON |
| 5 | LibraryPage | 100 CORE | FULLY_COMMON |
| 6 | LibraryResourcesPage | 383 | SERVICE_SPECIFIC (등록·수정·비활성 write 흐름 — 공통 View 는 목록 전용) |
| 7 | ProductsPage | 251 | SERVICE_SPECIFIC (공급 offer 모델) |
| 8 | ProductDetailPage | 247 | SERVICE_SPECIFIC |
| 9 | CartPage | 289 | SERVICE_SPECIFIC (PH 전용 B2B 장바구니) |
| 10 | OrdersPage | 138 | SERVICE_SPECIFIC |
| 11 | OrderDetailPage | 197 | SERVICE_SPECIFIC |
| 12 | PaymentPage | — | SERVICE_SPECIFIC |
| 13 | PaymentSuccessPage | — | SERVICE_SPECIFIC |
| 14 | PaymentFailPage | — | SERVICE_SPECIFIC |
| 15 | ContentPage | 291 | SERVICE_SPECIFIC |
| 16 | PopPage | 458 | SERVICE_SPECIFIC (`store_pops` draft→published→archived 모델) |
| 17 | QrPage | 617 | SERVICE_SPECIFIC |
| 18 | SignagePage | 420 | SERVICE_SPECIFIC |
| 19 | TabletsPage | 400 | SERVICE_SPECIFIC (`@o4o/tablet-screen-set-editor` 주입) |
| 20 | BlogPage | 175 | SERVICE_SPECIFIC |
| 21 | BlogEditorPage | 153 | SERVICE_SPECIFIC |
| 22 | ManualsPage | 134 | SERVICE_SPECIFIC |
| 23 | ManualDetailPage | 174 | SERVICE_SPECIFIC |
| 24 | StoreInfoPage | 439 | SERVICE_SPECIFIC |
| 25 | AccountPage | 242 | SERVICE_SPECIFIC |

### 3-5. Neture (3)

| # | 항목 | LOC | 판정 |
|---|---|---|---|
| 1 | StoreProductsManagerPage (`/store/my-products`) | `@o4o/store-products-ui` | FULLY_COMMON |
| 2 | StoreListingsPage (`/store/manage/products`) | 308 | SERVICE_SPECIFIC (Neture distribution/listing 모델) |
| 3 | StoreProductLibraryPage | 501 | SERVICE_SPECIFIC |

---

## 4. 이번 WO 에서 수행한 cleanup

이번 branch(`work/commonization-my-store`) 누적 기준. 마지막 구간(이번 commit)은 ★ 표시.

| 그룹 | 화면 | 공통 산출물 | 결과 |
|---|---|---|---|
| G1 | 매장 shell / 홈 | `StoreDashboardLayout` · `StoreHomeShell` | 4서비스 채택 |
| G2 | 자료함 Resources · Contents | `StoreLibraryResourcesView` · `StoreLibraryContentsView` | KCos·GP 채택 |
| G3 | 태블릿 진열 관리 | `StoreTabletDisplaysView` | KCos 43L · GP 110L adapter |
| G4 | POP 제작 | `StorePopComposerView` | KCos 83L · GP 85L adapter |
| G5 ★ | 매장 실행 분석 | `StoreMarketingAnalyticsView` | KCos·GP·KPA 22~25L adapter |
| G6 ★ | 제품 마케팅 | `ProductMarketingView` | KCos·GP 24L adapter |
| G7 ★ | POP 사본 관리 | `StorePopStaffView` | 465L → 46L ×2 |
| G8 ★ | 상품 상세설명 관리 | `StoreProductDescriptionsView` | 420L → 47L ×2 |
| G9 ★ | 사이니지 플레이어 선택 | `SignagePlayerSelectView` | → 23L ×2 |
| G10 ★ | 사이니지 재생 | `SignagePlaybackView` | → 38L ×2 |

### 4-1. 공통화 계약 원칙 (이번 구간)

- `@o4o/store-ui-core` 의 **의존성을 늘리지 않았다**. `RichTextEditor`(`@o4o/content-editor`) ·
  `getAccessToken`(`@o4o/auth-client`) · template registry 는 전부 **props/slot 주입**이다.
  `package.json` · lockfile 변경 0 (CLAUDE.md 중지 조건 회피).
- 서비스별 accent 는 Tailwind 가 동적 조합 클래스를 못 보므로 **완성된 class 문자열**로 전달.
- Core 의 구조적(duck-typed) interface 에 `[key: string]: unknown` 인덱스 시그니처를 쓰지 않는다 —
  Core 내부 필드 접근과 호출부 대입 양쪽이 깨진다(이번 구간 실제 typecheck 실패 원인, 수정 완료).
- backend · route · permission · API 계약 변경 0. DB/migration 0. 신규 기능 0.

---

## 5. 남은 예외와 이유

### 5-1. VIEW_DUPLICATED 잔여 7건 — 이번 WO 에서 닫지 않은 이유

| 항목 | 규모 | 미처리 사유 |
|---|---|---|
| KCos `StoreChannelsPage` / GP `StoreChannelsPage` | 1130 / 1139 (diff 67줄) | 공통화하려면 API adapter 약 15개 + `GuideBlock`(`@o4o/shared-space-ui`) · `GuideEditableSection`(서비스 컴포넌트) · `fetchGuidePageContent` 주입 계약이 필요하다. store-ui-core 의존성을 늘리지 않으려면 18개 이상의 주입 지점이 생기고, 이번 세션에서 **브라우저 smoke 가 불가능**해 회귀를 실측할 수 없다. |
| KCos `StoreQrPage` / GP `StoreQrPage` | 550 / 654 (diff 178줄) | GP 가 약 100줄 superset. 동일 본체로 합치려면 차이 구간이 실제 기능 차이인지 먼저 확정해야 한다(구조 판정 선행 필요). |
| KCos `StoreBlogManagePage` / GP `PharmacyBlogPage` | 602 / 629 (diff 75줄) | 본체는 약 94% 동일하나 KPA 판(928L)이 superset 이라, 2서비스만 합치면 3번째 판정이 다시 갈라진다. 3서비스 동시 설계가 맞다. |
| KPA `StoreProductDescriptionsPage` | 702 | 이번 WO 에서 만든 `StoreProductDescriptionsView` 와 구조 동일. 다만 라벨 문자열 약 15개 + palette 5토큰(KPA `#2563EB`/slate 계열 vs Core 의 gray 계열) + `mediaApi.upload` 기반 이미지 업로드가 다르다. 문자열·색을 전부 prop 화하면 KPA 화면 문구가 조용히 바뀔 위험이 있고 이를 브라우저로 확인할 수 없다. |

→ 후속 WO 로 분리 제안: **채널 콘솔 / QR 콘솔 / 블로그 관리 / KPA 상품설명 채택** 4건.

### 5-2. SERVICE_SPECIFIC 근거 요약

- **KPA**: 다국어 콘텐츠 축(`products/multilingual/*`) · screen-set/코너 태블릿 모델 · 사이니지 스케줄/player-key · 자료함 서버 pagination+업로드+삭제 · `:id/edit` 편집 모드 · B2C 진열(`PharmacySellPage`) · 주문 워크테이블 — 전부 타 서비스에 대응 기능이 없거나 데이터 모델이 다르다.
- **PharmacyHub**: 공급 offer → 장바구니 → 결제라는 별도 업무 모델. §3-4 참조.
- **GlycoPharm**: B2B 주문 · 퍼널 · 고객요청 · 사이니지 미디어 상세 축이 GP 전용.
- **K-Cosmetics**: 관심요청 · 수익요약 · 매장설정 항목 집합이 KCos 전용.
- **Neture**: distribution/listing 모델(공급자 축)로, 매장 실행 자산 축과 다르다.

---

## 6. 검증

| 항목 | 결과 |
|---|---|
| `packages/store-ui-core` `npx tsc --build` | PASS (exit 0) |
| `web-k-cosmetics` `tsc --noEmit` | PASS |
| `web-glycopharm` `tsc --noEmit` | PASS |
| `web-kpa-society` `tsc --noEmit` | PASS |
| `web-pharmacy-hub` `tsc --noEmit` | PASS (exit 0) |
| `web-neture` `tsc --noEmit` | PASS (exit 0) |
| `web-k-cosmetics` `vite build` | PASS (17.57s) |
| `web-glycopharm` `vite build` | PASS (18.45s) |
| `web-kpa-society` `vite build` | PASS (21.21s) |
| route 소비처 재검색 | 5서비스 App.tsx 전수 파싱 — §1-2 |
| 공통 component 소비처 전수 검색 | `@o4o/store-ui-core` grep — §3 표의 `CORE` 표기 |
| 남은 duplicate 재검색 | 서비스 간 `diff` 실측 — §5-1 |
| **브라우저 smoke** | **미수행 — PASS 처리하지 않음.** 이 세션은 비대화형이고 대상 화면이 로그인·매장 소유자 role·프로덕션 데이터를 요구한다. 이번 변경은 프로덕션 배포 대상이 아닌 별도 branch 이며, main 병합 전 실브라우저 확인이 필요하다. |

> 테스트 러너: 5개 서비스와 store-ui-core 모두 test runner 가 없다. 도입은 CLAUDE.md 중지 조건이라 하지 않았고,
> 대신 공통화 전후 **정적 동등성**(`git show HEAD:<file>` vs 신규 Core 본체 diff)으로 대체 검증했다.

---

## 7. 최종 숫자

```text
전체 모집단: 138
FULLY_COMMON: 67
CORE_ONLY: 0
VIEW_DUPLICATED: 7
SERVICE_SPECIFIC: 64
NOT_IMPLEMENTED: 0
OUT_OF_SCOPE: 0
미조사: 0
```

**VIEW_DUPLICATED 항목명 (7)**

1. `web-k-cosmetics` StoreChannelsPage
2. `web-glycopharm` StoreChannelsPage
3. `web-k-cosmetics` StoreQrPage
4. `web-glycopharm` StoreQrPage
5. `web-k-cosmetics` StoreBlogManagePage
6. `web-glycopharm` PharmacyBlogPage
7. `web-kpa-society` StoreProductDescriptionsPage

**CORE_ONLY: 0** — 이번 census 에서 "Core 는 있으나 소비처가 없는" 항목은 발견되지 않았다.
새로 만든 5개 View 는 모두 최소 2개 서비스가 즉시 채택했다.

---

## 8. 완료·미완료 판정

| WO §10 조건 | 충족 |
|---|---|
| census 완료 · 미조사 0 | ✅ 138건 전수 판정 |
| `VIEW_DUPLICATED = 0` | ❌ 7건 잔존 (§5-1) |
| `CORE_ONLY = 0` | ✅ |
| 모든 SERVICE_SPECIFIC 에 업무 차이 근거 | ✅ (§5-2, 항목별 표) |
| build / typecheck 완료 | ✅ (§6) |
| 브라우저 smoke | ❌ 미수행 (사유 기록, PASS 처리 안 함) |

### 판정

- **이번 WO 자체**: 완료 (census + 이번 구간 cleanup 5개 화면군 + 검증 + 문서).
- **"내 매장 전체 공통화 완료" 선언**: **하지 않는다.** WO §10 에 따라 `VIEW_DUPLICATED = 0` 조건이 미충족이다.
- 남은 4건(채널 콘솔 / QR 콘솔 / 블로그 관리 / KPA 상품설명)은 별도 WO 로 분리한다.

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 4건
