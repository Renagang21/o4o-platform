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
export { GuideBackLink } from './components/GuideBackLink';
export type { GuideBackLinkProps } from './components/GuideBackLink';
export { StoreTopBar } from './components/StoreTopBar';
export type { StoreTopBarProps, StoreNavItem } from './components/StoreTopBar';
export { StoreSidebar } from './components/StoreSidebar';
export type { StoreSidebarProps } from './components/StoreSidebar';

// 원본 보기 (Store Asset Derivation) 공통 뷰어 — WO-O4O-STORE-ASSET-DERIVATION-VIEWER-COMPONENT-EXTRACT-V1
export { StoreAssetDerivationViewer, resultKindToDerivedKind } from './components/StoreAssetDerivationViewer';
export type {
  StoreAssetDerivationViewerProps,
  StoreAssetDerivationItem,
  StoreResultKind,
} from './components/StoreAssetDerivationViewer';

// Capability Menu Integration (WO-O4O-CAPABILITY-MENU-INTEGRATION-V1)
export { MENU_CAPABILITY_MAP, resolveStoreMenu } from './config/menuCapabilityMap';

// Engine (WO-STORE-AI-INSIGHT-LAYER-V1)
export type { StoreInsight, StoreInsightAction, StoreInsightInput, InsightLevel } from './engine/storeInsightEngine';
export { computeStoreInsights } from './engine/storeInsightEngine';

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

// Shared Production Modal (WO-O4O-START-PRODUCTION-MODAL-SHARED-COMPONENT-PHASE2-H-V1)
export { StartProductionModal } from './components/StartProductionModal';
export type { StartProductionModalProps, StartProductionTargetConfig, StartProductionTemplateItem } from './components/StartProductionModal';

// Auth Guard (WO-O4O-MY-STORE-CROSSSERVICE-CANONICAL-GUARD-ALIGNMENT-V1)
export { StoreOwnerGuard } from './auth/StoreOwnerGuard';
export type {
  StoreOwnerGuardProps,
  StoreOwnerGuardUser,
  StoreOwnerServiceKey,
  StoreOwnerStaleRecovery,
} from './auth/StoreOwnerGuard';
