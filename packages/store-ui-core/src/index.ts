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
} from './config/storeMenuConfig';

// Constants (per-service configs)
export {
  ALL_STORE_MENUS,
  COSMETICS_STORE_CONFIG,
  GLYCOPHARM_STORE_CONFIG,
  GLUCOSEVIEW_STORE_CONFIG,
  KPA_SOCIETY_STORE_CONFIG,
} from './config/storeMenuConfig';

// Layout
export { StoreDashboardLayout } from './layout/StoreDashboardLayout';

// Components
export { StorePlaceholderPage } from './components/StorePlaceholderPage';
export { StoreTopBar } from './components/StoreTopBar';
export type { StoreTopBarProps } from './components/StoreTopBar';
export { StoreSidebar } from './components/StoreSidebar';
export type { StoreSidebarProps } from './components/StoreSidebar';

// Engine (WO-STORE-AI-INSIGHT-LAYER-V1)
export type { StoreInsight, StoreInsightAction, StoreInsightInput, InsightLevel } from './engine/storeInsightEngine';
export { computeStoreInsights } from './engine/storeInsightEngine';
