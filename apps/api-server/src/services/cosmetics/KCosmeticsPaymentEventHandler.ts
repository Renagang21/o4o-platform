/**
 * KCosmeticsPaymentEventHandler
 *
 * WO-O4O-PAYMENT-EXTENSION-ROLL-OUT-V0.1
 *
 * K-Cosmetics 서비스의 결제 이벤트 핸들러
 *
 * 역할:
 * - payment.completed 이벤트 수신
 * - serviceKey === 'cosmetics' 인 경우만 처리
 * - 주문 상태 전이 수행
 * - 중복 처리 방지
 *
 * 설계 원칙:
 * - 결제 Core의 결과만 받아서 자기 일만 한다
 * - 결제 금액의 해석, 분배, 계산은 수행하지 않음
 * - Neture에서 검증된 패턴 그대로 복제
 */

import { DataSource, Repository } from 'typeorm';
import {
  paymentEventHub,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentEventType,
} from '../payment/PaymentEventHub.js';
import {
  EcommerceOrder,
  OrderStatus,
  PaymentStatus,
} from '@o4o/ecommerce-core';
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
 * KCosmeticsPaymentEventHandler
 *
 * K-Cosmetics 서비스의 결제 이벤트 핸들러
 */
export class KCosmeticsPaymentEventHandler {
  private orderRepository: Repository<EcommerceOrder>;
  private processedPayments: Set<string> = new Set(); // 중복 처리 방지
  private initialized: boolean = false;

  constructor(private dataSource: DataSource) {
    this.orderRepository = dataSource.getRepository(EcommerceOrder);
  }

  /**
   * 이벤트 핸들러 초기화 및 구독
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('[KCosmeticsPaymentEventHandler] Already initialized');
      return;
    }

    // payment.completed 이벤트 구독 (serviceKey: cosmetics만)
    paymentEventHub.onPaymentCompleted(
      this.handlePaymentCompleted.bind(this),
      'cosmetics'
    );

    // payment.failed 이벤트 구독 (serviceKey: cosmetics만)
    paymentEventHub.onPaymentFailed(
      this.handlePaymentFailed.bind(this),
      'cosmetics'
    );

    this.initialized = true;
    logger.info('[KCosmeticsPaymentEventHandler] Initialized and subscribed to payment events');
  }

  /**
   * payment.completed 이벤트 핸들러
   *
   * 처리 규칙:
   * 1. serviceKey === 'cosmetics' 인 경우만 처리
   * 2. 이미 처리된 결제는 스킵
   * 3. 주문 상태를 'paid'로 변경, 결제 상태도 'paid'로 변경
   */
  private async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    const logPrefix = `[KCosmeticsPaymentEventHandler] payment.completed`;

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
    if (order.status === OrderStatus.PAID || order.status === OrderStatus.CONFIRMED) {
      return {
        success: true,
        orderId: event.orderId,
        action: 'skipped',
        reason: `Order already in ${order.status} status`,
      };
    }

    // 3. 결제 가능한 상태인지 확인
    if (order.status !== OrderStatus.CREATED && order.status !== OrderStatus.PENDING_PAYMENT) {
      return {
        success: false,
        orderId: event.orderId,
        action: 'failed',
        reason: `Order not in payable state (current: ${order.status})`,
      };
    }

    // 4. 주문 상태 업데이트
    order.status = OrderStatus.PAID;
    order.paymentStatus = PaymentStatus.PAID;
    order.paymentMethod = event.paymentMethod;
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
    const logPrefix = `[KCosmeticsPaymentEventHandler] payment.failed`;

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

      // 주문 상태가 'created' 또는 'pending_payment'인 경우 결제 상태만 실패로 변경
      if (order.status === OrderStatus.CREATED || order.status === OrderStatus.PENDING_PAYMENT) {
        // 결제 실패 시 주문은 그대로 유지 (사용자가 다시 결제 시도 가능)
        // paymentStatus만 FAILED로 변경
        order.paymentStatus = PaymentStatus.FAILED;
        await this.orderRepository.save(order);

        logger.info(`${logPrefix} Payment failed for order (paymentStatus set to FAILED)`, {
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
let handlerInstance: KCosmeticsPaymentEventHandler | null = null;

export function initializeKCosmeticsPaymentHandler(dataSource: DataSource): KCosmeticsPaymentEventHandler {
  if (!handlerInstance) {
    handlerInstance = new KCosmeticsPaymentEventHandler(dataSource);
    handlerInstance.initialize();
  }
  return handlerInstance;
}

export function getKCosmeticsPaymentHandler(): KCosmeticsPaymentEventHandler | null {
  return handlerInstance;
}
