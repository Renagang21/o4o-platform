/**
 * PartnerSettlementService
 *
 * 정산 배치 생성, 마감, 지급 처리
 *
 * @package @o4o/partner-core
 */

import { Repository, Between, LessThanOrEqual, IsNull } from 'typeorm';
import {
  PartnerSettlementBatch,
  SettlementBatchStatus,
} from '../entities/PartnerSettlementBatch.entity.js';
import { PartnerCommission, CommissionStatus } from '../entities/PartnerCommission.entity.js';
import { Partner } from '../entities/Partner.entity.js';

export interface CreateSettlementBatchDto {
  partnerId: string;
  periodStart: Date;
  periodEnd: Date;
  paymentDueDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface SettlementBatchFilter {
  partnerId?: string;
  status?: SettlementBatchStatus;
  periodStart?: Date;
  periodEnd?: Date;
  page?: number;
  limit?: number;
}

export interface PaymentInfo {
  method?: string;
  accountNumber?: string;
  bankName?: string;
  reference?: string;
  transactionId?: string;
}

export class PartnerSettlementService {
  constructor(
    private settlementBatchRepository: Repository<PartnerSettlementBatch>,
    private commissionRepository: Repository<PartnerCommission>,
    private partnerRepository: Repository<Partner>
  ) {}

  /**
   * 배치 번호 생성
   */
  private generateBatchNumber(partnerId: string): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `STL-${dateStr}-${partnerId.slice(0, 4).toUpperCase()}-${random}`;
  }

