/**
 * Payment Core - Event Definitions
 *
 * WO-O4O-PAYMENT-CORE-SCAFFOLD-V1
 *
 * 결제 이벤트 타입 정의
 *
 * 핵심 원칙:
 * - Payment Core는 결제 사실만 확인하고 이벤트 발행
 * - 비즈니스 로직(재고, 배송, 정산)은 Extension App 책임
 * - payment.completed가 모든 확장 App의 트리거
 */

// =============================================================================
// Event Types
// =============================================================================

export enum PaymentEventType {
  /** 결제 요청 생성됨 */
  PAYMENT_INITIATED = 'payment.initiated',

  /** PG 결제 승인됨 (서버 검증 대기) */
  PAYMENT_AUTHORIZED = 'payment.authorized',

  /** 서버 검증 완료 (최종 확정) */
  PAYMENT_CONFIRMED = 'payment.confirmed',

  /**
   * 결제 완료 (확장 App 트리거)
   *
   * ⭐ 핵심 이벤트: 모든 Extension App은 이 이벤트를 구독
   */
  PAYMENT_COMPLETED = 'payment.completed',

  /** 결제 실패 */
  PAYMENT_FAILED = 'payment.failed',

  /** 결제 취소 */
  PAYMENT_CANCELLED = 'payment.cancelled',

  /** 환불 완료 */
  PAYMENT_REFUNDED = 'payment.refunded',
}

// =============================================================================
// Event Payloads
// =============================================================================

/**
 * 기본 결제 이벤트 페이로드
 */
export interface PaymentEventBase {
  /** 이벤트 타입 */
  eventType: PaymentEventType;
  /** 내부 결제 ID */
  paymentId: string;
  /** 트랜잭션 ID */
  transactionId: string;
  /** 주문 참조 ID */
  orderId: string;
  /** 이벤트 발생 시각 */
  timestamp: Date;
  /** 서비스 키 */
  sourceService: string;
  /** 추가 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 결제 시작 이벤트
 */
export interface PaymentInitiatedEvent extends PaymentEventBase {
  eventType: PaymentEventType.PAYMENT_INITIATED;
  /** 요청 금액 */
  requestedAmount: number;
  /** 통화 */
  currency: string;
}

/**
 * 결제 승인 이벤트 (PG 응답)
 */
export interface PaymentAuthorizedEvent extends PaymentEventBase {
  eventType: PaymentEventType.PAYMENT_AUTHORIZED;
  /** PG 결제 키 */
  paymentKey: string;
  /** 결제 금액 */
  amount: number;
}

/**
 * 결제 확인 이벤트 (서버 검증 완료)
 */
export interface PaymentConfirmedEvent extends PaymentEventBase {
  eventType: PaymentEventType.PAYMENT_CONFIRMED;
  /** PG 결제 키 */
  paymentKey: string;
  /** 결제 금액 */
  paidAmount: number;
  /** 결제 수단 */
  paymentMethod: string;
  /** 승인 일시 */
  approvedAt: Date;
}

/**
 * 결제 완료 이벤트
 *
 * ⭐ 핵심 이벤트: Extension App이 구독하는 최종 이벤트
 */
export interface PaymentCompletedEvent extends PaymentEventBase {
  eventType: PaymentEventType.PAYMENT_COMPLETED;
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
 * 결제 실패 이벤트
 */
export interface PaymentFailedEvent extends PaymentEventBase {
  eventType: PaymentEventType.PAYMENT_FAILED;
  /** 실패 코드 */
  errorCode?: string;
  /** 실패 사유 */
  errorMessage: string;
  /** 실패 일시 */
  failedAt: Date;
}

/**
 * 결제 취소 이벤트
 */
export interface PaymentCancelledEvent extends PaymentEventBase {
  eventType: PaymentEventType.PAYMENT_CANCELLED;
  /** 취소 사유 */
  cancelReason?: string;
  /** 취소 일시 */
  cancelledAt: Date;
}

/**
 * 환불 완료 이벤트
 */
export interface PaymentRefundedEvent extends PaymentEventBase {
  eventType: PaymentEventType.PAYMENT_REFUNDED;
  /** 환불 금액 */
  refundAmount: number;
  /** 환불 사유 */
  refundReason?: string;
  /** 환불 일시 */
  refundedAt: Date;
}

// =============================================================================
// Union Type
// =============================================================================

/**
 * 모든 결제 이벤트 유니온 타입
 */
export type PaymentEvent =
  | PaymentInitiatedEvent
  | PaymentAuthorizedEvent
  | PaymentConfirmedEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | PaymentCancelledEvent
  | PaymentRefundedEvent;

// =============================================================================
// Event Subscription Types
// =============================================================================

/**
 * 이벤트 핸들러 타입
 */
export type PaymentEventHandler<T extends PaymentEvent = PaymentEvent> = (
  event: T,
) => void | Promise<void>;

/**
 * 이벤트 구독 옵션
 */
export interface PaymentEventSubscriptionOptions {
  /** 이벤트 타입 필터 */
  eventTypes?: PaymentEventType[];
  /** 주문 참조 ID 필터 */
  orderId?: string;
  /** 에러 핸들러 */
  onError?: (error: Error, event: PaymentEvent) => void;
}
