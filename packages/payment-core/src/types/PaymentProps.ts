/**
 * Payment Props Interface
 *
 * WO-O4O-PAYMENT-CORE-SCAFFOLD-V1
 *
 * 결제 속성 인터페이스 — TypeORM 데코레이터 없음.
 * 서비스별 Entity는 이 인터페이스를 implement하여
 * Core 호환성을 보장한다.
 *
 * ❌ No TypeORM decorators
 * ❌ No Order entity reference
 * ❌ No Provider-specific fields
 */

import type { PaymentStatus } from './PaymentStatus.js';

export interface PaymentProps {
  /** 결제 ID (UUID) */
  id: string;

  /** 결제 상태 */
  status: PaymentStatus;

  /** 결제 요청 금액 */
  amount: number;

  /** 통화 (기본: KRW) */
  currency: string;

  /** 트랜잭션 ID (내부 생성) */
  transactionId: string;

  /** 주문 참조 ID (문자열, FK 아님) */
  orderId?: string;

  /** PG 결제 키 (PG 승인 후 설정) */
  paymentKey?: string;

  /** 결제 수단 */
  paymentMethod?: string;

  /** 실결제 금액 (확인 후 설정) */
  paidAmount?: number;

  /** 결제 요청 일시 */
  requestedAt: Date;

  /** 결제 완료 일시 */
  paidAt?: Date;

  /** 실패 일시 */
  failedAt?: Date;

  /** 취소 일시 */
  cancelledAt?: Date;

  /** 환불 일시 */
  refundedAt?: Date;

  /** 실패 사유 */
  failureReason?: string;

  /** 서비스 키 (결제를 요청한 서비스 식별) */
  sourceService: string;

  /** 추가 메타데이터 */
  metadata?: Record<string, unknown>;
}
