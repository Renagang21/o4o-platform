/**
 * PartnerEarningsService
 *
 * 파트너 수익 관리 서비스
 * - Commission Engine 통합 (Phase 6-D)
 * - 이벤트 기반 수익 기록
 * - 인출 처리 기능
 */

import type { Repository } from 'typeorm';
import { PartnerEarnings, EarningsType, EarningsStatus, EventType } from '../entities/partner-earnings.entity.js';
import type { CommissionEngineService, CommissionCalculationInput } from './commission-engine.service.js';

export interface CreatePartnerEarningsDto {
  partnerId: string;
  earningsType: EarningsType;
  amount: number;
  orderId?: string;
  linkId?: string;
  routineId?: string;
  productId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Commission Engine 연동 수익 기록 DTO
 */
export interface RecordCommissionDto {
  partnerId: string;
  eventType: EventType;
  eventValue: number;
  orderId?: string;
  linkId?: string;
  routineId?: string;
  productId?: string;
  campaignId?: string;
  transactionId?: string;
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
  availableEarnings: number;
  paidEarnings: number;
  withdrawnEarnings: number;
  byType: Record<EarningsType, number>;
  byEventType: Record<EventType, number>;
  monthlyEarnings: { month: string; amount: number }[];
}

export interface WithdrawalResult {
  success: boolean;
  withdrawalId?: string;
  amount: number;
  message: string;
}

export class PartnerEarningsService {
  private commissionEngine?: CommissionEngineService;

  constructor(private readonly earningsRepository: Repository<PartnerEarnings>) {}

  /**
   * Commission Engine 주입 (선택적)
   */
  setCommissionEngine(engine: CommissionEngineService): void {
    this.commissionEngine = engine;
  }

  /**
   * 기존 방식: 직접 금액 지정하여 수익 기록
   */
  async logCommission(dto: CreatePartnerEarningsDto): Promise<PartnerEarnings> {
    const earnings = this.earningsRepository.create({
      ...dto,
      status: 'pending',
    });

    return this.earningsRepository.save(earnings);
  }

  /**
   * Commission Engine 연동: 이벤트 기반 수익 기록
   *
   * Commission Engine이 정책을 조회하고 금액을 자동 계산
   */
  async recordCommission(dto: RecordCommissionDto): Promise<PartnerEarnings> {
    if (!this.commissionEngine) {
      throw new Error('CommissionEngine is not configured');
    }

    // Commission Engine으로 금액 계산
    const calculationInput: CommissionCalculationInput = {
      partnerId: dto.partnerId,
      eventType: dto.eventType,
      eventValue: dto.eventValue,
      productId: dto.productId,
      campaignId: dto.campaignId,
      transactionId: dto.transactionId,
    };

    const result = await this.commissionEngine.calculate(calculationInput);

    // 수익 기록 생성
    const earnings = this.earningsRepository.create({
      partnerId: dto.partnerId,
      earningsType: this.mapEventTypeToEarningsType(dto.eventType),
      eventType: dto.eventType,
      eventValue: dto.eventValue,
      amount: result.amount,
      commissionPolicyId: result.policyId || undefined,
      orderId: dto.orderId,
      linkId: dto.linkId,
      routineId: dto.routineId,
      productId: dto.productId,
      transactionId: dto.transactionId,
      description: dto.description,
      metadata: {
        ...dto.metadata,
        calculationDetails: result.calculationDetails,
      },
      status: 'pending',
    });

    return this.earningsRepository.save(earnings);
  }

  /**
   * EventType을 EarningsType으로 매핑
   */
  private mapEventTypeToEarningsType(eventType: EventType): EarningsType {
    switch (eventType) {
      case 'SALE':
        return 'sale';
      case 'CONVERSION':
        return 'commission';
      case 'CLICK':
        return 'referral';
      default:
        return 'commission';
    }
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
    if (dto.status === 'available') {
      earnings.approvedAt = new Date();
    } else if (dto.status === 'paid') {
      earnings.paidAt = new Date();
    } else if (dto.status === 'withdrawn') {
      earnings.withdrawnAt = new Date();
    }

    return this.earningsRepository.save(earnings);
  }

  /**
   * 수익 승인 (pending → available)
   */
  async approveEarnings(id: string): Promise<PartnerEarnings> {
    return this.updateEarnings(id, { status: 'available' });
  }

