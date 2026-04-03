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
import { KPA_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../../../common/middleware/membership-guard.middleware.js';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { KpaApplication } from '../entities/kpa-application.entity.js';
import { KpaOrganizationJoinRequest } from '../entities/kpa-organization-join-request.entity.js';
import { CopilotEngineService } from '../../../copilot/copilot-engine.service.js';

interface OperatorSummaryServices {
  contentService: ContentQueryService;
  signageService: SignageQueryService;
  forumService: ForumQueryService;
}

const requireKpaScope = createMembershipScopeGuard(KPA_SCOPE_CONFIG);

export function createOperatorSummaryController(
  dataSource: DataSource,
  services: OperatorSummaryServices,
): Router {
  const router = Router();
  const copilotEngine = new CopilotEngineService();
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
        WHERE "serviceKey" IN ('kpa-society', 'kpa') AND status = 'published'
      `),
      dataSource.query(`
        SELECT COUNT(*) as count FROM signage_media
        WHERE "serviceKey" = 'kpa-society' AND status = 'active' AND "deletedAt" IS NULL
      `),
      dataSource.query(`
        SELECT COUNT(*) as count FROM signage_playlists
        WHERE "serviceKey" = 'kpa-society' AND status = 'active' AND "deletedAt" IS NULL
      `),
      // WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: DESIGN-ACCEPT
      // Forum is Community domain (Boundary Policy F6, primary boundary = organizationId).
      // Public posts (organization_id IS NULL) are shared across services by design.
      // forum_post/forum_category have no serviceKey column — isolation is via organizationId.
      dataSource.query(`
        SELECT COUNT(*) as count FROM forum_post
        WHERE status = 'publish' AND organization_id IS NULL
      `),
      // WO-KPA-OPERATOR-KPI-REALIGN-V1: Action Required COUNT queries
      dataSource.query(`
        SELECT COUNT(*) as count FROM cms_contents
        WHERE "serviceKey" IN ('kpa-society', 'kpa') AND status = 'draft'
      `),
      // WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1: pending approval count
      dataSource.query(`
        SELECT COUNT(*) as count FROM cms_contents
        WHERE "serviceKey" IN ('kpa-society', 'kpa') AND status = 'pending'
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
      // WO-KPA-A-OPERATOR-DASHBOARD-RECOVERY-V1: kpa_approval_requests 참조 제거 — 실존 테이블만 사용
      // Forum category request pending
      dataSource.query(`
        SELECT COUNT(*) AS count FROM forum_category_requests
        WHERE status = 'pending' AND service_code = 'kpa-society'
      `),
      // Instructor qualification pending
      dataSource.query(`
        SELECT COUNT(*) AS count FROM kpa_instructor_qualifications
        WHERE status = 'pending'
      `),
      // Course request pending
      dataSource.query(`
        SELECT COUNT(*) AS count FROM kpa_course_requests
        WHERE status = 'submitted'
      `),
      // Membership pending (organization join requests)
      dataSource.query(`
        SELECT COUNT(*) AS count FROM kpa_organization_join_requests
        WHERE status = 'pending'
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
   * GET /operator/dashboard
   * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1 (Phase 4)
   * 5-block OperatorDashboardConfig response — same data as /summary, unified shape.
   */
  router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
    const [
      recentContent,
      _signageHome,
      recentPosts,
      contentTotalCount,
      signageMediaTotalCount,
      signagePlaylistTotalCount,
      forumPostTotalCount,
      contentDraftCount,
      contentPendingCount,
      signagePendingMediaCount,
      signagePendingPlaylistCount,
      forumPendingRequestCount,
      instructorPendingCount,
      coursePendingCount,
      membershipPendingCount,
      forcedExpirySoonCount,
    ] = await Promise.all([
      contentService.listForHome(['notice', 'news', 'hero', 'promo'], 5),
      signageService.listForHome(3, 3),
      forumService.listRecentPosts(5),
      dataSource.query(`SELECT COUNT(*)::int as count FROM cms_contents WHERE "serviceKey" IN ('kpa-society', 'kpa') AND status = 'published'`),
      dataSource.query(`SELECT COUNT(*)::int as count FROM signage_media WHERE "serviceKey" = 'kpa-society' AND status = 'active' AND "deletedAt" IS NULL`),
      dataSource.query(`SELECT COUNT(*)::int as count FROM signage_playlists WHERE "serviceKey" = 'kpa-society' AND status = 'active' AND "deletedAt" IS NULL`),
      dataSource.query(`SELECT COUNT(*)::int as count FROM forum_post WHERE status = 'publish' AND organization_id IS NULL`), // DESIGN-ACCEPT: Community domain shared (F6)
      dataSource.query(`SELECT COUNT(*)::int as count FROM cms_contents WHERE "serviceKey" IN ('kpa-society', 'kpa') AND status = 'draft'`),
      dataSource.query(`SELECT COUNT(*)::int as count FROM cms_contents WHERE "serviceKey" IN ('kpa-society', 'kpa') AND status = 'pending'`),
      dataSource.query(`SELECT COUNT(*)::int as count FROM signage_media WHERE "serviceKey" = 'kpa-society' AND status = 'pending' AND "deletedAt" IS NULL`),
      dataSource.query(`SELECT COUNT(*)::int as count FROM signage_playlists WHERE "serviceKey" = 'kpa-society' AND status = 'pending' AND "deletedAt" IS NULL`),
      // WO-KPA-A-OPERATOR-DASHBOARD-RECOVERY-V1: kpa_approval_requests 참조 제거
      dataSource.query(`SELECT COUNT(*)::int AS count FROM forum_category_requests WHERE status = 'pending' AND service_code = 'kpa-society'`),
      dataSource.query(`SELECT COUNT(*)::int AS count FROM kpa_instructor_qualifications WHERE status = 'pending'`),
      dataSource.query(`SELECT COUNT(*)::int AS count FROM kpa_course_requests WHERE status = 'submitted'`),
      dataSource.query(`SELECT COUNT(*)::int AS count FROM kpa_organization_join_requests WHERE status = 'pending'`),
      dataSource.query(`SELECT COUNT(*)::int as count FROM kpa_store_asset_controls WHERE is_forced = true AND forced_end_at IS NOT NULL AND forced_end_at > NOW() AND forced_end_at <= NOW() + INTERVAL '7 days'`),
    ]);

    const p = (rows: any[]) => parseInt(rows[0]?.count || '0', 10);

    const publishedContent = p(contentTotalCount);
    const drafts = p(contentDraftCount);
    const pendingContent = p(contentPendingCount);
    const mediaCount = p(signageMediaTotalCount);
    const playlistCount = p(signagePlaylistTotalCount);
    const pendingMedia = p(signagePendingMediaCount);
    const pendingPlaylists = p(signagePendingPlaylistCount);
    const forumPosts = p(forumPostTotalCount);
    const forumPending = p(forumPendingRequestCount);
    const instrPending = p(instructorPendingCount);
    const coursePending = p(coursePendingCount);
    const memberPending = p(membershipPendingCount);
    const expirySoon = p(forcedExpirySoonCount);

    // Block 1: KPIs
    const kpis = [
      { key: 'published-content', label: '게시 콘텐츠', value: publishedContent, status: 'neutral' as const },
      { key: 'signage-media', label: '사이니지 미디어', value: mediaCount, status: 'neutral' as const },
      { key: 'signage-playlists', label: '플레이리스트', value: playlistCount, status: 'neutral' as const },
      { key: 'forum-posts', label: '포럼 게시글', value: forumPosts, status: 'neutral' as const },
    ];

    // Block 2: AI Summary (Copilot Engine)
    const copilotMetrics = {
      members: { active: 0, pending: memberPending },
      content: { published: publishedContent, pending: pendingContent },
      signage: { pending: pendingMedia + pendingPlaylists },
      forum: { pending: forumPending },
      storeAssets: { expiringSoon: expirySoon },
    };
    const copilotUser = {
      id: (req as any).user?.id || '',
      role: 'kpa:operator',
    };
    const { insights: aiSummary } = await copilotEngine.generateInsights(
      'kpa', copilotMetrics, copilotUser,
    );

    // Block 3: Action Queue
    const actionQueue = [
      { id: 'content-draft', label: '콘텐츠 임시저장', count: drafts, link: '/operator/content?status=draft' },
      { id: 'content-pending', label: '콘텐츠 승인 대기', count: pendingContent, link: '/operator/content?status=pending' },
      { id: 'signage-pending', label: '사이니지 승인 대기', count: pendingMedia + pendingPlaylists, link: '/operator/signage' },
      { id: 'forum-pending', label: '포럼 카테고리 요청', count: forumPending, link: '/operator/forum' },
      { id: 'instructor-pending', label: '강사 자격 승인', count: instrPending, link: '/operator/approvals' },
      { id: 'course-pending', label: '과정 승인', count: coursePending, link: '/operator/approvals' },
      { id: 'member-pending', label: '가입 승인', count: memberPending, link: '/operator/members' },
    ];

    // Block 4: Activity Log (recent content + forum posts, time-ordered)
    const activityLog: Array<{ id: string; message: string; timestamp: string }> = [];
    if (Array.isArray(recentContent)) {
      for (const item of recentContent.slice(0, 3)) {
        activityLog.push({
          id: `content-${(item as any).id}`,
          message: `콘텐츠: ${(item as any).title || '(제목 없음)'}`,
          timestamp: (item as any).createdAt || (item as any).publishedAt || new Date().toISOString(),
        });
      }
    }
    if (Array.isArray(recentPosts)) {
      for (const post of recentPosts.slice(0, 3)) {
        activityLog.push({
          id: `forum-${(post as any).id}`,
          message: `포럼: ${(post as any).title || '(제목 없음)'}`,
          timestamp: (post as any).createdAt || new Date().toISOString(),
        });
      }
    }
    activityLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Block 5: Quick Actions
    const quickActions = [
      { id: 'content', label: '콘텐츠 관리', link: '/operator/content', icon: 'file-text' },
      { id: 'signage', label: '사이니지 관리', link: '/operator/signage', icon: 'monitor' },
      { id: 'signage-media', label: '미디어 관리', link: '/operator/signage/media', icon: 'image' },
      { id: 'forum', label: '포럼 관리', link: '/operator/forum', icon: 'message-square' },
      { id: 'smart-display', label: '스마트 디스플레이', link: '/operator/smart-display', icon: 'tv' },
      { id: 'settings', label: '설정', link: '/operator/settings', icon: 'settings' },
    ];

    res.json({
      success: true,
      data: { kpis, aiSummary, actionQueue, activityLog, quickActions },
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
      // WO-KPA-A-OPERATOR-DASHBOARD-RECOVERY-V1: kpa_approval_requests 참조 제거 — 빈 배열 반환
      Promise.resolve([]),
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
