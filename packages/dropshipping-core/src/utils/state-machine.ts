/**
 * State Machine Utilities
 *
 * DS-4.3 상태 모델 준수
 * - 화이트리스트 기반 상태 전이만 허용
 * - 터미널 상태 관리
 * - 명시적 전이 규칙
 */

import { OrderRelayStatus } from '../entities/OrderRelay.entity.js';
import { SettlementBatchStatus } from '../entities/SettlementBatch.entity.js';

/**
 * OrderRelay 상태 전이 규칙 (DS-4.3)
 *
 * pending → relayed → confirmed → shipped → delivered → (closed)
 *                                              ↓
 *                                           refunded (terminal)
 * pending/relayed/confirmed → cancelled (terminal)
 */
const ORDER_RELAY_TRANSITIONS: Record<OrderRelayStatus, OrderRelayStatus[]> = {
  [OrderRelayStatus.PENDING]: [OrderRelayStatus.RELAYED, OrderRelayStatus.CANCELLED],
  [OrderRelayStatus.RELAYED]: [OrderRelayStatus.CONFIRMED, OrderRelayStatus.CANCELLED],
  [OrderRelayStatus.CONFIRMED]: [OrderRelayStatus.SHIPPED, OrderRelayStatus.CANCELLED],
  [OrderRelayStatus.SHIPPED]: [OrderRelayStatus.DELIVERED],
  [OrderRelayStatus.DELIVERED]: [OrderRelayStatus.REFUNDED],
  [OrderRelayStatus.CANCELLED]: [], // Terminal
  [OrderRelayStatus.REFUNDED]: [], // Terminal
};

/**
 * OrderRelay 터미널 상태
 */
const ORDER_RELAY_TERMINAL_STATES: OrderRelayStatus[] = [
  OrderRelayStatus.CANCELLED,
  OrderRelayStatus.REFUNDED,
];

/**
 * SettlementBatch 상태 전이 규칙 (DS-4.3)
 *
 * open → closed → processing → paid (terminal)
 *                     ↓
 *                  failed → processing (retry)
 */
const SETTLEMENT_BATCH_TRANSITIONS: Record<SettlementBatchStatus, SettlementBatchStatus[]> = {
  [SettlementBatchStatus.OPEN]: [SettlementBatchStatus.CLOSED],
  [SettlementBatchStatus.CLOSED]: [SettlementBatchStatus.PROCESSING],
  [SettlementBatchStatus.PROCESSING]: [SettlementBatchStatus.PAID, SettlementBatchStatus.FAILED],
  [SettlementBatchStatus.PAID]: [], // Terminal
  [SettlementBatchStatus.FAILED]: [SettlementBatchStatus.PROCESSING], // Retry allowed
};

/**
 * SettlementBatch 터미널 상태
 */
const SETTLEMENT_BATCH_TERMINAL_STATES: SettlementBatchStatus[] = [
  SettlementBatchStatus.PAID,
];

/**
 * 상태 전이 가능 여부 확인
 */
export function canTransitionOrderRelay(
  currentStatus: OrderRelayStatus,
  targetStatus: OrderRelayStatus
): boolean {
  const allowedTransitions = ORDER_RELAY_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(targetStatus);
}

/**
 * OrderRelay 터미널 상태 여부
 */
export function isOrderRelayTerminal(status: OrderRelayStatus): boolean {
  return ORDER_RELAY_TERMINAL_STATES.includes(status);
}

/**
 * SettlementBatch 상태 전이 가능 여부 확인
 */
export function canTransitionSettlementBatch(
  currentStatus: SettlementBatchStatus,
  targetStatus: SettlementBatchStatus
): boolean {
  const allowedTransitions = SETTLEMENT_BATCH_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(targetStatus);
}

/**
 * SettlementBatch 터미널 상태 여부
 */
export function isSettlementBatchTerminal(status: SettlementBatchStatus): boolean {
  return SETTLEMENT_BATCH_TERMINAL_STATES.includes(status);
}

/**
 * 상태 전이 에러 클래스
 */
export class StateTransitionError extends Error {
  constructor(
    public readonly entityType: 'OrderRelay' | 'SettlementBatch',
    public readonly currentStatus: string,
    public readonly targetStatus: string,
    public readonly entityId?: string
  ) {
    super(
      `Invalid state transition for ${entityType}${entityId ? ` (${entityId})` : ''}: ` +
      `${currentStatus} → ${targetStatus} is not allowed`
    );
    this.name = 'StateTransitionError';
  }
}

/**
 * 허용된 다음 상태 목록 반환
 */
export function getAllowedOrderRelayTransitions(
  currentStatus: OrderRelayStatus
): OrderRelayStatus[] {
  return ORDER_RELAY_TRANSITIONS[currentStatus] || [];
}

export function getAllowedSettlementBatchTransitions(
  currentStatus: SettlementBatchStatus
): SettlementBatchStatus[] {
  return SETTLEMENT_BATCH_TRANSITIONS[currentStatus] || [];
}

/**
 * 상태별 트리거 권한 정의
 */
export const ORDER_RELAY_TRIGGER_PERMISSIONS: Record<string, string[]> = {
  'pending→relayed': ['admin', 'system'],
  'pending→cancelled': ['admin', 'seller'],
  'relayed→confirmed': ['admin', 'supplier'],
  'relayed→cancelled': ['admin', 'supplier'],
  'confirmed→shipped': ['admin', 'supplier'],
  'confirmed→cancelled': ['admin'],
  'shipped→delivered': ['admin', 'system'],
  'delivered→refunded': ['admin'],
};

export const SETTLEMENT_BATCH_TRIGGER_PERMISSIONS: Record<string, string[]> = {
  'open→closed': ['admin', 'system'],
  'closed→processing': ['admin', 'finance'],
  'processing→paid': ['finance', 'system'],
  'processing→failed': ['finance', 'system'],
  'failed→processing': ['admin'],
};

/**
 * 트리거 권한 확인
 */
export function canTriggerOrderRelayTransition(
  currentStatus: OrderRelayStatus,
  targetStatus: OrderRelayStatus,
  actorType: string
): boolean {
  const key = `${currentStatus}→${targetStatus}`;
  const allowedActors = ORDER_RELAY_TRIGGER_PERMISSIONS[key];
  if (!allowedActors) return false;
  return allowedActors.includes(actorType);
}

export function canTriggerSettlementBatchTransition(
  currentStatus: SettlementBatchStatus,
  targetStatus: SettlementBatchStatus,
  actorType: string
): boolean {
  const key = `${currentStatus}→${targetStatus}`;
  const allowedActors = SETTLEMENT_BATCH_TRIGGER_PERMISSIONS[key];
  if (!allowedActors) return false;
  return allowedActors.includes(actorType);
}
