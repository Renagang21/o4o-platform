/**
 * @o4o/store-asset-policy-core - Store Asset Policy Core
 *
 * Platform-common snapshot policy, types, and asset management components.
 * Data fetching remains in each service; this package handles policy interpretation and display.
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 */

// Types
export type {
  AssetPublishStatus,
  SnapshotType,
  LifecycleStatus,
  ChannelMap,
  StoreAssetItem,
  TabKey,
  StatusFilter,
  PolicyFilter,
  ChannelFilter,
  SortKey,
} from './types/snapshot';

// Policy
export {
  isForcedActive,
  isForcedExpired,
  canEdit,
  canToggleStatus,
} from './policy/policyGate';

export {
  FORCED_WARN_DAYS,
  daysUntil,
  isForcedExpiringSoon,
} from './policy/expiringSoon';

export {
  STATUS_CONFIG,
  SNAPSHOT_TYPE_CONFIG,
  formatDate,
  formatShortDate,
} from './policy/mapping';

// Components
export { StoreAssetsPanel } from './components/StoreAssetsPanel';
export type { StoreAssetsPanelProps } from './components/StoreAssetsPanel';

// WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1
//   StoreAssetsView = 조회·상태전이 controller + Panel 을 묶은 화면 단위 공통 View.
//   KPA·KCos·GP 의 StoreAssetsPage 사본 3벌을 대체한다 (API 클라이언트만 주입).
export { StoreAssetsView } from './components/StoreAssetsView';
export type { StoreAssetsViewProps, StoreAssetsViewApi } from './components/StoreAssetsView';

export { ForcedSection } from './components/ForcedSection';
export type { ForcedSectionProps } from './components/ForcedSection';

export { SnapshotTypeBadge } from './components/SnapshotTypeBadge';
export { LifecycleStatusPill } from './components/LifecycleStatusPill';

export { PolicyFilterBar } from './components/PolicyFilterBar';
export type { PolicyFilterBarProps } from './components/PolicyFilterBar';

// Media Extraction (WO-O4O-TABLET-IDLE-LIBRARY-SNAPSHOT-SUPPORT-V1)
export {
  extractSnapshotMedia,
  extractSnapshotMediaList,
} from './media/snapshotMedia';
export type {
  SnapshotMediaItem,
  SnapshotForMedia,
} from './media/snapshotMedia';
