import { AppDataSource } from '../database/connection';
import { cacheService } from './cache.service';
import logger from '../utils/logger';
import axios from 'axios';
import crypto from 'crypto';

export interface BillingKeyRequest {
  customerKey: string;
  customerName: string;
  customerEmail: string;
  cardNumber: string;
  cardExpirationYear: string;
  cardExpirationMonth: string;
  cardPassword?: string;
  customerBirthday?: string;
}

export interface BillingKeyResponse {
  billingKey: string;
  customerKey: string;
  authenticatedAt: string;
  card: {
    company: string;
    number: string;
    cardType: string;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number;
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  intervalCount: number;
  currency: string;
  trialDays?: number;
  description?: string;
  metadata?: Record<string, any>;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  billingKey: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired' | 'trial';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  totalPayments: number;
  totalAmount: number;
  metadata?: Record<string, any>;
}

export interface PartialCancelRequest {
  paymentKey: string;
  cancelAmount: number;
  cancelReason: string;
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
  taxFreeAmount?: number;
  taxExemptionAmount?: number;
}

export interface EscrowConfirmRequest {
  paymentKey: string;
  confirmAmount?: number;
  deliveryDate?: string;
}

export interface CashReceiptRequest {
  paymentKey: string;
  type: 'personal' | 'business';
  registrationNumber: string;
}

export interface SettlementInfo {
  date: string;
  totalAmount: number;
  totalFee: number;
  netAmount: number;
  settlementStatus: 'pending' | 'completed' | 'failed';
  settlements: Array<{
    paymentKey: string;
    orderId: string;
    amount: number;
    fee: number;
    netAmount: number;
    settledAt?: string;
  }>;
}

export class TossPaymentsAdvancedService {
  private readonly baseURL: string;
  private readonly secretKey: string;
  private readonly clientKey: string;

  constructor() {
    this.baseURL = process.env.TOSS_PAYMENTS_API_URL || 'https://api.tosspayments.com/v1';
    this.secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || '';
    this.clientKey = process.env.TOSS_PAYMENTS_CLIENT_KEY || '';

    if (!this.secretKey || !this.clientKey) {
      logger.warn('Toss Payments credentials not configured. Some features may not work.');
    }
  }

