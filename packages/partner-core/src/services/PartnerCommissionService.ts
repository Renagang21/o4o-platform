/**
 * PartnerCommissionService
 *
 * 커미션 계산, 확정, 정산 처리
 *
 * @package @o4o/partner-core
 */

import { Repository } from 'typeorm';
import {
  PartnerCommission,
  CommissionStatus,
} from '../entities/PartnerCommission.entity.js';
import { PartnerConversion, ConversionStatus } from '../entities/PartnerConversion.entity.js';
import { Partner } from '../entities/Partner.entity.js';
import { PartnerSettlementBatch } from '../entities/PartnerSettlementBatch.entity.js';

export interface CreateCommissionDto {
  partnerId: string;
  conversionId: string;
  baseAmount: number;
  commissionRate: number;
  bonusAmount?: number;
  commissionType?: string;
  metadata?: Record<string, any>;
}

export interface CommissionFilter {
  partnerId?: string;
  conversionId?: string;
  settlementBatchId?: string;
  status?: CommissionStatus;
  commissionType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class PartnerCommissionService {
  constructor(
    private commissionRepository: Repository<PartnerCommission>,
    private conversionRepository: Repository<PartnerConversion>,
    private partnerRepository: Repository<Partner>,
    private settlementBatchRepository: Repository<PartnerSettlementBatch>
  ) {}

  /**
   * 커미션 계산 및 생성
   */
  async createCommission(data: CreateCommissionDto): Promise<PartnerCommission> {
    // 커미션 금액 계산
    const commissionAmount = (data.baseAmount * data.commissionRate) / 100;
    const bonusAmount = data.bonusAmount || 0;
    const finalAmount = commissionAmount + bonusAmount;

    const commission = this.commissionRepository.create({
      partnerId: data.partnerId,
      conversionId: data.conversionId,
      baseAmount: data.baseAmount,
      commissionRate: data.commissionRate,
      commissionAmount,
      bonusAmount,
      finalAmount,
      status: CommissionStatus.PENDING,
      commissionType: data.commissionType || 'click',
      metadata: data.metadata,
    });

    const savedCommission = await this.commissionRepository.save(commission);

    // 전환에 커미션 금액 업데이트
    await this.conversionRepository.update(data.conversionId, {
      commissionAmount: finalAmount,
    });

    return savedCommission;
  }

  /**
   * 전환 기반 커미션 자동 생성
   */
  async createCommissionFromConversion(
    conversionId: string,
    bonusAmount?: number,
    commissionType?: string
  ): Promise<PartnerCommission | null> {
    // 전환 조회
    const conversion = await this.conversionRepository.findOne({
      where: { id: conversionId },
      relations: ['partner'],
    });

    if (!conversion) {
      return null;
    }

    // 파트너 조회 (커미션율 확인)
    const partner = await this.partnerRepository.findOne({
      where: { id: conversion.partnerId },
    });

    if (!partner) {
      return null;
    }

    // 기존 커미션 확인
    const existingCommission = await this.commissionRepository.findOne({
      where: { conversionId },
    });

    if (existingCommission) {
      return existingCommission;
    }

    return this.createCommission({
      partnerId: conversion.partnerId,
      conversionId,
      baseAmount: Number(conversion.orderAmount),
      commissionRate: Number(partner.commissionRate),
      bonusAmount,
      commissionType,
    });
  }

  /**
   * 커미션 조회 (ID)
   */
  async findById(id: string): Promise<PartnerCommission | null> {
    return this.commissionRepository.findOne({
      where: { id },
      relations: ['partner', 'conversion', 'settlementBatch'],
    });
  }

  /**
   * 전환 ID로 커미션 조회
   */
  async findByConversionId(conversionId: string): Promise<PartnerCommission | null> {
    return this.commissionRepository.findOne({
      where: { conversionId },
      relations: ['partner', 'conversion'],
    });
  }

  /**
   * 커미션 목록 조회
   */
  async findAll(filter: CommissionFilter = {}): Promise<{
    items: PartnerCommission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, startDate, endDate, ...where } = filter;

    const qb = this.commissionRepository.createQueryBuilder('commission');

    if (where.partnerId) {
      qb.andWhere('commission.partnerId = :partnerId', {
        partnerId: where.partnerId,
      });
    }

    if (where.conversionId) {
      qb.andWhere('commission.conversionId = :conversionId', {
        conversionId: where.conversionId,
      });
    }

    if (where.settlementBatchId) {
      qb.andWhere('commission.settlementBatchId = :settlementBatchId', {
        settlementBatchId: where.settlementBatchId,
      });
    }

    if (where.status) {
      qb.andWhere('commission.status = :status', { status: where.status });
    }

    if (where.commissionType) {
      qb.andWhere('commission.commissionType = :commissionType', {
        commissionType: where.commissionType,
      });
    }

    if (startDate) {
      qb.andWhere('commission.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('commission.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('commission.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 커미션 확정
   */
  async confirmCommission(id: string): Promise<PartnerCommission | null> {
    const commission = await this.findById(id);
    if (!commission) return null;

    if (commission.status !== CommissionStatus.PENDING) {
      return commission;
    }

    commission.status = CommissionStatus.CONFIRMED;
    commission.confirmedAt = new Date();

    const savedCommission = await this.commissionRepository.save(commission);

    // 파트너 총 커미션 업데이트
    const partner = await this.partnerRepository.findOne({
      where: { id: commission.partnerId },
    });

    if (partner) {
      partner.totalCommission = Number(partner.totalCommission) + Number(commission.finalAmount);
      await this.partnerRepository.save(partner);
    }

    return savedCommission;
  }

  /**
   * 커미션 취소
   */
  async cancelCommission(id: string): Promise<PartnerCommission | null> {
    const commission = await this.findById(id);
    if (!commission) return null;

    // 이미 정산된 커미션은 취소 불가
    if (commission.status === CommissionStatus.SETTLED) {
      throw new Error('Cannot cancel settled commission');
    }

    // 확정된 커미션 취소 시 파트너 총 커미션 감소
    if (commission.status === CommissionStatus.CONFIRMED) {
      const partner = await this.partnerRepository.findOne({
        where: { id: commission.partnerId },
      });

      if (partner) {
        partner.totalCommission = Math.max(
          0,
          Number(partner.totalCommission) - Number(commission.finalAmount)
        );
        await this.partnerRepository.save(partner);
      }
    }

    commission.status = CommissionStatus.CANCELLED;
    return this.commissionRepository.save(commission);
  }

  /**
   * 커미션 정산 처리 (정산 배치에 포함)
   */
  async settleCommission(
    id: string,
    settlementBatchId: string
  ): Promise<PartnerCommission | null> {
    const commission = await this.findById(id);
    if (!commission) return null;

    if (commission.status !== CommissionStatus.CONFIRMED) {
      throw new Error('Only confirmed commissions can be settled');
    }

    commission.status = CommissionStatus.SETTLED;
    commission.settlementBatchId = settlementBatchId;
    commission.settledAt = new Date();

    return this.commissionRepository.save(commission);
  }

  /**
   * 확정된 커미션 일괄 정산 처리
   */
  async settleConfirmedCommissions(
    partnerId: string,
    settlementBatchId: string
  ): Promise<number> {
    const result = await this.commissionRepository
      .createQueryBuilder()
      .update(PartnerCommission)
      .set({
        status: CommissionStatus.SETTLED,
        settlementBatchId,
        settledAt: new Date(),
      })
      .where('partnerId = :partnerId', { partnerId })
      .andWhere('status = :status', { status: CommissionStatus.CONFIRMED })
      .andWhere('settlementBatchId IS NULL')
      .execute();

    return result.affected || 0;
  }

  /**
   * 파트너별 커미션 통계
   */
  async getStatsByPartnerId(
    partnerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCommissions: number;
    pendingAmount: number;
    confirmedAmount: number;
    settledAmount: number;
    cancelledAmount: number;
    byType: Record<string, { count: number; amount: number }>;
  }> {
    const baseQuery = this.commissionRepository
      .createQueryBuilder('commission')
      .where('commission.partnerId = :partnerId', { partnerId });

    if (startDate) {
      baseQuery.andWhere('commission.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      baseQuery.andWhere('commission.createdAt <= :endDate', { endDate });
    }

    const totalCommissions = await baseQuery.getCount();

    // 상태별 금액 합계
    const statusAmounts = await this.commissionRepository
      .createQueryBuilder('commission')
      .select('commission.status', 'status')
      .addSelect('SUM(commission.finalAmount)', 'amount')
      .where('commission.partnerId = :partnerId', { partnerId })
      .groupBy('commission.status')
      .getRawMany();

    let pendingAmount = 0;
    let confirmedAmount = 0;
    let settledAmount = 0;
    let cancelledAmount = 0;

    statusAmounts.forEach((row) => {
      const amount = parseFloat(row.amount || '0');
      switch (row.status) {
        case CommissionStatus.PENDING:
          pendingAmount = amount;
          break;
        case CommissionStatus.CONFIRMED:
          confirmedAmount = amount;
          break;
        case CommissionStatus.SETTLED:
          settledAmount = amount;
          break;
        case CommissionStatus.CANCELLED:
          cancelledAmount = amount;
          break;
      }
    });

    // 타입별 통계
    const typeStats = await this.commissionRepository
      .createQueryBuilder('commission')
      .select('commission.commissionType', 'commissionType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(commission.finalAmount)', 'amount')
      .where('commission.partnerId = :partnerId', { partnerId })
      .andWhere('commission.status != :status', {
        status: CommissionStatus.CANCELLED,
      })
      .groupBy('commission.commissionType')
      .getRawMany();

    const byType: Record<string, { count: number; amount: number }> = {};
    typeStats.forEach((row) => {
      byType[row.commissionType] = {
        count: parseInt(row.count, 10),
        amount: parseFloat(row.amount),
      };
    });

    return {
      totalCommissions,
      pendingAmount,
      confirmedAmount,
      settledAmount,
      cancelledAmount,
      byType,
    };
  }

  /**
   * 정산 가능 금액 조회
   */
  async getSettleableAmount(partnerId: string): Promise<{
    count: number;
    totalAmount: number;
  }> {
    const result = await this.commissionRepository
      .createQueryBuilder('commission')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(commission.finalAmount)', 'totalAmount')
      .where('commission.partnerId = :partnerId', { partnerId })
      .andWhere('commission.status = :status', {
        status: CommissionStatus.CONFIRMED,
      })
      .andWhere('commission.settlementBatchId IS NULL')
      .getRawOne();

    return {
      count: parseInt(result?.count || '0', 10),
      totalAmount: parseFloat(result?.totalAmount || '0'),
    };
  }
}
