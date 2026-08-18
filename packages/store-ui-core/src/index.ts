/**
 * @o4o/store-ui-core - Store Dashboard UI Core
 *
 * Store 대시보드 공통 UI를 제공한다.
 * 서비스별 config만 전달하면 동일한 Store 대시보드 구조를 사용할 수 있다.
 *
 * WO-STORE-CORE-MODULE-EXTRACTION-V1 Step 1
 * Extracted from @o4o/operator-core
 */

// Types
export type {
  StoreMenuKey,
  StoreDashboardConfig,
  StoreMenuItemDef,
  StoreMenuSection,
  StoreMenuSectionItem,
} from './config/storeMenuConfig';

// Constants (per-service configs)
export {
  ALL_STORE_MENUS,
  COSMETICS_STORE_CONFIG,
  GLYCOPHARM_STORE_CONFIG,
  KPA_SOCIETY_STORE_CONFIG,
  // WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1
  PHARMACY_HUB_STORE_CONFIG,
} from './config/storeMenuConfig';

// Layout
export { StoreDashboardLayout } from './layout/StoreDashboardLayout';

// Components
export { StorePlaceholderPage } from './components/StorePlaceholderPage';
// WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1
export { ForeignVisitorSalesSupportPanel } from './components/ForeignVisitorSalesSupportPanel';
export type { ForeignVisitorSalesSupportPanelProps } from './components/ForeignVisitorSalesSupportPanel';
export { GuideBackLink } from './components/GuideBackLink';
export type { GuideBackLinkProps } from './components/GuideBackLink';
export { StoreTopBar } from './components/StoreTopBar';
export type { StoreTopBarProps, StoreNavItem } from './components/StoreTopBar';
export { StoreSidebar } from './components/StoreSidebar';
export type { StoreSidebarProps } from './components/StoreSidebar';
// WO-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
export { StoreRecruitmentApplicationsView } from './components/StoreRecruitmentApplicationsView';
export type { StoreRecruitmentApplicationsViewProps, StoreRecruitmentApplicationRow } from './components/StoreRecruitmentApplicationsView';

// 원본 보기 (Store Asset Derivation) 공통 뷰어 — WO-O4O-STORE-ASSET-DERIVATION-VIEWER-COMPONENT-EXTRACT-V1
export { StoreAssetDerivationViewer, resultKindToDerivedKind } from './components/StoreAssetDerivationViewer';
export type {
  StoreAssetDerivationViewerProps,
  StoreAssetDerivationItem,
  StoreResultKind,
} from './components/StoreAssetDerivationViewer';

// Production Materials 목록 공통 View (WO-O4O-STORE-PRODUCTION-MATERIALS-PAGE-COMPONENT-EXTRACTION-V1)
export { StoreProductionMaterialsView } from './components/StoreProductionMaterialsView';
export type {
  StoreProductionMaterialsViewProps,
  StoreProductionMaterialsCrossLink,
} from './components/StoreProductionMaterialsView';

// Production Materials 목록 정규화/병합 (WO-O4O-STORE-PRODUCTION-MATERIAL-LIST-QUERY-CLEANUP-V1)
export {
  mergeProductionMaterials,
  PRODUCTION_USAGE_LABELS,
  PRODUCTION_ASSET_TYPE_LABELS,
  PRODUCTION_KIND_BADGE,
  PRODUCTION_BLOG_STATUS_LABELS,
} from './utils/productionMaterials';
export type {
  ProductionMaterialItem,
  ProductionMaterialKind,
  MergeProductionMaterialsInput,
} from './utils/productionMaterials';

// Capability Menu Integration (WO-O4O-CAPABILITY-MENU-INTEGRATION-V1)
export { MENU_CAPABILITY_MAP, resolveStoreMenu } from './config/menuCapabilityMap';

// Engine (WO-STORE-AI-INSIGHT-LAYER-V1)
export type { StoreInsight, StoreInsightAction, StoreInsightInput, InsightLevel } from './engine/storeInsightEngine';
export { computeStoreInsights } from './engine/storeInsightEngine';

