/**
 * KpaPaymentEventHandler
 *
 * WO-O4O-KPA-PAYMENT-EVENT-HANDLER-FIX-V1
 *
 * KPA B2C 결제 이벤트 핸들러 (누락 복구).
 *
 * 배경: KPA 결제 흐름은 PaymentCoreService.confirm() → EventHubPaymentPublisher 로
 *   `payment.completed`(serviceKey='kpa') 를 발행하나, 이를 구독하는 KPA 핸들러가
 *   등록되지 않아 checkout_orders 가 paid 로 전이되지 않았다(paymentStatus=pending 잔존).
 *   GlycopharmPaymentEventHandler / KCosmeticsPaymentEventHandler 와 동일 패턴으로 복구한다.
 *
 * 역할:
 * - payment.completed (serviceKey='kpa') 수신 → CheckoutOrder.status/paymentStatus=paid, paidAt 반영
 * - payment.failed (serviceKey='kpa') 수신 → paymentStatus=failed (created/pending_payment 한정)
 * - 중복 처리 방지
 *
 * 범위: 결제 성공의 주문 상태 반영만. sales_limit 재검증(PAID 전이 직전)은 환불 함의가 있어 V1 제외
 *   (KPA 는 주문 생성 시점 sales_limit FOR UPDATE 검증 유지). → 후속 hardening WO.
 *
 * 참조: services/glycopharm/GlycopharmPaymentEventHandler.ts (동일 패턴)
 */

import { DataSource, Repository } from 'typeorm';
import {
  paymentEventHub,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '../payment/PaymentEventHub.js';
import {
  CheckoutOrder,
  CheckoutOrderStatus,
  CheckoutPaymentStatus,
} from '../../entities/checkout/CheckoutOrder.entity.js';
import logger from '../../utils/logger.js';

/** KPA 결제 sourceService (kpa-payment.controller prepare 의 sourceService 와 일치) */
const KPA_PAYMENT_SERVICE_KEY = 'kpa';

export class KpaPaymentEventHandler {
  private orderRepository: Repository<CheckoutOrder>;
  private processedPayments: Set<string> = new Set();
  private initialized = false;

  constructor(private dataSource: DataSource) {
    this.orderRepository = dataSource.getRepository(CheckoutOrder);
  }

  initialize(): void {
    if (this.initialized) {
      logger.warn('[KpaPaymentEventHandler] Already initialized');
      return;
    }
    paymentEventHub.onPaymentCompleted(
      this.handlePaymentCompleted.bind(this),
      KPA_PAYMENT_SERVICE_KEY,
    );
    paymentEventHub.onPaymentFailed(
      this.handlePaymentFailed.bind(this),
      KPA_PAYMENT_SERVICE_KEY,
    );
    this.initialized = true;
    logger.info('[KpaPaymentEventHandler] Initialized and subscribed to payment events (serviceKey=kpa)');
  }

  private async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    const logPrefix = '[KpaPaymentEventHandler] payment.completed';
    const eventKey = `${event.paymentId}:${event.orderId}`;
    if (this.processedPayments.has(eventKey)) {
      logger.info(`${logPrefix} Skipped (duplicate)`, { eventKey });
      return;
    }
    try {
      const order = await this.orderRepository.findOne({ where: { id: event.orderId } });
      if (!order) {
        logger.warn(`${logPrefix} Order not found`, { orderId: event.orderId });
        return;
      }
      if (order.status === CheckoutOrderStatus.PAID) {
        // 이미 paid — idempotent skip
        this.processedPayments.add(eventKey);
        return;
      }
      if (
        order.status !== CheckoutOrderStatus.CREATED &&
        order.status !== CheckoutOrderStatus.PENDING_PAYMENT
      ) {
        logger.warn(`${logPrefix} Order not in payable state`, {
          orderId: event.orderId,
          status: order.status,
        });
        return;
      }

      order.status = CheckoutOrderStatus.PAID;
      order.paymentStatus = CheckoutPaymentStatus.PAID;
      order.paymentMethod = event.paymentMethod;
      order.paidAt = event.approvedAt;
      await this.orderRepository.save(order);

      this.processedPayments.add(eventKey);
      setTimeout(() => this.processedPayments.delete(eventKey), 60 * 60 * 1000);

      logger.info(`${logPrefix} Order marked paid`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
    } catch (error) {
      logger.error(`${logPrefix} Processing failed`, {
        orderId: event.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const logPrefix = '[KpaPaymentEventHandler] payment.failed';
    try {
      const order = await this.orderRepository.findOne({ where: { id: event.orderId } });
      if (!order) {
        logger.warn(`${logPrefix} Order not found`, { orderId: event.orderId });
        return;
      }
      if (
        order.status === CheckoutOrderStatus.CREATED ||
        order.status === CheckoutOrderStatus.PENDING_PAYMENT
      ) {
        order.paymentStatus = CheckoutPaymentStatus.FAILED;
        await this.orderRepository.save(order);
        logger.info(`${logPrefix} paymentStatus set to FAILED`, {
          orderId: event.orderId,
          errorCode: event.errorCode,
        });
      }
    } catch (error) {
      logger.error(`${logPrefix} Processing failed`, {
        orderId: event.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  getStats(): { initialized: boolean; processedPaymentsCount: number } {
    return { initialized: this.initialized, processedPaymentsCount: this.processedPayments.size };
  }
}

let handlerInstance: KpaPaymentEventHandler | null = null;

export function initializeKpaPaymentHandler(dataSource: DataSource): KpaPaymentEventHandler {
  if (!handlerInstance) {
    handlerInstance = new KpaPaymentEventHandler(dataSource);
    handlerInstance.initialize();
  }
  return handlerInstance;
}

export function getKpaPaymentHandler(): KpaPaymentEventHandler | null {
  return handlerInstance;
}
