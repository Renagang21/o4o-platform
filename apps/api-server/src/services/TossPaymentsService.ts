/**
 * 토스페이먼츠 결제 서비스
 * https://docs.tosspayments.com/reference
 */

import axios from 'axios';
import crypto from 'crypto';
import { Order } from '../entities/Order';
import { Payment } from '../entities/Payment';
import { AppDataSource } from '../database/connection';
import logger from '../utils/simpleLogger';

interface TossPaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  customerName?: string;
  customerEmail?: string;
  successUrl: string;
  failUrl: string;
  // 결제 수단별 추가 옵션
  method?: 'card' | 'transfer' | 'virtual-account' | 'mobile' | 'easy-pay';
  easyPay?: {
    provider: 'tosspay' | 'naverpay' | 'kakaopay' | 'payco' | 'samsungpay';
  };
}

interface TossPaymentConfirm {
  paymentKey: string;
  orderId: string;
  amount: number;
}

interface TossWebhookPayload {
  eventType: string;
  timestamp: string;
  data: {
    paymentKey: string;
    orderId: string;
    status: string;
    amount: number;
    method?: string;
    approvedAt?: string;
    card?: {
      number: string;
      company: string;
    };
    virtualAccount?: {
      bank: string;
      accountNumber: string;
      dueDate: string;
    };
    transfer?: {
      bank: string;
      settlementStatus: string;
    };
    mobilePhone?: {
      carrier: string;
      settlementStatus: string;
    };
    receipt?: {
      url: string;
    };
    failure?: {
      code: string;
      message: string;
    };
  };
}

export class TossPaymentsService {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly clientKey: string;
  private readonly webhookSecret: string;
  
  private orderRepository = AppDataSource.getRepository(Order);
  private paymentRepository = AppDataSource.getRepository(Payment);

  constructor() {
    // 환경변수에서 토스페이먼츠 설정 로드
    this.apiKey = process.env.TOSS_API_KEY || '';
    this.secretKey = process.env.TOSS_SECRET_KEY || '';
    this.clientKey = process.env.TOSS_CLIENT_KEY || '';
    this.webhookSecret = process.env.TOSS_WEBHOOK_SECRET || '';
    
    // 테스트/프로덕션 환경 구분
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.tosspayments.com/v1'
      : 'https://api.tosspayments.com/v1';
    
    if (!this.secretKey) {
      logger.warn('TossPayments: Secret key not configured');
    }
  }

  /**
   * Basic Auth 헤더 생성
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.secretKey}:`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * 결제 요청 생성
   */
  async createPayment(request: TossPaymentRequest): Promise<any> {
    try {
      // 주문 정보 저장
      const order = await this.orderRepository.findOne({
        where: { id: request.orderId }
      });

      if (!order) {
        throw new Error('주문을 찾을 수 없습니다');
      }

      // Payment 엔티티 생성
      const payment = this.paymentRepository.create({
        orderId: order.id,
        amount: request.amount,
        currency: 'KRW',
        status: 'pending',
        provider: 'tosspayments',
        method: request.method || 'card',
        metadata: {
          orderName: request.orderName,
          customerName: request.customerName,
          customerEmail: request.customerEmail
        }
      });

      await this.paymentRepository.save(payment);

      // 토스페이먼츠 결제 창 호출을 위한 정보 반환
      // 실제 결제창은 프론트엔드에서 SDK로 호출
      return {
        success: true,
        data: {
          clientKey: this.clientKey,
          orderId: request.orderId,
          orderName: request.orderName,
          amount: request.amount,
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          successUrl: request.successUrl,
          failUrl: request.failUrl,
          paymentId: payment.id
        }
      };
    } catch (error) {
      logger.error('TossPayments: Failed to create payment', error);
      throw error;
    }
  }