// Store Home canonical shell (WO-O4O-STORE-HOME-CANONICAL-SHELL-V1)
// HubLayout 의 beforeSections 로 주입하는 canonical pre-sections 영역(새로고침/매장선택/배너/AI요약/인사이트/온보딩).
export { StoreHomeShell } from './components/StoreHomeShell';
export type { StoreHomeShellProps } from './components/StoreHomeShell';

// Store Home 공통 본문 파트 (WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1)
// KPA / GlycoPharm / K-Cosmetics / Pharmacy-Hub 4서비스 "내 매장(약국) 홈" 공통 구조·동작.
// 지표 항목·문구·목적지·행 표현은 서비스가 주입한다 (화면을 강제로 동일하게 만들지 않는다).
export { StoreHomeMetricGrid } from './components/home/StoreHomeMetricGrid';
export type {
  StoreHomeMetricGridProps,
  StoreHomeMetricItem,
  StoreHomeMetricVariant,
} from './components/home/StoreHomeMetricGrid';
export { StoreHomeSignalList } from './components/home/StoreHomeSignalList';
export type {
  StoreHomeSignalListProps,
  StoreHomeSignalItem,
  StoreHomeSignalTone,
} from './components/home/StoreHomeSignalList';
export { StoreHomeActivityPanel } from './components/home/StoreHomeActivityPanel';
export type { StoreHomeActivityPanelProps } from './components/home/StoreHomeActivityPanel';
export { StoreHomeStateView } from './components/home/StoreHomeStateView';
export type { StoreHomeStateViewProps, StoreHomeViewState } from './components/home/StoreHomeStateView';
// WO-O4O-MY-STORE-HOME-SHORTCUT-GRID-CROSSSERVICE-COMMONIZATION-V1
export { StoreHomeShortcutGrid } from './components/home/StoreHomeShortcutGrid';
export type {
  StoreHomeShortcutGridProps,
  StoreHomeShortcutItem,
  StoreHomeShortcutVariant,
} from './components/home/StoreHomeShortcutGrid';
// WO-O4O-MY-STORE-HOME-STORE-STATUS-CARD-CROSSSERVICE-COMMONIZATION-V1
export { StoreHomeStatusCard } from './components/home/StoreHomeStatusCard';
export type {
  StoreHomeStatusCardProps,
  StoreHomeStatusMetaItem,
  StoreHomeStatusVariant,
} from './components/home/StoreHomeStatusCard';

// Production Router Utils (WO-O4O-STORE-PRODUCTION-ROUTER-UTILS-COMMONIZATION-PHASE2-G-V1)
export type { ProductionTarget, ProductionSourceItem, ProductionSource, ProductionRouterState } from './utils/productionUtils';
export { buildProductionState, composeSourceTextFromItems, parseProductionRouterState, useProductionRouterState } from './utils/productionUtils';
// WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1: 매장 자체 상품 POP canonical 진입
export { CANONICAL_STORE_POP_ROUTE, buildLocalProductPopState } from './utils/productionUtils';

// Buyer Checkout Status 표시 매핑 (WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1)
export {
  getBuyerCheckoutStatusDisplay,
  getBuyerCheckoutStatusLabel,
  getBuyerPaymentStatusLabel,
  BUYER_CHECKOUT_TONE_HEX,
  BUYER_CHECKOUT_STATUS_TABS,
} from './utils/buyerCheckoutStatus';
export type { BuyerCheckoutTone, BuyerCheckoutStatusDisplay } from './utils/buyerCheckoutStatus';

// Buyer 주문 내역 공통 presentation 컴포넌트 (WO-O4O-STORE-BUYER-ORDERS-COMMON-COMPONENT-EXTRACTION-V1)
export { BuyerOrderStatusBadge } from './components/buyer-orders/BuyerOrderStatusBadge';
export type { BuyerOrderStatusBadgeProps } from './components/buyer-orders/BuyerOrderStatusBadge';

