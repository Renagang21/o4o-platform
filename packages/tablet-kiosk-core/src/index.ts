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

// WO-O4O-KPA-TABLET-IDLE-VIDEO-URL-ONLY-V1: 제작 화면이 URL 로 미디어 타입을 자동 판별할 때 재사용.
//   (판별 규칙을 소비처에 복제하지 않기 위해 export — 뷰어와 동일 규칙 보장)
export { detectIdleMediaType, toIdleEmbedUrl } from './idleMedia';
export type { IdleMediaType } from './idleMedia';

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
  // WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-RUNTIME-V1
  TabletContentCard,
} from './types';
