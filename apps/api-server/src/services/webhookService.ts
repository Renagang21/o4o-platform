import crypto from 'crypto';
import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { Payment, PaymentProvider, PaymentGatewayStatus } from '../entities/Payment';
import { Order, PaymentStatus, OrderStatus, PaymentMethod } from '../entities/Order';
import { inventoryService } from './inventoryService';
import { PaymentWebhookData } from '../types/payment';

export interface WebhookPayload {
  provider: PaymentProvider;
  transactionId: string;
  gatewayTransactionId: string;
  status: 'success' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
  signature?: string;
  timestamp?: number;
}

export interface IamportWebhookPayload {
  imp_uid: string;
  merchant_uid: string;
  status: string;
  amount: number;
  currency?: string;
  pay_method?: string;
  pg_provider?: string;
  paid_at?: number;
  failed_at?: number;
  cancelled_at?: number;
  receipt_url?: string;
}

export interface TossPaymentsWebhookPayload {
  paymentKey: string;
  orderId: string;
  status: string;
  amount: {
    total: number;
    currency: string;
  };
  method?: string;
  requestedAt?: string;
  approvedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
}

export interface KakaoPayWebhookPayload {
  tid: string;
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: string;
  amount: {
    total: number;
    tax_free: number;
    vat: number;
  };
  status: string;
  created_at: string;
  approved_at?: string;
  canceled_at?: string;
}

export interface NaverPayWebhookPayload {
  paymentId: string;
  merchantPayKey: string;
  merchantUserKey: string;
  primaryMethod: string;
  totalPayAmount: number;
  paymentStatus: string;
  paymentDate?: string;
  detail?: {
    productItems: Array<{
      categoryType: string;
      categoryId: string;
      uid: string;
      name: string;
      count: number;
    }>;
  };
}

export class WebhookService {
  private paymentRepository = AppDataSource.getRepository(Payment);
  private orderRepository = AppDataSource.getRepository(Order);

  /**
   * 웹훅 시그니처를 검증합니다.
   */
  private verifyWebhookSignature(
    payload: string, 
    signature: string, 
    secret: string, 
    provider: PaymentProvider
  ): boolean {
    try {
      let expectedSignature: string;

      switch (provider) {
        case PaymentProvider.IAMPORT:
          // 아임포트 시그니처 검증
          expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
          return signature === expectedSignature;

        case PaymentProvider.TOSS_PAYMENTS:
          // 토스페이먼츠 시그니처 검증
          expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('base64');
          return signature === expectedSignature;

        case PaymentProvider.KAKAO_PAY:
          // 카카오페이 시그니처 검증
          expectedSignature = crypto
            .createHash('sha256')
            .update(payload + secret)
            .digest('hex');
          return signature === expectedSignature;

        default:
          // Warning log removed
          return false;
      }
    } catch (error) {
      // Error log removed
      return false;
    }
  }

  /**
   * 아임포트 웹훅을 처리합니다.
   */
  async handleIamportWebhook(payload: IamportWebhookPayload, signature: string): Promise<{ success: boolean; message: string }> {
    const secret = process.env.IAMPORT_WEBHOOK_SECRET;
    if (!secret) {
      return { success: false, message: 'Webhook secret not configured' };
    }

    // 시그니처 검증
    if (!this.verifyWebhookSignature(
      JSON.stringify(payload), 
      signature, 
      secret, 
      PaymentProvider.IAMPORT
    )) {
      return { success: false, message: 'Invalid webhook signature' };
    }

    const webhookData: WebhookPayload = {
      provider: PaymentProvider.IAMPORT,
      transactionId: payload.merchant_uid,
      gatewayTransactionId: payload.imp_uid,
      status: payload.status === 'paid' ? 'success' : 'failed',
      amount: payload.amount,
      currency: payload.currency || 'KRW',
      metadata: payload as unknown as Record<string, unknown>
    };

    return await this.processWebhook(webhookData);
  }