// 매장 취급 상품(local-products) 공통 presentation (WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V1)
export { LocalProductBadge, LOCAL_PRODUCT_BADGE_OPTIONS } from './components/local-products/LocalProductBadge';
export type { LocalProductBadgeProps, LocalProductBadgeOption, LocalProductBadgeType } from './components/local-products/LocalProductBadge';
// 매장 취급 상품 CRUD 공통 manager (V2 — GP/KCos 통합)
export { StoreLocalProductsManager } from './components/local-products/StoreLocalProductsManager';
export type {
  StoreLocalProductsManagerProps,
  StoreLocalProductsManagerLabels,
  // WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1: 후속 화면 진입 액션 주입(미주입 시 기존 동작 유지)
  StoreLocalProductsManagerActions,
  StoreLocalProductsApi,
  StoreLocalProduct,
  StoreLocalProductInput,
  // WO-O4O-MY-STORE-LOCAL-PRODUCTS-CROSSSERVICE-COMMONIZATION-V1: KPA 수렴용 슬롯
  StoreLocalProductsExtraColumn,
  StoreLocalProductsFormModalContext,
} from './components/local-products/StoreLocalProductsManager';

// Store Hub 이벤트 오퍼 단순 목록 공통 (WO-O4O-STORE-HUB-EVENT-OFFER-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1)
export { EventOffersHubList } from './components/event-offers/EventOffersHubList';
export type { EventOffersHubListProps, EventOfferHubItem, EventOffersHubAccent } from './components/event-offers/EventOffersHubList';
export { EventOfferHubView } from './components/event-offers/EventOfferHubView';
export type {
  EventOfferHubViewProps,
  EventOfferHubRow,
  EventOfferHubSelection,
} from './components/event-offers/EventOfferHubView';

// 이벤트 오퍼 공통 helper (WO-O4O-STORE-HUB-EVENT-OFFER-COMMONIZATION-V1)
export { asUuid, buildEventOfferCartPayload } from './components/event-offers/eventOfferCart';
export type {
  EventOfferCartSource,
  EventOfferCartPayload,
} from './components/event-offers/eventOfferCart';
// WO-O4O-STORE-HUB-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
//   raw 매핑(EVENT_OFFER_STATUS_LABEL) 은 외부 소비처가 없고, 직접 조회하면 미지 status 를
//   보수적으로 처리하는 resolver 를 우회하게 된다. 공개 표면은 resolver 하나로 유지한다.
export { resolveEventOfferStatusLabel } from './components/event-offers/eventOfferStatus';
export type { EventOfferStatusKey } from './components/event-offers/eventOfferStatus';

// Store Hub 공급 상품 카탈로그 공통 (WO-O4O-STORE-HUB-SUPPLY-CATALOG-NAMING-ALIGNMENT-V1)
// 구 B2BCatalogHub → SupplyCatalogHub. extraction 원본: WO-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1.
export { SupplyCatalogHub } from './components/supply-catalog/SupplyCatalogHub';
// WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 (census F1): 카탈로그 client factory
export { createSupplyCatalogApi } from './components/supply-catalog/createSupplyCatalogApi';
export type {
  SupplyCatalogHttp,
  SupplyCatalogQueryParams,
  SupplyCatalogApiClient,
} from './components/supply-catalog/createSupplyCatalogApi';
export type {
  SupplyCatalogHubProps,
  SupplyCatalogHubLabels,
  SupplyCatalogProduct,
  SupplyCatalogApi,
  SupplyCatalogGetParams,
  SupplyCatalogListResponse,
  SupplyCatalogAccent,
} from './components/supply-catalog/SupplyCatalogHub';

