/**
 * 매장 태블릿 진열 관리 공통 모듈
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 */

export { StoreTabletDisplaysView } from './StoreTabletDisplaysView';
export type { StoreTabletDisplaysViewProps } from './StoreTabletDisplaysView';

export { useStoreTabletDisplays } from './useStoreTabletDisplays';
export type { TabletToastState } from './useStoreTabletDisplays';

export { TabletSelectorBar } from './TabletSelectorBar';
export type { TabletSelectorBarProps } from './TabletSelectorBar';
export { TabletProductPoolPanel } from './TabletProductPoolPanel';
export type { TabletProductPoolPanelProps } from './TabletProductPoolPanel';
export { TabletDisplayListPanel } from './TabletDisplayListPanel';
export type { TabletDisplayListPanelProps } from './TabletDisplayListPanel';
export { TabletIdlePlaylistSection } from './TabletIdlePlaylistSection';
export type { TabletIdlePlaylistSectionProps } from './TabletIdlePlaylistSection';
export { TabletProductTypeBadge } from './TabletProductTypeBadge';
export type { TabletProductTypeBadgeProps } from './TabletProductTypeBadge';
export {
  TabletLoadingBlock,
  TabletEmptyBlock,
  TabletErrorBlock,
  TabletToastBlock,
  TabletChangesBadge,
} from './TabletStateBlocks';

export {
  buildDisplayEntries,
  buildPoolCandidates,
  hasIdleChanges,
  isInDisplay,
  moveEntry,
  removeEntryAt,
  resequenceEntries,
  tabletOptionLabel,
  toDisplaySavePayload,
} from './tabletHelpers';

export {
  DEFAULT_TABLET_LABELS,
  TABLET_TEAL_ACCENT,
  TABLET_VISIBILITY_FALLBACK_NOTICE,
  TABLET_VISIBILITY_NOTICE,
} from './types';
export type {
  StoreTabletAccentClasses,
  StoreTabletChannelState,
  StoreTabletDisplayItem,
  StoreTabletDisplaysApi,
  StoreTabletDisplaysLabels,
  StoreTabletPoolLocalProduct,
  StoreTabletPoolSupplierProduct,
  StoreTabletProductPool,
  StoreTabletSummary,
  TabletDisplayEntry,
  TabletDisplaySaveInput,
  TabletPoolCandidate,
  TabletVisibilityReason,
} from './types';
