/**
 * Settlement Service
 *
 * 파트너 정산 관리 서비스 (Partner-Core 기반)
 *
 * @package @o4o/partnerops
 */

import type { Repository } from 'typeorm';
import {
  Partner,
  PartnerCommission,
  PartnerSettlementBatch,
  PartnerSettlementService,
  SettlementBatchStatus,
  type PaymentInfo,
} from '@o4o/partner-core';
import type {
  SettlementSummaryDto,
  SettlementBatchItemDto,
  SettlementQueryDto,
} from '../dto/index.js';

export class SettlementService {
  private partnerSettlementService: PartnerSettlementService;

  constructor(
    private readonly settlementBatchRepository: Repository<PartnerSettlementBatch>,
    private readonly commissionRepository: Repository<PartnerCommission>,
    private readonly partnerRepository: Repository<Partner>
  ) {
    this.partnerSettlementService = new PartnerSettlementService(
      settlementBatchRepository,
      commissionRepository,
      partnerRepository
    );
  }

  /**
   * 정산 요약 조회 (Partner-Core 기반)
   */
  async getSummary(partnerId: string): Promise<SettlementSummaryDto> {
    const stats = await this.partnerSettlementService.getStatsByPartnerId(partnerId);

    // 다음 지급 예정일 계산 (매월 15일)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    const thisMonth15 = new Date(now.getFullYear(), now.getMonth(), 15);
    const nextPaymentDate = now.getDate() < 15 ? thisMonth15 : nextMonth;

    // 마지막 지급일 조회
    const batchResult = await this.partnerSettlementService.findAll({
      partnerId,
      status: SettlementBatchStatus.PAID,
      limit: 1,
    });

    const lastPaidBatch = batchResult.items[0];

    return {
      totalEarnings: stats.totalPaidAmount + stats.pendingAmount,
      settledEarnings: stats.totalPaidAmount,
      pendingEarnings: stats.pendingAmount,
      processingAmount: 0, // 처리 중 금액 별도 조회 필요
      lastPaymentDate: lastPaidBatch?.paidAt,
      nextPaymentDate,
      totalBatches: stats.totalBatches,
      openBatches: stats.openBatches,
      paidBatches: stats.paidBatches,
    };
  }

  /**
   * 정산 배치 목록 조회 (Partner-Core 기반)
   */
  async getBatches(
    partnerId: string,
    filters?: SettlementQueryDto
  ): Promise<SettlementBatchItemDto[]> {
    const result = await this.partnerSettlementService.findAll({
      partnerId,
      status: filters?.status as SettlementBatchStatus | undefined,
      page: filters?.page,
      limit: filters?.limit,
    });

    return result.items.map((batch) => this.toBatchDto(batch));
  }

  /**
   * 정산 배치 상세 조회
   */
  async getBatchById(
    partnerId: string,
    batchId: string
  ): Promise<SettlementBatchItemDto | null> {
    const batch = await this.partnerSettlementService.findById(batchId);
    if (!batch || batch.partnerId !== partnerId) return null;
    return this.toBatchDto(batch);
  }

  /**
   * 정산 배치 생성 (관리자용)
   */
  async createBatch(
    partnerId: string,
    periodStart: Date,
    periodEnd: Date,
    paymentDueDate?: Date
  ): Promise<SettlementBatchItemDto> {
    const batch = await this.partnerSettlementService.createBatch({
      partnerId,
      periodStart,
      periodEnd,
      paymentDueDate,
    });

    // 커미션 추가
    await this.partnerSettlementService.addCommissionsToBatch(batch.id);

    const updatedBatch = await this.partnerSettlementService.findById(batch.id);
    return this.toBatchDto(updatedBatch!);
  }

  /**
   * 정산 배치 마감
   */
  async closeBatch(partnerId: string, batchId: string): Promise<SettlementBatchItemDto | null> {
    const batch = await this.partnerSettlementService.findById(batchId);
    if (!batch || batch.partnerId !== partnerId) return null;

    const closedBatch = await this.partnerSettlementService.closeBatch(batchId);
    return closedBatch ? this.toBatchDto(closedBatch) : null;
  }

  /**
   * 정산 처리 시작
   */
  async startProcessing(
    partnerId: string,
    batchId: string
  ): Promise<SettlementBatchItemDto | null> {
    const batch = await this.partnerSettlementService.findById(batchId);
    if (!batch || batch.partnerId !== partnerId) return null;

    const processingBatch = await this.partnerSettlementService.startProcessing(batchId);
    return processingBatch ? this.toBatchDto(processingBatch) : null;
  }

  /**
   * 지급 완료 처리
   */
  async markAsPaid(
    partnerId: string,
    batchId: string,
    paymentInfo: PaymentInfo
  ): Promise<SettlementBatchItemDto | null> {
    const batch = await this.partnerSettlementService.findById(batchId);
    if (!batch || batch.partnerId !== partnerId) return null;

    const paidBatch = await this.partnerSettlementService.markAsPaid(batchId, paymentInfo);
    return paidBatch ? this.toBatchDto(paidBatch) : null;
  }

  /**
   * 자동 월별 배치 생성
   */
  async createMonthlyBatches(): Promise<SettlementBatchItemDto[]> {
    const batches = await this.partnerSettlementService.createMonthlyBatches();
    return batches.map((batch) => this.toBatchDto(batch));
  }

  /**
   * SettlementBatch → DTO 변환
   */
  private toBatchDto(batch: PartnerSettlementBatch): SettlementBatchItemDto {
    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      periodStart: batch.periodStart,
      periodEnd: batch.periodEnd,
      conversionCount: batch.conversionCount,
      totalCommissionAmount: Number(batch.totalCommissionAmount),
      deductionAmount: Number(batch.deductionAmount),
      netAmount: Number(batch.netAmount),
      status: batch.status as SettlementBatchItemDto['status'],
      paymentDueDate: batch.paymentDueDate,
      paidAt: batch.paidAt,
      createdAt: batch.createdAt,
    };
  }
}

// Factory function
export function createSettlementService(
  settlementBatchRepository: Repository<PartnerSettlementBatch>,
  commissionRepository: Repository<PartnerCommission>,
  partnerRepository: Repository<Partner>
): SettlementService {
  return new SettlementService(
    settlementBatchRepository,
    commissionRepository,
    partnerRepository
  );
}
