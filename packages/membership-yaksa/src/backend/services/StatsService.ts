import { DataSource, Repository } from 'typeorm';
import { Member, PharmacistType, OfficialRole, Gender } from '../entities/Member.js';
import { MemberCategory } from '../entities/MemberCategory.js';
import { Verification } from '../entities/Verification.js';
import { MembershipYear } from '../entities/MembershipYear.js';
import { Affiliation } from '../entities/Affiliation.js';
import { AffiliationChangeLog } from '../entities/AffiliationChangeLog.js';

/**
 * DashboardStats
 *
 * 대시보드에 표시할 통계 정보
 */
export interface DashboardStats {
  totalMembers: number;
  verifiedMembers: number;
  pendingVerifications: number;
  unpaidFees: number;
  newMembersThisMonth: number;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>;
  organizationBreakdown?: Array<{
    organizationId: string;
    organizationName?: string;
    count: number;
  }>;
  recentTrends: {
    membersLastWeek: number;
    membersLastMonth: number;
    verificationsLastWeek: number;
  };
}

/**
 * Phase 2: 확장 대시보드 통계
 *
 * 약사회 운영 지표를 포함한 상세 통계
 */
export interface ExtendedDashboardStats extends DashboardStats {
  // 약사 유형별 통계
  pharmacistTypeBreakdown: Record<PharmacistType | 'unset', number>;

  // 직책별 통계
  officialRoleBreakdown: Record<OfficialRole | 'unset', number>;

  // 성별 분포
  genderBreakdown: Record<Gender | 'unset', number>;

  // 임원 통계
  executiveStats: {
    totalExecutives: number;
    byRole: Record<string, number>;
  };

  // 조직별 회원 현황 (지부→분회 drill-down 지원)
  organizationHierarchy?: Array<{
    organizationId: string;
    organizationName?: string;
    type: 'district' | 'branch';
    parentId?: string;
    memberCount: number;
    executiveCount: number;
    verifiedCount: number;
  }>;

  // 연회비 통계
  feeStats: {
    currentYear: number;
    paidCount: number;
    unpaidCount: number;
    exemptCount: number;
    totalCollected: number;
    collectionRate: number;
  };

  // 최근 활동
  recentActivity: {
    newMembers: number;
    transfersIn: number;
    transfersOut: number;
    positionChanges: number;
    verificationsPending: number;
    verificationsApproved: number;
    verificationsRejected: number;
  };
}

/**
 * StatsService
 *
 * 회원 시스템 통계 서비스
 *
 * Phase 2 확장:
 * - 약사 유형별 통계
 * - 직책별 통계
 * - 성별 분포
 * - 임원 통계
 * - 조직별 회원 현황
 * - 연회비 통계
 * - 최근 활동 통계
 */
export class StatsService {
  private memberRepo: Repository<Member>;
  private categoryRepo: Repository<MemberCategory>;
  private verificationRepo: Repository<Verification>;
  private membershipYearRepo: Repository<MembershipYear>;
  private affiliationRepo: Repository<Affiliation>;
  private changeLogRepo: Repository<AffiliationChangeLog>;

  constructor(private dataSource: DataSource) {
    this.memberRepo = dataSource.getRepository(Member);
    this.categoryRepo = dataSource.getRepository(MemberCategory);
    this.verificationRepo = dataSource.getRepository(Verification);
    this.membershipYearRepo = dataSource.getRepository(MembershipYear);
    this.affiliationRepo = dataSource.getRepository(Affiliation);
    this.changeLogRepo = dataSource.getRepository(AffiliationChangeLog);
  }

