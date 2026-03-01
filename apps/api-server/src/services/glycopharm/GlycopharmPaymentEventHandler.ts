/**
 * GlycopharmPaymentEventHandler
 *
 * WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
 *
 * GlycoPharm 서비스의 결제 이벤트 핸들러
 *
 * 역할:
 * - payment.completed 이벤트 수신
 * - serviceKey === 'glycopharm' 인 경우만 처리
 * - 주문 상태 전이 수행
 * - 중복 처리 방지
 *
 * 참조: KCosmeticsPaymentEventHandler.ts (동일 패턴)
 */

import { DataSource, Repository } from 'typeorm';
import {
  paymentEventHub,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '../payment/PaymentEventHub.js';
import {
  EcommerceOrder,
  EcommerceOrderItem,
  OrderStatus,
  PaymentStatus,
} from '@o4o/ecommerce-core';
import logger from '../../utils/logger.js';

interface ProcessingResult {
  success: boolean;
  orderId: string;
  action: 'updated' | 'skipped' | 'failed';
  reason?: string;
}

export class GlycopharmPaymentEventHandler {
  private orderRepository: Repository<EcommerceOrder>;
  private processedPayments: Set<string> = new Set();
  private initialized: boolean = false;

  constructor(private dataSource: DataSource) {
    this.orderRepository = dataSource.getRepository(EcommerceOrder);
  }

  initialize(): void {
    if (this.initialized) {
      logger.warn('[GlycopharmPaymentEventHandler] Already initialized');
      return;
    }

    paymentEventHub.onPaymentCompleted(
      this.handlePaymentCompleted.bind(this),
      'glycopharm'
    );

    paymentEventHub.onPaymentFailed(
      this.handlePaymentFailed.bind(this),
      'glycopharm'
    );

    this.initialized = true;
    logger.info('[GlycopharmPaymentEventHandler] Initialized and subscribed to payment events');
  }

  private async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    const logPrefix = `[GlycopharmPaymentEventHandler] payment.completed`;

    logger.info(`${logPrefix} Received`, {
      orderId: event.orderId,
      paymentId: event.paymentId,
      paidAmount: event.paidAmount,
    });

    const eventKey = `${event.paymentId}:${event.orderId}`;
    if (this.processedPayments.has(eventKey)) {
      logger.info(`${logPrefix} Skipped (duplicate)`, { eventKey });
      return;
    }

    try {
      const result = await this.processPaymentCompleted(event);

      if (result.success) {
        this.processedPayments.add(eventKey);

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

  private async processPaymentCompleted(
    event: PaymentCompletedEvent
  ): Promise<ProcessingResult> {
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

    if (order.status === OrderStatus.PAID || order.status === OrderStatus.CONFIRMED) {
      return {
        success: true,
        orderId: event.orderId,
        action: 'skipped',
        reason: `Order already in ${order.status} status`,
      };
    }

    if (order.status !== OrderStatus.CREATED && order.status !== OrderStatus.PENDING_PAYMENT) {
      return {
        success: false,
        orderId: event.orderId,
        action: 'failed',
        reason: `Order not in payable state (current: ${order.status})`,
      };
    }

    // ================================================================
    // WO-O4O-SALES-LIMIT-HARDENING-V1 Phase 2: PAID 전이 전 sales_limit 재검증
    // 결제 지연 동안 한도가 초과되었으면 CANCELLED 처리
    // ================================================================
    const limitExceeded = await this.checkSalesLimitBeforePaid(order);
    if (limitExceeded) {
      order.status = OrderStatus.CANCELLED;
      order.paymentStatus = PaymentStatus.FAILED;
      await this.orderRepository.save(order);

      logger.warn('[GlycopharmPaymentEventHandler] Order cancelled: sales_limit exceeded at confirm', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        limitExceeded,
      });

      return {
        success: true,
        orderId: event.orderId,
        action: 'updated',
        reason: `Order cancelled: sales_limit exceeded (${limitExceeded.productId})`,
      };
    }

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
   * sales_limit 재검증 — PAID 전이 직전 호출
   *
   * 주문에 포함된 상품들의 현재 PAID 판매량을 확인하여
   * 한도 초과 시 초과 정보를 반환한다.
   * 한도 미초과 또는 매핑 없음 → null 반환.
   */
  private async checkSalesLimitBeforePaid(
    order: EcommerceOrder,
  ): Promise<{ productId: string; salesLimit: number; currentSold: number; quantity: number } | null> {
    const metadata = order.metadata as { channelId?: string; pharmacyId?: string } | null;
    if (!metadata?.channelId || !metadata?.pharmacyId) {
      return null; // 채널 정보 없으면 검증 스킵
    }

    // 주문 아이템 조회
    const orderItemRepo = this.dataSource.getRepository(EcommerceOrderItem);
    const items = await orderItemRepo.find({ where: { orderId: order.id } });
    if (items.length === 0) return null;

    // 해당 채널의 sales_limit 매핑 조회
    const channelMappings: Array<{
      offer_id: string;
      sales_limit: number | null;
    }> = await this.dataSource.query(
      `SELECT opl.offer_id::text AS offer_id, opc.sales_limit
       FROM organization_product_channels opc
       JOIN organization_product_listings opl ON opl.id = opc.product_listing_id
       WHERE opc.channel_id = $1
         AND opl.organization_id = $2
         AND opl.service_key = 'kpa'
         AND opc.is_active = true
         AND opc.sales_limit IS NOT NULL`,
      [metadata.channelId, metadata.pharmacyId]
    );

    if (channelMappings.length === 0) return null;

    const limitMap = new Map(channelMappings.map((m) => [m.offer_id, m.sales_limit!]));

    for (const item of items) {
      if (!item.productId) continue;
      const salesLimit = limitMap.get(item.productId);
      if (salesLimit === undefined) continue;

      // 현재 PAID 판매량 조회
      const soldResult: Array<{ sold: number }> = await this.dataSource.query(
        `SELECT COALESCE(SUM(oi.quantity), 0)::int AS sold
         FROM ecommerce_order_items oi
         JOIN ecommerce_orders o ON o.id = oi."orderId"
         WHERE oi."productId" = $1
           AND o."sellerId" = $2
           AND o.status = 'PAID'`,
        [item.productId, order.sellerId]
      );

      const currentSold = soldResult[0]?.sold || 0;
      if (currentSold + item.quantity > salesLimit) {
        return {
          productId: item.productId,
          salesLimit,
          currentSold,
          quantity: item.quantity,
        };
      }
    }

    return null;
  }

  private async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const logPrefix = `[GlycopharmPaymentEventHandler] payment.failed`;

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

let handlerInstance: GlycopharmPaymentEventHandler | null = null;

export function initializeGlycopharmPaymentHandler(dataSource: DataSource): GlycopharmPaymentEventHandler {
  if (!handlerInstance) {
    handlerInstance = new GlycopharmPaymentEventHandler(dataSource);
    handlerInstance.initialize();
  }
  return handlerInstance;
}

export function getGlycopharmPaymentHandler(): GlycopharmPaymentEventHandler | null {
  return handlerInstance;
}
