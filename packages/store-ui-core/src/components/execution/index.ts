/**
 * 매장 실행(Store Execution) 홈 공통 모듈
 * WO-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1
 *
 * v1 표면 = Tablet + QR. POP · Signage · ESL 은 배치 축이 없어 포함하지 않는다.
 * Pharmacy-Hub 의 기존 `[매장 실행]` 메뉴 개념을 KPA 와 공통으로 승격한 자리다.
 */

export {
  STORE_EXECUTION_STATUS_LABELS,
  STORE_EXECUTION_STATUS_SEVERITY,
  STORE_EXECUTION_REASON_LABELS,
  STORE_EXECUTION_GROUP_LABELS,
  resolveTabletExecutionStatus,
  resolveQrExecutionStatus,
  normalizeExecutionTablet,
  normalizeExecutionQr,
  groupStoreExecution,
  summarizeStoreExecution,
} from './storeExecutionModel';
export type {
  StoreExecutionStatus,
  StoreExecutionReason,
  StoreExecutionTabletInput,
  StoreExecutionQrInput,
  StoreExecutionTablet,
  StoreExecutionQr,
  StoreExecutionGroupKind,
  StoreExecutionGroup,
  StoreExecutionSummary,
} from './storeExecutionModel';

export {
  StoreExecutionHomeView,
  DEFAULT_STORE_EXECUTION_PALETTE,
  DEFAULT_STORE_EXECUTION_HOME_LABELS,
} from './StoreExecutionHomeView';
export type {
  StoreExecutionHomeViewProps,
  StoreExecutionHomeLabels,
  StoreExecutionPalette,
} from './StoreExecutionHomeView';