  /**
   * 대시보드 통계 조회
   */
  async getDashboardStats(organizationId?: string): Promise<DashboardStats> {
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. 총 회원 수
    const totalMembers = organizationId
      ? await this.memberRepo.count({ where: { organizationId } })
      : await this.memberRepo.count();

    // 2. 검증된 회원 수
    const verifiedMembers = organizationId
      ? await this.memberRepo.count({ where: { organizationId, isVerified: true } })
      : await this.memberRepo.count({ where: { isVerified: true } });

    // 3. 검증 대기 중인 회원 수
    const pendingVerifications = await this.verificationRepo
      .createQueryBuilder('v')
      .leftJoin('v.member', 'member')
      .where('v.status = :status', { status: 'pending' })
      .andWhere(organizationId ? 'member.organizationId = :organizationId' : '1=1', {
        organizationId,
      })
      .getCount();

    // 4. 연회비 미납 회원 수 (현재 연도 기준)
    const unpaidFeesQuery = this.memberRepo
      .createQueryBuilder('member')
      .leftJoin('member.category', 'category')
      .leftJoin('member.membershipYears', 'year')
      .where('category.requiresAnnualFee = true')
      .andWhere(
        '(year.year IS NULL OR (year.year = :currentYear AND year.paid = false))',
        { currentYear }
      );

    if (organizationId) {
      unpaidFeesQuery.andWhere('member.organizationId = :organizationId', {
        organizationId,
      });
    }

    const unpaidFees = await unpaidFeesQuery.getCount();

    // 5. 이번 달 신규 가입자 수
    const newMembersQuery = this.memberRepo
      .createQueryBuilder('member')
      .where('member.createdAt >= :startOfMonth', { startOfMonth });

    if (organizationId) {
      newMembersQuery.andWhere('member.organizationId = :organizationId', {
        organizationId,
      });
    }

    const newMembersThisMonth = await newMembersQuery.getCount();

    // 6. 카테고리별 회원 분포
    const categoryBreakdownQuery = this.memberRepo
      .createQueryBuilder('member')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(member.id)', 'count')
      .leftJoin('member.category', 'category')
      .groupBy('category.id')
      .addGroupBy('category.name');

    if (organizationId) {
      categoryBreakdownQuery.where('member.organizationId = :organizationId', {
        organizationId,
      });
    }

    const categoryBreakdownRaw = await categoryBreakdownQuery.getRawMany();
    const categoryBreakdown = categoryBreakdownRaw.map((row) => ({
      categoryId: row.categoryId || 'uncategorized',
      categoryName: row.categoryName || '미분류',
      count: parseInt(row.count, 10),
    }));

    // 7. 조직별 회원 분포 (전체 조회 시에만)
    let organizationBreakdown: DashboardStats['organizationBreakdown'];
    if (!organizationId) {
      const orgBreakdownRaw = await this.memberRepo
        .createQueryBuilder('member')
        .select('member.organizationId', 'organizationId')
        .addSelect('COUNT(member.id)', 'count')
        .groupBy('member.organizationId')
        .getRawMany();

      organizationBreakdown = orgBreakdownRaw.map((row) => ({
        organizationId: row.organizationId,
        count: parseInt(row.count, 10),
      }));
    }

    // 8. 최근 트렌드
    const membersLastWeekQuery = this.memberRepo
      .createQueryBuilder('member')
      .where('member.createdAt >= :oneWeekAgo', { oneWeekAgo });

    const membersLastMonthQuery = this.memberRepo
      .createQueryBuilder('member')
      .where('member.createdAt >= :oneMonthAgo', { oneMonthAgo });

    const verificationsLastWeekQuery = this.verificationRepo
      .createQueryBuilder('v')
      .where('v.createdAt >= :oneWeekAgo', { oneWeekAgo });

    if (organizationId) {
      membersLastWeekQuery
        .leftJoin('member.organization', 'org')
        .andWhere('member.organizationId = :organizationId', { organizationId });

      membersLastMonthQuery
        .leftJoin('member.organization', 'org')
        .andWhere('member.organizationId = :organizationId', { organizationId });

      verificationsLastWeekQuery
        .leftJoin('v.member', 'member')
        .andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const membersLastWeek = await membersLastWeekQuery.getCount();
    const membersLastMonth = await membersLastMonthQuery.getCount();
    const verificationsLastWeek = await verificationsLastWeekQuery.getCount();

    return {
      totalMembers,
      verifiedMembers,
      pendingVerifications,
      unpaidFees,
      newMembersThisMonth,
      categoryBreakdown,
      organizationBreakdown,
      recentTrends: {
        membersLastWeek,
        membersLastMonth,
        verificationsLastWeek,
      },
    };
  }

  // ==========================================
  // Phase 2: 확장 대시보드 통계 메서드
  // ==========================================

  /**
   * 확장 대시보드 통계 조회
   *
   * Phase 2: 운영 고도화 지표 포함
   */
  async getExtendedDashboardStats(organizationId?: string): Promise<ExtendedDashboardStats> {
    // 1. 기본 통계 조회
    const basicStats = await this.getDashboardStats(organizationId);

    // 2. 약사 유형별 통계
    const pharmacistTypeBreakdown = await this.getPharmacistTypeBreakdown(organizationId);

    // 3. 직책별 통계
    const officialRoleBreakdown = await this.getOfficialRoleBreakdown(organizationId);

    // 4. 성별 분포
    const genderBreakdown = await this.getGenderBreakdown(organizationId);

    // 5. 임원 통계
    const executiveStats = await this.getExecutiveStats(organizationId);

    // 6. 연회비 통계
    const feeStats = await this.getFeeStats(organizationId);

    // 7. 최근 활동 통계
    const recentActivity = await this.getRecentActivityStats(organizationId);

    return {
      ...basicStats,
      pharmacistTypeBreakdown,
      officialRoleBreakdown,
      genderBreakdown,
      executiveStats,
      feeStats,
      recentActivity,
    };
  }

  /**
   * 약사 유형별 통계
   */
  async getPharmacistTypeBreakdown(
    organizationId?: string
  ): Promise<Record<PharmacistType | 'unset', number>> {
    const queryBuilder = this.memberRepo
      .createQueryBuilder('member')
      .select('member.pharmacistType', 'pharmacistType')
      .addSelect('COUNT(*)', 'count')
      .where('member.isActive = true')
      .groupBy('member.pharmacistType');

    if (organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const results = await queryBuilder.getRawMany();

    const breakdown: Record<string, number> = {
      working: 0,
      owner: 0,
      hospital: 0,
      public: 0,
      industry: 0,
      retired: 0,
      other: 0,
      unset: 0,
    };

    for (const row of results) {
      const key = row.pharmacistType || 'unset';
      breakdown[key] = parseInt(row.count, 10);
    }

    return breakdown as Record<PharmacistType | 'unset', number>;
  }

  /**
   * 직책별 통계
   */
  async getOfficialRoleBreakdown(
    organizationId?: string
  ): Promise<Record<OfficialRole | 'unset', number>> {
    const queryBuilder = this.memberRepo
      .createQueryBuilder('member')
      .select('member.officialRole', 'officialRole')
      .addSelect('COUNT(*)', 'count')
      .where('member.isActive = true')
      .groupBy('member.officialRole');

    if (organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const results = await queryBuilder.getRawMany();

    const breakdown: Record<string, number> = {
      president: 0,
      vice_president: 0,
      general_manager: 0,
      auditor: 0,
      director: 0,
      branch_head: 0,
      district_head: 0,
      none: 0,
      unset: 0,
    };

    for (const row of results) {
      const key = row.officialRole || 'unset';
      breakdown[key] = parseInt(row.count, 10);
    }

    return breakdown as Record<OfficialRole | 'unset', number>;
  }

  /**
   * 성별 분포 통계
   */
  async getGenderBreakdown(
    organizationId?: string
  ): Promise<Record<Gender | 'unset', number>> {
    const queryBuilder = this.memberRepo
      .createQueryBuilder('member')
      .select('member.gender', 'gender')
      .addSelect('COUNT(*)', 'count')
      .where('member.isActive = true')
      .groupBy('member.gender');

    if (organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const results = await queryBuilder.getRawMany();

    const breakdown: Record<string, number> = {
      male: 0,
      female: 0,
      other: 0,
      unset: 0,
    };

    for (const row of results) {
      const key = row.gender || 'unset';
      breakdown[key] = parseInt(row.count, 10);
    }

    return breakdown as Record<Gender | 'unset', number>;
  }

  /**
   * 임원 통계
   */
  async getExecutiveStats(organizationId?: string): Promise<{
    totalExecutives: number;
    byRole: Record<string, number>;
  }> {
    const executiveRoles = [
      'president', 'vice_president', 'general_manager',
      'auditor', 'director', 'branch_head', 'district_head',
    ];

    const queryBuilder = this.memberRepo
      .createQueryBuilder('member')
      .select('member.officialRole', 'officialRole')
      .addSelect('COUNT(*)', 'count')
      .where('member.isActive = true')
      .andWhere('member.officialRole IN (:...executiveRoles)', { executiveRoles })
      .groupBy('member.officialRole');

    if (organizationId) {
      queryBuilder.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const results = await queryBuilder.getRawMany();

    const byRole: Record<string, number> = {};
    let totalExecutives = 0;

    for (const row of results) {
      const count = parseInt(row.count, 10);
      byRole[row.officialRole] = count;
      totalExecutives += count;
    }

    return { totalExecutives, byRole };
  }

  /**
   * 연회비 통계
   */
  async getFeeStats(organizationId?: string): Promise<{
    currentYear: number;
    paidCount: number;
    unpaidCount: number;
    exemptCount: number;
    totalCollected: number;
    collectionRate: number;
  }> {
    const currentYear = new Date().getFullYear();

    // 연회비가 필요한 회원 수 조회
    const feeRequiredQuery = this.memberRepo
      .createQueryBuilder('member')
      .leftJoin('member.category', 'category')
      .where('member.isActive = true')
      .andWhere('category.requiresAnnualFee = true');

    if (organizationId) {
      feeRequiredQuery.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const totalFeeRequired = await feeRequiredQuery.getCount();

    // 면제 회원 수 (연회비 불필요 카테고리)
    const exemptQuery = this.memberRepo
      .createQueryBuilder('member')
      .leftJoin('member.category', 'category')
      .where('member.isActive = true')
      .andWhere('(category.requiresAnnualFee = false OR category.requiresAnnualFee IS NULL)');

    if (organizationId) {
      exemptQuery.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const exemptCount = await exemptQuery.getCount();

    // 납부 완료 회원 수
    const paidQuery = this.membershipYearRepo
      .createQueryBuilder('year')
      .leftJoin('year.member', 'member')
      .where('year.year = :currentYear', { currentYear })
      .andWhere('year.paid = true')
      .andWhere('member.isActive = true');

    if (organizationId) {
      paidQuery.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const paidCount = await paidQuery.getCount();

    // 총 수금액
    const totalCollectedQuery = this.membershipYearRepo
      .createQueryBuilder('year')
      .select('SUM(year.amount)', 'total')
      .leftJoin('year.member', 'member')
      .where('year.year = :currentYear', { currentYear })
      .andWhere('year.paid = true')
      .andWhere('member.isActive = true');

    if (organizationId) {
      totalCollectedQuery.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const totalCollectedResult = await totalCollectedQuery.getRawOne();
    const totalCollected = parseFloat(totalCollectedResult?.total) || 0;

    // 미납 회원 수
    const unpaidCount = totalFeeRequired - paidCount;

    // 수금율
    const collectionRate = totalFeeRequired > 0 ? (paidCount / totalFeeRequired) * 100 : 0;

    return {
      currentYear,
      paidCount,
      unpaidCount: Math.max(0, unpaidCount),
      exemptCount,
      totalCollected,
      collectionRate: Math.round(collectionRate * 100) / 100,
    };
  }

  /**
   * 최근 활동 통계 (지난 30일)
   */
  async getRecentActivityStats(organizationId?: string): Promise<{
    newMembers: number;
    transfersIn: number;
    transfersOut: number;
    positionChanges: number;
    verificationsPending: number;
    verificationsApproved: number;
    verificationsRejected: number;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 신규 회원 수
    const newMembersQuery = this.memberRepo
      .createQueryBuilder('member')
      .where('member.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo });

    if (organizationId) {
      newMembersQuery.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const newMembers = await newMembersQuery.getCount();

    // 전입 (다른 조직에서 현재 조직으로)
    let transfersIn = 0;
    let transfersOut = 0;
    let positionChanges = 0;

    if (organizationId) {
      transfersIn = await this.changeLogRepo
        .createQueryBuilder('log')
        .where('log.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .andWhere('log.changeType = :type', { type: 'transfer' })
        .andWhere('log.toOrganizationId = :organizationId', { organizationId })
        .getCount();

      transfersOut = await this.changeLogRepo
        .createQueryBuilder('log')
        .where('log.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .andWhere('log.changeType = :type', { type: 'transfer' })
        .andWhere('log.fromOrganizationId = :organizationId', { organizationId })
        .getCount();

      positionChanges = await this.changeLogRepo
        .createQueryBuilder('log')
        .where('log.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .andWhere('log.changeType = :type', { type: 'position_change' })
        .andWhere('log.toOrganizationId = :organizationId', { organizationId })
        .getCount();
    } else {
      // 전체 조직 기준
      const transferTotal = await this.changeLogRepo
        .createQueryBuilder('log')
        .where('log.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .andWhere('log.changeType = :type', { type: 'transfer' })
        .getCount();

      transfersIn = transferTotal;
      transfersOut = transferTotal;

      positionChanges = await this.changeLogRepo
        .createQueryBuilder('log')
        .where('log.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .andWhere('log.changeType = :type', { type: 'position_change' })
        .getCount();
    }

    // 검증 현황
    const verificationBaseQuery = this.verificationRepo
      .createQueryBuilder('v')
      .leftJoin('v.member', 'member')
      .where('v.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo });

    if (organizationId) {
      verificationBaseQuery.andWhere('member.organizationId = :organizationId', { organizationId });
    }

    const verificationsPending = await verificationBaseQuery
      .clone()
      .andWhere('v.status = :status', { status: 'pending' })
      .getCount();

    const verificationsApproved = await verificationBaseQuery
      .clone()
      .andWhere('v.status = :status', { status: 'approved' })
      .getCount();

    const verificationsRejected = await verificationBaseQuery
      .clone()
      .andWhere('v.status = :status', { status: 'rejected' })
      .getCount();

    return {
      newMembers,
      transfersIn,
      transfersOut,
      positionChanges,
      verificationsPending,
      verificationsApproved,
      verificationsRejected,
    };
  }

  /**
   * 조직별 회원 요약 통계
   */
  async getOrganizationSummary(organizationId: string): Promise<{
    organizationId: string;
    totalMembers: number;
    activeMembers: number;
    verifiedMembers: number;
    executiveCount: number;
    paidFeeCount: number;
    pharmacistTypeBreakdown: Record<string, number>;
    genderBreakdown: Record<string, number>;
  }> {
    // 총 회원 수
    const totalMembers = await this.memberRepo.count({
      where: { organizationId },
    });

    // 활성 회원 수
    const activeMembers = await this.memberRepo.count({
      where: { organizationId, isActive: true },
    });

    // 검증된 회원 수
    const verifiedMembers = await this.memberRepo.count({
      where: { organizationId, isVerified: true, isActive: true },
    });

    // 임원 수
    const executiveRoles = [
      'president', 'vice_president', 'general_manager',
      'auditor', 'director', 'branch_head', 'district_head',
    ];

    const executiveCount = await this.memberRepo
      .createQueryBuilder('member')
      .where('member.organizationId = :organizationId', { organizationId })
      .andWhere('member.isActive = true')
      .andWhere('member.officialRole IN (:...executiveRoles)', { executiveRoles })
      .getCount();

    // 연회비 납부 회원 수
    const currentYear = new Date().getFullYear();
    const paidFeeCount = await this.membershipYearRepo
      .createQueryBuilder('year')
      .leftJoin('year.member', 'member')
      .where('member.organizationId = :organizationId', { organizationId })
      .andWhere('year.year = :currentYear', { currentYear })
      .andWhere('year.paid = true')
      .getCount();

    // 약사 유형별 분포
    const pharmacistTypeBreakdown = await this.getPharmacistTypeBreakdown(organizationId);

    // 성별 분포
    const genderBreakdown = await this.getGenderBreakdown(organizationId);

    return {
      organizationId,
      totalMembers,
      activeMembers,
      verifiedMembers,
      executiveCount,
      paidFeeCount,
      pharmacistTypeBreakdown,
      genderBreakdown,
    };
  }
}
