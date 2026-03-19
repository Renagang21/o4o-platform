/**
 * Operator Action Types — Shared Action & Status Definitions
 *
 * WO-O4O-OPERATOR-ACTION-STANDARDIZATION-V1
 *
 * Operator가 수행하는 공통 액션(승인/거절/상태변경)의 타입 정의.
 * Backend endpoint URL이나 비즈니스 로직은 변경하지 않음 — Frontend UI 패턴 표준화 전용.
 */

/** Operator가 수행 가능한 공통 액션 타입 */
export enum OperatorActionType {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUSPEND = 'SUSPEND',
  ACTIVATE = 'ACTIVATE',
  RESTORE = 'RESTORE',
}

/** 엔티티 공통 상태 (승인/가입/주문 등) */
export enum OperatorEntityStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  DRAFT = 'draft',
}

/** 액션 실행 시 전달되는 공통 Payload */
export interface OperatorActionPayload {
  /** 대상 엔티티 ID */
  targetId: string;
  /** 액션 타입 */
  action: OperatorActionType;
  /** 거절/정지 사유 (optional) */
  reason?: string;
  /** 추가 메타데이터 (도메인별 확장) */
  meta?: Record<string, unknown>;
}

/** 액션 확인 모달 설정 */
export interface OperatorActionConfig {
  /** 모달 제목 */
  title: string;
  /** 확인 메시지 */
  message: string;
  /** 확인 버튼 텍스트 */
  confirmText: string;
  /** 확인 버튼 variant */
  confirmVariant: 'primary' | 'danger';
  /** 사유 입력 필수 여부 */
  requireReason: boolean;
  /** 사유 입력 placeholder */
  reasonPlaceholder?: string;
}

/** 액션 타입별 기본 설정 */
export const OPERATOR_ACTION_CONFIGS: Record<OperatorActionType, OperatorActionConfig> = {
  [OperatorActionType.APPROVE]: {
    title: '승인 확인',
    message: '이 항목을 승인하시겠습니까?',
    confirmText: '승인',
    confirmVariant: 'primary',
    requireReason: false,
  },
  [OperatorActionType.REJECT]: {
    title: '거절 확인',
    message: '이 항목을 거절하시겠습니까?',
    confirmText: '거절',
    confirmVariant: 'danger',
    requireReason: true,
    reasonPlaceholder: '거절 사유를 입력해주세요',
  },
  [OperatorActionType.SUSPEND]: {
    title: '정지 확인',
    message: '이 항목을 정지하시겠습니까?',
    confirmText: '정지',
    confirmVariant: 'danger',
    requireReason: true,
    reasonPlaceholder: '정지 사유를 입력해주세요',
  },
  [OperatorActionType.ACTIVATE]: {
    title: '활성화 확인',
    message: '이 항목을 활성화하시겠습니까?',
    confirmText: '활성화',
    confirmVariant: 'primary',
    requireReason: false,
  },
  [OperatorActionType.RESTORE]: {
    title: '복원 확인',
    message: '이 항목을 복원하시겠습니까?',
    confirmText: '복원',
    confirmVariant: 'primary',
    requireReason: false,
  },
};

/** 상태별 표시 색상 매핑 (AGTag color) */
export const OPERATOR_STATUS_COLORS: Record<OperatorEntityStatus, string> = {
  [OperatorEntityStatus.PENDING]: 'yellow',
  [OperatorEntityStatus.ACTIVE]: 'green',
  [OperatorEntityStatus.APPROVED]: 'blue',
  [OperatorEntityStatus.REJECTED]: 'red',
  [OperatorEntityStatus.SUSPENDED]: 'gray',
  [OperatorEntityStatus.DRAFT]: 'gray',
};

/** 상태별 표시 라벨 (한국어) */
export const OPERATOR_STATUS_LABELS: Record<OperatorEntityStatus, string> = {
  [OperatorEntityStatus.PENDING]: '대기',
  [OperatorEntityStatus.ACTIVE]: '활성',
  [OperatorEntityStatus.APPROVED]: '승인',
  [OperatorEntityStatus.REJECTED]: '거절',
  [OperatorEntityStatus.SUSPENDED]: '정지',
  [OperatorEntityStatus.DRAFT]: '임시저장',
};
