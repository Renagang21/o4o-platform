/**
 * PaymentCoreService — Scaffold
 *
 * WO-O4O-PAYMENT-CORE-SCAFFOLD-V1
 *
 * 결제 흐름 조율 서비스 골격
 *
 * 모든 의존성은 인터페이스로 주입:
 * - PaymentRepository: 결제 데이터 접근
 * - PaymentProviderAdapter: PG 통합
 * - PaymentEventPublisher: 이벤트 발행
 *
 * ❌ No DB direct access (interface only)
 * ❌ No Provider API implementation
 * ❌ No NestJS decorators
 * ❌ No ecommerce-core import
 */

import { PaymentStatus } from '../types/PaymentStatus.js';
import { PaymentEventType } from '../types/PaymentEvents.js';
import type { PaymentProps } from '../types/PaymentProps.js';
import type { PreparePaymentRequest } from '../types/PaymentTypes.js';
import type { PaymentRepository } from '../interfaces/PaymentRepository.js';
import type { PaymentProviderAdapter } from '../interfaces/PaymentProviderAdapter.js';
import type { PaymentEventPublisher } from '../interfaces/PaymentEventPublisher.js';
import { assertTransition } from './PaymentStateMachine.js';

/**
 * 트랜잭션 ID 생성
 */
function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `PAY-${timestamp}-${random}`;
}