  /**
   * 토스페이먼츠 웹훅을 처리합니다.
   */
  async handleTossPaymentsWebhook(payload: TossPaymentsWebhookPayload, signature: string): Promise<{ success: boolean; message: string }> {
    const secret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET;
    if (!secret) {
      return { success: false, message: 'Webhook secret not configured' };
    }

    // 시그니처 검증
    if (!this.verifyWebhookSignature(
      JSON.stringify(payload), 
      signature, 
      secret, 
      PaymentProvider.TOSS_PAYMENTS
    )) {
      return { success: false, message: 'Invalid webhook signature' };
    }

    const webhookData: WebhookPayload = {
      provider: PaymentProvider.TOSS_PAYMENTS,
      transactionId: payload.orderId,
      gatewayTransactionId: payload.paymentKey,
      status: payload.status === 'DONE' ? 'success' : 'failed',
      amount: payload.amount.total,
      currency: payload.amount.currency || 'KRW',
      metadata: payload as unknown as Record<string, unknown>
    };

    return await this.processWebhook(webhookData);
  }

  /**
   * 카카오페이 웹훅을 처리합니다.
   */
  async handleKakaoPayWebhook(payload: KakaoPayWebhookPayload, signature: string): Promise<{ success: boolean; message: string }> {
    const secret = process.env.KAKAO_PAY_WEBHOOK_SECRET;
    if (!secret) {
      return { success: false, message: 'Webhook secret not configured' };
    }

    // 시그니처 검증
    if (!this.verifyWebhookSignature(
      JSON.stringify(payload), 
      signature, 
      secret, 
      PaymentProvider.KAKAO_PAY
    )) {
      return { success: false, message: 'Invalid webhook signature' };
    }

    const webhookData: WebhookPayload = {
      provider: PaymentProvider.KAKAO_PAY,
      transactionId: payload.partner_order_id,
      gatewayTransactionId: payload.tid,
      status: payload.status === 'SUCCESS_PAYMENT' ? 'success' : 'failed',
      amount: payload.amount.total,
      currency: 'KRW',
      metadata: payload as unknown as Record<string, unknown>
    };

    return await this.processWebhook(webhookData);
  }

  /**
   * 네이버페이 웹훅을 처리합니다.
   */
  async handleNaverPayWebhook(payload: NaverPayWebhookPayload, signature: string): Promise<{ success: boolean; message: string }> {
    const secret = process.env.NAVER_PAY_WEBHOOK_SECRET;
    if (!secret) {
      return { success: false, message: 'Webhook secret not configured' };
    }

    // 시그니처 검증
    if (!this.verifyWebhookSignature(
      JSON.stringify(payload), 
      signature, 
      secret, 
      PaymentProvider.NAVER_PAY
    )) {
      return { success: false, message: 'Invalid webhook signature' };
    }

    const webhookData: WebhookPayload = {
      provider: PaymentProvider.NAVER_PAY,
      transactionId: payload.merchantPayKey,
      gatewayTransactionId: payload.paymentId,
      status: payload.paymentStatus === 'SUCCESS' ? 'success' : 'failed',
      amount: payload.totalPayAmount,
      currency: 'KRW',
      metadata: payload as unknown as Record<string, unknown>
    };

    return await this.processWebhook(webhookData);
  }

