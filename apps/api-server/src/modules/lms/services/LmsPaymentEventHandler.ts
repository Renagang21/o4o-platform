/**
 * LmsPaymentEventHandler
 *
 * WO-LMS-PAID-COURSE-V1
 *
 * LMS 유료 강의 결제 이벤트 핸들러
 *
 * 역할:
 * - payment.completed 이벤트 수신 (serviceKey === 'lms')
 * - 주문 상태 전이 (CREATED → PAID)
 * - 결제 완료 후 자동 Enrollment 생성
 * - 중복 처리 방지
 *
 * 패턴: KCosmeticsPaymentEventHandler 기반
 */

import { DataSource, Repository } from 'typeorm';
import {
  paymentEventHub,
} from '../../../services/payment/PaymentEventHub.js';
import type {
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '../../../services/payment/PaymentEventHub.js';
import {
  EcommerceOrder,
  OrderStatus,
  PaymentStatus,
} from '@o4o/ecommerce-core';
import { EnrollmentService } from './EnrollmentService.js';
import logger from '../../../utils/logger.js';

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
 * LmsPaymentEventHandler
 */
export class LmsPaymentEventHandler {
  private orderRepository: Repository<EcommerceOrder>;
  private processedPayments: Set<string> = new Set();
  private initialized = false;

  constructor(private dataSource: DataSource) {
    this.orderRepository = dataSource.getRepository(EcommerceOrder);
  }

  /**
   * 이벤트 핸들러 초기화 및 구독
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('[LmsPaymentEventHandler] Already initialized');
      return;
    }

    // payment.completed 이벤트 구독 (serviceKey: lms만)
    paymentEventHub.onPaymentCompleted(
      this.handlePaymentCompleted.bind(this),
      'lms'
    );

    // payment.failed 이벤트 구독 (serviceKey: lms만)
    paymentEventHub.onPaymentFailed(
      this.handlePaymentFailed.bind(this),
      'lms'
    );

    this.initialized = true;
    logger.info('[LmsPaymentEventHandler] Initialized and subscribed to payment events');
  }

  /**
   * payment.completed 이벤트 핸들러
   *
   * 처리 규칙:
   * 1. 이미 처리된 결제는 스킵
   * 2. 주문 상태를 'paid'로 변경
   * 3. metadata에서 courseId/userId 추출 → Enrollment 자동 생성
   */
  private async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    const logPrefix = '[LmsPaymentEventHandler] payment.completed';

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

    // 5. Enrollment 자동 생성 (LMS 고유 로직)
    const courseId = event.metadata?.courseId;
    const userId = event.metadata?.userId;

    if (courseId && userId) {
      try {
        const enrollmentService = EnrollmentService.getInstance();
        await enrollmentService.enrollCourse({
          courseId,
          userId,
          __fromPayment: true,
        });
        logger.info(`[LmsPaymentEventHandler] Enrollment created`, {
          courseId,
          userId,
          orderId: event.orderId,
        });
      } catch (enrollError) {
        // Enrollment 실패해도 결제는 성공 처리 (환불은 수동 대응 — v1)
        logger.error(`[LmsPaymentEventHandler] Enrollment creation failed`, {
          courseId,
          userId,
          orderId: event.orderId,
          error: enrollError instanceof Error ? enrollError.message : 'Unknown error',
        });
      }
    } else {
      logger.warn(`[LmsPaymentEventHandler] Missing courseId or userId in metadata`, {
        orderId: event.orderId,
        metadata: event.metadata,
      });
    }

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
    const logPrefix = '[LmsPaymentEventHandler] payment.failed';

    logger.info(`${logPrefix} Received`, {
      orderId: event.orderId,
      paymentId: event.paymentId,
      errorCode: event.errorCode,
      errorMessage: event.errorMessage,
    });

    try {
      const order = await this.orderRepository.findOne({
        where: { id: event.orderId },
      });

      if (!order) {
        logger.warn(`${logPrefix} Order not found`, { orderId: event.orderId });
        return;
      }

      if (order.status === OrderStatus.CREATED || order.status === OrderStatus.PENDING_PAYMENT) {
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
let handlerInstance: LmsPaymentEventHandler | null = null;

export function initializeLmsPaymentHandler(dataSource: DataSource): LmsPaymentEventHandler {
  if (!handlerInstance) {
    handlerInstance = new LmsPaymentEventHandler(dataSource);
    handlerInstance.initialize();
  }
  return handlerInstance;
}

export function getLmsPaymentHandler(): LmsPaymentEventHandler | null {
  return handlerInstance;
}
