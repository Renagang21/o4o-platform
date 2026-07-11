/**
 * @o4o/tablet-kiosk-core — public exports
 *
 * WO-O4O-TABLET-KIOSK-PAGE-DEDUP-V1
 */

export { TabletKioskPage } from './TabletKioskPage';
export type { TabletKioskPageProps, TabletKioskDisplaySettings } from './TabletKioskPage';

// WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1
export { IdlePlaylistEditor } from './IdlePlaylistEditor';
export type { IdlePlaylistEditorProps } from './IdlePlaylistEditor';

export type {
  TabletProduct,
  TabletProductsResponse,
  TabletProductsParams,
  InterestSubmitResult,
  InterestStatusDetail,
  TabletInterestSubmitBody,
  TabletKioskApi,
  IdlePlaylistItem,
  LibraryAsset,
  // WO-O4O-KPA-TABLET-KIOSK-CORE-SCREEN-CONSUMER-V1
  TabletScreenResponse,
  TabletScreenSection,
} from './types';