  /**
   * 결제 승인 (결제창에서 성공 후 호출)
   */
  async confirmPayment(confirm: TossPaymentConfirm): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments/confirm`,
        {
          paymentKey: confirm.paymentKey,
          orderId: confirm.orderId,
          amount: confirm.amount
        },
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      );

      const paymentData = response.data;

      // Payment 정보 업데이트
      const payment = await this.paymentRepository.findOne({
        where: { orderId: confirm.orderId }
      });

      if (payment) {
        payment.transactionId = paymentData.paymentKey;
        payment.status = this.mapTossStatus(paymentData.status);
        payment.paidAt = new Date(paymentData.approvedAt);
        payment.metadata = {
          ...payment.metadata,
          tossData: paymentData
        };

        await this.paymentRepository.save(payment);

        // 주문 상태 업데이트
        await this.updateOrderStatus(confirm.orderId, 'paid');
      }

      logger.info(`Payment confirmed: ${confirm.orderId}`);
      
      return {
        success: true,
        data: paymentData
      };
    } catch (error: any) {
      logger.error('TossPayments: Payment confirmation failed', error);
      
      // 실패 정보 저장
      const payment = await this.paymentRepository.findOne({
        where: { orderId: confirm.orderId }
      });
      
      if (payment) {
        payment.status = 'failed';
        payment.failureReason = error.response?.data?.message || error.message;
        await this.paymentRepository.save(payment);
      }

      throw error;
    }
  }

  /**
   * 결제 취소
   */
  async cancelPayment(
    paymentKey: string, 
    cancelReason: string,
    cancelAmount?: number // 부분 취소 금액
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments/${paymentKey}/cancel`,
        {
          cancelReason,
          cancelAmount
        },
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          }
        }
      );

      const cancelData = response.data;

      // Payment 정보 업데이트
      const payment = await this.paymentRepository.findOne({
        where: { transactionId: paymentKey }
      });

      if (payment) {
        payment.status = cancelAmount && cancelAmount < payment.amount 
          ? 'partially_refunded' 
          : 'refunded';
        payment.refundedAmount = (payment.refundedAmount || 0) + (cancelAmount || payment.amount);
        payment.metadata = {
          ...payment.metadata,
          lastCancel: {
            reason: cancelReason,
            amount: cancelAmount,
            canceledAt: new Date()
          }
        };

        await this.paymentRepository.save(payment);

        // 주문 상태 업데이트
        if (payment.status === 'refunded') {
          await this.updateOrderStatus(payment.orderId, 'cancelled');
        }
      }

      logger.info(`Payment cancelled: ${paymentKey}`);

      return {
        success: true,
        data: cancelData
      };
    } catch (error) {
      logger.error('TossPayments: Payment cancellation failed', error);
      throw error;
    }
  }

  /**
   * 결제 조회
   */
  async getPayment(paymentKeyOrOrderId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/payments/${paymentKeyOrOrderId}`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('TossPayments: Failed to get payment', error);
      throw error;
    }
  }

  /**
   * 웹훅 검증 및 처리
   */
  async handleWebhook(
    signature: string,
    timestamp: string,
    body: TossWebhookPayload
  ): Promise<void> {
    try {
      // 서명 검증
      if (!this.verifyWebhookSignature(signature, timestamp, body)) {
        throw new Error('Invalid webhook signature');
      }

      const { eventType, data } = body;

      logger.info(`TossPayments webhook: ${eventType}`, { orderId: data.orderId });

      switch (eventType) {
        case 'PAYMENT_STATUS_CHANGED':
          await this.handlePaymentStatusChange(data);
          break;
          
        case 'PAYMENT_DONE':
          await this.handlePaymentComplete(data);
          break;
          
        case 'PAYMENT_FAILED':
          await this.handlePaymentFailed(data);
          break;
          
        case 'PAYMENT_CANCELED':
          await this.handlePaymentCanceled(data);
          break;
          
        case 'VIRTUAL_ACCOUNT_DEPOSIT':
          await this.handleVirtualAccountDeposit(data);
          break;
          
        default:
          logger.warn(`Unhandled webhook event: ${eventType}`);
      }
    } catch (error) {
      logger.error('TossPayments: Webhook processing failed', error);
      throw error;
    }
  }

  /**
   * 웹훅 서명 검증
   */
  private verifyWebhookSignature(
    signature: string,
    timestamp: string,
    body: any
  ): boolean {
    if (!this.webhookSecret) {
      logger.warn('Webhook secret not configured, skipping verification');
      return true; // 개발 환경에서는 스킵
    }

    const message = `${timestamp}.${JSON.stringify(body)}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(message)
      .digest('base64');

    return signature === expectedSignature;
  }

  /**
   * 결제 상태 변경 처리
   */
  private async handlePaymentStatusChange(data: any): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: data.paymentKey }
    });

    if (!payment) {
      logger.warn(`Payment not found for key: ${data.paymentKey}`);
      return;
    }

    payment.status = this.mapTossStatus(data.status);
    payment.metadata = {
      ...payment.metadata,
      lastWebhook: {
        status: data.status,
        timestamp: new Date()
      }
    };

    await this.paymentRepository.save(payment);

    // 주문 상태 업데이트
    if (data.status === 'DONE') {
      await this.updateOrderStatus(payment.orderId, 'paid');
    } else if (data.status === 'CANCELED' || data.status === 'FAILED') {
      await this.updateOrderStatus(payment.orderId, 'failed');
    }
  }

  /**
   * 결제 완료 처리
   */
  private async handlePaymentComplete(data: any): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId: data.orderId }
    });

    if (!payment) {
      // 새 결제 정보 생성 (웹훅이 먼저 도착한 경우)
      const newPayment = this.paymentRepository.create({
        orderId: data.orderId,
        transactionId: data.paymentKey,
        amount: data.amount,
        currency: 'KRW',
        status: 'completed',
        provider: 'tosspayments',
        method: data.method,
        paidAt: new Date(data.approvedAt),
        metadata: {
          tossData: data
        }
      });

      await this.paymentRepository.save(newPayment);
    } else {
      payment.status = 'completed';
      payment.transactionId = data.paymentKey;
      payment.paidAt = new Date(data.approvedAt);
      payment.metadata = {
        ...payment.metadata,
        tossData: data
      };

      await this.paymentRepository.save(payment);
    }

    // 주문 상태를 'processing'으로 변경
    await this.updateOrderStatus(data.orderId, 'processing');
    
    // 재고 차감
    await this.deductInventory(data.orderId);
    
    // 영수증 URL 저장
    if (data.receipt?.url) {
      await this.saveReceiptUrl(data.orderId, data.receipt.url);
    }
  }

  /**
   * 결제 실패 처리
   */
  private async handlePaymentFailed(data: any): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId: data.orderId }
    });

    if (payment) {
      payment.status = 'failed';
      payment.failureReason = data.failure?.message || 'Unknown error';
      payment.failureCode = data.failure?.code;
      await this.paymentRepository.save(payment);
    }

    await this.updateOrderStatus(data.orderId, 'failed');
  }

  /**
   * 결제 취소 처리
   */
  private async handlePaymentCanceled(data: any): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: data.paymentKey }
    });

    if (payment) {
      payment.status = 'refunded';
      payment.refundedAmount = data.amount;
      payment.metadata = {
        ...payment.metadata,
        canceledAt: new Date()
      };
      await this.paymentRepository.save(payment);
    }

    await this.updateOrderStatus(data.orderId, 'cancelled');
    
    // 재고 복구
    await this.restoreInventory(data.orderId);
  }

  /**
   * 가상계좌 입금 처리
   */
  private async handleVirtualAccountDeposit(data: any): Promise<void> {
    logger.info(`Virtual account deposit received for order: ${data.orderId}`);
    
    // 결제 완료 처리와 동일
    await this.handlePaymentComplete(data);
  }

  /**
   * 토스 상태를 내부 상태로 매핑
   */
  private mapTossStatus(tossStatus: string): string {
    const statusMap: Record<string, string> = {
      'READY': 'pending',
      'IN_PROGRESS': 'processing',
      'WAITING_FOR_DEPOSIT': 'pending',
      'DONE': 'completed',
      'CANCELED': 'refunded',
      'PARTIAL_CANCELED': 'partially_refunded',
      'ABORTED': 'failed',
      'EXPIRED': 'failed'
    };

    return statusMap[tossStatus] || 'pending';
  }

  /**
   * 주문 상태 업데이트
   */
  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId }
    });

    if (order) {
      order.paymentStatus = status;
      
      // 주문 상태도 함께 업데이트
      if (status === 'paid' || status === 'processing') {
        order.status = 'processing';
      } else if (status === 'failed' || status === 'cancelled') {
        order.status = 'cancelled';
      }

      await this.orderRepository.save(order);
      logger.info(`Order ${orderId} status updated to ${status}`);
    }
  }

  /**
   * 재고 차감
   */
  private async deductInventory(orderId: string): Promise<void> {
    // OrderItem에서 상품 정보를 가져와 재고 차감
    // 실제 구현은 OrderItem 엔티티 구조에 따라 조정 필요
    logger.info(`Deducting inventory for order: ${orderId}`);
  }

  /**
   * 재고 복구
   */
  private async restoreInventory(orderId: string): Promise<void> {
    // 취소된 주문의 재고 복구
    logger.info(`Restoring inventory for order: ${orderId}`);
  }

  /**
   * 영수증 URL 저장
   */
  private async saveReceiptUrl(orderId: string, receiptUrl: string): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId }
    });

    if (order) {
      order.metadata = {
        ...order.metadata,
        receiptUrl
      };
      await this.orderRepository.save(order);
    }
  }

  /**
   * 정산 정보 조회
   */
  async getSettlements(date: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/settlements?date=${date}`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('TossPayments: Failed to get settlements', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
export const tossPaymentsService = new TossPaymentsService();