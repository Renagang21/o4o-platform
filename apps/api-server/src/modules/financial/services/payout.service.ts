/**
 * Payout Service
 *
 * WO-O4O-PAYOUT-ENGINE-V1
 *
 * Settlement/Commission → PayoutBatch → PayoutItems → Paid
 *
 * Supplier payout: neture_settlements (status=approved, paid_at IS NULL)
 * Partner payout: partner_commissions (status=approved, paid_at IS NULL)
 */

import type { DataSource, Repository } from 'typeorm';
import { PayoutBatch } from '../entities/payout-batch.entity.js';
import { PayoutItem } from '../entities/payout-item.entity.js';
import logger from '../../../utils/logger.js';

export class PayoutService {
  private batchRepo: Repository<PayoutBatch>;
  private itemRepo: Repository<PayoutItem>;

  constructor(private dataSource: DataSource) {
    this.batchRepo = dataSource.getRepository(PayoutBatch);
    this.itemRepo = dataSource.getRepository(PayoutItem);
  }

  /**
   * Supplier payout batch 생성
   * approved 상태이며 미지급 settlement을 수집하여 배치 생성
   */
  async createSupplierPayoutBatch(
    periodStart: string,
    periodEnd: string,
    notes?: string,
  ): Promise<{ success: boolean; data?: PayoutBatch; error?: string; itemCount?: number }> {
    // 1. eligible settlements 조회
    const settlements = await this.dataSource.query(
      `SELECT id, supplier_id, supplier_amount
       FROM neture_settlements
       WHERE status = 'approved'
         AND paid_at IS NULL
         AND period_start >= $1
         AND period_end <= $2`,
      [periodStart, periodEnd],
    );

    if (settlements.length === 0) {
      return { success: false, error: 'NO_ELIGIBLE_SETTLEMENTS' };
    }

    // 2. 이미 payout_items에 포함된 settlement 제외
    const settlementIds = settlements.map((s: any) => s.id);
    const existingItems = await this.dataSource.query(
      `SELECT reference_id FROM payout_items WHERE reference_id = ANY($1)`,
      [settlementIds],
    );
    const existingRefIds = new Set(existingItems.map((e: any) => e.reference_id));
    const eligible = settlements.filter((s: any) => !existingRefIds.has(s.id));

    if (eligible.length === 0) {
      return { success: false, error: 'ALL_SETTLEMENTS_ALREADY_IN_PAYOUT' };
    }

    // 3. batch 생성
    const totalAmount = eligible.reduce((sum: number, s: any) => sum + Number(s.supplier_amount), 0);
    const batch = this.batchRepo.create({
      payoutType: 'supplier',
      periodStart,
      periodEnd,
      totalAmount,
      itemCount: eligible.length,
      status: 'created',
      notes: notes ?? null,
    });
    const savedBatch = await this.batchRepo.save(batch);

    // 4. payout_items 생성
    const items = eligible.map((s: any) =>
      this.itemRepo.create({
        batchId: savedBatch.id,
        entityType: 'supplier',
        entityId: s.supplier_id,
        amount: Number(s.supplier_amount),
        referenceId: s.id,
        status: 'pending',
      }),
    );
    await this.itemRepo.save(items);

    logger.info(`[PayoutService] Supplier payout batch created: ${savedBatch.id}, items: ${eligible.length}, total: ${totalAmount}`);
    return { success: true, data: savedBatch, itemCount: eligible.length };
  }

  /**
   * Partner payout batch 생성
   * approved 상태이며 미지급 commission을 수집하여 배치 생성
   */
  async createPartnerPayoutBatch(
    periodStart: string,
    periodEnd: string,
    notes?: string,
  ): Promise<{ success: boolean; data?: PayoutBatch; error?: string; itemCount?: number }> {
    // 1. eligible commissions 조회
    const commissions = await this.dataSource.query(
      `SELECT id, partner_id, commission_amount
       FROM partner_commissions
       WHERE status = 'approved'
         AND paid_at IS NULL
         AND period_start >= $1
         AND period_end <= $2`,
      [periodStart, periodEnd],
    );

    if (commissions.length === 0) {
      return { success: false, error: 'NO_ELIGIBLE_COMMISSIONS' };
    }

    // 2. 이미 payout_items에 포함된 commission 제외
    const commissionIds = commissions.map((c: any) => c.id);
    const existingItems = await this.dataSource.query(
      `SELECT reference_id FROM payout_items WHERE reference_id = ANY($1)`,
      [commissionIds],
    );
    const existingRefIds = new Set(existingItems.map((e: any) => e.reference_id));
    const eligible = commissions.filter((c: any) => !existingRefIds.has(c.id));

    if (eligible.length === 0) {
      return { success: false, error: 'ALL_COMMISSIONS_ALREADY_IN_PAYOUT' };
    }

    // 3. batch 생성
    const totalAmount = eligible.reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);
    const batch = this.batchRepo.create({
      payoutType: 'partner',
      periodStart,
      periodEnd,
      totalAmount,
      itemCount: eligible.length,
      status: 'created',
      notes: notes ?? null,
    });
    const savedBatch = await this.batchRepo.save(batch);

