import type { Repository } from 'typeorm';
import { CheckoutOrder, CheckoutOrderStatus, CheckoutPaymentStatus } from '../../entities/checkout/CheckoutOrder.entity.js';
import type { PaymentCompletedEvent, PaymentFailedEvent } from './PaymentEventHub.js';
import type { CheckoutFulfillmentBridgeService } from '../neture/checkout-fulfillment-bridge.service.js';
import logger from '../../utils/logger.js';

// 서비스별 이벤트 구독·원장 선택은 각 consumer가 유지한다. 이 함수는 선택된 주문의 후속 처리만 공유한다.
export async function transitionCheckoutPaymentAndBridge(
  order: CheckoutOrder,
  event: PaymentCompletedEvent,
  repository: Repository<CheckoutOrder>,
  bridge: CheckoutFulfillmentBridgeService,
  logPrefix: string,
): Promise<void> {
  if (order.status === CheckoutOrderStatus.CREATED || order.status === CheckoutOrderStatus.PENDING_PAYMENT) {
    order.status = CheckoutOrderStatus.PAID;
    order.paymentStatus = CheckoutPaymentStatus.PAID;
    order.paymentMethod = event.paymentMethod;
    order.paidAt = event.approvedAt;
    await repository.save(order);
    logger.info(`${logPrefix} Order marked paid`, { orderId: order.id, orderNumber: order.orderNumber });
  } else if (order.status !== CheckoutOrderStatus.PAID) {
    logger.warn(`${logPrefix} Order not in payable state`, { orderId: order.id, status: order.status });
    return;
  }

  // 이미 paid면 원장을 다시 쓰지 않고 bridge만 멱등하게 재시도한다. bridge 실패는 유효한 결제를 되돌리지 않는다.
  try {
    const result = await bridge.bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId: order.id });
    if (result.bridged) {
      logger.info(`${logPrefix} bridged to supplier fulfillment`, { orderId: order.id, netureOrderId: result.netureOrderId });
    } else {
      logger.warn(`${logPrefix} bridge skipped`, { orderId: order.id, reason: result.skippedReason });
    }
  } catch (error) {
    logger.error(`${logPrefix} bridge error (order remains paid, supplier hidden)`, {
      orderId: order.id, error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function markCheckoutPaymentFailed(
  order: CheckoutOrder,
  event: PaymentFailedEvent,
  repository: Repository<CheckoutOrder>,
  logPrefix: string,
): Promise<void> {
  if (order.status !== CheckoutOrderStatus.CREATED && order.status !== CheckoutOrderStatus.PENDING_PAYMENT) return;
  order.paymentStatus = CheckoutPaymentStatus.FAILED;
  await repository.save(order);
  logger.info(`${logPrefix} paymentStatus set to FAILED`, { orderId: order.id, errorCode: event.errorCode });
}
