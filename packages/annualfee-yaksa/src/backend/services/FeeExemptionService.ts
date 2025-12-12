import { DataSource, Repository } from 'typeorm';
import {
  FeeExemption,
  ExemptionCategory,
  ExemptionStatus,
} from '../entities/FeeExemption.js';
import { FeeLogService } from './FeeLogService.js';

export interface CreateExemptionDto {
  memberId: string;
  year: number;
  category: ExemptionCategory;
  exemptionType: 'full' | 'partial_rate' | 'partial_amount';
  exemptionRate?: number;
  exemptionAmount?: number;
  reason: string;
  requestedBy?: string;
  validFrom?: string;
  validUntil?: string;
  isAutoApplied?: boolean;
  appliedRuleId?: string;
  invoiceId?: string;
  attachmentUrl?: string;
  note?: string;
}

export interface ExemptionFilters {
  memberId?: string;
  year?: number;
  category?: ExemptionCategory | ExemptionCategory[];
  status?: ExemptionStatus | ExemptionStatus[];
  isAutoApplied?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * FeeExemptionService
 *
 * 회비 감면 관리 서비스
 */
export class FeeExemptionService {
  private repo: Repository<FeeExemption>;
  private logService: FeeLogService;

  constructor(private dataSource: DataSource) {
    this.repo = dataSource.getRepository(FeeExemption);
    this.logService = new FeeLogService(dataSource);
  }

  /**
   * 감면 신청/등록
   */
  async create(dto: CreateExemptionDto, actorId?: string): Promise<FeeExemption> {
    const exemption = this.repo.create({
      ...dto,
      status: dto.isAutoApplied ? 'approved' : 'pending',
      requestedAt: new Date(),
      requestedBy: dto.requestedBy || actorId,
    });

    // 자동 적용인 경우 즉시 승인
    if (dto.isAutoApplied) {
      exemption.approvedAt = new Date();
      exemption.approvedBy = 'system';
      exemption.approvedByName = '시스템 자동 적용';
    }

    const saved = await this.repo.save(exemption);

    // 로그 기록
    await this.logService.log({
      memberId: dto.memberId,
      entityType: 'exemption',
      entityId: saved.id,
      action: dto.isAutoApplied ? 'exemption_auto_applied' : 'exemption_requested',
      year: dto.year,
      newState: {
        category: dto.category,
        exemptionType: dto.exemptionType,
        reason: dto.reason,
      },
      actorId: actorId || 'system',
      actorType: dto.isAutoApplied ? 'system' : 'user',
      description: dto.isAutoApplied
        ? `감면 자동 적용: ${saved.getCategoryDisplayName()}`
        : `감면 신청: ${saved.getCategoryDisplayName()}`,
    });

    return saved;
  }

  /**
   * 감면 조회 (ID)
   */
  async findById(id: string): Promise<FeeExemption | null> {
    return await this.repo.findOne({ where: { id } });
  }