  /**
   * 정산 배치 생성
   */
  async createBatch(data: CreateSettlementBatchDto): Promise<PartnerSettlementBatch> {
    // 파트너 존재 확인
    const partner = await this.partnerRepository.findOne({
      where: { id: data.partnerId },
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    // 동일 기간 열린 배치 확인
    const existingBatch = await this.settlementBatchRepository.findOne({
      where: {
        partnerId: data.partnerId,
        status: SettlementBatchStatus.OPEN,
      },
    });

    if (existingBatch) {
      throw new Error('An open settlement batch already exists for this partner');
    }

    const batch = this.settlementBatchRepository.create({
      partnerId: data.partnerId,
      batchNumber: this.generateBatchNumber(data.partnerId),
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      conversionCount: 0,
      totalCommissionAmount: 0,
      deductionAmount: 0,
      netAmount: 0,
      status: SettlementBatchStatus.OPEN,
      paymentDueDate: data.paymentDueDate,
      notes: data.notes,
      metadata: data.metadata,
    });

    return this.settlementBatchRepository.save(batch);
  }

  /**
   * 정산 배치 조회 (ID)
   */
  async findById(id: string): Promise<PartnerSettlementBatch | null> {
    return this.settlementBatchRepository.findOne({
      where: { id },
      relations: ['partner', 'commissions'],
    });
  }

  /**
   * 배치 번호로 조회
   */
  async findByBatchNumber(batchNumber: string): Promise<PartnerSettlementBatch | null> {
    return this.settlementBatchRepository.findOne({
      where: { batchNumber },
      relations: ['partner', 'commissions'],
    });
  }

  /**
   * 정산 배치 목록 조회
   */
  async findAll(filter: SettlementBatchFilter = {}): Promise<{
    items: PartnerSettlementBatch[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, periodStart, periodEnd, ...where } = filter;

    const qb = this.settlementBatchRepository.createQueryBuilder('batch');

    if (where.partnerId) {
      qb.andWhere('batch.partnerId = :partnerId', {
        partnerId: where.partnerId,
      });
    }

    if (where.status) {
      qb.andWhere('batch.status = :status', { status: where.status });
    }

    if (periodStart) {
      qb.andWhere('batch.periodStart >= :periodStart', { periodStart });
    }

    if (periodEnd) {
      qb.andWhere('batch.periodEnd <= :periodEnd', { periodEnd });
    }

    qb.orderBy('batch.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 확정 커미션을 배치에 추가
   */
  async addCommissionsToBatch(batchId: string): Promise<PartnerSettlementBatch | null> {
    const batch = await this.findById(batchId);
    if (!batch) return null;

    if (batch.status !== SettlementBatchStatus.OPEN) {
      throw new Error('Cannot add commissions to non-open batch');
    }

    // 확정된 커미션 중 정산되지 않은 것들을 배치에 추가
    const result = await this.commissionRepository
      .createQueryBuilder()
      .update(PartnerCommission)
      .set({ settlementBatchId: batchId })
      .where('partnerId = :partnerId', { partnerId: batch.partnerId })
      .andWhere('status = :status', { status: CommissionStatus.CONFIRMED })
      .andWhere('settlementBatchId IS NULL')
      .andWhere('createdAt <= :periodEnd', { periodEnd: batch.periodEnd })
      .execute();

    // 배치 통계 업데이트
    await this.updateBatchStats(batchId);

    return this.findById(batchId);
  }

  /**
   * 배치 통계 업데이트
   */
  private async updateBatchStats(batchId: string): Promise<void> {
    const stats = await this.commissionRepository
      .createQueryBuilder('commission')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(commission.finalAmount)', 'totalAmount')
      .where('commission.settlementBatchId = :batchId', { batchId })
      .getRawOne();

    await this.settlementBatchRepository.update(batchId, {
      conversionCount: parseInt(stats?.count || '0', 10),
      totalCommissionAmount: parseFloat(stats?.totalAmount || '0'),
      netAmount: parseFloat(stats?.totalAmount || '0'), // 공제 없이 우선 설정
    });
  }

  /**
   * 공제 금액 설정
   */
  async setDeduction(
    batchId: string,
    deductionAmount: number
  ): Promise<PartnerSettlementBatch | null> {
    const batch = await this.findById(batchId);
    if (!batch) return null;

    if (batch.status !== SettlementBatchStatus.OPEN) {
      throw new Error('Cannot modify non-open batch');
    }

    batch.deductionAmount = deductionAmount;
    batch.netAmount = Number(batch.totalCommissionAmount) - deductionAmount;

    return this.settlementBatchRepository.save(batch);
  }

  /**
   * 정산 배치 마감
   */
  async closeBatch(batchId: string): Promise<PartnerSettlementBatch | null> {
    const batch = await this.findById(batchId);
    if (!batch) return null;

    if (batch.status !== SettlementBatchStatus.OPEN) {
      throw new Error('Batch is not open');
    }

    batch.status = SettlementBatchStatus.CLOSED;
    batch.closedAt = new Date();

    return this.settlementBatchRepository.save(batch);
  }

  /**
   * 정산 처리 시작
   */
  async startProcessing(batchId: string): Promise<PartnerSettlementBatch | null> {
    const batch = await this.findById(batchId);
    if (!batch) return null;

    if (batch.status !== SettlementBatchStatus.CLOSED) {
      throw new Error('Batch must be closed before processing');
    }

    batch.status = SettlementBatchStatus.PROCESSING;
    return this.settlementBatchRepository.save(batch);
  }

  /**
   * 지급 완료 처리
   */
  async markAsPaid(
    batchId: string,
    paymentInfo: PaymentInfo
  ): Promise<PartnerSettlementBatch | null> {
    const batch = await this.findById(batchId);
    if (!batch) return null;

    if (batch.status !== SettlementBatchStatus.PROCESSING) {
      throw new Error('Batch must be processing before marking as paid');
    }

    // 커미션들을 정산됨으로 처리
    await this.commissionRepository
      .createQueryBuilder()
      .update(PartnerCommission)
      .set({
        status: CommissionStatus.SETTLED,
        settledAt: new Date(),
      })
      .where('settlementBatchId = :batchId', { batchId })
      .execute();

    batch.status = SettlementBatchStatus.PAID;
    batch.paidAt = new Date();
    batch.paymentInfo = paymentInfo;

    return this.settlementBatchRepository.save(batch);
  }

  /**
   * 지급 실패 처리
   */
  async markAsFailed(
    batchId: string,
    reason: string
  ): Promise<PartnerSettlementBatch | null> {
    const batch = await this.findById(batchId);
    if (!batch) return null;

    batch.status = SettlementBatchStatus.FAILED;
    batch.failureReason = reason;

    return this.settlementBatchRepository.save(batch);
  }

  /**
   * 실패한 배치 재시도
   */
  async retryBatch(batchId: string): Promise<PartnerSettlementBatch | null> {
    const batch = await this.findById(batchId);
    if (!batch) return null;

    if (batch.status !== SettlementBatchStatus.FAILED) {
      throw new Error('Only failed batches can be retried');
    }

    batch.status = SettlementBatchStatus.PROCESSING;
    batch.failureReason = undefined;

    return this.settlementBatchRepository.save(batch);
  }

  /**
   * 파트너별 정산 통계
   */
  async getStatsByPartnerId(partnerId: string): Promise<{
    totalBatches: number;
    openBatches: number;
    paidBatches: number;
    totalPaidAmount: number;
    pendingAmount: number;
  }> {
    const totalBatches = await this.settlementBatchRepository.count({
      where: { partnerId },
    });

    const openBatches = await this.settlementBatchRepository.count({
      where: { partnerId, status: SettlementBatchStatus.OPEN },
    });

    const paidBatches = await this.settlementBatchRepository.count({
      where: { partnerId, status: SettlementBatchStatus.PAID },
    });

    // 지급 완료 금액 합계
    const paidResult = await this.settlementBatchRepository
      .createQueryBuilder('batch')
      .select('SUM(batch.netAmount)', 'totalPaidAmount')
      .where('batch.partnerId = :partnerId', { partnerId })
      .andWhere('batch.status = :status', { status: SettlementBatchStatus.PAID })
      .getRawOne();

    // 대기 중인 금액 (열린 배치 + 마감된 배치)
    const pendingResult = await this.settlementBatchRepository
      .createQueryBuilder('batch')
      .select('SUM(batch.netAmount)', 'pendingAmount')
      .where('batch.partnerId = :partnerId', { partnerId })
      .andWhere('batch.status IN (:...statuses)', {
        statuses: [
          SettlementBatchStatus.OPEN,
          SettlementBatchStatus.CLOSED,
          SettlementBatchStatus.PROCESSING,
        ],
      })
      .getRawOne();

    return {
      totalBatches,
      openBatches,
      paidBatches,
      totalPaidAmount: parseFloat(paidResult?.totalPaidAmount || '0'),
      pendingAmount: parseFloat(pendingResult?.pendingAmount || '0'),
    };
  }

  /**
   * 자동 정산 배치 생성 (월별)
   */
  async createMonthlyBatches(): Promise<PartnerSettlementBatch[]> {
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // 전월 말일
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 전월 1일

    // 정산 대상 파트너 조회 (확정 커미션이 있는 파트너)
    const partners = await this.commissionRepository
      .createQueryBuilder('commission')
      .select('DISTINCT commission.partnerId', 'partnerId')
      .where('commission.status = :status', { status: CommissionStatus.CONFIRMED })
      .andWhere('commission.settlementBatchId IS NULL')
      .andWhere('commission.createdAt <= :periodEnd', { periodEnd })
      .getRawMany();

    const batches: PartnerSettlementBatch[] = [];

    for (const { partnerId } of partners) {
      try {
        const batch = await this.createBatch({
          partnerId,
          periodStart,
          periodEnd,
          paymentDueDate: new Date(now.getFullYear(), now.getMonth(), 15), // 익월 15일 지급 예정
        });

        await this.addCommissionsToBatch(batch.id);
        batches.push(batch);
      } catch (error) {
        // 이미 배치가 있거나 다른 오류인 경우 스킵
        console.error(`Failed to create batch for partner ${partnerId}:`, error);
      }
    }

    return batches;
  }

  /**
   * 정산 요약 조회
   */
  async getSummary(): Promise<{
    totalBatches: number;
    openBatches: number;
    closedBatches: number;
    processingBatches: number;
    paidBatches: number;
    failedBatches: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
  }> {
    const statusCounts = await this.settlementBatchRepository
      .createQueryBuilder('batch')
      .select('batch.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(batch.netAmount)', 'amount')
      .groupBy('batch.status')
      .getRawMany();

    let totalBatches = 0;
    let openBatches = 0;
    let closedBatches = 0;
    let processingBatches = 0;
    let paidBatches = 0;
    let failedBatches = 0;
    let totalPaidAmount = 0;
    let totalPendingAmount = 0;

    statusCounts.forEach((row) => {
      const count = parseInt(row.count, 10);
      const amount = parseFloat(row.amount || '0');
      totalBatches += count;

      switch (row.status) {
        case SettlementBatchStatus.OPEN:
          openBatches = count;
          totalPendingAmount += amount;
          break;
        case SettlementBatchStatus.CLOSED:
          closedBatches = count;
          totalPendingAmount += amount;
          break;
        case SettlementBatchStatus.PROCESSING:
          processingBatches = count;
          totalPendingAmount += amount;
          break;
        case SettlementBatchStatus.PAID:
          paidBatches = count;
          totalPaidAmount += amount;
          break;
        case SettlementBatchStatus.FAILED:
          failedBatches = count;
          break;
      }
    });

    return {
      totalBatches,
      openBatches,
      closedBatches,
      processingBatches,
      paidBatches,
      failedBatches,
      totalPaidAmount,
      totalPendingAmount,
    };
  }
}
