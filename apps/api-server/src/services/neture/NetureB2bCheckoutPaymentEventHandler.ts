/**
 * NetureB2bCheckoutPaymentEventHandler
 *
 * WO-O4O-NETURE-B2B-PAYMENT-FLOW-V1 (P2b)
 * 상위: CHECK-O4O-NETURE-B2B-PAYMENT-FIRST-CANONICAL-FLOW-CORRECTION-V1
 *
 * Neture B2B checkout_order(payment-first) 결제 완료/실패 이벤트 핸들러.
 *
 * 배경: P2a(NetureB2BCartCheckoutService)가 B2B cart 를 checkout_orders(paymentStatus='pending',
 *   metadata.source='neture_b2b_checkout')로 생성한다. 이 주문이 결제되면 paid 로 전이되어야
 *   후속 P2c(fulfillment bridge)에서 공급자에게 노출/배송 가능해진다.
 *
 * 설계(후보 C): 전용 serviceKey='neture-b2b' 구독.
 *   - 결제는 neture-b2b-payment.controller 가 PaymentCoreService.prepare/confirm(sourceService='neture-b2b')
 *     로 진행 → payment.completed(serviceKey='neture-b2b') 발행.
 *   - legacy NeturePaymentEventHandler(serviceKey='neture', neture_orders 전용)와 **serviceKey 분리** →
 *     충돌 없음.
 *   - 추가 안전장치: metadata.source='neture_b2b_checkout' 인 checkout_order 만 전이(오발 방지).
 *
 * 범위: paymentStatus 전이만. collectionStatus 미사용. 공급자 노출/fulfillment bridge 없음(후속 P2c).
 *
 * 참조: services/kpa/KpaPaymentEventHandler.ts (동일 패턴)
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
import { CheckoutFulfillmentBridgeService } from './checkout-fulfillment-bridge.service.js';

/** Neture B2B checkout 결제 sourceService/serviceKey (legacy 'neture' 와 분리) */
const NETURE_B2B_SERVICE_KEY = 'neture-b2b';
/** P2a orchestrator 가 세팅하는 checkout_order metadata.source */
const NETURE_B2B_ORDER_SOURCE = 'neture_b2b_checkout';

export class NetureB2bCheckoutPaymentEventHandler {
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
      logger.warn('[NetureB2bCheckoutPaymentEventHandler] Already initialized');
      return;
    }
    paymentEventHub.onPaymentCompleted(
      this.handlePaymentCompleted.bind(this),
      NETURE_B2B_SERVICE_KEY,
    );
    paymentEventHub.onPaymentFailed(
      this.handlePaymentFailed.bind(this),
      NETURE_B2B_SERVICE_KEY,
    );
    this.initialized = true;
    logger.info(
      '[NetureB2bCheckoutPaymentEventHandler] Initialized and subscribed to payment events (serviceKey=neture-b2b)',
    );
  }

  /** checkout_order 가 Neture B2B 주문(metadata.source) 인지 */
  private isNetureB2bOrder(order: CheckoutOrder): boolean {
    const md = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
    return (md as Record<string, unknown>).source === NETURE_B2B_ORDER_SOURCE;
  }

  private async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    const logPrefix = '[NetureB2bCheckoutPaymentEventHandler] payment.completed';
    const eventKey = `${event.paymentId}:${event.orderId}`;
    if (this.processedPayments.has(eventKey)) {
      logger.info(`${logPrefix} Skipped (duplicate)`, { eventKey });
      return;
    }
    try {
      // event.orderId 는 (a) 단일 checkout_order id 이거나 (b) paymentGroupId 다.
      // (WO-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1)
      const single = await this.orderRepository.findOne({ where: { id: event.orderId } });
      if (single) {
        if (!this.isNetureB2bOrder(single)) {
          // serviceKey='neture-b2b' 인데 B2B 주문이 아니면 처리하지 않음(안전장치)
          logger.warn(`${logPrefix} Not a neture_b2b_checkout order; skip`, { orderId: event.orderId });
          return;
        }
        await this.transitionAndBridge(single, event, logPrefix);
        this.processedPayments.add(eventKey);
        setTimeout(() => this.processedPayments.delete(eventKey), 60 * 60 * 1000);
        return;
      }

      // group 결제: event.orderId = paymentGroupId → group orders 재조회(N건 전이·bridge)
      const groupOrders = await this.orderRepository
        .createQueryBuilder('o')
        .where("o.metadata->>'paymentGroupId' = :pg", { pg: event.orderId })
        .getMany();
      const b2bGroup = groupOrders.filter((o) => this.isNetureB2bOrder(o));
      if (b2bGroup.length === 0) {
        // checkout_order 도 아니고 group 도 아니면 graceful skip(예: legacy neture_order id)
        logger.warn(`${logPrefix} No order/group found`, { orderId: event.orderId });
        return;
      }
      logger.info(`${logPrefix} group paid transition`, {
        paymentGroupId: event.orderId,
        orderCount: b2bGroup.length,
      });
      for (const o of b2bGroup) {
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

  /**
   * 단일 checkout_order paid 전이(payable 한정·idempotent) + fulfillment bridge(best-effort).
   * 단일/그룹 경로 공용. cancelled/refunded 는 전이·bridge 금지.
   */
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
      // cancelled/refunded → 전이·bridge 금지
      logger.warn(`${logPrefix} Order not in payable state`, {
        orderId: order.id,
        status: order.status,
      });
      return;
    }
    // 이미 PAID 면 전이는 skip(idempotent)하되 bridge 는 재시도(bridge 자체 idempotent).

    // WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1 (P2c):
    // 결제 완료 후 공급자 fulfillment 로 bridge (best-effort — 실패해도 paid 유지, 공급자 미노출).
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
        logger.warn(`${logPrefix} bridge skipped`, {
          orderId: order.id,
          reason: result.skippedReason,
        });
      }
    } catch (bridgeErr) {
      logger.error(`${logPrefix} bridge error (order remains paid, supplier hidden)`, {
        orderId: order.id,
        error: bridgeErr instanceof Error ? bridgeErr.message : 'Unknown error',
      });
    }
  }

  private async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const logPrefix = '[NetureB2bCheckoutPaymentEventHandler] payment.failed';
    try {
      // 단일 order 또는 group(paymentGroupId) 모두 대상
      const single = await this.orderRepository.findOne({ where: { id: event.orderId } });
      const targets =
        single && this.isNetureB2bOrder(single)
          ? [single]
          : (
              await this.orderRepository
                .createQueryBuilder('o')
                .where("o.metadata->>'paymentGroupId' = :pg", { pg: event.orderId })
                .getMany()
            ).filter((o) => this.isNetureB2bOrder(o));
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

let handlerInstance: NetureB2bCheckoutPaymentEventHandler | null = null;

export function initializeNetureB2bCheckoutPaymentHandler(
  dataSource: DataSource,
): NetureB2bCheckoutPaymentEventHandler {
  if (!handlerInstance) {
    handlerInstance = new NetureB2bCheckoutPaymentEventHandler(dataSource);
    handlerInstance.initialize();
  }
  return handlerInstance;
}

export function getNetureB2bCheckoutPaymentHandler(): NetureB2bCheckoutPaymentEventHandler | null {
  return handlerInstance;
}
