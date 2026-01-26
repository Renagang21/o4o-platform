/**
 * PaymentEventHub
 *
 * WO-O4O-PAYMENT-NETURE-INTEGRATION-V0.1
 *
 * Payment Core 이벤트 허브 (Express 기반)
 *
 * 역할:
 * - payment.completed 이벤트 발행 및 구독 관리
 * - 확장앱(Neture 등)이 결제 이벤트를 구독할 수 있는 중앙 허브
 *
 * 설계 원칙:
 * - Payment Core는 결제 사실만 확인하고 이벤트 발행
 * - 비즈니스 로직(재고, 배송, 정산)은 Extension App 책임
 * - payment.completed가 모든 확장 App의 트리거
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger.js';

// =============================================================================
// Event Types (Payment Core v0.1과 동기화)
// =============================================================================

/**
 * Payment Event Types
 */
export enum PaymentEventType {
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_CONFIRMED = 'payment.confirmed',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELLED = 'payment.cancelled',
}

/**
 * Payment Completed Event Payload
 *
 * ⭐ 핵심 이벤트: Extension App이 구독하는 최종 이벤트
 */
export interface PaymentCompletedEvent {
  eventType: PaymentEventType.PAYMENT_COMPLETED;
  /** 내부 결제 ID */
  paymentId: string;
  /** 트랜잭션 ID */
  transactionId: string;
  /** 주문 ID */
  orderId: string;
  /** PG 결제 키 */
  paymentKey: string;
  /** 결제 금액 */
  paidAmount: number;
  /** 결제 수단 */
  paymentMethod: string;
  /** 승인 일시 */
  approvedAt: Date;
  /** 서비스 키 (neture, cosmetics 등) */
  serviceKey?: string;
  /** 카드 정보 */
  card?: {
    company: string;
    number: string;
    installmentMonths: number;
  };
  /** 영수증 URL */
  receiptUrl?: string;
  /** 이벤트 발생 시각 */
  timestamp: Date;
  /** 추가 메타데이터 */
  metadata?: Record<string, any>;
}

/**
 * Payment Failed Event Payload
 */
export interface PaymentFailedEvent {
  eventType: PaymentEventType.PAYMENT_FAILED;
  paymentId: string;
  transactionId: string;
  orderId: string;
  errorCode?: string;
  errorMessage: string;
  serviceKey?: string;
  failedAt: Date;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * 모든 결제 이벤트 유니온 타입
 */
export type PaymentEvent = PaymentCompletedEvent | PaymentFailedEvent;

/**
 * 이벤트 핸들러 타입
 */
export type PaymentEventHandler<T extends PaymentEvent = PaymentEvent> = (
  event: T
) => void | Promise<void>;

// =============================================================================
// PaymentEventHub
// =============================================================================

/**
 * PaymentEventHub
 *
 * Express 기반 api-server용 결제 이벤트 허브
 */
class PaymentEventHub extends EventEmitter {
  private handlerCounts: Map<PaymentEventType, number> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
    logger.info('[PaymentEventHub] Initialized');
  }

  /**
   * 이벤트 구독
   */
  subscribe(
    eventType: PaymentEventType,
    handler: PaymentEventHandler,
    serviceKey?: string
  ): void {
    const wrappedHandler = (event: PaymentEvent) => {
      // 서비스 키 필터링 (지정된 경우)
      if (serviceKey && event.serviceKey && event.serviceKey !== serviceKey) {
        return;
      }
      handler(event);
    };

    this.on(eventType, wrappedHandler);

    const count = (this.handlerCounts.get(eventType) || 0) + 1;
    this.handlerCounts.set(eventType, count);

    logger.debug(
      `[PaymentEventHub] Handler subscribed: ${eventType}${serviceKey ? ` (serviceKey: ${serviceKey})` : ''}`
    );
  }

  /**
   * payment.completed 이벤트 구독 (편의 메서드)
   */
  onPaymentCompleted(
    handler: PaymentEventHandler<PaymentCompletedEvent>,
    serviceKey?: string
  ): void {
    this.subscribe(
      PaymentEventType.PAYMENT_COMPLETED,
      handler as PaymentEventHandler,
      serviceKey
    );
  }

  /**
   * payment.failed 이벤트 구독 (편의 메서드)
   */
  onPaymentFailed(
    handler: PaymentEventHandler<PaymentFailedEvent>,
    serviceKey?: string
  ): void {
    this.subscribe(
      PaymentEventType.PAYMENT_FAILED,
      handler as PaymentEventHandler,
      serviceKey
    );
  }

  /**
   * 이벤트 발행
   */
  publish(event: PaymentEvent): void {
    const eventCount = this.listenerCount(event.eventType);

    logger.info(`[PaymentEventHub] Publishing ${event.eventType}`, {
      orderId: event.orderId,
      serviceKey: event.serviceKey,
      listenerCount: eventCount,
    });

    this.emit(event.eventType, event);
  }

  /**
   * payment.completed 이벤트 발행 (편의 메서드)
   */
  emitCompleted(params: {
    paymentId: string;
    transactionId: string;
    orderId: string;
    paymentKey: string;
    paidAmount: number;
    paymentMethod: string;
    approvedAt: Date | string;
    serviceKey?: string;
    card?: {
      company: string;
      number: string;
      installmentMonths: number;
    };
    receiptUrl?: string;
    metadata?: Record<string, any>;
  }): void {
    const event: PaymentCompletedEvent = {
      eventType: PaymentEventType.PAYMENT_COMPLETED,
      paymentId: params.paymentId,
      transactionId: params.transactionId,
      orderId: params.orderId,
      paymentKey: params.paymentKey,
      paidAmount: params.paidAmount,
      paymentMethod: params.paymentMethod,
      approvedAt: typeof params.approvedAt === 'string'
        ? new Date(params.approvedAt)
        : params.approvedAt,
      serviceKey: params.serviceKey,
      card: params.card,
      receiptUrl: params.receiptUrl,
      timestamp: new Date(),
      metadata: params.metadata,
    };

    this.publish(event);
  }

  /**
   * payment.failed 이벤트 발행 (편의 메서드)
   */
  emitFailed(params: {
    paymentId: string;
    transactionId: string;
    orderId: string;
    errorCode?: string;
    errorMessage: string;
    serviceKey?: string;
    metadata?: Record<string, any>;
  }): void {
    const event: PaymentFailedEvent = {
      eventType: PaymentEventType.PAYMENT_FAILED,
      paymentId: params.paymentId,
      transactionId: params.transactionId,
      orderId: params.orderId,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      serviceKey: params.serviceKey,
      failedAt: new Date(),
      timestamp: new Date(),
      metadata: params.metadata,
    };

    this.publish(event);
  }

  /**
   * 통계 조회
   */
  getStats(): {
    eventTypes: Record<string, number>;
    totalHandlers: number;
  } {
    const eventTypes: Record<string, number> = {};
    let totalHandlers = 0;

    for (const [type, count] of this.handlerCounts) {
      eventTypes[type] = count;
      totalHandlers += count;
    }

    return { eventTypes, totalHandlers };
  }
}

// Singleton export
export const paymentEventHub = new PaymentEventHub();

// Class export for testing
export { PaymentEventHub };