    // 4. payout_items 생성
    const items = eligible.map((c: any) =>
      this.itemRepo.create({
        batchId: savedBatch.id,
        entityType: 'partner',
        entityId: c.partner_id,
        amount: Number(c.commission_amount),
        referenceId: c.id,
        status: 'pending',
      }),
    );
    await this.itemRepo.save(items);

    logger.info(`[PayoutService] Partner payout batch created: ${savedBatch.id}, items: ${eligible.length}, total: ${totalAmount}`);
    return { success: true, data: savedBatch, itemCount: eligible.length };
  }

  /**
   * 지급 완료 처리 (markPaid)
   * batch + 모든 items → paid 상태
   * 원본 settlement/commission도 paid 상태로 변경
   */
  async markPaid(batchId: string, notes?: string): Promise<{ success: boolean; error?: string }> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      return { success: false, error: 'BATCH_NOT_FOUND' };
    }
    if (batch.status === 'paid') {
      return { success: false, error: 'BATCH_ALREADY_PAID' };
    }
    if (batch.status === 'failed') {
      return { success: false, error: 'BATCH_FAILED' };
    }

    const items = await this.itemRepo.find({ where: { batchId } });

    // 트랜잭션으로 일괄 처리
    await this.dataSource.transaction(async (manager) => {
      const now = new Date();

      // 1. batch 상태 변경
      await manager.update(PayoutBatch, batchId, {
        status: 'paid',
        paidAt: now,
        notes: notes ?? batch.notes,
      });

      // 2. items 상태 변경
      await manager.update(PayoutItem, { batchId }, { status: 'paid' });

      // 3. 원본 settlement/commission paid 처리
      const referenceIds = items.map((item) => item.referenceId);

      if (batch.payoutType === 'supplier') {
        await manager.query(
          `UPDATE neture_settlements
           SET status = 'paid', paid_at = $1, updated_at = $1
           WHERE id = ANY($2) AND status = 'approved'`,
          [now, referenceIds],
        );
      } else if (batch.payoutType === 'partner') {
        await manager.query(
          `UPDATE partner_commissions
           SET status = 'paid', paid_at = $1, updated_at = $1
           WHERE id = ANY($2) AND status = 'approved'`,
          [now, referenceIds],
        );
      }
    });

    logger.info(`[PayoutService] Payout batch marked paid: ${batchId}, type: ${batch.payoutType}, items: ${items.length}`);
    return { success: true };
  }

  /**
   * Payout batch 상세 조회 (items 포함)
   */
  async getPayoutBatch(batchId: string): Promise<{
    success: boolean;
    data?: PayoutBatch & { items: PayoutItem[] };
    error?: string;
  }> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      return { success: false, error: 'BATCH_NOT_FOUND' };
    }

    const items = await this.itemRepo.find({
      where: { batchId },
      order: { createdAt: 'ASC' },
    });

    return { success: true, data: { ...batch, items } };
  }

  /**
   * Payout batch 목록 조회
   */
  async listPayoutBatches(filters?: {
    payoutType?: string;
    status?: string;
  }): Promise<PayoutBatch[]> {
    const qb = this.batchRepo.createQueryBuilder('batch');

    if (filters?.payoutType) {
      qb.andWhere('batch.payoutType = :payoutType', { payoutType: filters.payoutType });
    }
    if (filters?.status) {
      qb.andWhere('batch.status = :status', { status: filters.status });
    }

    qb.orderBy('batch.createdAt', 'DESC');
    return qb.getMany();
  }
}
