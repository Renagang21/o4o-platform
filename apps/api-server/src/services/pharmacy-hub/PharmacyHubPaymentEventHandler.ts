/**
 * PharmacyHubPaymentEventHandler — Pharmacy-Hub 결제 완료 → 주문 paid 전이 → 공급자 fulfillment
 *
 * WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1
 *
 * 흐름:
 *   PharmacyHubPaymentController.confirm()
 *     → PaymentCoreService.confirm(sourceService='pharmacy-hub', orderId=paymentGroupId)
 *     → payment.completed(serviceKey='pharmacy-hub')
 *     → (여기) 그룹의 checkout_orders 전부 paid 전이
 *     → CheckoutFulfillmentBridgeService 로 neture_orders 생성 → 공급자에게 노출
 *
 * 계약:
 *   · **결제 완료 이벤트만이** paid 전이의 유일한 주체다. 주문 생성·조회 경로는 상태를 바꾸지 않는다.
 *   · 전이는 payable(created/pending_payment) 에서만 일어난다. cancelled/refunded 는 건드리지 않는다.
 *   · bridge 는 best-effort — 실패해도 결제는 유효(paid)하고 공급자에게만 보이지 않는다.
 *     이 경우 운영자 복구 경로(admin recovery)가 멱등하게 다시 시도한다.
 *   · bridge 자체가 `metadata.checkoutOrderId` 로 멱등하므로 이벤트 중복 수신도 안전하다.
 *
 * 참조: services/neture/NetureB2bCheckoutPaymentEventHandler.ts (동일 패턴 · serviceKey 만 분리)
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
import { CheckoutFulfillmentBridgeService } from '../neture/checkout-fulfillment-bridge.service.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import {
  PHARMACY_HUB_ORDER_SOURCE,
  PHARMACY_HUB_PAYMENT_SERVICE_KEY,
} from './pharmacy-hub-payment.constants.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

export class PharmacyHubPaymentEventHandler {
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
      logger.warn('[PharmacyHubPaymentEventHandler] Already initialized');
      return;
    }
    paymentEventHub.onPaymentCompleted(
      this.handlePaymentCompleted.bind(this),
      PHARMACY_HUB_PAYMENT_SERVICE_KEY,
    );
    paymentEventHub.onPaymentFailed(
      this.handlePaymentFailed.bind(this),
      PHARMACY_HUB_PAYMENT_SERVICE_KEY,
    );
    this.initialized = true;
    logger.info(
      '[PharmacyHubPaymentEventHandler] Initialized (serviceKey=pharmacy-hub)',
    );
  }

  /**
   * 이 주문이 Pharmacy-Hub 장바구니 주문인지 — serviceKey · source 를 **함께** 확인한다.
   * serviceKey 구독만으로는 오발 가능성이 남으므로 원장 값으로 한 번 더 막는다.
   */
  private isPharmacyHubOrder(order: CheckoutOrder): boolean {
    const md = (order.metadata && typeof order.metadata === 'object' ? order.metadata : {}) as Record<
      string,
      unknown
    >;
    return md.serviceKey === SERVICE_KEY && md.source === PHARMACY_HUB_ORDER_SOURCE;
  }

  /** event.orderId 는 paymentGroupId 다 (그룹 1회 결제). */
  private async loadGroup(paymentGroupId: string): Promise<CheckoutOrder[]> {
    const orders = await this.orderRepository
      .createQueryBuilder('o')
      .where("o.metadata->>'paymentGroupId' = :pg", { pg: paymentGroupId })
      .getMany();
    return orders.filter((o) => this.isPharmacyHubOrder(o));
  }

  private async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    const logPrefix = '[PharmacyHubPaymentEventHandler] payment.completed';
    const eventKey = `${event.paymentId}:${event.orderId}`;
    if (this.processedPayments.has(eventKey)) {
      logger.info(`${logPrefix} Skipped (duplicate)`, { eventKey });
      return;
    }

    try {
      const group = await this.loadGroup(event.orderId);
      if (group.length === 0) {
        // 다른 서비스의 결제이거나 이미 삭제된 주문 — graceful skip
        logger.warn(`${logPrefix} No pharmacy-hub order found`, { orderId: event.orderId });
        return;
      }

      logger.info(`${logPrefix} group paid transition`, {
        paymentGroupId: event.orderId,
        orderCount: group.length,
      });

      for (const order of group) {
        await this.transitionAndBridge(order, event, logPrefix);
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

  /** 단일 checkout_order paid 전이(payable 한정·멱등) + fulfillment bridge(best-effort). */
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
    // 이미 PAID 면 전이는 skip(멱등)하되 bridge 는 재시도한다(bridge 자체가 멱등).

    try {
      const result = await this.bridgeService.bridgeCheckoutOrderToNetureFulfillment({
        checkoutOrderId: order.id,
      });
      if (result.bridged) {
        logger.info(`${logPrefix} bridged to supplier fulfillment`, {
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
      // 결제는 유효하다. 공급자 노출만 실패 → 운영자 복구 경로 대상.
      logger.error(`${logPrefix} bridge error (order remains paid, supplier hidden)`, {
        orderId: order.id,
        error: bridgeErr instanceof Error ? bridgeErr.message : 'Unknown error',
      });
    }
  }

  private async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const logPrefix = '[PharmacyHubPaymentEventHandler] payment.failed';
    try {
      const group = await this.loadGroup(event.orderId);
      for (const order of group) {
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

let handlerInstance: PharmacyHubPaymentEventHandler | null = null;

export function initializePharmacyHubPaymentHandler(
  dataSource: DataSource,
): PharmacyHubPaymentEventHandler {
  if (!handlerInstance) {
    handlerInstance = new PharmacyHubPaymentEventHandler(dataSource);
    handlerInstance.initialize();
  }
  return handlerInstance;
}

export function getPharmacyHubPaymentHandler(): PharmacyHubPaymentEventHandler | null {
  return handlerInstance;
}
