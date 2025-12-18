/**
 * SettlementAutomation
 *
 * 정산 자동화 서비스
 * - 정책 기반 분배율 자동 적용
 * - 분회 → 지부 → 본회 캐스케이드 정산
 * - 정산 워크플로우 자동화
 *
 * Phase R1.1: MembershipReadPort 사용으로 의존성 전환
 */

import { DataSource, Repository, In } from 'typeorm';
import { FeeSettlement } from '../entities/FeeSettlement.js';
import { FeePolicy } from '../entities/FeePolicy.js';
import { FeeInvoice } from '../entities/FeeInvoice.js';
import { FeePayment } from '../entities/FeePayment.js';
import { FeeLogService } from './FeeLogService.js';
import type { MembershipReadPort, MemberBasicInfo } from '@o4o/membership-yaksa';

export interface DistributionRates {
  nationalRate: number; // 본회비 비율 (예: 0.6)
  divisionRate: number; // 지부비 비율 (예: 0.25)
  branchRate: number; // 분회비 비율 (예: 0.15)
}

export interface AutoSettlementOptions {
  year: number;
  month?: number; // 월별 정산인 경우
  organizationIds?: string[]; // 특정 조직만 (미지정 시 전체)
  dryRun?: boolean;
  forceRecalculate?: boolean; // 기존 정산 재계산
}

export interface AutoSettlementResult {
  success: boolean;
  year: number;
  month?: number;
  phases: {
    branch: PhaseResult;
    division: PhaseResult;
    national: PhaseResult;
  };
  totals: {
    organizationsProcessed: number;
    totalCollected: number;
    totalBranchShare: number;
    totalDivisionShare: number;
    totalNationalShare: number;
  };
}

export interface PhaseResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { organizationId: string; error: string }[];
}

export interface CascadeRemittanceResult {
  success: boolean;
  branchToDivision: {
    total: number;
    processed: number;
    amount: number;
  };
  divisionToNational: {
    total: number;
    processed: number;
    amount: number;
  };
}

export class SettlementAutomation {
  private settlementRepo: Repository<FeeSettlement>;
  private policyRepo: Repository<FeePolicy>;
  private invoiceRepo: Repository<FeeInvoice>;
  private paymentRepo: Repository<FeePayment>;
  private logService: FeeLogService;
  private membershipPort: MembershipReadPort | null = null;

  constructor(private dataSource: DataSource) {
    this.settlementRepo = dataSource.getRepository(FeeSettlement);
    this.policyRepo = dataSource.getRepository(FeePolicy);
    this.invoiceRepo = dataSource.getRepository(FeeInvoice);
    this.paymentRepo = dataSource.getRepository(FeePayment);
    this.logService = new FeeLogService(dataSource);
  }

  /**
   * Phase R1.1: MembershipReadPort 주입
   */
  setMembershipPort(port: MembershipReadPort): void {
    this.membershipPort = port;
  }

  /**
   * 정책에서 분배율 가져오기
   */
  async getDistributionRates(year: number): Promise<DistributionRates> {
    const policy = await this.policyRepo.findOne({
      where: { year, isActive: true },
    });

    if (policy && policy.metadata) {
      const metadata = policy.metadata as Record<string, any>;
      if (metadata.distributionRates) {
        const rates = metadata.distributionRates;
        return {
          nationalRate: rates.nationalRate || 0.6,
          divisionRate: rates.divisionRate || 0.25,
          branchRate: rates.branchRate || 0.15,
        };
      }
    }

    // 기본 분배율
    return {
      nationalRate: 0.6,
      divisionRate: 0.25,
      branchRate: 0.15,
    };
  }

