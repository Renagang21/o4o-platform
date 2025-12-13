/**
 * SettlementOpsService
 *
 * 정산/수수료 조회 서비스 (Seller 관점)
 *
 * Phase 2 업데이트:
 * - contextType = 'seller' 기반 조회
 * - Core Entity 직접 사용
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SettlementBatch,
  CommissionTransaction,
  SettlementBatchStatus,
  SettlementType,
} from '@o4o/dropshipping-core';
import type {
  SettlementSummaryDto,
  SettlementBatchDto,
  CommissionDetailDto,
  SettlementContextType,
} from '../dto/index.js';

/**
 * SellerOps는 SettlementType.SELLER만 처리합니다.
 *
 * 다른 정산 유형(SUPPLIER, PLATFORM_EXTENSION)은
 * 각각 supplierops, partnerops 등에서 처리합니다.
 */
const SELLER_SETTLEMENT_TYPE = SettlementType.SELLER;

@Injectable()
export class SettlementOpsService {
  constructor(
    @InjectRepository(SettlementBatch)
    private readonly settlementRepository: Repository<SettlementBatch>,
    @InjectRepository(CommissionTransaction)
    private readonly commissionRepository: Repository<CommissionTransaction>
  ) {}

  /**
   * 정산 요약 조회 (Seller 관점)
   *
   * settlementType = SELLER인 정산 배치만 조회
   */
  async getSettlementSummary(sellerId: string): Promise<SettlementSummaryDto> {
    // 총 정산 완료 금액 (seller settlementType)
    const paidResult = await this.settlementRepository
      .createQueryBuilder('batch')
      .where('batch.sellerId = :sellerId', { sellerId })
      .andWhere('batch.settlementType = :settlementType', { settlementType: SELLER_SETTLEMENT_TYPE })
      .andWhere('batch.status = :status', { status: 'paid' })
      .select('SUM(batch.netAmount)', 'total')
      .getRawOne();

    const totalSettled = parseFloat(paidResult?.total || '0');

    // 정산 대기 금액 (seller settlementType)
    const pendingResult = await this.settlementRepository
      .createQueryBuilder('batch')
      .where('batch.sellerId = :sellerId', { sellerId })
      .andWhere('batch.settlementType = :settlementType', { settlementType: SELLER_SETTLEMENT_TYPE })
      .andWhere('batch.status = :status', { status: 'closed' })
      .select('SUM(batch.netAmount)', 'total')
      .getRawOne();

    const pendingSettlement = parseFloat(pendingResult?.total || '0');

    // 현재 기간 판매액 (seller settlementType)
    const currentPeriod = await this.settlementRepository.findOne({
      where: {
        sellerId,
        settlementType: SELLER_SETTLEMENT_TYPE,
        status: SettlementBatchStatus.OPEN,
      },
    });

    const currentPeriodSales = currentPeriod?.totalAmount || 0;
    const currentPeriodCommission = currentPeriod?.commissionAmount || 0;

    return {
      totalSettled,
      pendingSettlement,
      currentPeriodSales,
      currentPeriodCommission,
    };
  }

  /**
   * 정산 배치 목록 조회 (Seller 관점)
   *
   * settlementType = SELLER인 정산 배치만 조회
   */
  async getSettlementBatches(
    sellerId: string,
    filters?: { status?: string; year?: number; month?: number }
  ): Promise<SettlementBatchDto[]> {
    const query = this.settlementRepository
      .createQueryBuilder('batch')
      .where('batch.sellerId = :sellerId', { sellerId })
      .andWhere('batch.settlementType = :settlementType', { settlementType: SELLER_SETTLEMENT_TYPE });

    if (filters?.status) {
      query.andWhere('batch.status = :status', { status: filters.status });
    }

    if (filters?.year) {
      query.andWhere('EXTRACT(YEAR FROM batch.periodStart) = :year', {
        year: filters.year,
      });
    }

    if (filters?.month) {
      query.andWhere('EXTRACT(MONTH FROM batch.periodStart) = :month', {
        month: filters.month,
      });
    }

    query.orderBy('batch.periodStart', 'DESC');

    const batches = await query.getMany();

    // 각 배치의 트랜잭션 수 조회
    const result: SettlementBatchDto[] = [];
    for (const batch of batches) {
      const transactionCount = await this.commissionRepository.count({
        where: { settlementBatchId: batch.id },
      });

      result.push({
        id: batch.id,
        periodStart: batch.periodStart,
        periodEnd: batch.periodEnd,
        totalAmount: batch.totalAmount,
        commissionAmount: batch.commissionAmount,
        netAmount: batch.netAmount,
        status: batch.status,
        contextType: batch.contextType as SettlementContextType,
        transactionCount,
        closedAt: batch.closedAt,
        paidAt: batch.paidAt,
      });
    }

    return result;
  }

  /**
   * 정산 배치 상세 조회 (Seller 관점)
   *
   * settlementType = SELLER인 정산 배치만 조회
   */
  async getSettlementBatchById(
    batchId: string,
    sellerId: string
  ): Promise<SettlementBatchDto | null> {
    const batch = await this.settlementRepository.findOne({
      where: {
        id: batchId,
        sellerId,
        settlementType: SELLER_SETTLEMENT_TYPE,
      },
    });

    if (!batch) return null;

    const transactionCount = await this.commissionRepository.count({
      where: { settlementBatchId: batch.id },
    });

    return {
      id: batch.id,
      periodStart: batch.periodStart,
      periodEnd: batch.periodEnd,
      totalAmount: batch.totalAmount,
      commissionAmount: batch.commissionAmount,
      netAmount: batch.netAmount,
      status: batch.status,
      contextType: batch.contextType as SettlementContextType,
      transactionCount,
      closedAt: batch.closedAt,
      paidAt: batch.paidAt,
    };
  }

  /**
   * 수수료 상세 내역 조회 (Seller 관점)
   *
   * settlementType = SELLER인 정산 배치만 조회
   */
  async getCommissionDetails(
    sellerId: string,
    batchId?: string
  ): Promise<CommissionDetailDto[]> {
    const query = this.commissionRepository
      .createQueryBuilder('commission')
      .innerJoin('commission.settlementBatch', 'batch')
      .leftJoinAndSelect('commission.orderRelay', 'orderRelay')
      .leftJoinAndSelect('orderRelay.listing', 'listing')
      .leftJoinAndSelect('listing.offer', 'offer')
      .leftJoinAndSelect('offer.productMaster', 'productMaster')
      .where('batch.sellerId = :sellerId', { sellerId })
      .andWhere('batch.settlementType = :settlementType', { settlementType: SELLER_SETTLEMENT_TYPE });

    if (batchId) {
      query.andWhere('commission.settlementBatchId = :batchId', { batchId });
    }

    query.orderBy('commission.createdAt', 'DESC');

    const commissions = await query.getMany();

    return commissions.map((c) => {
      const orderAmount = Number(c.orderAmount) || 0;
      const commissionAmount = Number(c.commissionAmount) || 0;
      const productName =
        c.orderRelay?.listing?.offer?.productMaster?.name || 'Unknown';

      return {
        id: c.id,
        orderId: c.orderRelayId,
        productName,
        saleAmount: orderAmount,
        commissionRate: c.appliedRate || 0,
        commissionAmount,
        netAmount: orderAmount - commissionAmount,
        createdAt: c.createdAt,
      };
    });
  }
}
