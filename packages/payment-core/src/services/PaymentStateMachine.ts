/**
 * Payment State Machine
 *
 * WO-O4O-PAYMENT-CORE-SCAFFOLD-V1
 *
 * 결제 상태 전이 규칙 정의 및 검증
 *
 * 전이 규칙:
 *   CREATED    → CONFIRMING, CANCELLED, FAILED
 *   CONFIRMING → PAID, FAILED
 *   PAID       → REFUNDED
 *   FAILED     → (terminal)
 *   CANCELLED  → (terminal)
 *   REFUNDED   → (terminal)
 */

import { PaymentStatus } from '../types/PaymentStatus.js';

/**
 * 허용된 상태 전이 맵
 *
 * key: 현재 상태
 * value: 전이 가능한 상태 목록
 */
const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.CREATED]: [
    PaymentStatus.CONFIRMING,
    PaymentStatus.CANCELLED,
    PaymentStatus.FAILED,
  ],
  [PaymentStatus.CONFIRMING]: [
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
  ],
  [PaymentStatus.PAID]: [
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.CANCELLED]: [],
  [PaymentStatus.REFUNDED]: [],
};

/**
 * 상태 전이 가능 여부 확인
 *
 * @param from - 현재 상태
 * @param to - 전이 대상 상태
 * @returns 전이 가능 여부
 */
export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  const allowed = PAYMENT_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

/**
 * 상태 전이 실행 (검증 포함)
 *
 * @param from - 현재 상태
 * @param to - 전이 대상 상태
 * @throws Error - 전이 불가 시 INVALID_PAYMENT_TRANSITION 에러
 */
export function assertTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `INVALID_PAYMENT_TRANSITION: Cannot transition from '${from}' to '${to}'`,
    );
  }
}

/**
 * 터미널 상태 여부 확인
 */
export function isTerminalStatus(status: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[status]?.length === 0;
}

/**
 * 특정 상태에서 전이 가능한 상태 목록 조회
 */
export function getAllowedTransitions(from: PaymentStatus): PaymentStatus[] {
  return [...(PAYMENT_TRANSITIONS[from] ?? [])];
}
