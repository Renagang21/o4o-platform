/**
 * EventHub Payment Publisher
 *
 * WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
 *
 * PaymentEventPublisher 인터페이스 구현.
 * 기존 PaymentEventHub singleton을 래핑하여
 * payment-core 이벤트를 기존 이벤트 시스템으로 브릿지.
 */

import type { PaymentEventPublisher } from '@o4o/payment-core';
import type { PaymentEvent } from '@o4o/payment-core';
import { paymentEventHub } from '../PaymentEventHub.js';
import logger from '../../../utils/logger.js';

export class EventHubPaymentPublisher implements PaymentEventPublisher {
  async publish(event: PaymentEvent): Promise<void> {
    switch (event.eventType) {
      case 'payment.completed':
        paymentEventHub.emitCompleted({
          paymentId: event.paymentId,
          transactionId: event.transactionId,
          orderId: event.orderId,
          paymentKey: event.paymentKey,
          paidAmount: event.paidAmount,
          paymentMethod: event.paymentMethod,
          approvedAt: event.approvedAt,
          serviceKey: event.sourceService,
          card: event.card,
          receiptUrl: event.receiptUrl,
          metadata: event.metadata as Record<string, any>,
        });
        break;

      case 'payment.failed':
        paymentEventHub.emitFailed({
          paymentId: event.paymentId,
          transactionId: event.transactionId,
          orderId: event.orderId,
          errorCode: event.errorCode,
          errorMessage: event.errorMessage,
          serviceKey: event.sourceService,
          metadata: event.metadata as Record<string, any>,
        });
        break;

      default:
        // initiated, authorized, cancelled, refunded — 로그만 기록
        logger.info(`[EventHubPaymentPublisher] Event type '${event.eventType}' logged (no hub dispatch)`, {
          paymentId: event.paymentId,
          orderId: event.orderId,
        });
        break;
    }
  }
}