  /**
   * 자동 정산 생성/갱신
   * 분회 → 지부 → 본회 순서로 처리
   */
  async runAutoSettlement(
    options: AutoSettlementOptions,
    performedBy?: string
  ): Promise<AutoSettlementResult> {
    const { year, month, dryRun = false, forceRecalculate = false } = options;

    const result: AutoSettlementResult = {
      success: true,
      year,
      month,
      phases: {
        branch: this.createEmptyPhaseResult(),
        division: this.createEmptyPhaseResult(),
        national: this.createEmptyPhaseResult(),
      },
      totals: {
        organizationsProcessed: 0,
        totalCollected: 0,
        totalBranchShare: 0,
        totalDivisionShare: 0,
        totalNationalShare: 0,
      },
    };

    // 분배율 조회
    const rates = await this.getDistributionRates(year);

    // 조직 목록 조회
    const organizations = await this.getOrganizationHierarchy(options.organizationIds);

    // Phase 1: 분회(Branch) 정산
    const branches = organizations.filter((org) => org.type === 'branch');
    for (const branch of branches) {
      const phaseResult = await this.processOrganizationSettlement(
        branch,
        year,
        month,
        rates,
        dryRun,
        forceRecalculate,
        performedBy
      );
      this.mergePhaseResult(result.phases.branch, phaseResult);
    }

    // Phase 2: 지부(Division) 정산
    const divisions = organizations.filter((org) => org.type === 'division');
    for (const division of divisions) {
      const phaseResult = await this.processOrganizationSettlement(
        division,
        year,
        month,
        rates,
        dryRun,
        forceRecalculate,
        performedBy
      );
      this.mergePhaseResult(result.phases.division, phaseResult);
    }

    // Phase 3: 본회(National) 정산
    const nationals = organizations.filter((org) => org.type === 'national');
    for (const national of nationals) {
      const phaseResult = await this.processOrganizationSettlement(
        national,
        year,
        month,
        rates,
        dryRun,
        forceRecalculate,
        performedBy
      );
      this.mergePhaseResult(result.phases.national, phaseResult);
    }

    // 전체 합계 계산
    result.totals.organizationsProcessed =
      result.phases.branch.processed +
      result.phases.division.processed +
      result.phases.national.processed;

    // 로그 기록
    if (!dryRun) {
      await this.logService.log({
        action: 'settlement_created',
        entityType: 'settlement',
        entityId: `settlement-${year}${month ? `-${month}` : ''}`,
        year,
        data: {
          autoSettlement: true,
          phases: result.phases,
          totals: result.totals,
        },
        actorId: performedBy,
        actorType: performedBy ? 'admin' : 'batch',
      });
    }

    return result;
  }

  /**
   * 캐스케이드 송금 처리
   * 분회 확정 → 지부 수신 → 지부 확정 → 본회 수신
   */
  async processCascadeRemittance(
    year: number,
    month?: number,
    performedBy?: string
  ): Promise<CascadeRemittanceResult> {
    const result: CascadeRemittanceResult = {
      success: true,
      branchToDivision: { total: 0, processed: 0, amount: 0 },
      divisionToNational: { total: 0, processed: 0, amount: 0 },
    };

    const whereClause: any = { year };
    if (month) {
      whereClause.month = month;
    }

    // 1. 분회 → 지부 송금 처리
    const branchSettlements = await this.settlementRepo.find({
      where: { ...whereClause, organizationType: 'branch', status: 'confirmed' },
    });

    result.branchToDivision.total = branchSettlements.length;

    for (const settlement of branchSettlements) {
      if (settlement.remitToOrganizationId && settlement.remittanceAmount > 0) {
        // 송금 완료 표시
        settlement.markAsRemitted(performedBy || 'system', `AUTO-${Date.now()}`);
        await this.settlementRepo.save(settlement);

        result.branchToDivision.processed++;
        result.branchToDivision.amount += settlement.remittanceAmount;

        // 수신 지부 정산에 반영
        await this.recordIncomingRemittance(
          settlement.remitToOrganizationId,
          settlement.organizationId,
          settlement.remittanceAmount,
          year,
          month
        );
      }
    }

    // 2. 지부 → 본회 송금 처리
    const divisionSettlements = await this.settlementRepo.find({
      where: { ...whereClause, organizationType: 'division', status: 'confirmed' },
    });

    result.divisionToNational.total = divisionSettlements.length;

    for (const settlement of divisionSettlements) {
      if (settlement.remitToOrganizationId && settlement.remittanceAmount > 0) {
        settlement.markAsRemitted(performedBy || 'system', `AUTO-${Date.now()}`);
        await this.settlementRepo.save(settlement);

        result.divisionToNational.processed++;
        result.divisionToNational.amount += settlement.remittanceAmount;

        await this.recordIncomingRemittance(
          settlement.remitToOrganizationId,
          settlement.organizationId,
          settlement.remittanceAmount,
          year,
          month
        );
      }
    }

    // 로그 기록
    await this.logService.log({
      action: 'settlement_remitted',
      entityType: 'settlement',
      entityId: `remittance-${year}${month ? `-${month}` : ''}`,
      year,
      data: result,
      actorId: performedBy,
      actorType: performedBy ? 'admin' : 'batch',
    });

    return result;
  }

