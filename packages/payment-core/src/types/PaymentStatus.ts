/**
 * Payment Status Enum
 *
 * WO-O4O-PAYMENT-CORE-SCAFFOLD-V1
 *
 * 결제 상태 정의 — 모든 서비스가 공유하는 단일 상태 체계
 *
 * State transitions are enforced by PaymentStateMachine.
 */

export enum PaymentStatus {
  /** 결제 생성됨 (초기 상태) */
  CREATED = 'CREATED',

  /** PG 승인 진행 중 (서버 검증 대기) */
  CONFIRMING = 'CONFIRMING',

  /** 결제 완료 */
  PAID = 'PAID',

  /** 결제 실패 */
  FAILED = 'FAILED',

  /** 결제 취소 */
  CANCELLED = 'CANCELLED',

  /** 환불 완료 */
  REFUNDED = 'REFUNDED',
}
