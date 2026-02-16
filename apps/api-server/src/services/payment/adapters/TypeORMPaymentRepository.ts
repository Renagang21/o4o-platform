/**
 * TypeORM Payment Repository
 *
 * WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1
 *
 * PaymentRepository 인터페이스 구현.
 * PlatformPayment entity를 사용하여 o4o_payments 테이블에 접근.
 */

import { DataSource, Repository } from 'typeorm';
import type { PaymentRepository, PaymentProps } from '@o4o/payment-core';
import { PlatformPayment } from '../../../entities/payment/PlatformPayment.entity.js';

/**
 * Entity → PaymentProps 변환
 */
function toProps(entity: PlatformPayment): PaymentProps {
  return {
    id: entity.id,
    status: entity.status as PaymentProps['status'],
    amount: Number(entity.amount),
    currency: entity.currency,
    transactionId: entity.transactionId,
    orderId: entity.orderId ?? undefined,
    paymentKey: entity.paymentKey ?? undefined,
    paymentMethod: entity.paymentMethod ?? undefined,
    paidAmount: entity.paidAmount != null ? Number(entity.paidAmount) : undefined,
    requestedAt: entity.requestedAt,
    paidAt: entity.paidAt ?? undefined,
    failedAt: entity.failedAt ?? undefined,
    cancelledAt: entity.cancelledAt ?? undefined,
    refundedAt: entity.refundedAt ?? undefined,
    failureReason: entity.failureReason ?? undefined,
    sourceService: entity.sourceService,
    metadata: entity.metadata ?? undefined,
  };
}

export class TypeORMPaymentRepository implements PaymentRepository {
  private repo: Repository<PlatformPayment>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(PlatformPayment);
  }

  async findById(id: string): Promise<PaymentProps | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? toProps(entity) : null;
  }

  async findByTransactionId(transactionId: string): Promise<PaymentProps | null> {
    const entity = await this.repo.findOne({ where: { transactionId } });
    return entity ? toProps(entity) : null;
  }

  async findByOrderId(orderId: string): Promise<PaymentProps | null> {
    const entity = await this.repo.findOne({ where: { orderId } });
    return entity ? toProps(entity) : null;
  }

  async save(payment: PaymentProps): Promise<PaymentProps> {
    const existing = await this.repo.findOne({ where: { id: payment.id } });

    if (existing) {
      // Update existing record
      existing.status = payment.status;
      existing.amount = payment.amount;
      existing.currency = payment.currency;
      existing.transactionId = payment.transactionId;
      existing.orderId = payment.orderId ?? null;
      existing.paymentKey = payment.paymentKey ?? null;
      existing.paymentMethod = payment.paymentMethod ?? null;
      existing.paidAmount = payment.paidAmount ?? null;
      existing.requestedAt = payment.requestedAt;
      existing.paidAt = payment.paidAt ?? null;
      existing.failedAt = payment.failedAt ?? null;
      existing.cancelledAt = payment.cancelledAt ?? null;
      existing.refundedAt = payment.refundedAt ?? null;
      existing.failureReason = payment.failureReason ?? null;
      existing.sourceService = payment.sourceService;
      existing.metadata = payment.metadata ?? null;

      const saved = await this.repo.save(existing);
      return toProps(saved);
    }

    // Create new record
    const entity = this.repo.create({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      transactionId: payment.transactionId,
      orderId: payment.orderId ?? null,
      paymentKey: payment.paymentKey ?? null,
      paymentMethod: payment.paymentMethod ?? null,
      paidAmount: payment.paidAmount ?? null,
      requestedAt: payment.requestedAt,
      paidAt: payment.paidAt ?? null,
      failedAt: payment.failedAt ?? null,
      cancelledAt: payment.cancelledAt ?? null,
      refundedAt: payment.refundedAt ?? null,
      failureReason: payment.failureReason ?? null,
      sourceService: payment.sourceService,
      metadata: payment.metadata ?? null,
    });

    const saved = await this.repo.save(entity);
    return toProps(saved);
  }

  /**
   * 원자적 상태 전이 — 동시성 보호
   *
   * UPDATE WHERE status = fromStatus
   * affected = 0 → 이미 다른 요청이 전이 완료
   */
  async transitionStatus(id: string, fromStatus: string, toStatus: string): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(PlatformPayment)
      .set({ status: toStatus })
      .where('id = :id AND status = :fromStatus', { id, fromStatus })
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