  /**
   * 통합 웹훅 처리 로직입니다.
   */
  private async processWebhook(webhookData: WebhookPayload): Promise<{ success: boolean; message: string }> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 결제 정보 조회
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { transactionId: webhookData.transactionId },
        relations: ['order', 'order.items', 'order.items.product']
      });

      if (!payment) {
        await queryRunner.rollbackTransaction();
        return { success: false, message: 'Payment not found' };
      }

      // 이미 처리된 웹훅인지 확인
      if (payment.status === PaymentGatewayStatus.COMPLETED || 
          payment.status === PaymentGatewayStatus.FAILED) {
        await queryRunner.rollbackTransaction();
        return { success: true, message: 'Webhook already processed' };
      }

      // 결제 상태 업데이트
      const newPaymentStatus = webhookData.status === 'success' 
        ? PaymentGatewayStatus.COMPLETED 
        : PaymentGatewayStatus.FAILED;

      await queryRunner.manager.update(Payment, payment.id, {
        status: newPaymentStatus,
        gatewayTransactionId: webhookData.gatewayTransactionId,
        webhookData: webhookData.metadata as PaymentWebhookData,
        ...(webhookData.status === 'failed' && { 
          failureReason: (webhookData.metadata?.failureReason as string) || 'Payment failed' 
        })
      });

      if (newPaymentStatus === PaymentGatewayStatus.COMPLETED) {
        // 결제 성공 처리
        await this.handleSuccessfulPayment(queryRunner, payment, webhookData);
      } else {
        // 결제 실패 처리
        await this.handleFailedPayment(queryRunner, payment, webhookData);
      }

      await queryRunner.commitTransaction();
      
      return { 
        success: true, 
        message: `Payment ${webhookData.status} processed successfully` 
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      // Error log removed
      return { 
        success: false, 
        message: 'Failed to process webhook' 
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 결제 성공 시 처리 로직입니다.
   */
  private async handleSuccessfulPayment(
    queryRunner: QueryRunner, 
    payment: Payment, 
    webhookData: WebhookPayload
  ): Promise<void> {
    // 주문 상태 업데이트
    await queryRunner.manager.update(Order, payment.orderId, {
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.CONFIRMED,
      paymentId: payment.id,
      paymentMethod: payment.method as PaymentMethod
    });

    // 재고 확정 (예약된 재고를 실제 차감)
    if (payment.order && payment.order.items) {
      const inventoryItems = payment.order.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      // 예약 확정은 별도 트랜잭션에서 처리
      // (현재 트랜잭션과 분리하여 재고 처리 실패가 결제 완료를 막지 않도록)
      setTimeout(async () => {
        try {
          await inventoryService.confirmReservation(
            `order_${payment.orderId}`,
            inventoryItems
          );
        } catch (error) {
          // Error log removed
          // 재고 확정 실패 시 알림 처리 (관리자 알림 등)
        }
      }, 0);
    }

    // 결제 완료 후처리 (이메일 발송, 알림 등)
    this.postPaymentSuccess(payment, webhookData);
  }

  /**
   * 결제 실패 시 처리 로직입니다.
   */
  private async handleFailedPayment(
    queryRunner: QueryRunner, 
    payment: Payment, 
    webhookData: WebhookPayload
  ): Promise<void> {
    // 주문 상태 업데이트
    await queryRunner.manager.update(Order, payment.orderId, {
      paymentStatus: PaymentStatus.FAILED,
      status: OrderStatus.CANCELLED
    });

    // 예약된 재고 해제
    if (payment.order && payment.order.items) {
      const inventoryItems = payment.order.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      // 재고 복구는 별도로 처리
      setTimeout(async () => {
        try {
          await inventoryService.restoreInventory(inventoryItems);
        } catch (error) {
          // Error log removed
        }
      }, 0);
    }

    // 결제 실패 후처리
    this.postPaymentFailure(payment, webhookData);
  }

  /**
   * 결제 성공 후처리입니다.
   */
  private async postPaymentSuccess(payment: Payment, webhookData: WebhookPayload): Promise<void> {
    try {
      // 이메일 발송, 알림 등 비동기 처리
      
      // 실제 구현에서는 이메일 서비스, 알림 서비스 등을 호출
      // await emailService.sendPaymentConfirmation(payment);
      // await notificationService.sendPushNotification(payment.userId, 'Payment successful');
    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 결제 실패 후처리입니다.
   */
  private async postPaymentFailure(payment: Payment, webhookData: WebhookPayload): Promise<void> {
    try {
      // 결제 실패 알림 등 비동기 처리
      
      // 실제 구현에서는 알림 서비스 등을 호출
      // await notificationService.sendPaymentFailureNotification(payment.userId, webhookData.metadata);
    } catch (error) {
      // Error log removed
    }
  }

  /**
   * 웹훅 재시도 처리입니다.
   */
  async retryWebhook(
    paymentId: string, 
    maxRetries: number = 3
  ): Promise<{ success: boolean; message: string }> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['order']
      });

      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }

      // 실제 구현에서는 각 결제 게이트웨이의 API를 호출하여 상태를 확인
      
      return { success: true, message: 'Webhook retry completed' };
    } catch (error) {
      // Error log removed
      return { success: false, message: 'Webhook retry failed' };
    }
  }

  /**
   * 외부 URL에 웹훅을 전송합니다.
   */
  async sendWebhook(url: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'O4O-Platform-Webhook/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      // Error log removed
      throw error;
    }
  }
}

export const webhookService = new WebhookService();