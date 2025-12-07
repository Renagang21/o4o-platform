import { DataSource, Repository } from 'typeorm';
import { Member } from '../entities/Member.js';
import { MemberCategory } from '../entities/MemberCategory.js';
import { Verification } from '../entities/Verification.js';
import { MembershipYear } from '../entities/MembershipYear.js';

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
 * StatsService
 *
 * 회원 시스템 통계 서비스
 */
export class StatsService {
  private memberRepo: Repository<Member>;
  private categoryRepo: Repository<MemberCategory>;
  private verificationRepo: Repository<Verification>;
  private membershipYearRepo: Repository<MembershipYear>;

  constructor(private dataSource: DataSource) {
    this.memberRepo = dataSource.getRepository(Member);
    this.categoryRepo = dataSource.getRepository(MemberCategory);
    this.verificationRepo = dataSource.getRepository(Verification);
    this.membershipYearRepo = dataSource.getRepository(MembershipYear);
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
}
