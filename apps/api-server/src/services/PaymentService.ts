import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/Payment';
import { PaymentSettlement, SettlementStatus, RecipientType } from '../entities/PaymentSettlement';
import { PaymentWebhook, WebhookEventType } from '../entities/PaymentWebhook';
import { Order } from '../entities/Order';
import logger from '../utils/logger';
import axios, { AxiosInstance } from 'axios';

export interface PreparePaymentRequest {
  orderId: string;
  amount: number;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
  customerMobilePhone?: string;
  successUrl: string;
  failUrl: string;
}

export interface ConfirmPaymentRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface CancelPaymentRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number; // 부분 취소 금액 (없으면 전액)
}

export interface TossPaymentsConfig {
  clientKey: string;
  secretKey: string;
  apiUrl: string;
}

export class PaymentService {
  private paymentRepository: Repository<Payment>;
  private settlementRepository: Repository<PaymentSettlement>;
  private webhookRepository: Repository<PaymentWebhook>;
  private orderRepository: Repository<Order>;
  private tossClient: AxiosInstance;
  private config: TossPaymentsConfig;

  constructor() {
    this.paymentRepository = AppDataSource.getRepository(Payment);
    this.settlementRepository = AppDataSource.getRepository(PaymentSettlement);
    this.webhookRepository = AppDataSource.getRepository(PaymentWebhook);
    this.orderRepository = AppDataSource.getRepository(Order);

    // 토스페이먼츠 설정
    this.config = {
      clientKey: process.env.TOSS_CLIENT_KEY || 'test_ck_',
      secretKey: process.env.TOSS_SECRET_KEY || 'test_sk_',
      apiUrl: process.env.TOSS_API_URL || 'https://api.tosspayments.com/v1'
    };

    // Axios 인스턴스 생성
    this.tossClient = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Authorization': `Basic ${Buffer.from(this.config.secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 결제 준비 - 결제 위젯으로 전달할 정보 생성
   */
  async preparePayment(request: PreparePaymentRequest): Promise<Payment> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 주문 정보 확인
      const order = await this.orderRepository.findOne({
        where: { id: request.orderId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // 금액 검증 - 주문 금액과 결제 요청 금액 일치 확인
      const orderTotal = order.calculateTotal();
      if (Math.abs(orderTotal - request.amount) > 0.01) {
        throw new Error(`Amount mismatch. Order: ${orderTotal}, Request: ${request.amount}`);
      }

      // 이미 결제가 진행 중이거나 완료된 경우 체크
      const existingPayment = await this.paymentRepository.findOne({
        where: {
          orderId: request.orderId,
          status: PaymentStatus.DONE
        }
      });

      if (existingPayment) {
        throw new Error('Payment already completed for this order');
      }

      // Payment 엔티티 생성
      const payment = new Payment();
      payment.orderId = request.orderId;
      payment.amount = request.amount;
      payment.balanceAmount = request.amount;
      payment.currency = 'KRW';
      payment.orderName = request.orderName;
      payment.customerEmail = request.customerEmail;
      payment.customerName = request.customerName;
      payment.customerMobilePhone = request.customerMobilePhone;
      payment.successUrl = request.successUrl;
      payment.failUrl = request.failUrl;
      payment.status = PaymentStatus.PENDING;

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      await queryRunner.commitTransaction();

      logger.info(`Payment prepared: ${savedPayment.id} for order ${request.orderId}`);

      return savedPayment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error preparing payment:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 결제 승인 - 토스페이먼츠 API 호출
   */
  async confirmPayment(request: ConfirmPaymentRequest): Promise<Payment> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 기존 결제 정보 조회
      const payment = await this.paymentRepository.findOne({
        where: { orderId: request.orderId }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // 금액 재검증
      if (Math.abs(payment.amount - request.amount) > 0.01) {
        throw new Error('Amount mismatch during confirmation');
      }

      // 토스페이먼츠 API 호출
      const response = await this.tossClient.post('/payments/confirm', {
        paymentKey: request.paymentKey,
        orderId: request.orderId,
        amount: request.amount
      });

      // 응답 데이터로 Payment 업데이트
      const tossResponse = response.data;

      payment.paymentKey = tossResponse.paymentKey;
      payment.transactionId = tossResponse.transactionKey;
      payment.method = this.mapPaymentMethod(tossResponse.method);
      payment.status = this.mapPaymentStatus(tossResponse.status);
      payment.approvedAt = new Date(tossResponse.approvedAt);
      payment.gatewayResponse = tossResponse;

      // 카드 정보 등 상세 정보 저장
      if (tossResponse.card) {
        payment.methodDetails = tossResponse.card;
      } else if (tossResponse.virtualAccount) {
        payment.methodDetails = tossResponse.virtualAccount;
      } else if (tossResponse.easyPay) {
        payment.methodDetails = tossResponse.easyPay;
      }

      const updatedPayment = await queryRunner.manager.save(Payment, payment);

      // 주문 상태 업데이트
      const order = await this.orderRepository.findOne({
        where: { id: request.orderId }
      });

      if (order) {
        order.paymentStatus = 'completed' as any;
        order.paymentDate = new Date();
        await queryRunner.manager.save(Order, order);
      }

      await queryRunner.commitTransaction();

      logger.info(`Payment confirmed: ${updatedPayment.id}, paymentKey: ${request.paymentKey}`);

      // 정산 생성 (비동기)
      this.createSettlements(updatedPayment.id).catch(err => {
        logger.error('Error creating settlements:', err);
      });

      return updatedPayment;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // 실패 정보 저장
      if (error.response?.data) {
        await this.recordPaymentFailure(request.orderId, error.response.data);
      }

      logger.error('Error confirming payment:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 결제 취소/환불
   */
  async cancelPayment(request: CancelPaymentRequest): Promise<Payment> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await this.paymentRepository.findOne({
        where: { paymentKey: request.paymentKey }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (!payment.canBeCanceled()) {
        throw new Error('Payment cannot be canceled');
      }

      // 취소 금액 결정 (없으면 전액)
      const cancelAmount = request.cancelAmount || payment.balanceAmount;

      // 토스페이먼츠 API 호출
      const response = await this.tossClient.post(`/payments/${request.paymentKey}/cancel`, {
        cancelReason: request.cancelReason,
        cancelAmount
      });

      const tossResponse = response.data;

      // Payment 업데이트
      payment.cancelAmount += cancelAmount;
      payment.balanceAmount -= cancelAmount;
      payment.cancelReason = request.cancelReason;
      payment.canceledAt = new Date();

      // 취소 내역 추가
      if (!payment.cancels) {
        payment.cancels = [];
      }
      payment.cancels.push({
        cancelAmount,
        cancelReason: request.cancelReason,
        canceledAt: new Date().toISOString(),
        transactionKey: tossResponse.transactionKey
      });

      // 상태 업데이트
      if (payment.balanceAmount <= 0) {
        payment.status = PaymentStatus.CANCELED;
      } else {
        payment.status = PaymentStatus.PARTIAL_CANCELED;
      }

      payment.gatewayResponse = tossResponse;

      const updatedPayment = await queryRunner.manager.save(Payment, payment);

      await queryRunner.commitTransaction();

      logger.info(`Payment canceled: ${updatedPayment.id}, amount: ${cancelAmount}`);

      return updatedPayment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error canceling payment:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 웹훅 처리
   */
  async handleWebhook(eventType: WebhookEventType, payload: any, headers: any): Promise<PaymentWebhook> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 웹훅 로그 생성
      const webhook = new PaymentWebhook();
      webhook.eventType = eventType;
      webhook.paymentKey = payload.paymentKey;
      webhook.orderId = payload.orderId;
      webhook.transactionKey = payload.transactionKey;
      webhook.payload = payload;
      webhook.headers = headers;
      webhook.signature = headers['toss-signature'];

      const savedWebhook = await queryRunner.manager.save(PaymentWebhook, webhook);

      // 웹훅 처리
      try {
        await this.processWebhook(savedWebhook);
        savedWebhook.markAsProcessed();
      } catch (error) {
        savedWebhook.markAsFailed(error as Error);
      }

      await queryRunner.manager.save(PaymentWebhook, savedWebhook);
      await queryRunner.commitTransaction();

      return savedWebhook;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error handling webhook:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 정산 생성
   */
  private async createSettlements(paymentId: string): Promise<void> {
    // TODO: 실제 정산 로직 구현
    // - 공급자 정산
    // - 파트너 커미션
    // - 플랫폼 수수료
    logger.info(`Creating settlements for payment: ${paymentId}`);
  }

  /**
   * 웹훅 처리 로직
   */
  private async processWebhook(webhook: PaymentWebhook): Promise<void> {
    const { eventType, payload } = webhook;

    switch (eventType) {
      case WebhookEventType.PAYMENT_CONFIRMED:
        await this.handlePaymentConfirmed(payload);
        break;

      case WebhookEventType.PAYMENT_CANCELLED:
        await this.handlePaymentCancelled(payload);
        break;

      case WebhookEventType.VIRTUAL_ACCOUNT_DEPOSIT:
        await this.handleVirtualAccountDeposit(payload);
        break;

      default:
        logger.warn(`Unhandled webhook event type: ${eventType}`);
    }
  }

  private async handlePaymentConfirmed(payload: any): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { paymentKey: payload.paymentKey }
    });

    if (payment) {
      payment.webhookReceived = true;
      payment.status = this.mapPaymentStatus(payload.status);
      await this.paymentRepository.save(payment);
    }
  }

  private async handlePaymentCancelled(payload: any): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { paymentKey: payload.paymentKey }
    });

    if (payment) {
      payment.status = PaymentStatus.CANCELED;
      await this.paymentRepository.save(payment);
    }
  }

  private async handleVirtualAccountDeposit(payload: any): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { paymentKey: payload.paymentKey }
    });

    if (payment) {
      payment.status = PaymentStatus.DONE;
      payment.approvedAt = new Date();
      await this.paymentRepository.save(payment);
    }
  }

