/**
 * StoreB2bCheckoutPaymentEventHandler — 승인축 B2B · Event Offer 공통 결제 완료 핸들러
 *
 * WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §2-E-3
 *
 * `payment.completed(serviceKey='store-b2b')` 를 구독해
 *   checkout_order → paid 전이 → CheckoutFulfillmentBridgeService → neture_order
 * 까지 연결한다. 구조는 `NetureB2bCheckoutPaymentEventHandler`(회귀 기준 · 미접촉)와 동일하며,
 * 다른 것은 구독 serviceKey 와 허용 order source 집합뿐이다.
 *
 * 절대 기준:
 *   - payment-first. paid 전이는 결제 완료 event 로만 발생한다(라우트가 직접 조작하지 않는다).
 *   - cancelled/refunded 주문은 전이·bridge 대상이 아니다.
 *   - bridge 는 idempotent(`metadata.checkoutOrderId` dedup) — 중복 neture_order 0.
 *   - **재고를 추가로 차감하지 않는다.** Event Offer 수량은 checkout-confirm 단계에서
 *     `organization_product_listings` 를 `FOR UPDATE` 로 잠그고 이미 원자 확보했다(§2-I).
 */
import { DataSource, Repository } from 'typeorm';
import {
  paymentEventHub,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '../PaymentEventHub.js';
import {
  CheckoutOrder,
  CheckoutOrderStatus,
  CheckoutPaymentStatus,
} from '../../../entities/checkout/CheckoutOrder.entity.js';
import logger from '../../../utils/logger.js';
import { CheckoutFulfillmentBridgeService } from '../../neture/checkout-fulfillment-bridge.service.js';
import {
  STORE_B2B_PAYMENT_SERVICE_KEY,
  STORE_B2B_PAYABLE_ORDER_SOURCES,
} from './store-b2b-payment.constants.js';

export class StoreB2bCheckoutPaymentEventHandler {
  private orderRepository: Repository<CheckoutOrder>;
  private bridgeService: CheckoutFulfillmentBridgeService;
  private processedPayments: Set<string> = new Set();
  private initialized = false;

  constructor(private dataSource: DataSource) {
    this.orderRepository = dataSource.getRepository(CheckoutOrder);
    this.bridgeService = new CheckoutFulfillmentBridgeService(dataSource);
  }

  initialize(): void {
    if (this.initialized) {
      logger.warn('[StoreB2bCheckoutPaymentEventHandler] Already initialized');
      return;
    }
    paymentEventHub.onPaymentCompleted(
      this.handlePaymentCompleted.bind(this),
      STORE_B2B_PAYMENT_SERVICE_KEY,
    );
    paymentEventHub.onPaymentFailed(
      this.handlePaymentFailed.bind(this),
      STORE_B2B_PAYMENT_SERVICE_KEY,
    );
    this.initialized = true;
    logger.info(
      `[StoreB2bCheckoutPaymentEventHandler] Initialized (serviceKey=${STORE_B2B_PAYMENT_SERVICE_KEY})`,
    );
  }

  /** 이 축이 담당하는 checkout_order 인지 (metadata.source) */
  private isStoreB2bOrder(order: CheckoutOrder): boolean {
    const md = order.metadata && typeof order.metadata === 'object' ? (order.metadata as Record<string, unknown>) : {};
    const source = typeof md.source === 'string' ? md.source : '';
    return STORE_B2B_PAYABLE_ORDER_SOURCES.includes(source);
  }

  private async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    const logPrefix = '[StoreB2bCheckoutPaymentEventHandler] payment.completed';
    const eventKey = `${event.paymentId}:${event.orderId}`;
    if (this.processedPayments.has(eventKey)) {
      logger.info(`${logPrefix} Skipped (duplicate)`, { eventKey });
      return;
    }
    try {
      // event.orderId 는 (a) 단일 checkout_order id 이거나 (b) paymentGroupId 다.
      const single = await this.orderRepository.findOne({ where: { id: event.orderId } });
      if (single) {
        if (!this.isStoreB2bOrder(single)) {
          logger.warn(`${logPrefix} Not a store-b2b checkout order; skip`, { orderId: event.orderId });
          return;
        }
        await this.transitionAndBridge(single, event, logPrefix);
        this.processedPayments.add(eventKey);
        setTimeout(() => this.processedPayments.delete(eventKey), 60 * 60 * 1000);
        return;
      }

      const groupOrders = await this.orderRepository
        .createQueryBuilder('o')
        .where("o.metadata->>'paymentGroupId' = :pg", { pg: event.orderId })
        .getMany();
      const targets = groupOrders.filter((o) => this.isStoreB2bOrder(o));
      if (targets.length === 0) {
        logger.warn(`${logPrefix} No order/group found`, { orderId: event.orderId });
        return;
      }
      logger.info(`${logPrefix} group paid transition`, {
        paymentGroupId: event.orderId,
        orderCount: targets.length,
      });
      for (const o of targets) {
        await this.transitionAndBridge(o, event, logPrefix);
      }
      this.processedPayments.add(eventKey);
      setTimeout(() => this.processedPayments.delete(eventKey), 60 * 60 * 1000);
    } catch (error) {
      logger.error(`${logPrefix} Processing failed`, {
        orderId: event.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /** 단일 checkout_order paid 전이(payable 한정·idempotent) + fulfillment bridge(best-effort) */
  private async transitionAndBridge(
    order: CheckoutOrder,
    event: PaymentCompletedEvent,
    logPrefix: string,
  ): Promise<void> {
    if (
      order.status === CheckoutOrderStatus.CREATED ||
      order.status === CheckoutOrderStatus.PENDING_PAYMENT
    ) {
      order.status = CheckoutOrderStatus.PAID;
      order.paymentStatus = CheckoutPaymentStatus.PAID;
      order.paymentMethod = event.paymentMethod;
      order.paidAt = event.approvedAt;
      await this.orderRepository.save(order);
      logger.info(`${logPrefix} Order marked paid`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
    } else if (order.status !== CheckoutOrderStatus.PAID) {
      logger.warn(`${logPrefix} Order not in payable state`, { orderId: order.id, status: order.status });
      return;
    }

    try {
      const result = await this.bridgeService.bridgeCheckoutOrderToNetureFulfillment({
        checkoutOrderId: order.id,
      });
      if (result.bridged) {
        logger.info(`${logPrefix} bridged to neture fulfillment`, {
          orderId: order.id,
          netureOrderId: result.netureOrderId,
        });
      } else {
        logger.warn(`${logPrefix} bridge skipped`, { orderId: order.id, reason: result.skippedReason });
      }
    } catch (bridgeErr) {
      logger.error(`${logPrefix} bridge error (order remains paid, supplier hidden)`, {
        orderId: order.id,
        error: bridgeErr instanceof Error ? bridgeErr.message : 'Unknown error',
      });
    }
  }

  private async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const logPrefix = '[StoreB2bCheckoutPaymentEventHandler] payment.failed';
    try {
      const single = await this.orderRepository.findOne({ where: { id: event.orderId } });
      const targets =
        single && this.isStoreB2bOrder(single)
          ? [single]
          : (
              await this.orderRepository
                .createQueryBuilder('o')
                .where("o.metadata->>'paymentGroupId' = :pg", { pg: event.orderId })
                .getMany()
            ).filter((o) => this.isStoreB2bOrder(o));
      for (const order of targets) {
        if (
          order.status === CheckoutOrderStatus.CREATED ||
          order.status === CheckoutOrderStatus.PENDING_PAYMENT
        ) {
          order.paymentStatus = CheckoutPaymentStatus.FAILED;
          await this.orderRepository.save(order);
          logger.info(`${logPrefix} paymentStatus set to FAILED`, {
            orderId: order.id,
            errorCode: event.errorCode,
          });
        }
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

let handlerInstance: StoreB2bCheckoutPaymentEventHandler | null = null;

export function initializeStoreB2bCheckoutPaymentHandler(
  dataSource: DataSource,
): StoreB2bCheckoutPaymentEventHandler {
  if (!handlerInstance) {
    handlerInstance = new StoreB2bCheckoutPaymentEventHandler(dataSource);
    handlerInstance.initialize();
  }
  return handlerInstance;
}

export function getStoreB2bCheckoutPaymentHandler(): StoreB2bCheckoutPaymentEventHandler | null {
  return handlerInstance;
}