// 공급 상품 탐색 공통 Core (WO-O4O-STORE-HUB-SUPPLY-PRODUCT-EXPLORER-COMMONIZATION-V1)
//   useSupplyProductList = 조회/페이지/필터/검색/loading/empty/error 상태 Core (headless)
//   SupplyProductExplorer = 위 상태를 쓰는 목록 View (DataTable + Pagination + 필터 바)
//   신청 · 제외 · 장바구니 · 주문은 담지 않는다 (서비스 액션).
export { useSupplyProductList } from './components/supply-catalog/useSupplyProductList';
export type {
  SupplyProductListQuery,
  SupplyProductListPage,
  UseSupplyProductListOptions,
  UseSupplyProductListResult,
} from './components/supply-catalog/useSupplyProductList';
export { SupplyProductExplorer } from './components/supply-catalog/SupplyProductExplorer';
export type {
  SupplyProductExplorerProps,
  SupplyProductExplorerTab,
  SupplyProductExplorerOption,
  SupplyProductExplorerSelectFilter,
  SupplyProductExplorerColumn,
} from './components/supply-catalog/SupplyProductExplorer';

// Shared Production Modal (WO-O4O-START-PRODUCTION-MODAL-SHARED-COMPONENT-PHASE2-H-V1)
export { StartProductionModal } from './components/StartProductionModal';
export type { StartProductionModalProps, StartProductionTargetConfig, StartProductionTemplateItem } from './components/StartProductionModal';

// Shared Production Material Editor Shell (WO-O4O-PRODUCTION-MATERIAL-EDITOR-SHELL-COMMONIZATION-V1)
export { ProductionMaterialEditorShell } from './components/ProductionMaterialEditorShell';
export type { ProductionMaterialEditorShellProps, ProductionMaterialCreateInput } from './components/ProductionMaterialEditorShell';

// 공용 Media Picker (WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1)
// 서비스별 MediaPickerModal 사본을 이 단일 공용 컴포넌트로 통합. 어댑터(api)+isOperator 주입.
export { MediaPickerModal } from './components/media/MediaPickerModal';
export type { MediaPickerModalProps, MediaPickerApi, MediaAssetItem } from './components/media/MediaPickerModal';

// Auth Guard (WO-O4O-MY-STORE-CROSSSERVICE-CANONICAL-GUARD-ALIGNMENT-V1)
export { StoreOwnerGuard } from './auth/StoreOwnerGuard';
export type {
  StoreOwnerGuardProps,
  StoreOwnerGuardUser,
  StoreOwnerServiceKey,
  StoreOwnerStaleRecovery,
} from './auth/StoreOwnerGuard';

// 매장 HUB 콘텐츠 탐색 + 가져오기 공통 Core (WO-O4O-STORE-HUB-SUPPLIER-CONTENT-EXPLORER-COMMONIZATION-V1)
//   useHubImportLibrary = 목록/페이지/loading/error + 매장 slug + 선택 + 단건·일괄 가져오기 상태 Core.
//   가져오기 API(importOne) 와 화면(컬럼·안내문·accent)은 서비스 페이지가 주입·소유한다.
export { useHubImportLibrary } from './components/hub-import/useHubImportLibrary';
export type {
  HubImportLibraryItem,
  HubImportLibraryMessages,
  UseHubImportLibraryOptions,
  UseHubImportLibraryResult,
} from './components/hub-import/useHubImportLibrary';

// 매장 장바구니 공통 (WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1)
//   storeCartTypes = canonical Store Cart API 계약 타입 (3 서비스 중복 제거 — 계약 자체는 무변경)
//   useStoreCart   = 조회/수량/삭제/비우기/주문확정 상태 Core (headless)
//   StoreCartView  = KCos·GP near-identical 화면 공통 View (accent 주입)
//   Pharmacy-Hub 는 결제 그룹 기반 다른 주문 계약이므로 대상 아님.
export type {
  CartSourceType,
  CartPricingSource,
  StoreCartItem,
  AddCartItemInput,
  SupplierGroupShipping,
  SupplierGroup,
  CreatedOrderSummary,
  FailedCartItem,
  CheckoutConfirmResult,
  StoreCartApiOk,
  StoreCartApi,
} from './components/store-cart/storeCartTypes';
export { createStoreCartApi } from './components/store-cart/createStoreCartApi';
export type { StoreCartHttp, StoreCartApiClient } from './components/store-cart/createStoreCartApi';
export { useStoreCart } from './components/store-cart/useStoreCart';
export type { UseStoreCartOptions, UseStoreCartResult } from './components/store-cart/useStoreCart';
export { StoreCartView } from './components/store-cart/StoreCartView';
export type { StoreCartViewProps, StoreCartAccent } from './components/store-cart/StoreCartView';