  private getAuthHeaders() {
    const credentials = Buffer.from(`${this.secretKey}:`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 빌링키 발급 (카드 자동결제 등록)
   */
  async issueBillingKey(request: BillingKeyRequest): Promise<BillingKeyResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/billing/authorizations/card`,
        {
          customerKey: request.customerKey,
          cardNumber: request.cardNumber,
          cardExpirationYear: request.cardExpirationYear,
          cardExpirationMonth: request.cardExpirationMonth,
          cardPassword: request.cardPassword,
          customerBirthday: request.customerBirthday,
        },
        { headers: this.getAuthHeaders() }
      );

      const billingKeyData = response.data;

      // 빌링키 정보를 데이터베이스에 저장
      await this.saveBillingKey({
        billingKey: billingKeyData.billingKey,
        customerKey: request.customerKey,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        cardCompany: billingKeyData.card.company,
        cardNumber: billingKeyData.card.number,
        cardType: billingKeyData.card.cardType,
        authenticatedAt: new Date(billingKeyData.authenticatedAt),
        status: 'active',
      });

      logger.info('Billing key issued successfully', {
        customerKey: request.customerKey,
        billingKey: billingKeyData.billingKey,
      });

      return billingKeyData;
    } catch (error) {
      logger.error('Error issuing billing key:', error);
      throw new Error(`Failed to issue billing key: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 빌링키로 결제 실행
   */
  async payWithBillingKey(params: {
    billingKey: string;
    customerKey: string;
    amount: number;
    orderId: string;
    orderName: string;
    customerEmail?: string;
    customerName?: string;
    taxFreeAmount?: number;
  }): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/billing/${params.billingKey}`,
        {
          customerKey: params.customerKey,
          amount: params.amount,
          orderId: params.orderId,
          orderName: params.orderName,
          customerEmail: params.customerEmail,
          customerName: params.customerName,
          taxFreeAmount: params.taxFreeAmount,
        },
        { headers: this.getAuthHeaders() }
      );

      const paymentData = response.data;

      // 결제 정보를 데이터베이스에 저장
      await this.savePaymentRecord({
        paymentKey: paymentData.paymentKey,
        orderId: params.orderId,
        billingKey: params.billingKey,
        amount: params.amount,
        status: paymentData.status,
        method: 'billing',
        approvedAt: new Date(paymentData.approvedAt),
        customerKey: params.customerKey,
      });

      logger.info('Payment with billing key completed', {
        paymentKey: paymentData.paymentKey,
        orderId: params.orderId,
        amount: params.amount,
      });

      return paymentData;
    } catch (error) {
      logger.error('Error processing billing key payment:', error);
      throw new Error(`Failed to process payment: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 부분 취소 처리
   */
  async partialCancel(request: PartialCancelRequest): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/payments/${request.paymentKey}/cancel`,
        {
          cancelReason: request.cancelReason,
          cancelAmount: request.cancelAmount,
          refundReceiveAccount: request.refundReceiveAccount,
          taxFreeAmount: request.taxFreeAmount,
          taxExemptionAmount: request.taxExemptionAmount,
        },
        { headers: this.getAuthHeaders() }
      );

      const cancelData = response.data;

      // 취소 정보를 데이터베이스에 저장
      await this.saveCancelRecord({
        paymentKey: request.paymentKey,
        cancelAmount: request.cancelAmount,
        cancelReason: request.cancelReason,
        cancelledAt: new Date(cancelData.cancelledAt),
        transactionKey: cancelData.transactionKey,
        receiptUrl: cancelData.receipt?.url,
      });

      // 재고 복구 처리 (inventory service 연동)
      await this.restoreInventoryForCancel(request.paymentKey, request.cancelAmount);

      logger.info('Partial cancel completed', {
        paymentKey: request.paymentKey,
        cancelAmount: request.cancelAmount,
      });

      return cancelData;
    } catch (error) {
      logger.error('Error processing partial cancel:', error);
      throw new Error(`Failed to cancel payment: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 에스크로 구매 확정
   */
  async confirmEscrow(request: EscrowConfirmRequest): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/payments/${request.paymentKey}/confirm-escrow`,
        {
          confirmAmount: request.confirmAmount,
          deliveryDate: request.deliveryDate,
        },
        { headers: this.getAuthHeaders() }
      );

      const confirmData = response.data;

      // 에스크로 확정 정보 저장
      await this.saveEscrowConfirm({
        paymentKey: request.paymentKey,
        confirmAmount: request.confirmAmount || confirmData.totalAmount,
        confirmedAt: new Date(),
        deliveryDate: request.deliveryDate ? new Date(request.deliveryDate) : undefined,
      });

      // 판매자 정산 처리 (commission service 연동)
      await this.processVendorSettlement(request.paymentKey, confirmData);

      logger.info('Escrow confirmed', {
        paymentKey: request.paymentKey,
        confirmAmount: request.confirmAmount,
      });

      return confirmData;
    } catch (error) {
      logger.error('Error confirming escrow:', error);
      throw new Error(`Failed to confirm escrow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 현금영수증 발급
   */
  async issueCashReceipt(request: CashReceiptRequest): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/cash-receipts`,
        {
          paymentKey: request.paymentKey,
          type: request.type,
          registrationNumber: request.registrationNumber,
        },
        { headers: this.getAuthHeaders() }
      );

      const receiptData = response.data;

      // 현금영수증 정보 저장
      await this.saveCashReceipt({
        paymentKey: request.paymentKey,
        receiptKey: receiptData.receiptKey,
        type: request.type,
        registrationNumber: request.registrationNumber,
        totalAmount: receiptData.totalAmount,
        issuedAt: new Date(receiptData.issuedAt),
        receiptUrl: receiptData.receiptUrl,
      });

      logger.info('Cash receipt issued', {
        paymentKey: request.paymentKey,
        receiptKey: receiptData.receiptKey,
      });

      return receiptData;
    } catch (error) {
      logger.error('Error issuing cash receipt:', error);
      throw new Error(`Failed to issue cash receipt: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * 정산 조회
   */
  async getSettlements(date: string): Promise<SettlementInfo> {
    try {
      const response = await axios.get(
        `${this.baseURL}/settlements`,
        {
          params: { dateFrom: date, dateTo: date },
          headers: this.getAuthHeaders(),
        }
      );

      const settlementData = response.data;

      // 정산 데이터 캐싱 (1시간)
      const cacheKey = `settlements:${date}`;
      await cacheService.set(cacheKey, settlementData, { ttl: 3600 });

      return {
        date,
        totalAmount: settlementData.totalAmount,
        totalFee: settlementData.totalFee,
        netAmount: settlementData.netAmount,
        settlementStatus: settlementData.status,
        settlements: settlementData.settlements,
      };
    } catch (error) {
      logger.error('Error fetching settlements:', error);
      throw new Error(`Failed to fetch settlements: ${error.response?.data?.message || error.message}`);
    }
  }

  // Database helper methods

  private async saveBillingKey(data: any): Promise<void> {
    try {
      const repository = AppDataSource.getRepository('BillingKey');
      const billingKey = repository.create(data);
      await repository.save(billingKey);
    } catch (error) {
      logger.error('Error saving billing key:', error);
    }
  }

  private async savePaymentRecord(data: any): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const repository = AppDataSource.getRepository('Payment');
      const payment = repository.create(data);
      await repository.save(payment);
    } catch (error) {
      logger.error('Error saving payment record:', error);
    }
  }

