/**
 * PartnerEarningsService
 *
 * 파트너 수익 관리 서비스
 */

import type { Repository } from 'typeorm';
import { PartnerEarnings, EarningsType, EarningsStatus } from '../entities/partner-earnings.entity';

export interface CreatePartnerEarningsDto {
  partnerId: string;
  earningsType: EarningsType;
  amount: number;
  orderId?: string;
  linkId?: string;
  routineId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePartnerEarningsDto {
  status?: EarningsStatus;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface EarningsFilter {
  partnerId?: string;
  earningsType?: EarningsType;
  status?: EarningsStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  approvedEarnings: number;
  paidEarnings: number;
  byType: Record<EarningsType, number>;
  monthlyEarnings: { month: string; amount: number }[];
}

export class PartnerEarningsService {
  constructor(private readonly earningsRepository: Repository<PartnerEarnings>) {}

  async logCommission(dto: CreatePartnerEarningsDto): Promise<PartnerEarnings> {
    const earnings = this.earningsRepository.create({
      ...dto,
      status: 'pending',
    });

    return this.earningsRepository.save(earnings);
  }

  async findById(id: string): Promise<PartnerEarnings | null> {
    return this.earningsRepository.findOne({ where: { id } });
  }

  async findByPartnerId(partnerId: string): Promise<PartnerEarnings[]> {
    return this.earningsRepository.find({
      where: { partnerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByFilter(filter: EarningsFilter): Promise<PartnerEarnings[]> {
    const query = this.earningsRepository.createQueryBuilder('earnings');

    if (filter.partnerId) {
      query.andWhere('earnings.partnerId = :partnerId', { partnerId: filter.partnerId });
    }
    if (filter.earningsType) {
      query.andWhere('earnings.earningsType = :earningsType', { earningsType: filter.earningsType });
    }
    if (filter.status) {
      query.andWhere('earnings.status = :status', { status: filter.status });
    }
    if (filter.startDate) {
      query.andWhere('earnings.createdAt >= :startDate', { startDate: filter.startDate });
    }
    if (filter.endDate) {
      query.andWhere('earnings.createdAt <= :endDate', { endDate: filter.endDate });
    }

    return query.orderBy('earnings.createdAt', 'DESC').getMany();
  }

  async updateEarnings(id: string, dto: UpdatePartnerEarningsDto): Promise<PartnerEarnings> {
    const earnings = await this.findById(id);
    if (!earnings) {
      throw new Error('Partner earnings not found');
    }

    Object.assign(earnings, dto);

    // Set timestamps based on status
    if (dto.status === 'approved') {
      earnings.approvedAt = new Date();
    } else if (dto.status === 'paid') {
      earnings.paidAt = new Date();
    }

    return this.earningsRepository.save(earnings);
  }

  async approveEarnings(id: string): Promise<PartnerEarnings> {
    return this.updateEarnings(id, { status: 'approved' });
  }

  async processWithdrawal(partnerId: string, amount: number): Promise<PartnerEarnings> {
    // Get approved earnings for partner
    const approvedEarnings = await this.findByFilter({
      partnerId,
      status: 'approved',
    });

    const totalApproved = approvedEarnings.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    if (totalApproved < amount) {
      throw new Error('Insufficient approved earnings for withdrawal');
    }

    // Create withdrawal record
    const withdrawal = this.earningsRepository.create({
      partnerId,
      earningsType: 'commission',
      amount: -amount,
      status: 'pending',
      description: 'Withdrawal request',
    });

    return this.earningsRepository.save(withdrawal);
  }

  async getEarningsSummary(partnerId: string): Promise<EarningsSummary> {
    const earnings = await this.findByPartnerId(partnerId);

    let totalEarnings = 0;
    let pendingEarnings = 0;
    let approvedEarnings = 0;
    let paidEarnings = 0;

    const byType: Record<EarningsType, number> = {
      commission: 0,
      bonus: 0,
      referral: 0,
      campaign: 0,
    };

    const monthlyMap: Record<string, number> = {};

    for (const earning of earnings) {
      const amount = Number(earning.amount);
      totalEarnings += amount;

      if (earning.status === 'pending') {
        pendingEarnings += amount;
      } else if (earning.status === 'approved') {
        approvedEarnings += amount;
      } else if (earning.status === 'paid') {
        paidEarnings += amount;
      }

      byType[earning.earningsType] += amount;

      // Monthly aggregation
      const month = earning.createdAt.toISOString().substring(0, 7); // YYYY-MM
      monthlyMap[month] = (monthlyMap[month] || 0) + amount;
    }

    const monthlyEarnings = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalEarnings,
      pendingEarnings,
      approvedEarnings,
      paidEarnings,
      byType,
      monthlyEarnings,
    };
  }

  async getPendingApprovals(): Promise<PartnerEarnings[]> {
    return this.earningsRepository.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.earningsRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
