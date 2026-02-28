/**
 * KPA Operator Summary Controller
 *
 * 운영자 실사용 화면 1단계: APP-CONTENT / APP-SIGNAGE / APP-FORUM 요약 API
 * 기존 동결 QueryService 3개를 조합하여 단일 요약 응답을 반환.
 *
 * WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: requireKpaScope('kpa:operator') 표준화
 * WO-O4O-API-STRUCTURE-NORMALIZATION-PHASE2-V1: district-summary 추가
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import type { ContentQueryService } from '../../../modules/content/index.js';
import type { SignageQueryService } from '../../../modules/signage/index.js';
import type { ForumQueryService } from '../../../modules/forum/index.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createServiceScopeGuard, KPA_SCOPE_CONFIG } from '@o4o/security-core';
import { OrganizationStore } from '../entities/organization-store.entity.js';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { KpaApplication } from '../entities/kpa-application.entity.js';
import { KpaOrganizationJoinRequest } from '../entities/kpa-organization-join-request.entity.js';

interface OperatorSummaryServices {
  contentService: ContentQueryService;
  signageService: SignageQueryService;
  forumService: ForumQueryService;
}

const requireKpaScope = createServiceScopeGuard(KPA_SCOPE_CONFIG);

export function createOperatorSummaryController(
  dataSource: DataSource,
  services: OperatorSummaryServices,
): Router {
  const router = Router();
  const { contentService, signageService, forumService } = services;

  // WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: Operator scope enforced at router level
  router.use(authenticate);
  router.use(requireKpaScope('kpa:operator'));

  /**
   * GET /operator/summary
   * WO-KPA-OPERATOR-KPI-REALIGN-V1: Action Required 중심 KPI
   * 운영자 대시보드 통합 요약: 승인/요청 대기 + 최근 활동
   */
  router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
    // Parallel fetch: totals + pending counts + recent items
    const [
      recentContent,
      signageHome,
      recentPosts,
      // Totals (Hub, BranchOperator용)
      contentTotalCount,
      signageMediaTotalCount,
      signagePlaylistTotalCount,
      forumPostTotalCount,
      // WO-KPA-OPERATOR-KPI-REALIGN-V1: Action Required counts
      contentDraftCount,
      // WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1
      contentPendingCount,
      signagePendingMediaCount,
      signagePendingPlaylistCount,
      forumPendingRequestCount,
      // WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1: 통합 승인 카운트
      instructorPendingCount,
      coursePendingCount,
      membershipPendingCount,
      // WO-HUB-RISK-LOOP-COMPLETION-V1
      forcedExpirySoonCount,
    ] = await Promise.all([
      contentService.listForHome(['notice', 'news', 'hero', 'promo'], 5),
      signageService.listForHome(3, 3),
      forumService.listRecentPosts(5),
      // Total COUNT queries (Hub/BranchOperator 통계용)
      dataSource.query(`
        SELECT COUNT(*) as count FROM cms_contents
        WHERE "serviceKey" IN ('kpa', 'kpa-society') AND status = 'published'
      `),
      dataSource.query(`
        SELECT COUNT(*) as count FROM signage_media
        WHERE "serviceKey" = 'kpa-society' AND status = 'active' AND "deletedAt" IS NULL
      `),
      dataSource.query(`
        SELECT COUNT(*) as count FROM signage_playlists
        WHERE "serviceKey" = 'kpa-society' AND status = 'active' AND "deletedAt" IS NULL
      `),
      dataSource.query(`
        SELECT COUNT(*) as count FROM forum_post
        WHERE status = 'publish' AND organization_id IS NULL
      `),
      // WO-KPA-OPERATOR-KPI-REALIGN-V1: Action Required COUNT queries
      dataSource.query(`
        SELECT COUNT(*) as count FROM cms_contents
        WHERE "serviceKey" IN ('kpa', 'kpa-society') AND status = 'draft'
      `),
      // WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1: pending approval count
      dataSource.query(`
        SELECT COUNT(*) as count FROM cms_contents
        WHERE "serviceKey" IN ('kpa', 'kpa-society') AND status = 'pending'
      `),
      // WO-O4O-SIGNAGE-APPROVAL-IMPLEMENTATION-V1: pending = approval 대기 상태
      dataSource.query(`
        SELECT COUNT(*) as count FROM signage_media
        WHERE "serviceKey" = 'kpa-society' AND status = 'pending' AND "deletedAt" IS NULL
      `),
      dataSource.query(`
        SELECT COUNT(*) as count FROM signage_playlists
        WHERE "serviceKey" = 'kpa-society' AND status = 'pending' AND "deletedAt" IS NULL
      `),
      // WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1: 통합 승인 카운트 (4 entity_type + legacy dual-query)
      dataSource.query(`
        SELECT
          (SELECT COUNT(*) FROM forum_category_requests WHERE status = 'pending' AND service_code = 'kpa-society')
          +
          (SELECT COUNT(*) FROM kpa_approval_requests WHERE status = 'pending' AND entity_type = 'forum_category')
          AS count
      `),
      // Instructor qualification pending (unified + legacy)
      dataSource.query(`
        SELECT
          (SELECT COUNT(*) FROM kpa_approval_requests WHERE status = 'pending' AND entity_type = 'instructor_qualification')
          +
          (SELECT COUNT(*) FROM kpa_instructor_qualifications WHERE status = 'pending')
          AS count
      `),
      // Course request pending (unified + legacy)
      dataSource.query(`
        SELECT
          (SELECT COUNT(*) FROM kpa_approval_requests WHERE status = 'submitted' AND entity_type = 'course')
          +
          (SELECT COUNT(*) FROM kpa_course_requests WHERE status = 'submitted')
          AS count
      `),
      // Membership pending (unified + legacy)
      dataSource.query(`
        SELECT
          (SELECT COUNT(*) FROM kpa_approval_requests WHERE status = 'pending' AND entity_type = 'membership')
          +
          (SELECT COUNT(*) FROM kpa_organization_join_requests WHERE status = 'pending')
          AS count
      `),
      // WO-HUB-RISK-LOOP-COMPLETION-V1: 강제노출 만료 임박 (7일 이내)
      dataSource.query(`
        SELECT COUNT(*) as count FROM kpa_store_asset_controls
        WHERE is_forced = true
          AND forced_end_at IS NOT NULL
          AND forced_end_at > NOW()
          AND forced_end_at <= NOW() + INTERVAL '7 days'
      `),
    ]);

    res.json({
      success: true,
      data: {
        content: {
          totalPublished: parseInt(contentTotalCount[0]?.count || '0', 10),
          pendingDraft: parseInt(contentDraftCount[0]?.count || '0', 10),
          pendingApproval: parseInt(contentPendingCount[0]?.count || '0', 10),
          recentItems: recentContent,
        },
        signage: {
          totalMedia: parseInt(signageMediaTotalCount[0]?.count || '0', 10),
          totalPlaylists: parseInt(signagePlaylistTotalCount[0]?.count || '0', 10),
          pendingMedia: parseInt(signagePendingMediaCount[0]?.count || '0', 10),
          pendingPlaylists: parseInt(signagePendingPlaylistCount[0]?.count || '0', 10),
          recentMedia: signageHome.media,
          recentPlaylists: signageHome.playlists,
        },
        forum: {
          totalPosts: parseInt(forumPostTotalCount[0]?.count || '0', 10),
          pendingRequests: parseInt(forumPendingRequestCount[0]?.count || '0', 10),
          recentPosts,
        },
        // WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1
        approval: {
          instructorPending: parseInt(instructorPendingCount[0]?.count || '0', 10),
          coursePending: parseInt(coursePendingCount[0]?.count || '0', 10),
          membershipPending: parseInt(membershipPendingCount[0]?.count || '0', 10),
        },
        store: {
          forcedExpirySoon: parseInt(forcedExpirySoonCount[0]?.count || '0', 10),
        },
      },
    });
  }));

  /**
   * GET /operator/forum-analytics
   * 포럼 운영 통계: KPI 4개 + Top 5 활성 포럼 + 무활동 포럼
   */
  router.get('/forum-analytics', asyncHandler(async (req: Request, res: Response) => {
    const data = await forumService.getForumAnalytics();
    res.json({ success: true, data });
  }));

  /**
   * GET /operator/district-summary
   * WO-O4O-API-STRUCTURE-NORMALIZATION-PHASE2-V1
   *
   * KPA-c District Operator 전용 — adminApi 의존 제거.
   * 동일 데이터(organizations, members, applications, join-requests)를
   * Operator scope에서 직접 조회.
   */
  router.get('/district-summary', asyncHandler(async (req: Request, res: Response) => {
    const orgRepo = dataSource.getRepository(OrganizationStore);
    const memberRepo = dataSource.getRepository(KpaMember);
    const appRepo = dataSource.getRepository(KpaApplication);
    const joinReqRepo = dataSource.getRepository(KpaOrganizationJoinRequest);

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // WO-PLATFORM-APPROVAL-ENGINE-UNIFICATION-V1: dual-query (unified + legacy)
    const [
      branchCount,
      groupCount,
      totalMembers,
      pendingApprovals,
      pendingJoinResult,
      pendingJoinUnifiedRows,
    ] = await Promise.all([
      orgRepo.count({ where: { type: 'branch', isActive: true } }),
      orgRepo.count({ where: { type: 'group', isActive: true } }),
      memberRepo.count({ where: { status: 'active' } }),
      appRepo.count({ where: { status: 'submitted' } }),
      joinReqRepo
        .createQueryBuilder('r')
        .where('r.status = :status', { status: 'pending' })
        .orderBy('r.created_at', 'ASC')
        .take(limit)
        .getManyAndCount(),
      dataSource.query(
        `SELECT ar.id, ar.requester_id AS user_id, ar.organization_id,
                ar.payload->>'requested_role' AS requested_role,
                ar.payload->>'request_type' AS request_type,
                ar.status, ar.created_at
         FROM kpa_approval_requests ar
         WHERE ar.entity_type = 'membership' AND ar.status = 'pending'
         ORDER BY ar.created_at ASC
         LIMIT $1`,
        [limit],
      ),
    ]);

    const [pendingLegacyItems, pendingLegacyTotal] = pendingJoinResult;
    const pendingItems = [...pendingJoinUnifiedRows, ...pendingLegacyItems]
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, limit);
    const pendingTotal = pendingLegacyTotal + pendingJoinUnifiedRows.length;

    res.json({
      success: true,
      data: {
        kpis: {
          totalBranches: branchCount + groupCount,
          totalMembers,
          pendingApprovals,
        },
        pendingRequests: {
          total: pendingTotal,
          items: pendingItems,
        },
      },
    });
  }));

  return router;
}