  /**
   * 수익 일괄 승인
   */
  async approveEarningsBatch(ids: string[]): Promise<PartnerEarnings[]> {
    const results: PartnerEarnings[] = [];
    for (const id of ids) {
      const earnings = await this.approveEarnings(id);
      results.push(earnings);
    }
    return results;
  }

  /**
   * 인출 요청 처리
   *
   * available 상태의 수익을 withdrawn으로 변경하고 인출 기록 생성
   */
  async processWithdrawal(partnerId: string, amount: number): Promise<WithdrawalResult> {
    // Get available earnings for partner
    const availableEarnings = await this.findByFilter({
      partnerId,
      status: 'available',
    });

    const totalAvailable = availableEarnings.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    if (totalAvailable < amount) {
      return {
        success: false,
        amount: 0,
        message: `인출 가능 금액(${totalAvailable.toLocaleString()}원)이 요청 금액(${amount.toLocaleString()}원)보다 적습니다.`,
      };
    }

    // 인출 처리: available → withdrawn
    let remainingAmount = amount;
    const processedIds: string[] = [];

    for (const earning of availableEarnings) {
      if (remainingAmount <= 0) break;

      const earningAmount = Number(earning.amount);
      if (earningAmount <= remainingAmount) {
        // 전체 금액 인출
        await this.updateEarnings(earning.id, { status: 'withdrawn' });
        remainingAmount -= earningAmount;
        processedIds.push(earning.id);
      }
    }

    // 인출 기록 생성
    const withdrawal = this.earningsRepository.create({
      partnerId,
      earningsType: 'commission',
      amount: -amount,
      status: 'withdrawn',
      withdrawnAt: new Date(),
      description: `인출 완료 (처리된 수익 ${processedIds.length}건)`,
      metadata: {
        processedEarningsIds: processedIds,
        requestedAmount: amount,
      },
    });

    const savedWithdrawal = await this.earningsRepository.save(withdrawal);

    return {
      success: true,
      withdrawalId: savedWithdrawal.id,
      amount,
      message: `${amount.toLocaleString()}원 인출이 완료되었습니다.`,
    };
  }

  /**
   * 인출 가능 금액 조회
   */
  async getAvailableBalance(partnerId: string): Promise<number> {
    const result = await this.earningsRepository
      .createQueryBuilder('earnings')
      .select('SUM(earnings.amount)', 'total')
      .where('earnings.partnerId = :partnerId', { partnerId })
      .andWhere('earnings.status = :status', { status: 'available' })
      .getRawOne();

    return Number(result?.total || 0);
  }

  async getEarningsSummary(partnerId: string): Promise<EarningsSummary> {
    const earnings = await this.findByPartnerId(partnerId);

    let totalEarnings = 0;
    let pendingEarnings = 0;
    let availableEarnings = 0;
    let paidEarnings = 0;
    let withdrawnEarnings = 0;

    const byType: Record<EarningsType, number> = {
      commission: 0,
      bonus: 0,
      referral: 0,
      campaign: 0,
      sale: 0,
    };

    const byEventType: Record<EventType, number> = {
      CLICK: 0,
      CONVERSION: 0,
      SALE: 0,
    };

    const monthlyMap: Record<string, number> = {};

    for (const earning of earnings) {
      const amount = Number(earning.amount);

      // 음수(인출)는 총액에 포함하지 않음
      if (amount > 0) {
        totalEarnings += amount;
      }

      if (earning.status === 'pending') {
        pendingEarnings += amount;
      } else if (earning.status === 'available') {
        availableEarnings += amount;
      } else if (earning.status === 'paid') {
        paidEarnings += amount;
      } else if (earning.status === 'withdrawn') {
        if (amount < 0) {
          withdrawnEarnings += Math.abs(amount);
        }
      }

      if (amount > 0) {
        byType[earning.earningsType] = (byType[earning.earningsType] || 0) + amount;

        if (earning.eventType) {
          byEventType[earning.eventType] = (byEventType[earning.eventType] || 0) + amount;
        }

        // Monthly aggregation (양수만)
        const month = earning.createdAt.toISOString().substring(0, 7); // YYYY-MM
        monthlyMap[month] = (monthlyMap[month] || 0) + amount;
      }
    }

    const monthlyEarnings = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalEarnings,
      pendingEarnings,
      availableEarnings,
      paidEarnings,
      withdrawnEarnings,
      byType,
      byEventType,
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
