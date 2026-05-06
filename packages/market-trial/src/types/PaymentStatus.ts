/**
 * Market Trial Payment Types
 *
 * WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1
 *
 * PG-ready payment lifecycle for Market Trial participants.
 *
 * Out of scope:
 *   - Real PG integration (Toss / KG / Naver / Kakao approval APIs, webhooks)
 *   - Refund / cancel APIs
 *   - Payment-driven trial status auto-transition
 *
 * Provider/method values are stored as free-form strings so a future PG
 * integration can introduce new values without a migration. The constants
 * below are recommended values, not exhaustive enums.
 */

/**
 * Payment lifecycle states for a participant.
 *   unpaid   — initial state on participant insert
 *   pending  — payment initiated, awaiting confirmation
 *   paid     — payment confirmed (auto via PG, or manual via operator)
 *   failed   — payment attempt failed
 *   canceled — payment canceled before settle (operator or PG-initiated)
 *   refunded — payment refunded after settle
 *
 * Note: spelled `canceled` (single L) per WO §1 wording.
 */
export enum PaymentStatus {
  UNPAID = 'unpaid',
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}

export const VALID_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.UNPAID,
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELED,
  PaymentStatus.REFUNDED,
];

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === 'string' && (VALID_PAYMENT_STATUSES as string[]).includes(value);
}

/**
 * Recommended `paymentMethod` values. Stored as free-form varchar — callers
 * may introduce new values (e.g. 'card', 'bank_transfer') without a schema change.
 */
export const PAYMENT_METHOD_MANUAL_TRANSFER = 'manual_transfer';

/**
 * Recommended `paymentProvider` values. Stored as free-form varchar.
 *   'internal' — operator-confirmed payment (e.g. manual transfer reconciliation)
 *   future PG values: 'toss' | 'kakao' | 'naver' | 'kg_inicis' …
 */
export const PAYMENT_PROVIDER_INTERNAL = 'internal';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.UNPAID]: '미결제',
  [PaymentStatus.PENDING]: '결제 대기',
  [PaymentStatus.PAID]: '결제 완료',
  [PaymentStatus.FAILED]: '결제 실패',
  [PaymentStatus.CANCELED]: '결제 취소',
  [PaymentStatus.REFUNDED]: '환불 완료',
};
