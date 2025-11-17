/**
 * TossPaymentService
 * Phase PG-1: Simple Toss Payments Integration for Orders
 *
 * This is a simplified payment service that works directly with the Order entity
 * For advanced payment features (settlements, webhooks, etc.), use PaymentService
 */

import AppDataSource from '../database/data-source.js';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../entities/Order.js';
import { tossConfig, getTossAuthHeader } from '../config/payment.config.js';
import logger from '../utils/logger.js';

/**
 * Toss Payments confirm request
 */
export interface TossConfirmRequest {
  paymentKey: string;
  orderId: string; // orderNumber from Order entity
  amount: number;
}

/**
 * Toss Payments API response (simplified)
 */
interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  method: string;
  totalAmount: number;
  approvedAt: string;
  status: string;
  // Add more fields as needed
}

export class TossPaymentService {
  private orderRepository = AppDataSource.getRepository(Order);

  /**
   * Confirm Toss Payments transaction
   * Called from frontend success callback after customer completes payment
   */
  async confirmPayment(request: TossConfirmRequest): Promise<Order> {
    // 1. Find order by orderNumber
    const order = await this.orderRepository.findOne({
      where: { orderNumber: request.orderId }
    });

    if (!order) {
      throw new Error(`Order not found: ${request.orderId}`);
    }

    // 2. Validate amount
    const orderTotal = order.calculateTotal();
    if (Math.abs(request.amount - orderTotal) > 0.01) {
      throw new Error(
        `Amount mismatch. Order: ${orderTotal}, Request: ${request.amount}`
      );
    }

    // 3. Check if already paid
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      logger.warn(`⚠️  Order ${request.orderId} already paid, returning existing order`);
      return order;
    }

    // 4. Call Toss API to confirm payment
    try {
      const tossResponse = await this.callTossConfirmAPI(request);

      // 5. Update order with payment details
      order.paymentKey = tossResponse.paymentKey;
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.paymentProvider = 'tosspayments';
      order.paidAt = new Date(tossResponse.approvedAt);

      // Map payment method
      order.paymentMethod = this.mapTossMethod(tossResponse.method);

      // Update order status
      if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.CONFIRMED;
      }

      // Save to database
      await this.orderRepository.save(order);

      logger.info(`✅ Payment confirmed for order ${request.orderId}`, {
        paymentKey: tossResponse.paymentKey,
        method: tossResponse.method,
        amount: tossResponse.totalAmount
      });

      return order;
    } catch (error: any) {
      // Handle failure
      logger.error(`❌ Payment confirmation failed for order ${request.orderId}:`, error);

      order.paymentStatus = PaymentStatus.FAILED;
      await this.orderRepository.save(order);

      throw new Error(`Payment confirmation failed: ${error.message}`);
    }
  }

  /**
   * Call Toss Payments confirm API
   */
  private async callTossConfirmAPI(
    request: TossConfirmRequest
  ): Promise<TossConfirmResponse> {
    if (!tossConfig.secretKey) {
      throw new Error('Toss Payments secret key not configured');
    }

    const url = `${tossConfig.baseUrl}/payments/confirm`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': getTossAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentKey: request.paymentKey,
        orderId: request.orderId,
        amount: request.amount
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || data.code || 'Unknown error';
      throw new Error(`Toss API error: ${errorMessage}`);
    }

    return data as TossConfirmResponse;
  }

  /**
   * Map Toss method to Order PaymentMethod enum
   */
  private mapTossMethod(tossMethod: string): PaymentMethod {
    const methodMap: Record<string, PaymentMethod> = {
      '카드': PaymentMethod.CARD,
      'CARD': PaymentMethod.CARD,
      '계좌이체': PaymentMethod.TRANSFER,
      'TRANSFER': PaymentMethod.TRANSFER,
      '가상계좌': PaymentMethod.VIRTUAL_ACCOUNT,
      'VIRTUAL_ACCOUNT': PaymentMethod.VIRTUAL_ACCOUNT,
      '토스페이': PaymentMethod.KAKAO_PAY, // Map to similar method
      'TOSSPAY': PaymentMethod.KAKAO_PAY
    };

    return methodMap[tossMethod] || PaymentMethod.CARD;
  }

  /**
   * Mark payment as failed
   */
  async failPayment(orderNumber: string, reason?: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber }
    });

    if (!order) {
      throw new Error(`Order not found: ${orderNumber}`);
    }

    order.paymentStatus = PaymentStatus.FAILED;

    if (reason) {
      order.customerNotes = order.customerNotes
        ? `${order.customerNotes}\n[Payment Failed] ${reason}`
        : `[Payment Failed] ${reason}`;
    }

    await this.orderRepository.save(order);

    logger.warn(`⚠️  Payment marked as failed for order ${orderNumber}`);

    return order;
  }

  /**
   * Get order by orderNumber
   */
  async getOrder(orderNumber: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { orderNumber }
    });
  }
}
