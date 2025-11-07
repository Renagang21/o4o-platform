import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/Payment.js';
import { PaymentSettlement, SettlementStatus, RecipientType } from '../entities/PaymentSettlement.js';
import { PaymentWebhook, WebhookEventType } from '../entities/PaymentWebhook.js';
import { Order } from '../entities/Order.js';
import logger from '../utils/logger.js';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

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
  idempotencyKey?: string; // 멱등성 키 (선택사항, 없으면 자동 생성)
}

export interface CancelPaymentRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number; // 부분 취소 금액 (없으면 전액)
  idempotencyKey?: string; // 멱등성 키 (선택사항, 없으면 자동 생성)
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
    // 멱등성 키 생성 (없으면 orderId + paymentKey 조합)
    const idempotencyKey = request.idempotencyKey || `confirm_${request.orderId}_${request.paymentKey}`;

    // 멱등성 체크: 동일한 키로 이미 처리된 요청이 있는지 확인
    const existingPayment = await this.paymentRepository.findOne({
      where: { confirmIdempotencyKey: idempotencyKey }
    });

    if (existingPayment) {
      logger.info(`Idempotent request detected for confirmPayment: ${idempotencyKey}`);

      // 이미 성공적으로 처리된 경우 기존 결과 반환
      if (existingPayment.status === PaymentStatus.DONE) {
        logger.info(`Returning existing confirmed payment: ${existingPayment.id}`);
        return existingPayment;
      }

      // 진행 중이거나 실패한 경우 에러 반환
      if (existingPayment.status === PaymentStatus.IN_PROGRESS) {
        throw new Error('Payment confirmation already in progress');
      }

      if (existingPayment.status === PaymentStatus.ABORTED) {
        throw new Error(`Payment confirmation previously failed: ${existingPayment.failureMessage}`);
      }
    }

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

      // 멱등성 키 저장
      payment.confirmIdempotencyKey = idempotencyKey;
      payment.status = PaymentStatus.IN_PROGRESS; // 처리 중 상태로 변경
      await queryRunner.manager.save(Payment, payment);

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
    // 멱등성 키 생성 (없으면 paymentKey + cancelReason 조합)
    const cancelAmount = request.cancelAmount || 0;
    const idempotencyKey = request.idempotencyKey ||
      `cancel_${request.paymentKey}_${cancelAmount}_${Date.now()}`;

    // 멱등성 체크: 동일한 키로 이미 처리된 요청이 있는지 확인
    const existingPayment = await this.paymentRepository.findOne({
      where: { cancelIdempotencyKey: idempotencyKey }
    });

    if (existingPayment) {
      logger.info(`Idempotent request detected for cancelPayment: ${idempotencyKey}`);

      // 이미 취소된 경우 기존 결과 반환
      if (existingPayment.status === PaymentStatus.CANCELED ||
          existingPayment.status === PaymentStatus.PARTIAL_CANCELED) {
        logger.info(`Returning existing canceled payment: ${existingPayment.id}`);
        return existingPayment;
      }
    }

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

      // 멱등성 키 저장
      payment.cancelIdempotencyKey = idempotencyKey;

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
   * 웹훅 서명 검증
   * @param payload 웹훅 페이로드 (JSON 문자열)
   * @param headers HTTP 헤더
   * @returns 검증 성공 여부
   */
  private verifyWebhookSignature(payload: string, headers: any): boolean {
    try {
      const signature = headers['tosspayments-signature'];
      const transmissionTime = headers['tosspayments-webhook-transmission-time'];

      // 필수 헤더 검증
      if (!signature || !transmissionTime) {
        logger.warn('[Webhook] Missing required headers', {
          hasSignature: !!signature,
          hasTransmissionTime: !!transmissionTime
        });
        return false;
      }

      // 서명 형식 검증: "v1:signature1,signature2,..."
      if (!signature.startsWith('v1:')) {
        logger.warn('[Webhook] Invalid signature format (must start with v1:)', {
          signaturePrefix: signature.substring(0, 10)
        });
        return false;
      }

      // Clock skew 검증 (타임스탬프 유효성)
      try {
        const transmissionTimestamp = parseInt(transmissionTime, 10);
        if (isNaN(transmissionTimestamp)) {
          logger.warn('[Webhook] Invalid transmission time format', {
            transmissionTime
          });
          return false;
        }

        const now = Math.floor(Date.now() / 1000); // 현재 시간 (초 단위)
        const clockSkewSeconds = parseInt(process.env.WEBHOOK_CLOCK_SKEW_SECONDS || '300', 10); // 기본 5분
        const timeDifference = Math.abs(now - transmissionTimestamp);

        if (timeDifference > clockSkewSeconds) {
          logger.warn('[Webhook] Transmission time exceeds clock skew tolerance', {
            transmissionTimestamp,
            currentTimestamp: now,
            timeDifference,
            clockSkewSeconds,
            transmissionDate: new Date(transmissionTimestamp * 1000).toISOString(),
            currentDate: new Date(now * 1000).toISOString()
          });
          return false;
        }
      } catch (error) {
        logger.error('[Webhook] Error validating transmission time', { error });
        return false;
      }

      // "v1:" 제거 후 서명들 분리
      const signatures = signature.substring(3).split(',');

      // 검증할 데이터: {payload}:{transmissionTime}
      const dataToVerify = `${payload}:${transmissionTime}`;

      // HMAC-SHA256으로 해시 생성
      const expectedHash = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(dataToVerify)
        .digest();

      // 제공된 서명 중 하나와 timing-safe 비교
      const isValid = signatures.some(sig => {
        try {
          const receivedHash = Buffer.from(sig, 'base64');

          // 길이가 다르면 비교 불가
          if (receivedHash.length !== expectedHash.length) {
            return false;
          }

          // Timing-safe 비교 (타이밍 공격 방지)
          return crypto.timingSafeEqual(receivedHash, expectedHash);
        } catch (error) {
          logger.debug('[Webhook] Signature comparison error (likely invalid base64)', {
            error: error instanceof Error ? error.message : String(error)
          });
          return false;
        }
      });

      if (!isValid) {
        logger.error('[Webhook] Signature verification failed', {
          receivedSignatureCount: signatures.length,
          // 보안상 실제 서명은 로깅하지 않음
          signaturePrefix: signatures[0]?.substring(0, 10),
          payloadLength: payload.length,
          transmissionTime
        });
      } else {
        logger.info('[Webhook] Signature verification succeeded', {
          transmissionTime,
          payloadLength: payload.length
        });
      }

      return isValid;
    } catch (error) {
      logger.error('[Webhook] Error verifying webhook signature', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * 웹훅 처리
   */
  async handleWebhook(eventType: WebhookEventType, payload: any, headers: any, rawBody?: string): Promise<PaymentWebhook> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 웹훅 서명 검증
      const payloadString = rawBody || JSON.stringify(payload);
      const isSignatureValid = this.verifyWebhookSignature(payloadString, headers);

      // 웹훅 로그 생성
      const webhook = new PaymentWebhook();
      webhook.eventType = eventType;
      webhook.paymentKey = payload.paymentKey;
      webhook.orderId = payload.orderId;
      webhook.transactionKey = payload.transactionKey;
      webhook.payload = payload;
      webhook.headers = headers;
      webhook.signature = headers['tosspayments-signature'];
      webhook.signatureVerified = isSignatureValid;

      const savedWebhook = await queryRunner.manager.save(PaymentWebhook, webhook);

      // 서명 검증 실패 시 처리 중단
      if (!isSignatureValid) {
        const error = new Error('Invalid webhook signature');
        savedWebhook.markAsFailed(error);
        await queryRunner.manager.save(PaymentWebhook, savedWebhook);
        await queryRunner.commitTransaction();

        logger.error('Webhook signature verification failed', {
          eventType,
          orderId: payload.orderId,
          paymentKey: payload.paymentKey
        });

        throw error;
      }

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
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Payment 조회
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['order']
      });

      if (!payment || !payment.order) {
        logger.error(`Payment or Order not found for settlement: ${paymentId}`);
        return;
      }

      const order = payment.order;
      const settlements: PaymentSettlement[] = [];

      // 1. 공급자별 정산 생성
      const supplierSettlements = this.calculateSupplierSettlements(order, payment);
      settlements.push(...supplierSettlements);

      // 2. 파트너 커미션 정산 (partnerId가 있는 경우)
      const partnerSettlement = this.calculatePartnerSettlement(order, payment);
      if (partnerSettlement) {
        settlements.push(partnerSettlement);
      }

      // 3. 플랫폼 수수료 정산
      const platformSettlement = this.calculatePlatformSettlement(order, payment);
      settlements.push(platformSettlement);

      // 정산 저장
      await queryRunner.manager.save(PaymentSettlement, settlements);
      await queryRunner.commitTransaction();

      logger.info(`Created ${settlements.length} settlements for payment: ${paymentId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Error creating settlements:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 공급자별 정산 계산
   */
  private calculateSupplierSettlements(order: any, payment: Payment): PaymentSettlement[] {
    const settlements: PaymentSettlement[] = [];
    const supplierMap = new Map<string, { totalAmount: number; name: string }>();

    // OrderItem에서 공급자별 금액 집계
    order.items?.forEach((item: any) => {
      const supplierId = item.supplierId;
      const supplierName = item.supplierName;
      const amount = item.unitPrice * item.quantity; // 공급가 기준

      if (supplierMap.has(supplierId)) {
        const existing = supplierMap.get(supplierId)!;
        existing.totalAmount += amount;
      } else {
        supplierMap.set(supplierId, { totalAmount: amount, name: supplierName });
      }
    });

    // 공급자별 정산 생성
    const now = new Date();
    const settlementDate = new Date(now);
    settlementDate.setDate(settlementDate.getDate() + 3); // D+3

    supplierMap.forEach((supplierData, supplierId) => {
      const settlement = new PaymentSettlement();
      settlement.paymentId = payment.id;
      settlement.recipientType = RecipientType.SUPPLIER;
      settlement.recipientId = supplierId;
      settlement.recipientName = supplierData.name;
      settlement.amount = supplierData.totalAmount;
      settlement.fee = 0; // 공급자 수수료 없음
      settlement.tax = 0;
      settlement.netAmount = supplierData.totalAmount;
      settlement.status = SettlementStatus.SCHEDULED;
      settlement.scheduledAt = settlementDate;

      settlements.push(settlement);
    });

    return settlements;
  }

  /**
   * 파트너 커미션 정산 계산
   */
  private calculatePartnerSettlement(order: any, payment: Payment): PaymentSettlement | null {
    // Feature flag 체크
    const enablePartnerSettlement = process.env.ENABLE_PARTNER_SETTLEMENT === 'true';
    if (!enablePartnerSettlement) {
      logger.debug('Partner settlement disabled by feature flag');
      return null;
    }

    // 파트너 정보가 없으면 null 반환
    if (!order.partnerId || !order.partnerName) {
      logger.debug('No partner information in order, skipping partner settlement');
      return null;
    }

    // 기본 커미션 비율 (향후 CommissionPolicy 또는 Partner 엔티티에서 가져올 수 있음)
    const defaultCommissionRate = 10.0; // 10%
    const commissionAmount = (order.summary?.total || payment.amount) * (defaultCommissionRate / 100);

    // 커미션이 0 이하면 정산하지 않음
    if (commissionAmount <= 0) {
      logger.warn(`Partner commission is zero or negative for order ${order.id}`);
      return null;
    }

    // 정산 보류 기간 (환경변수, 기본 7일)
    const settlementHoldDays = parseInt(process.env.SETTLEMENT_HOLD_DAYS || '7', 10);
    const settlementDate = new Date();
    settlementDate.setDate(settlementDate.getDate() + settlementHoldDays);

    // PaymentSettlement 생성
    const settlement = new PaymentSettlement();
    settlement.paymentId = payment.id;
    settlement.recipientType = RecipientType.PARTNER;
    settlement.recipientId = order.partnerId;
    settlement.recipientName = order.partnerName;
    settlement.amount = commissionAmount;
    settlement.fee = 0; // 파트너 수수료 없음
    settlement.tax = 0; // 세금 계산 필요 시 추가
    settlement.netAmount = commissionAmount;
    settlement.status = SettlementStatus.SCHEDULED;
    settlement.scheduledAt = settlementDate;

    // 메타데이터 추가 (추적용)
    settlement.metadata = {
      referralCode: order.referralCode,
      commissionRate: defaultCommissionRate,
      orderTotal: order.summary?.total || payment.amount,
      calculatedAt: new Date().toISOString()
    };

    logger.info(`Partner settlement calculated for order ${order.id}: ${commissionAmount} KRW for partner ${order.partnerId}`);

    return settlement;
  }

  /**
   * 플랫폼 수수료 정산 계산
   */
  private calculatePlatformSettlement(order: any, payment: Payment): PaymentSettlement {
    const platformFeeRate = 0.05; // 5% 플랫폼 수수료
    const platformFee = order.summary?.total * platformFeeRate || payment.amount * platformFeeRate;

    const settlement = new PaymentSettlement();
    settlement.paymentId = payment.id;
    settlement.recipientType = RecipientType.PLATFORM;
    settlement.recipientId = '00000000-0000-0000-0000-000000000000'; // 플랫폼 고정 ID
    settlement.recipientName = 'O4O Platform';
    settlement.amount = platformFee;
    settlement.fee = 0;
    settlement.tax = 0;
    settlement.netAmount = platformFee;
    settlement.status = SettlementStatus.COMPLETED; // 플랫폼 수수료는 즉시 완료
    settlement.scheduledAt = new Date();
    settlement.completedAt = new Date();

    return settlement;
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
