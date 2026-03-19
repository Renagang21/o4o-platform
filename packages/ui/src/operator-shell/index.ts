/**
 * OperatorShell — O4O Operator UI 통합 레이아웃
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-OPERATOR-ACTION-STANDARDIZATION-V1
 */

export { OperatorShell } from './OperatorShell';
export type {
  OperatorShellProps,
  OperatorMenuItem,
  OperatorGroupKey,
} from './types';
export { STANDARD_GROUPS } from './constants';
export type { StandardGroup } from './constants';

// Operator Action Components (WO-O4O-OPERATOR-ACTION-STANDARDIZATION-V1)
export { OperatorConfirmModal } from './OperatorConfirmModal';
export type { OperatorConfirmModalProps } from './OperatorConfirmModal';
export { OperatorStatusBadge } from './OperatorStatusBadge';
export type { OperatorStatusBadgeProps } from './OperatorStatusBadge';
export { useOperatorAction } from './useOperatorAction';
export type { UseOperatorActionOptions, UseOperatorActionReturn } from './useOperatorAction';
