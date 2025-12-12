/**
 * PartnerEarningsService
 *
 * 파트너 수익 관리 서비스
 * - 수익 기록
 * - 정산 상태 관리
 * - 출금 처리
 */

import type { Repository } from 'typeorm';
import { PartnerEarnings, EarningsType, EarningsStatus } from '../entities/partner-earnings.entity';

export interface LogEarningsDto {
  partnerId: string;
  earningsType: EarningsType;
  amount: number;
  sourceType?: string;
  sourceId?: string;
  linkId?: string;
  orderId?: string;
  orderAmount?: number;
  commissionRate?: number;
  description?: string;
}

export interface EarningsSummary {
  totalPending: number;
  totalAvailable: number;
  totalWithdrawn: number;
  totalEarnings: number;
  recentEarnings: PartnerEarnings[];
}

export class PartnerEarningsService {
  constructor(private readonly repository: Repository<PartnerEarnings>) {}

  /**
   * 수익 기록
   */
  async logEarnings(dto: LogEarningsDto): Promise<PartnerEarnings> {
    const earnings = this.repository.create({
      ...dto,
      status: 'pending',
    });

    return this.repository.save(earnings);
  }

  /**
   * 판매 커미션 기록
   */
  async logCommission(
    partnerId: string,
    orderId: string,
    orderAmount: number,
    commissionRate: number,
    linkId?: string
  ): Promise<PartnerEarnings> {
    const amount = (orderAmount * commissionRate) / 100;

    return this.logEarnings({
      partnerId,
      earningsType: 'commission',
      amount,
      orderId,
      orderAmount,
      commissionRate,
      linkId,
      description: `주문 ${orderId} 커미션`,
    });
  }

  /**
   * ID로 수익 조회
   */
  async findById(id: string): Promise<PartnerEarnings | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * 파트너 ID로 수익 목록 조회
   */
  async findByPartnerId(
    partnerId: string,
    options?: {
      status?: EarningsStatus;
      earningsType?: EarningsType;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: PartnerEarnings[]; total: number }> {
    const { status, earningsType, startDate, endDate, page = 1, limit = 20 } = options || {};

    const queryBuilder = this.repository
      .createQueryBuilder('earnings')
      .where('earnings.partnerId = :partnerId', { partnerId });

    if (status) {
      queryBuilder.andWhere('earnings.status = :status', { status });
    }

    if (earningsType) {
      queryBuilder.andWhere('earnings.earningsType = :earningsType', { earningsType });
    }

    if (startDate) {
      queryBuilder.andWhere('earnings.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('earnings.createdAt <= :endDate', { endDate });
    }

    queryBuilder.orderBy('earnings.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total };
  }

  /**
   * 수익 요약 조회
   */
  async getEarningsSummary(partnerId: string): Promise<EarningsSummary> {
    const result = await this.repository
      .createQueryBuilder('earnings')
      .select([
        'SUM(CASE WHEN earnings.status = :pending THEN earnings.amount ELSE 0 END) as totalPending',
        'SUM(CASE WHEN earnings.status = :available THEN earnings.amount ELSE 0 END) as totalAvailable',
        'SUM(CASE WHEN earnings.status = :withdrawn THEN earnings.amount ELSE 0 END) as totalWithdrawn',
        'SUM(earnings.amount) as totalEarnings',
      ])
      .where('earnings.partnerId = :partnerId', { partnerId })
      .setParameter('pending', 'pending')
      .setParameter('available', 'available')
      .setParameter('withdrawn', 'withdrawn')
      .getRawOne();

    const recentEarnings = await this.repository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalPending: parseFloat(result.totalPending) || 0,
      totalAvailable: parseFloat(result.totalAvailable) || 0,
      totalWithdrawn: parseFloat(result.totalWithdrawn) || 0,
      totalEarnings: parseFloat(result.totalEarnings) || 0,
      recentEarnings,
    };
  }

  /**
   * 상태 변경: pending -> available
   */
  async makeAvailable(id: string): Promise<PartnerEarnings | null> {
    await this.repository.update(id, {
      status: 'available',
      availableAt: new Date(),
    });
    return this.findById(id);
  }

  /**
   * 다건 상태 변경: pending -> available
   */
  async makeMultipleAvailable(ids: string[]): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(PartnerEarnings)
      .set({ status: 'available', availableAt: new Date() })
      .whereInIds(ids)
      .andWhere('status = :status', { status: 'pending' })
      .execute();
  }

  /**
   * 출금 처리
   */
  async processWithdrawal(
    partnerId: string,
    amount: number,
    transactionId: string
  ): Promise<PartnerEarnings[]> {
    // 출금 가능한 수익 조회
    const availableEarnings = await this.repository.find({
      where: { partnerId, status: 'available' as EarningsStatus },
      order: { createdAt: 'ASC' },
    });

    let remainingAmount = amount;
    const processedEarnings: PartnerEarnings[] = [];

    for (const earning of availableEarnings) {
      if (remainingAmount <= 0) break;

      if (Number(earning.amount) <= remainingAmount) {
        // 전체 금액 출금
        await this.repository.update(earning.id, {
          status: 'withdrawn',
          withdrawnAt: new Date(),
          withdrawalTransactionId: transactionId,
        });
        processedEarnings.push(earning);
        remainingAmount -= Number(earning.amount);
      }
    }

    return processedEarnings;
  }

  /**
   * 월별 수익 통계
   */
  async getMonthlyStats(
    partnerId: string,
    year: number,
    month: number
  ): Promise<{
    totalEarnings: number;
    byType: Record<EarningsType, number>;
    count: number;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const result = await this.repository
      .createQueryBuilder('earnings')
      .select([
        'SUM(earnings.amount) as totalEarnings',
        'earnings.earningsType as earningsType',
        'COUNT(*) as count',
      ])
      .where('earnings.partnerId = :partnerId', { partnerId })
      .andWhere('earnings.createdAt >= :startDate', { startDate })
      .andWhere('earnings.createdAt <= :endDate', { endDate })
      .groupBy('earnings.earningsType')
      .getRawMany();

    const byType: Record<EarningsType, number> = {
      commission: 0,
      bonus: 0,
      referral: 0,
      campaign: 0,
    };

    let totalEarnings = 0;
    let totalCount = 0;

    for (const row of result) {
      const amount = parseFloat(row.totalEarnings) || 0;
      byType[row.earningsType as EarningsType] = amount;
      totalEarnings += amount;
      totalCount += parseInt(row.count) || 0;
    }

    return {
      totalEarnings,
      byType,
      count: totalCount,
    };
  }

  /**
   * 취소 처리
   */
  async cancelEarnings(id: string): Promise<PartnerEarnings | null> {
    await this.repository.update(id, { status: 'cancelled' });
    return this.findById(id);
  }
}
