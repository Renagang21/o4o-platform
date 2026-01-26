/**
 * NeturePaymentEventHandler
 *
 * WO-O4O-PAYMENT-NETURE-INTEGRATION-V0.1
 *
 * Neture 서비스의 결제 이벤트 핸들러
 *
 * 역할:
 * - payment.completed 이벤트 수신
 * - serviceKey === 'neture' 인 경우만 처리
 * - 주문 상태 전이 수행
 * - 중복 처리 방지
 *
 * 설계 원칙:
 * - 결제 Core의 결과만 받아서 자기 일만 한다
 * - 결제 금액의 해석, 분배, 계산은 수행하지 않음
 */

import { DataSource, Repository } from 'typeorm';
import {
  paymentEventHub,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentEventType,
} from '../payment/PaymentEventHub.js';
import { NetureOrder, NetureOrderStatus } from '../../routes/neture/entities/neture-order.entity.js';
import logger from '../../utils/logger.js';

/**
 * 처리 결과 타입
 */
interface ProcessingResult {
  success: boolean;
  orderId: string;
  action: 'updated' | 'skipped' | 'failed';
  reason?: string;
}

/**
 * NeturePaymentEventHandler
 *
 * Neture 서비스의 결제 이벤트 핸들러
 */
export class NeturePaymentEventHandler {
  private orderRepository: Repository<NetureOrder>;
  private processedPayments: Set<string> = new Set(); // 중복 처리 방지
  private initialized: boolean = false;

  constructor(private dataSource: DataSource) {
    this.orderRepository = dataSource.getRepository(NetureOrder);
  }

  /**
   * 이벤트 핸들러 초기화 및 구독
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('[NeturePaymentEventHandler] Already initialized');
      return;
    }

    // payment.completed 이벤트 구독 (serviceKey: neture만)
    paymentEventHub.onPaymentCompleted(
      this.handlePaymentCompleted.bind(this),
      'neture'
    );

    // payment.failed 이벤트 구독 (serviceKey: neture만)
    paymentEventHub.onPaymentFailed(
      this.handlePaymentFailed.bind(this),
      'neture'
    );

    this.initialized = true;
    logger.info('[NeturePaymentEventHandler] Initialized and subscribed to payment events');
  }

  /**
   * payment.completed 이벤트 핸들러
   *
   * 처리 규칙:
   * 1. serviceKey === 'neture' 인 경우만 처리
   * 2. 이미 처리된 결제는 스킵
   * 3. 주문 상태를 'paid'로 변경
   */
  private async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    const logPrefix = `[NeturePaymentEventHandler] payment.completed`;

    logger.info(`${logPrefix} Received`, {
      orderId: event.orderId,
      paymentId: event.paymentId,
      paidAmount: event.paidAmount,
    });

    // 중복 처리 방지
    const eventKey = `${event.paymentId}:${event.orderId}`;
    if (this.processedPayments.has(eventKey)) {
      logger.info(`${logPrefix} Skipped (duplicate)`, { eventKey });
      return;
    }

    try {
      const result = await this.processPaymentCompleted(event);

      if (result.success) {
        this.processedPayments.add(eventKey);

        // 메모리 관리: 1시간 후 제거
        setTimeout(() => {
          this.processedPayments.delete(eventKey);
        }, 60 * 60 * 1000);
      }

      logger.info(`${logPrefix} Processed`, {
        orderId: result.orderId,
        action: result.action,
        reason: result.reason,
      });
    } catch (error) {
      logger.error(`${logPrefix} Processing failed`, {
        orderId: event.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 결제 완료 처리 로직
   */
  private async processPaymentCompleted(
    event: PaymentCompletedEvent
  ): Promise<ProcessingResult> {
    // 1. 주문 조회
    const order = await this.orderRepository.findOne({
      where: { id: event.orderId },
    });

    if (!order) {
      return {
        success: false,
        orderId: event.orderId,
        action: 'failed',
        reason: 'Order not found',
      };
    }

    // 2. 이미 결제된 주문인지 확인
    if (order.status === NetureOrderStatus.PAID || order.status === NetureOrderStatus.PREPARING) {
      return {
        success: true,
        orderId: event.orderId,
        action: 'skipped',
        reason: `Order already in ${order.status} status`,
      };
    }

    // 3. 결제 가능한 상태인지 확인
    if (order.status !== NetureOrderStatus.CREATED) {
      return {
        success: false,
        orderId: event.orderId,
        action: 'failed',
        reason: `Order not in payable state (current: ${order.status})`,
      };
    }

    // 4. 주문 상태 업데이트
    order.status = NetureOrderStatus.PAID;
    order.paymentKey = event.paymentKey;
    order.paidAt = event.approvedAt;

    await this.orderRepository.save(order);

    return {
      success: true,
      orderId: event.orderId,
      action: 'updated',
    };
  }

  /**
   * payment.failed 이벤트 핸들러
   */
  private async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const logPrefix = `[NeturePaymentEventHandler] payment.failed`;

    logger.info(`${logPrefix} Received`, {
      orderId: event.orderId,
      paymentId: event.paymentId,
      errorCode: event.errorCode,
      errorMessage: event.errorMessage,
    });

    try {
      // 주문 조회
      const order = await this.orderRepository.findOne({
        where: { id: event.orderId },
      });

      if (!order) {
        logger.warn(`${logPrefix} Order not found`, { orderId: event.orderId });
        return;
      }

      // 주문 상태가 'created'인 경우에만 로깅
      // 참고: NetureOrderStatus에 payment_failed가 없으므로 상태 변경 없이 로깅만 수행
      if (order.status === NetureOrderStatus.CREATED) {
        // 결제 실패 시 주문은 그대로 'created' 상태 유지
        // 사용자가 다시 결제를 시도할 수 있도록 함
        logger.info(`${logPrefix} Payment failed for order (remains in CREATED status)`, {
          orderId: event.orderId,
          currentStatus: order.status,
          errorCode: event.errorCode,
          errorMessage: event.errorMessage,
        });
      }
    } catch (error) {
      logger.error(`${logPrefix} Processing failed`, {
        orderId: event.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 통계 조회
   */
  getStats(): {
    initialized: boolean;
    processedPaymentsCount: number;
  } {
    return {
      initialized: this.initialized,
      processedPaymentsCount: this.processedPayments.size,
    };
  }
}

// Factory function for initialization
let handlerInstance: NeturePaymentEventHandler | null = null;

export function initializeNeturePaymentHandler(dataSource: DataSource): NeturePaymentEventHandler {
  if (!handlerInstance) {
    handlerInstance = new NeturePaymentEventHandler(dataSource);
    handlerInstance.initialize();
  }
  return handlerInstance;
}

export function getNeturePaymentHandler(): NeturePaymentEventHandler | null {
  return handlerInstance;
}
