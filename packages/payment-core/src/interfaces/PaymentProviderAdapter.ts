/**
 * Payment Provider Adapter Interface
 *
 * WO-O4O-PAYMENT-CORE-SCAFFOLD-V1
 *
 * PG(Payment Gateway) 통합 계약.
 * 서비스 레벨에서 구현하여 주입한다.
 * (예: TossPaymentsAdapter, StripeAdapter 등)
 *
 * ❌ Core에서 Provider API 직접 구현 금지
 */

/**
 * PG 결제 승인 결과
 */
export interface ProviderConfirmResult {
  /** PG 결제 키 */
  paymentKey: string;
  /** 결제 금액 */
  paidAmount: number;
  /** 결제 수단 */
  paymentMethod: string;
  /** 승인 일시 */
  approvedAt: Date;
  /** 카드 정보 (카드 결제 시) */
  card?: {
    company: string;
    number: string;
    installmentMonths: number;
  };
  /** 영수증 URL */
  receiptUrl?: string;
}

/**
 * PG 결제 준비 결과
 */
export interface ProviderPrepareResult {
  /** PG 클라이언트 키 */
  clientKey: string;
  /** 테스트 모드 여부 */
  isTestMode: boolean;
}

/**
 * PG 환불 결과
 */
export interface ProviderRefundResult {
  /** 환불 금액 */
  refundAmount: number;
  /** 환불 일시 */
  refundedAt: Date;
}

/**
 * 결제 PG 어댑터 인터페이스
 */
export interface PaymentProviderAdapter {
  /** 결제 준비 (PG 세션 생성) */
  prepare(params: {
    orderId: string;
    orderName: string;
    amount: number;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }): Promise<ProviderPrepareResult>;

  /** 결제 승인 (서버 검증) */
  confirm(
    paymentKey: string,
    orderId: string,
    amount: number,
  ): Promise<ProviderConfirmResult>;

  /** 환불 */
  refund(
    paymentKey: string,
    reason?: string,
  ): Promise<ProviderRefundResult>;
}
