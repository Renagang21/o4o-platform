/**
 * MemberHomeQueryService
 *
 * Phase 2: Home 화면 전용 집계 서비스
 *
 * 정책:
 * - 조회만 수행 (쓰기/수정 경로 없음)
 * - 각 영역 독립 조회
 * - 한 영역 실패 시 해당 블록만 null (전체 실패 아님)
 * - 에러는 WARN 레벨로 로깅 (사용자에게 노출 안함)
 *
 * @see manifest.ts - Home UX Priority
 */

import type { DataSource, Repository, EntityManager } from 'typeorm';
import type {
  MemberHomeDTO,
  OrganizationNoticeSummary,
  GroupbuySummary,
  EducationSummary,
  ForumSummary,
  BannerSummary,
} from './dto.js';

/**
 * 조회 옵션
 */
export interface HomeQueryOptions {
  /** 사용자 ID (필수) */
  userId: string;
  /** 사용자 조직 ID */
  organizationId?: string;
  /** 회원 ID (yaksa_members.id) */
  memberId?: string;
}

export class MemberHomeQueryService {
  private dataSource: DataSource;
  private entityManager: EntityManager;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.entityManager = dataSource.manager;
  }

  /**
   * Home 전체 데이터 조회
   *
   * 각 영역을 독립적으로 조회하고 실패 시 null 반환
   * 전체 실패 없이 항상 결과 반환
   */
  async getHomeData(options: HomeQueryOptions): Promise<MemberHomeDTO> {
    const { userId, organizationId, memberId } = options;

    // 병렬 조회 (독립적)
    const [
      organizationNotice,
      groupbuySummary,
      educationSummary,
      forumSummary,
      bannerSummary,
    ] = await Promise.all([
      this.queryOrganizationNotice(userId, organizationId),
      this.queryGroupbuySummary(userId, organizationId),
      this.queryEducationSummary(userId),
      this.queryForumSummary(userId),
      this.queryBannerSummary(),
    ]);

    return {
      organizationNotice,
      groupbuySummary,
      educationSummary,
      forumSummary,
      bannerSummary,
    };
  }

  /**
   * [1] 지부/분회 공지 요약
   *
   * 출처: forum-yaksa (isAnnouncement: true인 글)
   */
  private async queryOrganizationNotice(
    userId: string,
    organizationId?: string
  ): Promise<OrganizationNoticeSummary | null> {
    try {
      // forum_posts 테이블에서 공지사항 조회
      const query = `
        SELECT
          p.id as "noticeId",
          p.title,
          p."createdAt",
          COALESCE((p.metadata->'yaksa'->>'pinned')::boolean, false) as "isPinned",
          COALESCE(p.metadata->'yaksa'->>'communityName', '') as "communityName"
        FROM forum_posts p
        WHERE p.status = 'publish'
          AND (p.metadata->'yaksa'->>'isAnnouncement')::boolean = true
        ORDER BY
          "isPinned" DESC,
          p."createdAt" DESC
        LIMIT 3
      `;

      const notices = await this.entityManager.query(query);

      return {
        notices: notices.map((n: any) => ({
          noticeId: n.noticeId,
          title: n.title,
          createdAt: n.createdAt?.toISOString?.() || n.createdAt,
          isPinned: n.isPinned,
          communityName: n.communityName || undefined,
        })),
        totalCount: notices.length,
      };
    } catch (error) {
      console.warn('[MemberHomeQueryService] Organization notice query failed:', error);
      return null;
    }
  }

  /**
   * [2] 공동구매 요약
   *
   * 출처: groupbuy-yaksa (GroupbuyCampaign)
   */
  private async queryGroupbuySummary(
    userId: string,
    organizationId?: string
  ): Promise<GroupbuySummary | null> {
    try {
      // 활성 캠페인 수 조회
      const activeCampaignsQuery = `
        SELECT COUNT(*) as count
        FROM groupbuy_campaigns gc
        WHERE gc.status = 'active'
        ${organizationId ? `AND gc."organizationId" = $1` : ''}
      `;

      const activeCampaignsResult = await this.entityManager.query(
        activeCampaignsQuery,
        organizationId ? [organizationId] : []
      );
      const activeCampaignCount = parseInt(activeCampaignsResult[0]?.count || '0', 10);

      // 참여 중인 캠페인 수 (사용자가 주문한 캠페인)
      const participatingQuery = `
        SELECT COUNT(DISTINCT o."campaignId") as count
        FROM groupbuy_orders o
        JOIN groupbuy_campaigns gc ON gc.id = o."campaignId"
        WHERE o."memberId" IN (
          SELECT id FROM yaksa_members WHERE "userId" = $1
        )
        AND gc.status = 'active'
      `;

      const participatingResult = await this.entityManager.query(participatingQuery, [userId]);
      const participatingCampaignCount = parseInt(participatingResult[0]?.count || '0', 10);

      // 마감 임박 캠페인
      const urgentQuery = `
        SELECT
          gc.id as "campaignId",
          gc.title,
          gc."endDate",
          EXTRACT(DAY FROM (gc."endDate" - NOW())) as "remainingDays"
        FROM groupbuy_campaigns gc
        WHERE gc.status = 'active'
          AND gc."endDate" > NOW()
        ${organizationId ? `AND gc."organizationId" = $1` : ''}
        ORDER BY gc."endDate" ASC
        LIMIT 1
      `;

      const urgentResult = await this.entityManager.query(
        urgentQuery,
        organizationId ? [organizationId] : []
      );
      const urgentCampaign = urgentResult[0];

      return {
        activeCampaignCount,
        participatingCampaignCount,
        mostUrgentCampaign: urgentCampaign
          ? {
              campaignId: urgentCampaign.campaignId,
              title: urgentCampaign.title,
              remainingDays: Math.max(0, Math.floor(urgentCampaign.remainingDays)),
              endDate: urgentCampaign.endDate?.toISOString?.() || urgentCampaign.endDate,
            }
          : undefined,
      };
    } catch (error) {
      console.warn('[MemberHomeQueryService] Groupbuy summary query failed:', error);
      return null;
    }
  }

  /**
   * [3] 교육(LMS) 필수 현황
   *
   * 출처: lms-yaksa (CourseAssignment, CreditRecord)
   */
  private async queryEducationSummary(userId: string): Promise<EducationSummary | null> {
    try {
      // 과제 현황 조회
      const assignmentQuery = `
        SELECT
          COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress', 'completed')) as "requiredCount",
          COUNT(*) FILTER (WHERE status = 'completed' OR "isCompleted" = true) as "completedCount",
          COUNT(*) FILTER (WHERE status = 'in_progress') as "inProgressCount",
          COUNT(*) FILTER (
            WHERE status IN ('pending', 'in_progress')
            AND "dueDate" < NOW()
            AND "isCompleted" = false
          ) as "overdueCount"
        FROM yaksa_course_assignments
        WHERE "userId" = $1
      `;

      const assignmentResult = await this.entityManager.query(assignmentQuery, [userId]);
      const stats = assignmentResult[0] || {};

      // 학점 현황 조회
      const creditQuery = `
        SELECT
          COALESCE(SUM(CASE WHEN "creditYear" = EXTRACT(YEAR FROM NOW()) THEN "creditsEarned" ELSE 0 END), 0) as "currentYearCredits"
        FROM credit_records
        WHERE "userId" = $1
          AND "isVerified" = true
      `;

      const creditResult = await this.entityManager.query(creditQuery, [userId]);
      const creditStats = creditResult[0] || {};

      const requiredCourseCount = parseInt(stats.requiredCount || '0', 10);
      const completedCourseCount = parseInt(stats.completedCount || '0', 10);
      const inProgressCourseCount = parseInt(stats.inProgressCount || '0', 10);
      const overdueCount = parseInt(stats.overdueCount || '0', 10);
      const currentYearCredits = parseFloat(creditStats.currentYearCredits || '0');

      // 필요 학점 (임의로 8학점으로 설정 - 향후 정책에서 가져올 수 있음)
      const requiredCredits = 8;
      const remainingCredits = Math.max(0, requiredCredits - currentYearCredits);

      return {
        requiredCourseCount,
        completedCourseCount,
        inProgressCourseCount,
        remainingCredits,
        currentYearCredits,
        hasOverdue: overdueCount > 0,
        overdueCount,
      };
    } catch (error) {
      console.warn('[MemberHomeQueryService] Education summary query failed:', error);
      return null;
    }
  }

  /**
   * [4] 포럼 최신 글
   *
   * 출처: forum-yaksa (ForumPost)
   */
  private async queryForumSummary(userId: string): Promise<ForumSummary | null> {
    try {
      const query = `
        SELECT
          p.id as "postId",
          p.title,
          p."createdAt",
          COALESCE(c.type, '') as "communityType",
          COALESCE(c.name, '') as "communityName"
        FROM forum_posts p
        LEFT JOIN yaksa_communities c
          ON c.id = (p.metadata->'yaksa'->>'communityId')::uuid
        WHERE p.status = 'publish'
          AND p.organization_id IS NULL
          AND (p.metadata->'yaksa'->>'isAnnouncement')::boolean IS NOT TRUE
        ORDER BY p."createdAt" DESC
        LIMIT 5
      `;

      const posts = await this.entityManager.query(query);

      return {
        posts: posts.map((p: any) => ({
          postId: p.postId,
          title: p.title,
          createdAt: p.createdAt?.toISOString?.() || p.createdAt,
          communityType: p.communityType || undefined,
          communityName: p.communityName || undefined,
        })),
      };
    } catch (error) {
      console.warn('[MemberHomeQueryService] Forum summary query failed:', error);
      return null;
    }
  }

  /**
   * [5] 배너/안내 (Placeholder)
   *
   * Phase 2에서는 정적 메시지만 반환
   * 향후 서비스 연결 예정
   */
  private async queryBannerSummary(): Promise<BannerSummary | null> {
    try {
      // Phase 2: Placeholder
      return {
        banners: [],
        message: '배너 기능은 향후 업데이트 예정입니다.',
      };
    } catch (error) {
      console.warn('[MemberHomeQueryService] Banner summary query failed:', error);
      return null;
    }
  }
}