  /**
   * 결제 실패 기록
   */
  private async recordPaymentFailure(orderId: string, errorData: any): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId }
    });

    if (payment) {
      payment.status = PaymentStatus.ABORTED;
      payment.failureCode = errorData.code;
      payment.failureMessage = errorData.message;
      await this.paymentRepository.save(payment);
    }
  }

  /**
   * 토스페이먼츠 결제 수단 매핑
   */
  private mapPaymentMethod(tossMethod: string): PaymentMethod {
    const methodMap: Record<string, PaymentMethod> = {
      '카드': PaymentMethod.CARD,
      '가상계좌': PaymentMethod.VIRTUAL_ACCOUNT,
      '계좌이체': PaymentMethod.TRANSFER,
      '휴대폰': PaymentMethod.MOBILE_PHONE,
      '카카오페이': PaymentMethod.KAKAO_PAY,
      '네이버페이': PaymentMethod.NAVER_PAY,
      '토스페이': PaymentMethod.TOSS_PAY,
      'PAYCO': PaymentMethod.PAYCO,
      '간편결제': PaymentMethod.EASY_PAY
    };

    return methodMap[tossMethod] || PaymentMethod.CARD;
  }

  /**
   * 토스페이먼츠 결제 상태 매핑
   */
  private mapPaymentStatus(tossStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'READY': PaymentStatus.PENDING,
      'IN_PROGRESS': PaymentStatus.IN_PROGRESS,
      'WAITING_FOR_DEPOSIT': PaymentStatus.WAITING_FOR_DEPOSIT,
      'DONE': PaymentStatus.DONE,
      'CANCELED': PaymentStatus.CANCELED,
      'PARTIAL_CANCELED': PaymentStatus.PARTIAL_CANCELED,
      'ABORTED': PaymentStatus.ABORTED,
      'EXPIRED': PaymentStatus.EXPIRED
    };

    return statusMap[tossStatus] || PaymentStatus.PENDING;
  }

  /**
   * Payment 조회
   */
  async getPayment(paymentId: string): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['order', 'settlements']
    });
  }

  /**
   * Order의 Payment 조회
   */
  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { orderId },
      relations: ['settlements']
    });
  }

  /**
   * Payment Key로 조회
   */
  async getPaymentByKey(paymentKey: string): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { paymentKey },
      relations: ['order', 'settlements']
    });
  }
}

export default new PaymentService();