// 공급 상품 신청/제외 액션 Core (WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1)
//   "내 매장에 추가" = ProductApproval 신청. 신청 ≠ 장바구니 ≠ 주문 (의미 변경 없음).
export { useSupplyProductApplication } from './components/supply-catalog/useSupplyProductApplication';
export type {
  SupplyApplicationItem,
  SupplyProductApplicationApi,
  SupplyProductApplicationLabels,
  UseSupplyProductApplicationOptions,
  UseSupplyProductApplicationResult,
} from './components/supply-catalog/useSupplyProductApplication';

// ─────────────────────────────────────────────────────────────────────────────
// WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1
// ─────────────────────────────────────────────────────────────────────────────

// 서비스 accent 토큰 단일 출처. 공통 View 는 서비스 이름이 아니라 accent 이름만 받는다.
export { STORE_ACCENT_CLASSES, storeAccentTokens } from './theme/storeAccent';
export type { StoreAccent, StoreAccentTokens } from './theme/storeAccent';

// Store HUB 사이니지 라이브러리 (KPA 652L · KCos 579L · GP 580L 사본 3벌 대체)
//   useSignageLibrary  = 2탭 · producer 필터 · 페이지네이션 · 선택 · 단건/일괄 복사 상태 Core
//   SignageLibraryView = 공통 화면. accent · ownerLabel · sortable · headerAction ·
//                        importedTargets · guide 를 config 로 받는다.
export { useSignageLibrary } from './components/signage-library/useSignageLibrary';
export type {
  SignageLibraryItem,
  SignageViewTab,
  SignageLibraryMessages,
  UseSignageLibraryOptions,
  UseSignageLibraryResult,
  SignageImportedNotice,
} from './components/signage-library/useSignageLibrary';
export { SignageLibraryView } from './components/signage-library/SignageLibraryView';
export type {
  SignageLibraryViewProps,
  SignageProducerTab,
  SignageLibraryGuide,
  SignageImportedTargets,
} from './components/signage-library/SignageLibraryView';
export { HubImportLibraryView } from './components/hub-import/HubImportLibraryView';
export type {
  HubImportLibraryRow,
  HubImportLibraryLabels,
  HubImportLibraryViewProps,
} from './components/hub-import/HubImportLibraryView';

// ── Store HUB Shell (WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1) ──
export { StoreHubShell } from './components/hub-shell/StoreHubShell';
export type {
  StoreHubShellProps,
  StoreHubNavGroup,
  StoreHubNavItem,
} from './components/hub-shell/StoreHubShell';

// WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1: 매장 HUB 콘텐츠 상세 공통 View
export { HubContentDetailView } from './components/hub-content/HubContentDetailView';
export type {
  HubContentDetailViewProps,
  HubContentDetailItem,
  HubContentDetailAccent,
} from './components/hub-content/HubContentDetailView';

// ─── Store HUB API 클라이언트 팩토리 (WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1, census F1) ───
export { createStoreHubApi } from './api/createStoreHubApi';
export type {
  StoreHubHttp,
  StoreHubApiClient,
  StoreHubOverview,
  ChannelType,
  ChannelStatus,
  ChannelOverview,
  ChannelOverviewWithCode,
  StoreKpiSummary,
  LiveSignals,
  StoreCapabilityOverview,
  StoreSlugStatus,
  StoreSlugChangeResult,
  StoreSlugErrorCode,
} from './api/createStoreHubApi';

