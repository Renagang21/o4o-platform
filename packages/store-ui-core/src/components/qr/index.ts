/**
 * Store QR 컴포넌트 — 2세대(StoreQrOperationBoard) 가 canonical 이다.
 *
 * WO-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1 §8
 *   신규 QR 운영 화면은 StoreQrOperationBoard + storeQrOperationModel 을 쓴다.
 *   StoreQrConsoleView 는 1세대이며 소비처가 K-Cosmetics 한 곳뿐이다 —
 *   확장하지 않고 세대 교체 대상으로 남긴다(이번 회차에서 KCos 는 건드리지 않는다).
 */

// ── 2세대 (canonical) ──────────────────────────────────────────────────────
export { StoreQrOperationBoard, DEFAULT_STORE_QR_OPERATION_BOARD_LABELS, DEFAULT_STORE_QR_BOARD_PALETTE } from './StoreQrOperationBoard';
export type {
  StoreQrOperationBoardProps,
  StoreQrOperationBoardLabels,
  StoreQrBoardPalette,
} from './StoreQrOperationBoard';

export {
  STORE_QR_TARGET_KINDS,
  STORE_QR_LANDING_TYPE_TO_TARGET_KIND,
  STORE_QR_TARGET_KIND_LABELS,
  STORE_QR_LANDING_TYPE_LABELS,
  STORE_QR_CONTENT_SOURCES,
  STORE_QR_CONTENT_SOURCE_LABELS,
  STORE_QR_EXPORT_PRESETS,
  toStoreQrTargetKind,
  storeQrContentSourceLabel,
  storeQrTargetLabel,
  isArchivedCornerQr,
  isQrLandable,
  isQrExportable,
} from './storeQrOperationModel';
export type {
  StoreQrTargetKind,
  StoreQrContentSource,
  StoreQrExportFormat,
  StoreQrExportPreset,
  StoreQrExportOption,
  StoreQrOperationItem,
} from './storeQrOperationModel';

// ── 1세대 (K-Cosmetics 전용 · 세대 교체 대기) ──────────────────────────────
export { StoreQrConsoleView } from './StoreQrConsoleView';
export type {
  StoreQrConsoleViewProps,
  StoreQrConsoleApi,
  StoreQrConsoleTheme,
  StoreQrConsoleLabels,
  StoreQrItem,
  StoreQrCreateInput,
  StoreQrLandingType,
  StoreQrTemplate,
} from './StoreQrConsoleView';

// ── 사용처(Placement) — WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §9 ──
export { StoreQrPlacementPanel } from './StoreQrPlacementPanel';
export type {
  StoreQrPlacementPanelProps,
  StoreQrPlacementRow,
  StoreQrPlacementScanRow,
} from './StoreQrPlacementPanel';
export {
  STORE_QR_PLACEMENT_PRESETS,
  QR_PRIMARY_PLACEMENT_MULTIPLE,
  storeQrPlacementLabel,
  hasAmbiguousPlacement,
} from './storeQrOperationModel';