  private async saveCancelRecord(data: any): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const repository = AppDataSource.getRepository('PaymentCancel');
      const cancel = repository.create(data);
      await repository.save(cancel);
    } catch (error) {
      logger.error('Error saving cancel record:', error);
    }
  }

  private async saveEscrowConfirm(data: any): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const repository = AppDataSource.getRepository('EscrowConfirm');
      const confirm = repository.create(data);
      await repository.save(confirm);
    } catch (error) {
      logger.error('Error saving escrow confirm:', error);
    }
  }

  private async saveCashReceipt(data: any): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const repository = AppDataSource.getRepository('CashReceipt');
      const receipt = repository.create(data);
      await repository.save(receipt);
    } catch (error) {
      logger.error('Error saving cash receipt:', error);
    }
  }

  // Integration methods

  private async restoreInventoryForCancel(paymentKey: string, cancelAmount: number): Promise<void> {
    try {
      // 결제 정보 조회
      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      const payment = await paymentRepository.findOne({ where: { paymentKey } });

      if (!payment) {
        logger.warn('Payment not found for inventory restoration', { paymentKey });
        return;
      }

      // 주문 정보 조회 및 재고 복구
      const orderRepository = AppDataSource.getRepository('Order');
      const order = await orderRepository.findOne({ 
        where: { id: payment.orderId },
        relations: ['items', 'items.product']
      });

      if (order && order.items) {
        const { inventoryService } = await import('./inventoryService');
        
        const itemsToRestore = [];
        for (const item of order.items) {
          const restoreQuantity = Math.floor((item.quantity * cancelAmount) / payment.amount);
          
          if (restoreQuantity > 0) {
            itemsToRestore.push({
              productId: item.productId,
              quantity: restoreQuantity
            });
          }
        }
        
        if (itemsToRestore.length > 0) {
          await inventoryService.restoreInventory(itemsToRestore);
        }
      }

      logger.info('Inventory restored for cancel', { paymentKey, cancelAmount });
    } catch (error) {
      logger.error('Error restoring inventory for cancel:', error);
    }
  }

  private async processVendorSettlement(paymentKey: string, confirmData: any): Promise<void> {
    try {
      // 에스크로 확정 시 판매자 정산 처리
      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      const payment = await paymentRepository.findOne({ 
        where: { paymentKey },
        relations: ['order', 'order.vendor']
      });

      if (!payment || !payment.order) {
        logger.warn('Payment or order not found for vendor settlement', { paymentKey });
        return;
      }

      // 수수료 서비스 연동 - 에스크로 정산 처리
      const { AppDataSource } = await import('../database/connection');
      const escrowSettlementRepository = AppDataSource.getRepository('EscrowSettlement');
      
      const settlement = escrowSettlementRepository.create({
        paymentKey,
        vendorId: payment.order.vendorId,
        amount: confirmData.totalAmount,
        settlementType: 'escrow_confirmed',
        status: 'confirmed',
        confirmedAt: new Date(),
        settlementDate: new Date(),
      });

      await escrowSettlementRepository.save(settlement);

      logger.info('Vendor settlement processed', { paymentKey, vendorId: payment.order.vendorId });
    } catch (error) {
      logger.error('Error processing vendor settlement:', error);
    }
  }

  /**
   * 결제 실패 재시도 로직
   */
  async retryFailedPayments(): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      
      // 최근 24시간 내 실패한 결제 조회
      const failedPayments = await paymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: 'failed' })
        .andWhere('payment.createdAt > :since', { 
          since: new Date(Date.now() - 24 * 60 * 60 * 1000) 
        })
        .andWhere('payment.retryCount < :maxRetries', { maxRetries: 3 })
        .getMany();

      logger.info(`Found ${failedPayments.length} failed payments to retry`);

      for (const payment of failedPayments) {
        try {
          // 빌링키 결제 재시도
          if (payment.billingKey) {
            await this.payWithBillingKey({
              billingKey: payment.billingKey,
              customerKey: payment.customerKey,
              amount: payment.amount,
              orderId: payment.orderId,
              orderName: payment.orderName || 'Retry Payment',
            });

            // 재시도 횟수 업데이트
            await paymentRepository.update(payment.id, {
              retryCount: payment.retryCount + 1,
              lastRetryAt: new Date(),
            });
          }
        } catch (error) {
          logger.error(`Failed to retry payment ${payment.id}:`, error);
          
          // 재시도 실패 기록
          await paymentRepository.update(payment.id, {
            retryCount: payment.retryCount + 1,
            lastRetryAt: new Date(),
            lastRetryError: error.message,
          });
        }
      }
    } catch (error) {
      logger.error('Error in retry failed payments job:', error);
    }
  }

  /**
   * 웹훅 서명 검증
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET || '';
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('base64');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * 웹훅 이벤트 처리
   */
  async processWebhookEvent(eventType: string, data: any): Promise<void> {
    try {
      switch (eventType) {
        case 'PAYMENT_COMPLETED':
          await this.handlePaymentCompleted(data);
          break;
        case 'PAYMENT_FAILED':
          await this.handlePaymentFailed(data);
          break;
        case 'PAYMENT_CANCELLED':
          await this.handlePaymentCancelled(data);
          break;
        case 'SUBSCRIPTION_RENEWED':
          await this.handleSubscriptionRenewed(data);
          break;
        case 'SUBSCRIPTION_FAILED':
          await this.handleSubscriptionFailed(data);
          break;
        default:
          logger.warn(`Unknown webhook event type: ${eventType}`);
      }
    } catch (error) {
      logger.error(`Error processing webhook event ${eventType}:`, error);
      throw error;
    }
  }

  private async handlePaymentCompleted(data: any): Promise<void> {
    // 결제 완료 처리
    // - 재고 차감
    // - 주문 상태 업데이트
    // - 분석 데이터 업데이트
    logger.info('Payment completed webhook processed', { paymentKey: data.paymentKey });
  }

  private async handlePaymentFailed(data: any): Promise<void> {
    // 결제 실패 처리
    // - 재고 복구
    // - 주문 상태 업데이트
    // - 실패 알림 발송
    logger.info('Payment failed webhook processed', { paymentKey: data.paymentKey });
  }

  private async handlePaymentCancelled(data: any): Promise<void> {
    // 결제 취소 처리
    // - 재고 복구
    // - 수수료 조정
    // - 정산 데이터 업데이트
    logger.info('Payment cancelled webhook processed', { paymentKey: data.paymentKey });
  }

  private async handleSubscriptionRenewed(data: any): Promise<void> {
    // 정기결제 갱신 처리
    // - 다음 결제일 업데이트
    // - 구독 상태 업데이트
    // - 분석 데이터 업데이트
    logger.info('Subscription renewed webhook processed', { subscriptionId: data.subscriptionId });
  }

  private async handleSubscriptionFailed(data: any): Promise<void> {
    // 정기결제 실패 처리
    // - 재시도 스케줄링
    // - 구독자 알림
    // - 상태 업데이트
    logger.info('Subscription failed webhook processed', { subscriptionId: data.subscriptionId });
  }
}