  /**
   * 회원의 연도별 감면 조회
   */
  async findByMemberAndYear(
    memberId: string,
    year: number
  ): Promise<FeeExemption[]> {
    return await this.repo.find({
      where: { memberId, year },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 회원의 승인된 감면 조회
   */
  async findApprovedByMemberAndYear(
    memberId: string,
    year: number
  ): Promise<FeeExemption[]> {
    return await this.repo.find({
      where: { memberId, year, status: 'approved' },
    });
  }

  /**
   * 감면 목록 조회
   */
  async findAll(filters: ExemptionFilters): Promise<{
    exemptions: FeeExemption[];
    total: number;
  }> {
    const queryBuilder = this.repo.createQueryBuilder('exemption');

    if (filters.memberId) {
      queryBuilder.andWhere('exemption.memberId = :memberId', {
        memberId: filters.memberId,
      });
    }
    if (filters.year) {
      queryBuilder.andWhere('exemption.year = :year', { year: filters.year });
    }
    if (filters.category) {
      if (Array.isArray(filters.category)) {
        queryBuilder.andWhere('exemption.category IN (:...categories)', {
          categories: filters.category,
        });
      } else {
        queryBuilder.andWhere('exemption.category = :category', {
          category: filters.category,
        });
      }
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        queryBuilder.andWhere('exemption.status IN (:...statuses)', {
          statuses: filters.status,
        });
      } else {
        queryBuilder.andWhere('exemption.status = :status', {
          status: filters.status,
        });
      }
    }
    if (filters.isAutoApplied !== undefined) {
      queryBuilder.andWhere('exemption.isAutoApplied = :isAutoApplied', {
        isAutoApplied: filters.isAutoApplied,
      });
    }

    queryBuilder.orderBy('exemption.createdAt', 'DESC');

    if (filters.limit) {
      queryBuilder.take(filters.limit);
    }
    if (filters.offset) {
      queryBuilder.skip(filters.offset);
    }

    const [exemptions, total] = await queryBuilder.getManyAndCount();
    return { exemptions, total };
  }

  /**
   * 승인 대기 목록 조회
   */
  async findPending(year?: number): Promise<FeeExemption[]> {
    const queryBuilder = this.repo
      .createQueryBuilder('exemption')
      .where('exemption.status = :status', { status: 'pending' });

    if (year) {
      queryBuilder.andWhere('exemption.year = :year', { year });
    }

    return await queryBuilder.orderBy('exemption.requestedAt', 'ASC').getMany();
  }

  /**
   * 감면 승인
   */
  async approve(
    id: string,
    actorId: string,
    actorName: string,
    note?: string
  ): Promise<FeeExemption> {
    const exemption = await this.findById(id);
    if (!exemption) {
      throw new Error(`Exemption "${id}" not found`);
    }

    if (!exemption.isPending()) {
      throw new Error(`Exemption is not pending (status: ${exemption.status})`);
    }

    const previousState = { status: exemption.status };
    exemption.approve(actorId, actorName);
    if (note) {
      exemption.note = note;
    }

    const saved = await this.repo.save(exemption);

    await this.logService.log({
      memberId: exemption.memberId,
      entityType: 'exemption',
      entityId: id,
      action: 'exemption_approved',
      year: exemption.year,
      previousState,
      newState: { status: 'approved' },
      actorId,
      description: `감면 승인: ${exemption.getCategoryDisplayName()}`,
    });

    return saved;
  }

  /**
   * 감면 반려
   */
  async reject(
    id: string,
    reason: string,
    actorId: string
  ): Promise<FeeExemption> {
    const exemption = await this.findById(id);
    if (!exemption) {
      throw new Error(`Exemption "${id}" not found`);
    }

    if (!exemption.isPending()) {
      throw new Error(`Exemption is not pending (status: ${exemption.status})`);
    }

    const previousState = { status: exemption.status };
    exemption.reject(actorId, reason);

    const saved = await this.repo.save(exemption);

    await this.logService.log({
      memberId: exemption.memberId,
      entityType: 'exemption',
      entityId: id,
      action: 'exemption_rejected',
      year: exemption.year,
      previousState,
      newState: { status: 'rejected', reason },
      actorId,
      description: `감면 반려: ${reason}`,
    });

    return saved;
  }

  /**
   * 감면 금액 계산 및 적용
   */
  async calculateAndApply(
    id: string,
    originalAmount: number
  ): Promise<FeeExemption> {
    const exemption = await this.findById(id);
    if (!exemption) {
      throw new Error(`Exemption "${id}" not found`);
    }

    exemption.calculateExemptionAmount(originalAmount);

    return await this.repo.save(exemption);
  }

  /**
   * 회원의 총 감면 금액 계산
   */
  async calculateTotalExemption(
    memberId: string,
    year: number,
    originalAmount: number
  ): Promise<{
    totalExemption: number;
    finalAmount: number;
    exemptions: Array<{
      category: string;
      reason: string;
      amount: number;
    }>;
  }> {
    const approvedExemptions = await this.findApprovedByMemberAndYear(
      memberId,
      year
    );

    let totalExemption = 0;
    const exemptionDetails: Array<{
      category: string;
      reason: string;
      amount: number;
    }> = [];

    let remainingAmount = originalAmount;

    for (const exemption of approvedExemptions) {
      const exemptionAmount = exemption.calculateExemptionAmount(remainingAmount);
      await this.repo.save(exemption);

      totalExemption += exemptionAmount;
      remainingAmount -= exemptionAmount;

      exemptionDetails.push({
        category: exemption.category,
        reason: exemption.reason,
        amount: exemptionAmount,
      });

      if (remainingAmount <= 0) break;
    }

    return {
      totalExemption,
      finalAmount: Math.max(0, originalAmount - totalExemption),
      exemptions: exemptionDetails,
    };
  }

  /**
   * 통계 조회
   */
  async getStatistics(
    year: number,
    organizationId?: string
  ): Promise<{
    totalExemptions: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    byCategory: Record<ExemptionCategory, number>;
    totalExemptedAmount: number;
  }> {
    const queryBuilder = this.repo
      .createQueryBuilder('exemption')
      .where('exemption.year = :year', { year });

    // TODO: organizationId 필터 추가 (Member join 필요)

    const exemptions = await queryBuilder.getMany();

    const totalExemptions = exemptions.length;
    const approvedCount = exemptions.filter((e) => e.status === 'approved').length;
    const pendingCount = exemptions.filter((e) => e.status === 'pending').length;
    const rejectedCount = exemptions.filter((e) => e.status === 'rejected').length;

    const byCategory: Record<ExemptionCategory, number> = {
      senior: 0,
      honorary: 0,
      inactive: 0,
      newMember: 0,
      earlyPayment: 0,
      lmsCredit: 0,
      executive: 0,
      hardship: 0,
      special: 0,
      manual: 0,
    };

    let totalExemptedAmount = 0;

    for (const exemption of exemptions) {
      if (exemption.status === 'approved') {
        byCategory[exemption.category]++;
        totalExemptedAmount += exemption.exemptionAmount || 0;
      }
    }

    return {
      totalExemptions,
      approvedCount,
      pendingCount,
      rejectedCount,
      byCategory,
      totalExemptedAmount,
    };
  }
}
