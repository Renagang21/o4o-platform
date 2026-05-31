/**
 * OperatorShell — O4O Operator UI 통합 레이아웃
 *
 * WO-O4O-OPERATOR-UI-STANDARDIZATION-V1
 * WO-O4O-OPERATOR-ACTION-STANDARDIZATION-V1
 */

// WO-O4O-UI-OPERATOR-SHELL-COMPONENT-REMOVAL-V1:
//   OperatorShell 컴포넌트 제거 (런타임 소비자 0 — KPA/GlycoPharm/K-Cosmetics/Neture 의
//   operator·admin layout 이 모두 @o4o/operator-ux-core 의 OperatorAreaShell + DomainIASidebar 로 이행 완료).
//   STANDARD_GROUPS / OperatorGroupKey / OperatorMenuItem / action 컴포넌트는 공통 자산으로 유지.
export type {
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
