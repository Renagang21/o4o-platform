/**
 * Payment Repository Interface
 *
 * WO-O4O-PAYMENT-CORE-SCAFFOLD-V1
 *
 * Core가 정의하는 결제 데이터 접근 계약.
 * 서비스(api-server)가 구현하여 주입한다.
 *
 * ❌ TypeORM 직접 사용 금지 (Core 내부)
 * ❌ Order 엔티티 참조 금지
 */

import type { PaymentProps } from '../types/PaymentProps.js';

/**
 * 결제 저장소 인터페이스
 */
export interface PaymentRepository {
  /** ID로 결제 조회 */
  findById(id: string): Promise<PaymentProps | null>;

  /** 트랜잭션 ID로 결제 조회 */
  findByTransactionId(transactionId: string): Promise<PaymentProps | null>;

  /** 주문 참조 ID로 결제 조회 */
  findByOrderId(orderId: string): Promise<PaymentProps | null>;

  /** 결제 저장 (생성/업데이트) */
  save(payment: PaymentProps): Promise<PaymentProps>;

  /**
   * 원자적 상태 전이 (동시성 보호)
   *
   * UPDATE WHERE status = fromStatus — affected = 0이면 이미 전이됨.
   * Optional: 구현하지 않으면 PaymentCoreService가 fallback 사용.
   */
  transitionStatus?(id: string, fromStatus: string, toStatus: string): Promise<boolean>;
}
