import { DataSource, Repository } from 'typeorm';
import {
  FeeSettlement,
  SettlementStatus,
  SettlementDetail,
} from '../entities/FeeSettlement.js';
import { FeeInvoice } from '../entities/FeeInvoice.js';
import { FeePayment } from '../entities/FeePayment.js';
import { FeeLogService } from './FeeLogService.js';

export interface CreateSettlementDto {
  organizationId: string;
  organizationType: 'branch' | 'division' | 'national';
  organizationName?: string;
  year: number;
  month?: number;
  remitToOrganizationId?: string;
  note?: string;
}

export interface SettlementFilters {
  organizationId?: string;
  organizationType?: 'branch' | 'division' | 'national';
  year?: number;
  month?: number;
  status?: SettlementStatus | SettlementStatus[];
  limit?: number;
  offset?: number;
}

/**
 * FeeSettlementService
 *
 * 회비 정산 관리 서비스
 * 분회 → 지부 → 본부 자금 흐름 관리
 */
export class FeeSettlementService {
  private repo: Repository<FeeSettlement>;
  private invoiceRepo: Repository<FeeInvoice>;
  private paymentRepo: Repository<FeePayment>;
  private logService: FeeLogService;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(FeeSettlement);
    this.invoiceRepo = dataSource.getRepository(FeeInvoice);
    this.paymentRepo = dataSource.getRepository(FeePayment);
    this.logService = new FeeLogService(dataSource);
  }

  /**
   * 정산 생성 및 계산
   */
  async create(dto: CreateSettlementDto, actorId?: string): Promise<FeeSettlement> {
    // 이미 정산이 있는지 확인
    const existing = await this.repo.findOne({
      where: {
        organizationId: dto.organizationId,
        year: dto.year,
        month: dto.month ?? undefined,
      },
    });
    if (existing) {
      throw new Error(
        `Settlement already exists for organization ${dto.organizationId} ` +
          `in ${dto.year}${dto.month ? `-${dto.month}` : ''}`
      );
    }

    // 정산 데이터 계산
    const details = await this.calculateSettlementDetails(
      dto.organizationId,
      dto.year,
      dto.month
    );

    // 분배 금액 계산 (기본 비율: 본회비 60%, 지부비 25%, 분회비 15%)
    // 실제로는 정책에서 가져와야 함
    const { branchShare, divisionShare, nationalShare, remittanceAmount } =
      this.calculateShares(
        details.totalPaidAmount,
        dto.organizationType
      );

    const settlement = this.repo.create({
      ...dto,
      memberCount: details.paidInvoiceCount,
      totalCollected: details.totalPaidAmount,
      branchShare,
      divisionShare,
      nationalShare,
      remittanceAmount,
      details,
      status: 'pending',
    });

    const saved = await this.repo.save(settlement);

    await this.logService.log({
      entityType: 'settlement',
      entityId: saved.id,
      action: 'settlement_created',
      year: dto.year,
      data: {
        organizationId: dto.organizationId,
        totalCollected: details.totalPaidAmount,
        memberCount: details.paidInvoiceCount,
      },
      actorId,
      description: `정산 생성: ${dto.organizationName || dto.organizationId} ${saved.getPeriodDisplayName()}`,
    });

    return saved;
  }

  /**
   * 정산 상세 계산
   */
  private async calculateSettlementDetails(
    organizationId: string,
    year: number,
    month?: number
  ): Promise<SettlementDetail> {
    // 청구서 조회
    const invoiceQuery = this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.organizationId = :organizationId', { organizationId })
      .andWhere('invoice.year = :year', { year });

    const invoices = await invoiceQuery.getMany();

    const invoiceCount = invoices.length;
    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const paidInvoiceCount = paidInvoices.length;
    const unpaidInvoiceCount = invoices.filter((i) =>
      ['pending', 'sent', 'partial', 'overdue'].includes(i.status)
    ).length;
    const totalInvoiceAmount = invoices.reduce((sum, i) => sum + i.amount, 0);
    const totalPaidAmount = paidInvoices.reduce((sum, i) => sum + i.paidAmount, 0);

    // 납부 방법별 집계
    const paymentQuery = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.invoice', 'invoice')
      .where('invoice.organizationId = :organizationId', { organizationId })
      .andWhere('invoice.year = :year', { year })
      .andWhere('payment.status = :status', { status: 'completed' });

    if (month) {
      // 월별 정산인 경우 해당 월의 납부만 집계
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      paymentQuery
        .andWhere('payment.paidAt >= :startDate', { startDate })
        .andWhere('payment.paidAt <= :endDate', { endDate });
    }

    const payments = await paymentQuery.getMany();

    const paymentMethods: SettlementDetail['paymentMethods'] = {};
    for (const payment of payments) {
      if (!paymentMethods[payment.method]) {
        paymentMethods[payment.method] = { count: 0, amount: 0 };
      }
      paymentMethods[payment.method].count++;
      paymentMethods[payment.method].amount += payment.amount;
    }

    const collectionRate =
      totalInvoiceAmount > 0
        ? Math.round((totalPaidAmount / totalInvoiceAmount) * 10000) / 100
        : 0;

    return {
      invoiceCount,
      paidInvoiceCount,
      unpaidInvoiceCount,
      totalInvoiceAmount,
      totalPaidAmount,
      collectionRate,
      paymentMethods,
    };
  }

  /**
   * 분배 금액 계산
   */
  private calculateShares(
    totalAmount: number,
    organizationType: 'branch' | 'division' | 'national'
  ): {
    branchShare: number;
    divisionShare: number;
    nationalShare: number;
    remittanceAmount: number;
  } {
    // 기본 분배 비율 (실제로는 정책에서 가져와야 함)
    const NATIONAL_RATE = 0.6; // 본회비 60%
    const DIVISION_RATE = 0.25; // 지부비 25%
    const BRANCH_RATE = 0.15; // 분회비 15%

    const nationalShare = Math.round(totalAmount * NATIONAL_RATE);
    const divisionShare = Math.round(totalAmount * DIVISION_RATE);
    const branchShare = totalAmount - nationalShare - divisionShare;

    let remittanceAmount = 0;
    if (organizationType === 'branch') {
      // 분회 → 지부: 본회비 + 지부비
      remittanceAmount = nationalShare + divisionShare;
    } else if (organizationType === 'division') {
      // 지부 → 본부: 본회비
      remittanceAmount = nationalShare;
    }

    return {
      branchShare,
      divisionShare,
      nationalShare,
      remittanceAmount,
    };
  }

  /**
   * 정산 조회 (ID)
   */
  async findById(id: string): Promise<FeeSettlement | null> {
    return await this.repo.findOne({ where: { id } });
  }

  /**
   * 정산 목록 조회
   */
  async findAll(filters: SettlementFilters): Promise<{
    settlements: FeeSettlement[];
    total: number;
  }> {
    const queryBuilder = this.repo.createQueryBuilder('settlement');

    if (filters.organizationId) {
      queryBuilder.andWhere('settlement.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }
    if (filters.organizationType) {
      queryBuilder.andWhere('settlement.organizationType = :organizationType', {
        organizationType: filters.organizationType,
      });
    }
    if (filters.year) {
      queryBuilder.andWhere('settlement.year = :year', { year: filters.year });
    }
    if (filters.month !== undefined) {
      queryBuilder.andWhere('settlement.month = :month', { month: filters.month });
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        queryBuilder.andWhere('settlement.status IN (:...statuses)', {
          statuses: filters.status,
        });
      } else {
        queryBuilder.andWhere('settlement.status = :status', {
          status: filters.status,
        });
      }
    }

    queryBuilder.orderBy('settlement.year', 'DESC').addOrderBy('settlement.month', 'DESC');

    if (filters.limit) {
      queryBuilder.take(filters.limit);
    }
    if (filters.offset) {
      queryBuilder.skip(filters.offset);
    }

    const [settlements, total] = await queryBuilder.getManyAndCount();
    return { settlements, total };
  }

  /**
   * 조직별 연도 정산 조회
   */
  async findByOrganizationAndYear(
    organizationId: string,
    year: number
  ): Promise<FeeSettlement[]> {
    return await this.repo.find({
      where: { organizationId, year },
      order: { month: 'ASC' },
    });
  }

  /**
   * 정산 확정
   */
  async confirm(
    id: string,
    actorId: string,
    actorName: string
  ): Promise<FeeSettlement> {
    const settlement = await this.findById(id);
    if (!settlement) {
      throw new Error(`Settlement "${id}" not found`);
    }

    if (!settlement.canConfirm()) {
      throw new Error(`Cannot confirm settlement with status "${settlement.status}"`);
    }

    const previousState = { status: settlement.status };
    settlement.confirm(actorId, actorName);

    const saved = await this.repo.save(settlement);

    await this.logService.log({
      entityType: 'settlement',
      entityId: id,
      action: 'settlement_confirmed',
      year: settlement.year,
      previousState,
      newState: { status: 'confirmed' },
      actorId,
      description: `정산 확정: ${settlement.getPeriodDisplayName()}`,
    });

    return saved;
  }

  /**
   * 송금 완료 처리
   */
  async markAsRemitted(
    id: string,
    actorId: string,
    reference?: string
  ): Promise<FeeSettlement> {
    const settlement = await this.findById(id);
    if (!settlement) {
      throw new Error(`Settlement "${id}" not found`);
    }

    if (!settlement.canRemit()) {
      throw new Error(`Cannot remit settlement with status "${settlement.status}"`);
    }

    const previousState = { status: settlement.status };
    settlement.markAsRemitted(actorId, reference);

    const saved = await this.repo.save(settlement);

    await this.logService.log({
      entityType: 'settlement',
      entityId: id,
      action: 'settlement_remitted',
      year: settlement.year,
      previousState,
      newState: { status: 'remitted', reference },
      actorId,
      description: `송금 완료: ${settlement.remittanceAmount.toLocaleString()}원`,
    });

    return saved;
  }

  /**
   * 정산 완료 처리
   */
  async complete(id: string, actorId?: string): Promise<FeeSettlement> {
    const settlement = await this.findById(id);
    if (!settlement) {
      throw new Error(`Settlement "${id}" not found`);
    }

    if (settlement.status !== 'remitted') {
      throw new Error(`Cannot complete settlement with status "${settlement.status}"`);
    }

    const previousState = { status: settlement.status };
    settlement.complete();

    const saved = await this.repo.save(settlement);

    await this.logService.log({
      entityType: 'settlement',
      entityId: id,
      action: 'settlement_completed',
      year: settlement.year,
      previousState,
      newState: { status: 'completed' },
      actorId,
      description: `정산 완료: ${settlement.getPeriodDisplayName()}`,
    });

    return saved;
  }

  /**
   * 일괄 정산 생성 (연말 배치)
   */
  async generateBulkSettlements(
    year: number,
    organizationIds: Array<{
      id: string;
      type: 'branch' | 'division' | 'national';
      name: string;
      parentId?: string;
    }>,
    actorId?: string
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    const result = { created: 0, skipped: 0, errors: [] as string[] };

    for (const org of organizationIds) {
      try {
        await this.create(
          {
            organizationId: org.id,
            organizationType: org.type,
            organizationName: org.name,
            year,
            remitToOrganizationId: org.parentId,
          },
          actorId
        );
        result.created++;
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          result.skipped++;
        } else {
          result.errors.push(
            `${org.name}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    return result;
  }

  /**
   * 연도별 전체 통계
   */
  async getYearSummary(year: number): Promise<{
    totalCollected: number;
    totalMemberCount: number;
    branchCount: number;
    divisionCount: number;
    avgCollectionRate: number;
    byType: Record<'branch' | 'division' | 'national', {
      count: number;
      totalCollected: number;
    }>;
  }> {
    const settlements = await this.repo.find({ where: { year } });

    const totalCollected = settlements.reduce((sum, s) => sum + s.totalCollected, 0);
    const totalMemberCount = settlements.reduce((sum, s) => sum + s.memberCount, 0);
    const branchCount = settlements.filter((s) => s.organizationType === 'branch').length;
    const divisionCount = settlements.filter((s) => s.organizationType === 'division').length;

    const avgCollectionRate =
      settlements.length > 0
        ? settlements.reduce((sum, s) => sum + s.calculateCollectionRate(), 0) /
          settlements.length
        : 0;

    const byType: Record<'branch' | 'division' | 'national', { count: number; totalCollected: number }> = {
      branch: { count: 0, totalCollected: 0 },
      division: { count: 0, totalCollected: 0 },
      national: { count: 0, totalCollected: 0 },
    };

    for (const settlement of settlements) {
      byType[settlement.organizationType].count++;
      byType[settlement.organizationType].totalCollected += settlement.totalCollected;
    }

    return {
      totalCollected,
      totalMemberCount,
      branchCount,
      divisionCount,
      avgCollectionRate: Math.round(avgCollectionRate * 100) / 100,
      byType,
    };
  }
}
