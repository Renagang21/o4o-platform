/**
 * PaymentCoreService
 *
 * WO-O4O-PAYMENT-CORE-V0.1
 *
 * 결제 흐름 조율 서비스
 *
 * 핵심 책임:
 * - 결제 준비 (prepare) → paymentId 반환
 * - 결제 확인 (confirm) → PG 승인 + 상태 업데이트 + 이벤트 발행
 * - 결제 상태 조회
 *
 * 의존성:
 * - EcommercePaymentService (ecommerce-core): 결제 상태 관리
 * - TossPaymentsService (ecommerce-core): PG 통합
 * - PaymentEventService: 이벤트 발행/저장
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EcommercePayment,
  PaymentTransactionStatus,
  PaymentMethod,
} from '@o4o/ecommerce-core';
import { TossPaymentsService } from '@o4o/ecommerce-core';
import { PaymentEventService } from './PaymentEventService.js';
import {
  PreparePaymentRequest,
  PreparePaymentResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
  PaymentStatusResponse,
  PaymentHealthResponse,
  PaymentCoreStatus,
} from '../types/PaymentTypes.js';

@Injectable()
export class PaymentCoreService {
  private tossService: TossPaymentsService;

  constructor(
    @InjectRepository(EcommercePayment)
    private readonly paymentRepository: Repository<EcommercePayment>,
    private readonly eventService: PaymentEventService
  ) {
    // TossPaymentsService 초기화
    this.tossService = new TossPaymentsService();
  }

  /**
   * 트랜잭션 ID 생성
   */
  private generateTransactionId(): string {
    const now = new Date();
    const timestamp = now.getTime();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PAY-${timestamp}-${random}`;
  }

  /**
   * PaymentTransactionStatus → PaymentCoreStatus 변환
   */
  private mapToPaymentCoreStatus(status: PaymentTransactionStatus): PaymentCoreStatus {
    switch (status) {
      case PaymentTransactionStatus.PENDING:
        return PaymentCoreStatus.PENDING;
      case PaymentTransactionStatus.PROCESSING:
        return PaymentCoreStatus.AUTHORIZED;
      case PaymentTransactionStatus.COMPLETED:
        return PaymentCoreStatus.CONFIRMED;
      case PaymentTransactionStatus.FAILED:
        return PaymentCoreStatus.FAILED;
      case PaymentTransactionStatus.CANCELLED:
        return PaymentCoreStatus.CANCELLED;
      default:
        return PaymentCoreStatus.PENDING;
    }
  }

  /**
   * 결제 준비
   *
   * POST /api/payments/prepare
   *
   * 1. EcommercePayment 레코드 생성 (PENDING)
   * 2. TossPaymentsService로 클라이언트 정보 생성
   * 3. payment.initiated 이벤트 발행
   */
  async prepare(request: PreparePaymentRequest): Promise<PreparePaymentResponse> {
    const transactionId = this.generateTransactionId();

    // 1. 결제 레코드 생성
    const payment = this.paymentRepository.create({
      orderId: request.orderId,
      transactionId,
      paymentMethod: PaymentMethod.CARD, // 기본값
      status: PaymentTransactionStatus.PENDING,
      requestedAmount: request.amount,
      currency: request.currency || 'KRW',
      pgProvider: 'toss',
      requestedAt: new Date(),
      metadata: request.metadata,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // 2. Toss 클라이언트 정보 생성
    const tossInfo = this.tossService.preparePayment({
      orderId: request.orderId,
      orderName: request.orderName,
      amount: request.amount,
      successUrl: request.successUrl,
      failUrl: request.failUrl,
      customerEmail: request.customerEmail,
      customerName: request.customerName,
    });

    // 3. 이벤트 발행
    await this.eventService.emitInitiated({
      paymentId: savedPayment.id,
      transactionId: savedPayment.transactionId,
      orderId: request.orderId,
      requestedAmount: request.amount,
      currency: request.currency || 'KRW',
      metadata: request.metadata,
    });

    return {
      paymentId: savedPayment.id,
      transactionId: savedPayment.transactionId,
      orderId: request.orderId,
      amount: request.amount,
      clientKey: tossInfo.clientKey,
      successUrl: tossInfo.successUrl,
      failUrl: tossInfo.failUrl,
      isTestMode: this.tossService.isTestMode(),
    };
  }

  /**
   * 결제 확인 (서버 검증)
   *
   * POST /api/payments/{paymentId}/confirm
   *
   * ⭐ 핵심 API: PG 승인 → 상태 업데이트 → payment.completed 이벤트 발행
   *
   * 1. 결제 레코드 조회 및 검증
   * 2. 금액 검증
   * 3. TossPaymentsService.confirmPayment() 호출
   * 4. 상태 업데이트 (COMPLETED)
   * 5. payment.completed 이벤트 발행
   */
  async confirm(
    paymentId: string,
    request: ConfirmPaymentRequest
  ): Promise<ConfirmPaymentResponse> {
    // 1. 결제 레코드 조회
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // 이미 완료된 결제인지 확인
    if (payment.status === PaymentTransactionStatus.COMPLETED) {
      throw new Error('Payment already completed');
    }

    // 2. 금액 검증
    if (Number(payment.requestedAmount) !== request.amount) {
      await this.eventService.emitFailed({
        paymentId: payment.id,
        transactionId: payment.transactionId,
        orderId: request.orderId,
        errorCode: 'AMOUNT_MISMATCH',
        errorMessage: `Amount mismatch: expected ${payment.requestedAmount}, got ${request.amount}`,
      });
      throw new Error('Payment amount mismatch');
    }

    // 3. Toss 결제 승인
    let tossResponse;
    try {
      tossResponse = await this.tossService.confirmPayment({
        paymentKey: request.paymentKey,
        orderId: request.orderId,
        amount: request.amount,
      });
    } catch (error: any) {
      // PG 승인 실패
      payment.status = PaymentTransactionStatus.FAILED;
      payment.failureReason = error.message;
      payment.failedAt = new Date();
      await this.paymentRepository.save(payment);

      await this.eventService.emitFailed({
        paymentId: payment.id,
        transactionId: payment.transactionId,
        orderId: request.orderId,
        errorCode: error.code || 'PG_CONFIRM_FAILED',
        errorMessage: error.message,
      });

      throw error;
    }

    // 4. 상태 업데이트
    payment.status = PaymentTransactionStatus.COMPLETED;
    payment.externalPaymentId = tossResponse.paymentKey;
    payment.paidAmount = tossResponse.totalAmount;
    payment.paidAt = new Date(tossResponse.approvedAt);

    if (tossResponse.card) {
      payment.cardCompany = tossResponse.card.company;
      payment.cardNumber = tossResponse.card.number;
      payment.installmentMonths = tossResponse.card.installmentPlanMonths;
    }

    payment.metadata = {
      ...payment.metadata,
      tossResponse: tossResponse.rawResponse,
    };

    await this.paymentRepository.save(payment);

    // 5. 이벤트 발행 (confirmed + completed)
    const approvedAt = new Date(tossResponse.approvedAt);

    await this.eventService.emitConfirmed({
      paymentId: payment.id,
      transactionId: payment.transactionId,
      orderId: request.orderId,
      paymentKey: tossResponse.paymentKey,
      paidAmount: tossResponse.totalAmount,
      paymentMethod: tossResponse.method,
      approvedAt,
    });

    // ⭐ payment.completed 이벤트 (Extension App 트리거)
    await this.eventService.emitCompleted({
      paymentId: payment.id,
      transactionId: payment.transactionId,
      orderId: request.orderId,
      paymentKey: tossResponse.paymentKey,
      paidAmount: tossResponse.totalAmount,
      paymentMethod: tossResponse.method,
      approvedAt,
      card: tossResponse.card
        ? {
            company: tossResponse.card.company,
            number: tossResponse.card.number,
            installmentMonths: tossResponse.card.installmentPlanMonths,
          }
        : undefined,
      receiptUrl: tossResponse.receipt?.url,
    });

    return {
      paymentId: payment.id,
      transactionId: payment.transactionId,
      orderId: request.orderId,
      status: PaymentCoreStatus.CONFIRMED,
      paidAmount: tossResponse.totalAmount,
      method: tossResponse.method,
      approvedAt: tossResponse.approvedAt,
      card: tossResponse.card
        ? {
            company: tossResponse.card.company,
            number: tossResponse.card.number,
            installmentMonths: tossResponse.card.installmentPlanMonths,
          }
        : undefined,
      receiptUrl: tossResponse.receipt?.url,
    };
  }

  /**
   * 결제 상태 조회
   *
   * GET /api/payments/{paymentId}
   */
  async getStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return {
      paymentId: payment.id,
      transactionId: payment.transactionId,
      orderId: payment.orderId,
      status: this.mapToPaymentCoreStatus(payment.status),
      requestedAmount: Number(payment.requestedAmount),
      paidAmount: Number(payment.paidAmount),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      pgProvider: payment.pgProvider,
      requestedAt: payment.requestedAt,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      failureReason: payment.failureReason,
    };
  }

  /**
   * 트랜잭션 ID로 조회
   */
  async findByTransactionId(transactionId: string): Promise<PaymentStatusResponse | null> {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId },
    });

    if (!payment) {
      return null;
    }

    return this.getStatus(payment.id);
  }

  /**
   * 주문 ID로 조회
   */
  async findByOrderId(orderId: string): Promise<PaymentStatusResponse[]> {
    const payments = await this.paymentRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    return payments.map((payment) => ({
      paymentId: payment.id,
      transactionId: payment.transactionId,
      orderId: payment.orderId,
      status: this.mapToPaymentCoreStatus(payment.status),
      requestedAmount: Number(payment.requestedAmount),
      paidAmount: Number(payment.paidAmount),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      pgProvider: payment.pgProvider,
      requestedAt: payment.requestedAt,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      failureReason: payment.failureReason,
    }));
  }

  /**
   * 헬스체크
   *
   * GET /api/payments/health
   */
  getHealth(): PaymentHealthResponse {
    const pgStatus = this.tossService.getConfigStatus();

    return {
      status: pgStatus.isConfigured ? 'healthy' : 'degraded',
      pg: {
        provider: 'toss',
        isConfigured: pgStatus.isConfigured,
        isTestMode: pgStatus.isTestMode,
        baseUrl: pgStatus.baseUrl,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