// ─── 매장측 이벤트 오퍼 / HUB 콘텐츠 API 팩토리 ───
// WO-O4O-STORE-HUB-API-CLIENT-AND-SERVICE-SCOPE-ALIGNMENT-V1
//   createEventOfferApi : KCos·GP 사본(주석·export명·prefix만 달랐다) 통합. KPA legacy `/groupbuy*` 는 제외.
//   createHubContentApi : `/hub/contents` 단일 계약. serviceKey 는 config 값.
//                         응답 타입은 `@o4o/types` 의존을 Core 로 끌어오지 않기 위해 제네릭 주입.
export { createEventOfferApi } from './api/createEventOfferApi';
export type {
  EventOfferHttp,
  CreateEventOfferApiConfig,
  EventOfferApiClient,
  EnrichedEventOffer,
  EnrichedEventOffersResponse,
  EventOfferOrderResult,
  EventOfferOrderResponse,
} from './api/createEventOfferApi';
export { createHubContentApi } from './api/createHubContentApi';
export type {
  HubContentHttp,
  CreateHubContentApiConfig,
  HubContentApiClient,
  HubContentListParams,
} from './api/createHubContentApi';

// ─── buyer 주문(구매/발주) 내역 공통 View ───
// WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1 §8
//   buyer checkout ledger 계약(KPA·GlycoPharm)만 대상. K-Cosmetics 소비자 storefront 주문과
//   PharmacyHub paymentGroup 결제 우선 주문은 업무 계약이 달라 합치지 않는다.
export { BuyerOrderLedgerView } from './components/order-ledger/BuyerOrderLedgerView';
export type {
  BuyerLedgerOrder,
  BuyerLedgerStatusTab,
  BuyerOrderLedgerEmptyConfig,
  BuyerOrderLedgerViewProps,
} from './components/order-ledger/BuyerOrderLedgerView';

// 결제 전 주문 취소 — 백엔드 계약(WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1)의
// 매장측 UI 노출. KPA · GlycoPharm · K-Cosmetics 공통(Pharmacy-Hub 는 자체 결제 우선 화면 유지).
export { useBuyerOrderCancel, isBuyerOrderCancellable } from './components/order-ledger/useBuyerOrderCancel';
export type {
  BuyerOrderCancelResult,
  UseBuyerOrderCancelOptions,
} from './components/order-ledger/useBuyerOrderCancel';
export { BuyerOrderCancelButton } from './components/order-ledger/BuyerOrderCancelButton';
export type { BuyerOrderCancelButtonProps } from './components/order-ledger/BuyerOrderCancelButton';

// 매장 경영활용 제품 — 교차 서비스 데이터 계약 + 목록 UI 파트
// (WO-O4O-MY-STORE-HANDLED-PRODUCTS-VIEW-COMMONIZATION-V1)
// 타입은 `@o4o/store-ui-core/handled-products` subpath 로도 노출된다(기존 소비처 유지).
export {
  handledProductKey,
} from './types/handledProducts';
export type {
  HandledProductSource,
  HandledProductListItem,
  HandledProductsPagination as HandledProductsPaginationMeta,
  HandledProductRef,
} from './types/handledProducts';

export {
  HandledProductsPageHeader,
  HandledProductsToolbar,
  HandledProductsCountRow,
  HandledProductsTable,
  HandledProductsPagination,
  HandledProductNameCell,
  HandledProductBadge,
  formatHandledProductPrice,
  formatHandledProductDate,
  handledProductClassificationLabel,
} from './components/handled-products/HandledProductsListParts';
export type {
  HandledProductsPageHeaderProps,
  HandledProductsToolbarProps,
  HandledProductsColumn,
  HandledProductsSelection,
  HandledProductsTableProps,
  HandledProductBadgeTone,
} from './components/handled-products/HandledProductsListParts';

// POP Composer (WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1)
export * from './components/pop';

// Store Library (WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1)
export * from './components/library';

// Store Tablet Displays (WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1)
export * from './components/tablet';

// 매장 실행 분석 · 제품 마케팅 · POP 사본 · 상품 설명 · 사이니지 재생
// (WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1)
export * from './components/analytics';
export * from './components/product-marketing';
export * from './components/pop-staff';
export * from './components/product-descriptions';
export * from './components/signage';

// 채널 콘솔 · QR 콘솔 · 블로그 관리
// (WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1)
export * from './components/channels';
export * from './components/qr';
export * from './components/blog';
