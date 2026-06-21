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
export type { StoreProductionMaterialsViewProps } from './components/StoreProductionMaterialsView';

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

// Production Router Utils (WO-O4O-STORE-PRODUCTION-ROUTER-UTILS-COMMONIZATION-PHASE2-G-V1)
export type { ProductionTarget, ProductionSourceItem, ProductionSource, ProductionRouterState } from './utils/productionUtils';
export { buildProductionState, composeSourceTextFromItems, parseProductionRouterState, useProductionRouterState } from './utils/productionUtils';

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
  StoreLocalProductsApi,
  StoreLocalProduct,
  StoreLocalProductInput,
} from './components/local-products/StoreLocalProductsManager';

// Store Hub 이벤트 오퍼 단순 목록 공통 (WO-O4O-STORE-HUB-EVENT-OFFER-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1)
export { EventOffersHubList } from './components/event-offers/EventOffersHubList';
export type { EventOffersHubListProps, EventOfferHubItem, EventOffersHubAccent } from './components/event-offers/EventOffersHubList';

// Store Hub 공급 상품 카탈로그 공통 (WO-O4O-STORE-HUB-SUPPLY-CATALOG-NAMING-ALIGNMENT-V1)
// 구 B2BCatalogHub → SupplyCatalogHub. extraction 원본: WO-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1.
export { SupplyCatalogHub } from './components/supply-catalog/SupplyCatalogHub';
export type {
  SupplyCatalogHubProps,
  SupplyCatalogHubLabels,
  SupplyCatalogProduct,
  SupplyCatalogApi,
  SupplyCatalogGetParams,
  SupplyCatalogListResponse,
  SupplyCatalogAccent,
} from './components/supply-catalog/SupplyCatalogHub';

// Shared Production Modal (WO-O4O-START-PRODUCTION-MODAL-SHARED-COMPONENT-PHASE2-H-V1)
export { StartProductionModal } from './components/StartProductionModal';
export type { StartProductionModalProps, StartProductionTargetConfig, StartProductionTemplateItem } from './components/StartProductionModal';

// Shared Production Material Editor Shell (WO-O4O-PRODUCTION-MATERIAL-EDITOR-SHELL-COMMONIZATION-V1)
export { ProductionMaterialEditorShell } from './components/ProductionMaterialEditorShell';
export type { ProductionMaterialEditorShellProps, ProductionMaterialCreateInput } from './components/ProductionMaterialEditorShell';

// Auth Guard (WO-O4O-MY-STORE-CROSSSERVICE-CANONICAL-GUARD-ALIGNMENT-V1)
export { StoreOwnerGuard } from './auth/StoreOwnerGuard';
export type {
  StoreOwnerGuardProps,
  StoreOwnerGuardUser,
  StoreOwnerServiceKey,
  StoreOwnerStaleRecovery,
} from './auth/StoreOwnerGuard';
