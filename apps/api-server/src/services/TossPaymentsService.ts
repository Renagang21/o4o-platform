/**
 * 토스페이먼츠 결제 서비스 (Mock Implementation)
 * Payment 엔티티가 구현될 때까지 임시로 사용
 * https://docs.tosspayments.com/reference
 */

import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/simpleLogger';
import { env } from '../utils/env-validator';

interface TossPaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  customerName?: string;
  customerEmail?: string;
  successUrl: string;
  failUrl: string;
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

  constructor() {
    // 환경변수에서 토스페이먼츠 설정 로드
    this.apiKey = env.getString('TOSS_API_KEY', '');
    this.secretKey = env.getString('TOSS_SECRET_KEY', '');
    this.clientKey = env.getString('TOSS_CLIENT_KEY', '');
    this.webhookSecret = env.getString('TOSS_WEBHOOK_SECRET', '');
    
    // 테스트/프로덕션 환경 구분
    this.baseUrl = 'https://api.tosspayments.com/v1';
    
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
   * 결제 요청 생성 (Mock)
   */
  async createPayment(request: TossPaymentRequest): Promise<any> {
    try {
      // TODO: Implement actual payment creation when Order and Payment entities are ready
      logger.info('Creating mock payment request:', { orderId: request.orderId, amount: request.amount });

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
          paymentId: `mock_payment_${Date.now()}`
        }
      };
    } catch (error: any) {
      logger.error('Payment creation failed:', error);
      throw error;
    }
  }

  /**
   * 결제 승인 (Mock)
   */
  async confirmPayment(confirm: TossPaymentConfirm): Promise<any> {
    try {
      if (!this.secretKey) {
        throw new Error('토스페이먼츠 시크릿 키가 설정되지 않았습니다');
      }

      // TODO: Implement actual payment confirmation
      logger.info('Confirming mock payment:', confirm);

      // Mock response
      return {
        success: true,
        data: {
          paymentKey: confirm.paymentKey,
          orderId: confirm.orderId,
          status: 'DONE',
          amount: confirm.amount,
          approvedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      logger.error('Payment confirmation failed:', error);
      throw error;
    }
  }

  /**
   * 결제 취소 (Mock)
   */
  async cancelPayment(
    paymentKey: string,
    cancelReason: string,
    cancelAmount?: number
  ): Promise<any> {
    try {
      if (!this.secretKey) {
        throw new Error('토스페이먼츠 시크릿 키가 설정되지 않았습니다');
      }

      // TODO: Implement actual payment cancellation
      logger.info('Cancelling mock payment:', { paymentKey, cancelReason, cancelAmount });

      // Mock response
      return {
        success: true,
        data: {
          paymentKey: paymentKey,
          status: 'CANCELED',
          cancelReason: cancelReason,
          cancelAmount: cancelAmount,
          canceledAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      logger.error('Payment cancellation failed:', error);
      throw error;
    }
  }

  /**
   * 결제 조회 (Mock)
   */
  async getPayment(paymentKey: string): Promise<any> {
    try {
      if (!this.secretKey) {
        throw new Error('토스페이먼츠 시크릿 키가 설정되지 않았습니다');
      }

      // TODO: Implement actual payment query
      logger.info('Getting mock payment', { paymentKey });

      // Mock response
      return {
        success: true,
        data: {
          paymentKey: paymentKey,
          status: 'DONE',
          amount: 10000,
          orderName: 'Mock Order',
          method: 'card'
        }
      };
    } catch (error: any) {
      logger.error('Payment query failed:', error);
      throw error;
    }
  }

  /**
   * 정산 조회 (Mock)
   */
  async getSettlements(date: string): Promise<any> {
    try {
      if (!this.secretKey) {
        throw new Error('토스페이먼츠 시크릿 키가 설정되지 않았습니다');
      }

      // TODO: Implement actual settlements query
      logger.info('Getting mock settlements for date', { date });

      // Mock response
      return {
        success: true,
        data: {
          date: date,
          settlements: [],
          totalAmount: 0,
          totalCount: 0
        }
      };
    } catch (error: any) {
      logger.error('Settlement query failed:', error);
      throw error;
    }
  }

  /**
   * 웹훅 서명 검증
   */
  verifyWebhookSignature(signature: string, timestamp: string, body: any): boolean {
    if (!this.webhookSecret) {
      logger.warn('Webhook secret not configured, skipping verification');
      return true;
    }

    const payload = timestamp + JSON.stringify(body);
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * 웹훅 처리
   */
  async handleWebhook(signature: string, timestamp: string, body: TossWebhookPayload): Promise<void> {
    try {
      // 서명 검증
      if (!this.verifyWebhookSignature(signature, timestamp, body)) {
        throw new Error('Invalid webhook signature');
      }

      const { eventType, data } = body;
      
      logger.info('Processing webhook:', { eventType, orderId: data.orderId });

      // TODO: Implement actual webhook processing when Payment entity is ready
      switch (eventType) {
        case 'PAYMENT.DONE':
          // 결제 완료 처리
          logger.info('Payment completed', { orderId: data.orderId });
          break;
          
        case 'PAYMENT.CANCELED':
          // 결제 취소 처리
          logger.info('Payment canceled', { orderId: data.orderId });
          break;
          
        case 'PAYMENT.FAILED':
          // 결제 실패 처리
          logger.info('Payment failed', { orderId: data.orderId });
          break;
          
        case 'DEPOSIT.DONE':
          // 가상계좌 입금 완료
          logger.info('Deposit completed', { orderId: data.orderId });
          break;
          
        default:
          logger.warn('Unknown webhook event type', { eventType });
      }
    } catch (error: any) {
      logger.error('Webhook processing failed:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 export
export const tossPaymentsService = new TossPaymentsService();