export class PaymentCoreService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly provider: PaymentProviderAdapter,
    private readonly eventPublisher: PaymentEventPublisher,
  ) {}

  /**
   * 결제 준비 — 결제 레코드 생성 + PG 세션
   *
   * CREATED 상태로 생성
   */
  async prepare(request: PreparePaymentRequest): Promise<PaymentProps> {
    const providerResult = await this.provider.prepare({
      orderId: request.orderId,
      orderName: request.orderName,
      amount: request.amount,
      successUrl: request.successUrl,
      failUrl: request.failUrl,
      customerEmail: request.customerEmail,
      customerName: request.customerName,
    });

    const payment = await this.repository.save({
      id: crypto.randomUUID(),
      status: PaymentStatus.CREATED,
      amount: request.amount,
      currency: request.currency ?? 'KRW',
      transactionId: generateTransactionId(),
      orderId: request.orderId,
      sourceService: request.sourceService,
      requestedAt: new Date(),
      metadata: {
        ...request.metadata,
        clientKey: providerResult.clientKey,
        isTestMode: providerResult.isTestMode,
      },
    });

    await this.eventPublisher.publish({
      eventType: PaymentEventType.PAYMENT_INITIATED,
      paymentId: payment.id,
      transactionId: payment.transactionId,
      orderId: request.orderId,
      timestamp: new Date(),
      sourceService: request.sourceService,
      requestedAmount: request.amount,
      currency: payment.currency,
    });

    return payment;
  }

  /**
   * 결제 확인 — PG 승인 + 상태 전이 (CREATED → CONFIRMING → PAID)
   *
   * WO-O4O-PAYMENT-CORE-AMOUNT-VERIFICATION-HARDEN-V1:
   * 금액은 Core 내부에서 payment.amount (prepare 시 서버 설정값) 사용.
   * 외부 amount 파라미터 제거 → 프론트엔드 금액 위변조 불가.
   *
   * @param paymentId — 내부 결제 ID
   * @param paymentKey — PG 결제 키
   * @param orderId — PG에 전달할 주문 식별자 (orderNumber)
   * @param internalOrderId — 내부 주문 UUID (이벤트용). 미지정 시 payment.orderId fallback
   *
   * @throws PAYMENT_NOT_FOUND — 결제 레코드 없음
   * @throws PAYMENT_AMOUNT_MISSING — prepare 시 금액 미설정
   * @throws INVALID_PAYMENT_TRANSITION — 상태 전이 불가
   * @throws PAYMENT_ALREADY_PROCESSING — 동시 confirm 감지
   */
  async confirm(
    paymentId: string,
    paymentKey: string,
    orderId: string,
    internalOrderId?: string,
  ): Promise<PaymentProps> {
    const payment = await this.repository.findById(paymentId);
    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    // Core 내부 금액 검증: prepare() 시 서버에서 설정한 payment.amount 사용
    // 프론트엔드가 보낸 금액을 사용하지 않음 → 위변조 원천 차단
    const verifiedAmount = payment.amount;
    if (!verifiedAmount || verifiedAmount <= 0) {
      throw new Error('PAYMENT_AMOUNT_MISSING');
    }

    // 이벤트 발행용 orderId: internalOrderId > payment.orderId > orderId
    const eventOrderId = internalOrderId || payment.orderId || orderId;

    // CREATED → CONFIRMING (동시성 보호)
    if (this.repository.transitionStatus) {
      assertTransition(payment.status, PaymentStatus.CONFIRMING);
      const transitioned = await this.repository.transitionStatus(
        payment.id, PaymentStatus.CREATED, PaymentStatus.CONFIRMING,
      );
      if (!transitioned) {
        throw new Error('PAYMENT_ALREADY_PROCESSING');
      }
      payment.status = PaymentStatus.CONFIRMING;
    } else {
      assertTransition(payment.status, PaymentStatus.CONFIRMING);
      payment.status = PaymentStatus.CONFIRMING;
      await this.repository.save(payment);
    }

    try {
      // PG 승인: Core 내부 verifiedAmount 사용 (프론트엔드 금액 미사용)
      const result = await this.provider.confirm(paymentKey, orderId, verifiedAmount);

      // CONFIRMING → PAID
      assertTransition(payment.status, PaymentStatus.PAID);
      payment.status = PaymentStatus.PAID;
      payment.paymentKey = paymentKey;
      payment.paidAmount = result.paidAmount;
      payment.paymentMethod = result.paymentMethod;
      payment.paidAt = result.approvedAt;
      const saved = await this.repository.save(payment);

      await this.eventPublisher.publish({
        eventType: PaymentEventType.PAYMENT_COMPLETED,
        paymentId: saved.id,
        transactionId: saved.transactionId,
        orderId: eventOrderId,
        timestamp: new Date(),
        sourceService: saved.sourceService,
        paymentKey: paymentKey,
        paidAmount: result.paidAmount,
        paymentMethod: result.paymentMethod,
        approvedAt: result.approvedAt,
        card: result.card,
        receiptUrl: result.receiptUrl,
      });

      return saved;
    } catch (error) {
      // CONFIRMING → FAILED
      payment.status = PaymentStatus.FAILED;
      payment.failedAt = new Date();
      payment.failureReason =
        error instanceof Error ? error.message : 'Unknown error';
      await this.repository.save(payment);

      await this.eventPublisher.publish({
        eventType: PaymentEventType.PAYMENT_FAILED,
        paymentId: payment.id,
        transactionId: payment.transactionId,
        orderId: eventOrderId,
        timestamp: new Date(),
        sourceService: payment.sourceService,
        errorCode: 'PG_CONFIRM_FAILED',
        errorMessage: payment.failureReason,
        failedAt: payment.failedAt,
      });

      throw error;
    }
  }

  /**
   * 결제 취소 — CREATED → CANCELLED
   *
   * @throws PAYMENT_NOT_FOUND
   * @throws INVALID_PAYMENT_TRANSITION
   */
  async cancel(paymentId: string, reason?: string): Promise<PaymentProps> {
    const payment = await this.repository.findById(paymentId);
    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    assertTransition(payment.status, PaymentStatus.CANCELLED);
    payment.status = PaymentStatus.CANCELLED;
    payment.cancelledAt = new Date();
    const saved = await this.repository.save(payment);

    await this.eventPublisher.publish({
      eventType: PaymentEventType.PAYMENT_CANCELLED,
      paymentId: saved.id,
      transactionId: saved.transactionId,
      orderId: saved.orderId ?? '',
      timestamp: new Date(),
      sourceService: saved.sourceService,
      cancelReason: reason,
      cancelledAt: saved.cancelledAt!,
    });

    return saved;
  }

  /**
   * 환불 — PAID → REFUNDED
   *
   * @throws PAYMENT_NOT_FOUND
   * @throws INVALID_PAYMENT_TRANSITION
   * @throws PAYMENT_KEY_MISSING
   */
  async refund(paymentId: string, reason?: string): Promise<PaymentProps> {
    const payment = await this.repository.findById(paymentId);
    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }
    if (!payment.paymentKey) {
      throw new Error('PAYMENT_KEY_MISSING');
    }

    assertTransition(payment.status, PaymentStatus.REFUNDED);

    const result = await this.provider.refund(payment.paymentKey, reason);

    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = result.refundedAt;
    const saved = await this.repository.save(payment);

    await this.eventPublisher.publish({
      eventType: PaymentEventType.PAYMENT_REFUNDED,
      paymentId: saved.id,
      transactionId: saved.transactionId,
      orderId: saved.orderId ?? '',
      timestamp: new Date(),
      sourceService: saved.sourceService,
      refundAmount: result.refundAmount,
      refundReason: reason,
      refundedAt: result.refundedAt,
    });

    return saved;
  }

  /**
   * 결제 상태 조회
   */
  async getStatus(paymentId: string): Promise<PaymentProps | null> {
    return this.repository.findById(paymentId);
  }

  /**
   * 트랜잭션 ID로 조회
   */
  async findByTransactionId(
    transactionId: string,
  ): Promise<PaymentProps | null> {
    return this.repository.findByTransactionId(transactionId);
  }

  /**
   * 주문 참조 ID로 조회
   */
  async findByOrderId(orderId: string): Promise<PaymentProps | null> {
    return this.repository.findByOrderId(orderId);
  }
}