  /**
   * 정산 상태 일괄 확정
   */
  async bulkConfirm(
    settlementIds: string[],
    performedBy: string,
    performedByName: string
  ): Promise<{ confirmed: number; errors: { id: string; error: string }[] }> {
    const result = { confirmed: 0, errors: [] as { id: string; error: string }[] };

    for (const id of settlementIds) {
      try {
        const settlement = await this.settlementRepo.findOne({ where: { id } });
        if (!settlement) {
          result.errors.push({ id, error: '정산을 찾을 수 없습니다.' });
          continue;
        }

        if (!settlement.canConfirm()) {
          result.errors.push({
            id,
            error: `확정할 수 없는 상태입니다: ${settlement.status}`,
          });
          continue;
        }

        settlement.confirm(performedBy, performedByName);
        await this.settlementRepo.save(settlement);
        result.confirmed++;
      } catch (error) {
        result.errors.push({
          id,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }

    await this.logService.log({
      action: 'settlement_confirmed',
      entityType: 'settlement',
      entityId: `bulk-confirm-${Date.now()}`,
      data: {
        settlementIds,
        confirmed: result.confirmed,
        errorCount: result.errors.length,
      },
      actorId: performedBy,
      actorType: 'admin',
    });

    return result;
  }

  /**
   * 정산 상태 일괄 완료 처리
   */
  async bulkComplete(
    settlementIds: string[],
    performedBy?: string
  ): Promise<{ completed: number; errors: { id: string; error: string }[] }> {
    const result = { completed: 0, errors: [] as { id: string; error: string }[] };

    for (const id of settlementIds) {
      try {
        const settlement = await this.settlementRepo.findOne({ where: { id } });
        if (!settlement) {
          result.errors.push({ id, error: '정산을 찾을 수 없습니다.' });
          continue;
        }

        if (settlement.status !== 'remitted') {
          result.errors.push({
            id,
            error: `완료 처리할 수 없는 상태입니다: ${settlement.status}`,
          });
          continue;
        }

        settlement.complete();
        await this.settlementRepo.save(settlement);
        result.completed++;
      } catch (error) {
        result.errors.push({
          id,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }

    await this.logService.log({
      action: 'settlement_completed',
      entityType: 'settlement',
      entityId: `bulk-complete-${Date.now()}`,
      data: {
        settlementIds,
        completed: result.completed,
        errorCount: result.errors.length,
      },
      actorId: performedBy,
      actorType: performedBy ? 'admin' : 'batch',
    });

    return result;
  }

  /**
   * 정산 대시보드 데이터
   */
  async getSettlementDashboard(year: number): Promise<{
    overview: {
      totalOrganizations: number;
      pendingCount: number;
      confirmedCount: number;
      remittedCount: number;
      completedCount: number;
    };
    byType: Record<
      'branch' | 'division' | 'national',
      {
        count: number;
        totalCollected: number;
        avgCollectionRate: number;
        pendingRemittance: number;
      }
    >;
    timeline: Array<{
      date: string;
      action: string;
      organizationName: string;
      amount: number;
    }>;
  }> {
    const settlements = await this.settlementRepo.find({ where: { year } });

    const overview = {
      totalOrganizations: settlements.length,
      pendingCount: settlements.filter((s) => s.status === 'pending').length,
      confirmedCount: settlements.filter((s) => s.status === 'confirmed').length,
      remittedCount: settlements.filter((s) => s.status === 'remitted').length,
      completedCount: settlements.filter((s) => s.status === 'completed').length,
    };

    const byType: Record<
      'branch' | 'division' | 'national',
      {
        count: number;
        totalCollected: number;
        avgCollectionRate: number;
        pendingRemittance: number;
      }
    > = {
      branch: { count: 0, totalCollected: 0, avgCollectionRate: 0, pendingRemittance: 0 },
      division: { count: 0, totalCollected: 0, avgCollectionRate: 0, pendingRemittance: 0 },
      national: { count: 0, totalCollected: 0, avgCollectionRate: 0, pendingRemittance: 0 },
    };

    for (const settlement of settlements) {
      const type = settlement.organizationType;
      byType[type].count++;
      byType[type].totalCollected += settlement.totalCollected;

      if (settlement.status === 'confirmed') {
        byType[type].pendingRemittance += settlement.remittanceAmount;
      }
    }

    // 평균 수납률 계산
    for (const type of ['branch', 'division', 'national'] as const) {
      const typeSettlements = settlements.filter((s) => s.organizationType === type);
      if (typeSettlements.length > 0) {
        const totalRate = typeSettlements.reduce(
          (sum, s) => sum + (s.details?.collectionRate || 0),
          0
        );
        byType[type].avgCollectionRate = Math.round(totalRate / typeSettlements.length * 100) / 100;
      }
    }

    // 최근 활동 타임라인 (로그에서 조회)
    const timeline: Array<{
      date: string;
      action: string;
      organizationName: string;
      amount: number;
    }> = [];

    return { overview, byType, timeline };
  }

  /**
   * 정산 리포트 생성
   */
  async generateSettlementReport(
    year: number,
    month?: number
  ): Promise<{
    summary: {
      period: string;
      totalCollected: number;
      totalMembers: number;
      avgCollectionRate: number;
      nationalShare: number;
      divisionShare: number;
      branchShare: number;
    };
    byOrganization: Array<{
      organizationId: string;
      organizationName: string;
      organizationType: string;
      memberCount: number;
      totalCollected: number;
      collectionRate: number;
      remittanceAmount: number;
      status: string;
    }>;
  }> {
    const whereClause: any = { year };
    if (month) {
      whereClause.month = month;
    }

    const settlements = await this.settlementRepo.find({ where: whereClause });

    const summary = {
      period: month ? `${year}년 ${month}월` : `${year}년`,
      totalCollected: settlements.reduce((sum, s) => sum + s.totalCollected, 0),
      totalMembers: settlements.reduce((sum, s) => sum + s.memberCount, 0),
      avgCollectionRate: 0,
      nationalShare: settlements.reduce((sum, s) => sum + s.nationalShare, 0),
      divisionShare: settlements.reduce((sum, s) => sum + s.divisionShare, 0),
      branchShare: settlements.reduce((sum, s) => sum + s.branchShare, 0),
    };

    if (settlements.length > 0) {
      const totalRate = settlements.reduce(
        (sum, s) => sum + (s.details?.collectionRate || 0),
        0
      );
      summary.avgCollectionRate = Math.round(totalRate / settlements.length * 100) / 100;
    }

    const byOrganization = settlements.map((s) => ({
      organizationId: s.organizationId,
      organizationName: s.organizationName || s.organizationId,
      organizationType: s.organizationType,
      memberCount: s.memberCount,
      totalCollected: s.totalCollected,
      collectionRate: s.details?.collectionRate || 0,
      remittanceAmount: s.remittanceAmount,
      status: s.status,
    }));

    return { summary, byOrganization };
  }

  // === Private Helper Methods ===

  private createEmptyPhaseResult(): PhaseResult {
    return { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] };
  }

  private mergePhaseResult(target: PhaseResult, source: PhaseResult): void {
    target.processed += source.processed;
    target.created += source.created;
    target.updated += source.updated;
    target.skipped += source.skipped;
    target.errors.push(...source.errors);
  }

  private async getOrganizationHierarchy(
    organizationIds?: string[]
  ): Promise<
    Array<{
      id: string;
      type: 'branch' | 'division' | 'national';
      name: string;
      parentId?: string;
    }>
  > {
    const orgRepo = this.dataSource.getRepository('Organization');

    let query = orgRepo.createQueryBuilder('org');

    if (organizationIds && organizationIds.length > 0) {
      query = query.where('org.id IN (:...ids)', { ids: organizationIds });
    }

    const organizations = await query.getMany();

    return organizations.map((org: any) => ({
      id: org.id,
      type: this.determineOrgType(org),
      name: org.name,
      parentId: org.parentId,
    }));
  }

  private determineOrgType(org: any): 'branch' | 'division' | 'national' {
    // 조직 타입 결정 로직
    if (org.organizationType) {
      return org.organizationType;
    }

    if (!org.parentId) {
      return 'national';
    }

    // 부모가 있고, 부모의 부모가 없으면 division
    // 그렇지 않으면 branch
    return org.level === 1 ? 'division' : 'branch';
  }

  private async processOrganizationSettlement(
    org: { id: string; type: 'branch' | 'division' | 'national'; name: string; parentId?: string },
    year: number,
    month: number | undefined,
    rates: DistributionRates,
    dryRun: boolean,
    forceRecalculate: boolean,
    performedBy?: string
  ): Promise<PhaseResult> {
    const result: PhaseResult = { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] };

    try {
      // 기존 정산 확인
      const existing = await this.settlementRepo.findOne({
        where: {
          organizationId: org.id,
          year,
          month: month ?? undefined,
        },
      });

      if (existing && !forceRecalculate) {
        result.skipped++;
        return result;
      }

      // 정산 데이터 계산
      const details = await this.calculateSettlementDetails(org.id, year, month);

      // 분배 금액 계산
      const shares = this.calculateShares(details.totalPaidAmount, org.type, rates);

      if (dryRun) {
        result.processed++;
        if (existing) {
          result.updated++;
        } else {
          result.created++;
        }
        return result;
      }

      if (existing) {
        // 기존 정산 업데이트
        existing.memberCount = details.paidInvoiceCount;
        existing.totalCollected = details.totalPaidAmount;
        existing.branchShare = shares.branchShare;
        existing.divisionShare = shares.divisionShare;
        existing.nationalShare = shares.nationalShare;
        existing.remittanceAmount = shares.remittanceAmount;
        existing.details = details;

        await this.settlementRepo.save(existing);
        result.updated++;
      } else {
        // 새 정산 생성
        const settlement = this.settlementRepo.create({
          organizationId: org.id,
          organizationType: org.type,
          organizationName: org.name,
          year,
          month,
          memberCount: details.paidInvoiceCount,
          totalCollected: details.totalPaidAmount,
          branchShare: shares.branchShare,
          divisionShare: shares.divisionShare,
          nationalShare: shares.nationalShare,
          remittanceAmount: shares.remittanceAmount,
          remitToOrganizationId: org.parentId,
          details,
          status: 'pending',
        });

        await this.settlementRepo.save(settlement);
        result.created++;
      }

      result.processed++;
    } catch (error) {
      result.errors.push({
        organizationId: org.id,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      });
    }

    return result;
  }

  private async calculateSettlementDetails(
    organizationId: string,
    year: number,
    month?: number
  ): Promise<{
    invoiceCount: number;
    paidInvoiceCount: number;
    unpaidInvoiceCount: number;
    totalInvoiceAmount: number;
    totalPaidAmount: number;
    collectionRate: number;
    paymentMethods: Record<string, { count: number; amount: number }>;
  }> {
    // 해당 조직의 청구서 조회
    const invoices = await this.invoiceRepo.find({
      where: { year },
    });

    // Phase R1.1: MembershipReadPort를 통한 조직 내 회원 조회
    let members: MemberBasicInfo[];
    if (this.membershipPort) {
      members = await this.membershipPort.findMembers({ organizationId });
    } else {
      // Fallback: 기존 방식 (deprecated)
      console.warn('[SettlementAutomation] MembershipReadPort not set. Using legacy repository access.');
      const memberRepo = this.dataSource.getRepository('YaksaMember');
      const rawMembers = await memberRepo.find({
        where: { organizationId },
      });
      members = rawMembers.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        name: m.name,
        email: m.email,
        phone: m.phone,
        licenseNumber: m.licenseNumber,
        registrationNumber: m.registrationNumber,
      }));
    }
    const memberIds = new Set(members.map((m) => m.id));

    const orgInvoices = invoices.filter((inv) => memberIds.has(inv.memberId));

    const paidInvoices = orgInvoices.filter((i) => i.status === 'paid');
    const totalInvoiceAmount = orgInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalPaidAmount = paidInvoices.reduce((sum, i) => sum + i.amount, 0);

    // 납부 방법별 집계
    const paymentMethods: Record<string, { count: number; amount: number }> = {};

    for (const invoice of paidInvoices) {
      const payments = await this.paymentRepo.find({
        where: { invoiceId: invoice.id, status: 'completed' },
      });

      for (const payment of payments) {
        const method = payment.method || 'unknown';
        if (!paymentMethods[method]) {
          paymentMethods[method] = { count: 0, amount: 0 };
        }
        paymentMethods[method].count++;
        paymentMethods[method].amount += payment.amount;
      }
    }

    const collectionRate =
      totalInvoiceAmount > 0
        ? Math.round((totalPaidAmount / totalInvoiceAmount) * 10000) / 100
        : 0;

    return {
      invoiceCount: orgInvoices.length,
      paidInvoiceCount: paidInvoices.length,
      unpaidInvoiceCount: orgInvoices.length - paidInvoices.length,
      totalInvoiceAmount,
      totalPaidAmount,
      collectionRate,
      paymentMethods,
    };
  }

  private calculateShares(
    totalAmount: number,
    organizationType: 'branch' | 'division' | 'national',
    rates: DistributionRates
  ): {
    branchShare: number;
    divisionShare: number;
    nationalShare: number;
    remittanceAmount: number;
  } {
    const nationalShare = Math.round(totalAmount * rates.nationalRate);
    const divisionShare = Math.round(totalAmount * rates.divisionRate);
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

  private async recordIncomingRemittance(
    receivingOrgId: string,
    sendingOrgId: string,
    amount: number,
    year: number,
    month?: number
  ): Promise<void> {
    // 수신 조직의 정산에 입금 기록
    await this.logService.log({
      action: 'settlement_remitted',
      entityType: 'settlement',
      entityId: receivingOrgId,
      year,
      data: {
        fromOrganizationId: sendingOrgId,
        amount,
        month,
      },
    });
  }
}

export function createSettlementAutomation(dataSource: DataSource): SettlementAutomation {
  return new SettlementAutomation(dataSource);
}
