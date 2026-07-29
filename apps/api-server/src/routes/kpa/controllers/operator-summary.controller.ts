/**
 * KPA Operator Summary Controller
 *
 * 운영자 실사용 화면 1단계: APP-CONTENT / APP-SIGNAGE / APP-FORUM 요약 API
 * 기존 동결 QueryService 3개를 조합하여 단일 요약 응답을 반환.
 *
 * WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: requireKpaScope('kpa:operator') 표준화
 * WO-O4O-API-STRUCTURE-NORMALIZATION-PHASE2-V1: district-summary 추가
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import type { ContentQueryService } from '../../../modules/content/index.js';
import type { SignageQueryService } from '../../../modules/signage/index.js';
import type { ForumQueryService } from '../../../modules/forum/index.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { KPA_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../../../common/middleware/membership-guard.middleware.js';
import { KpaMember } from '../entities/kpa-member.entity.js';
// WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1: KpaApplication(dead flow) import 제거.
//   recentActivity·pendingApprovals 를 canonical(kpa_members / kpa_approval_requests)로 정합.
// WO-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-FOUNDATION-V1:
//   IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1 (Option B) Foundation.
//   /operator/dashboard 재도입 — 기존 /operator/summary 와 병행 운영, frontend Adapter WO 단계에서 전환.
import { buildKpaOperatorDashboardConfig } from '../services/operator-dashboard.service.js';
// WO-O4O-KPA-OPERATOR-ORDER-VIEW-BACKEND-ENABLE-V1: 공통 view-only 주문 조회 헬퍼
import { queryOperatorOrders } from '../../common/order/operatorOrderQuery.js';

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
  const { contentService, signageService, forumService } = services;

  // WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: Operator scope enforced at router level
  router.use(authenticate);
  router.use(requireKpaScope('kpa:operator'));

  /**
   * GET /operator/orders
   * WO-O4O-KPA-OPERATOR-ORDER-VIEW-BACKEND-ENABLE-V1 — view-only 주문 목록.
   * canonical 원장 checkout_orders + metadata.serviceKey IN ('kpa-society','kpa') (서버 고정).
   * 상태변경/배송/취소/환불/정산 없음. PII 미노출. empty(row 0)에서도 200 + 빈 목록.
   */
  router.get('/orders', asyncHandler(async (req: Request, res: Response) => {
    const result = await queryOperatorOrders(dataSource, ['kpa-society', 'kpa'], {
      page: req.query.page as string,
      limit: req.query.limit as string,
      status: (req.query.status as string) || null,
      paymentStatus: (req.query.paymentStatus as string) || null,
      search: (req.query.search as string) || null,
      dateFrom: (req.query.dateFrom as string) || null,
      dateTo: (req.query.dateTo as string) || null,
    });
    res.json({ success: true, data: result });
  }));

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
      // WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1:
      //   membershipPendingCount(entity_type='membership') 제거 — dead 조직 가입 승인 채널(프로덕션 0건).
      //   canonical pending 회원 = kpa_members.status='pending'.
      // WO-HUB-RISK-LOOP-COMPLETION-V1
      forcedExpirySoonCount,
      // WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V2: recentActivity
      recentMemberRows,
    ] = await Promise.all([
      contentService.listForHome(['notice', 'news'], 5),
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
      // WO-KPA-A-OPERATOR-DASHBOARD-RECOVERY-V1: 미존재 테이블 참조 제거 — safe fallback
      // Forum category request pending
      dataSource.query(`
        SELECT COUNT(*) AS count FROM forum_category_requests
        WHERE status = 'pending' AND service_code = 'kpa-society'
      `),
      // Instructor qualification pending (kpa_approval_requests 테이블 복구됨)
      dataSource.query(`
        SELECT COUNT(*) AS count FROM kpa_approval_requests
        WHERE entity_type = 'instructor_qualification' AND status = 'pending'
      `).catch(() => [{ count: '0' }]),
      // Course request pending (kpa_approval_requests 테이블 복구됨)
      dataSource.query(`
        SELECT COUNT(*) AS count FROM kpa_approval_requests
        WHERE entity_type = 'course' AND status = 'pending'
      `).catch(() => [{ count: '0' }]),
      // WO-HUB-RISK-LOOP-COMPLETION-V1: 강제노출 만료 임박 — 테이블 미존재 시 safe fallback
      dataSource.query(`
        SELECT COUNT(*) as count FROM kpa_store_asset_controls
        WHERE is_forced = true
          AND forced_end_at IS NOT NULL
          AND forced_end_at > NOW()
          AND forced_end_at <= NOW() + INTERVAL '7 days'
      `).catch(() => [{ count: 0 }]),
      // WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V2: recentActivity 소스 쿼리
      dataSource.query(`
        SELECT m.id, u.name, m.membership_type, m.status, m.created_at
        FROM kpa_members m
        LEFT JOIN users u ON u.id = m.user_id
        ORDER BY m.created_at DESC LIMIT 10
      `).catch(() => []),
    ]);

    // WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V2: build recentActivity
    const recentActivity: Array<{ type: string; label: string; timestamp: string; status: string }> = [];
    for (const r of (recentMemberRows as any[]) || []) {
      const typeLabel = r.membership_type === 'student' ? '학생' : '약사';
      recentActivity.push({
        type: 'member_join',
        label: `${r.name || '(이름 없음)'} ${typeLabel} 가입`,
        timestamp: r.created_at,
        status: r.status,
      });
    }
    // WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1: kpa_applications recentActivity 제거(dead flow).
    // WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1: org_join recentActivity 제거(dead flow).
    //   recentActivity 는 kpa_members(회원 가입) 만으로 조립.
    // Sort by timestamp descending, limit to 15
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    recentActivity.splice(15);

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
        // WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1: membershipPending 제거(dead flow).
        approval: {
          instructorPending: parseInt(instructorPendingCount[0]?.count || '0', 10),
          coursePending: parseInt(coursePendingCount[0]?.count || '0', 10),
        },
        store: {
          forcedExpirySoon: parseInt(forcedExpirySoonCount[0]?.count || '0', 10),
        },
        // WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V2
        recentActivity,
      },
    });
  }));

  /**
   * GET /operator/dashboard
   * WO-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-FOUNDATION-V1
   *   IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1 (Option B) Foundation.
   *
   * Cross-service 5-Block dashboard 응답 (`OperatorDashboardConfig`).
   *   - 기존 /operator/summary 의 query 재사용 (3 module service + raw)
   *   - 추가 보조 query (members pending / event-offer pending / store stats /
   *     product-applications pending / [admin] total members)
   *   - frontend `buildKpaOperatorConfig` 의 5-Block 조립 logic 동일 적용
   *   - isAdmin role-aware (KPI 2 / AI summary 1 / Action Queue 1 / Quick Actions 3 추가)
   *
   * 포함하지 않음 (I3 정책 + I1 권고):
   *   - AxisNavigationSection axes — frontend 유지 (buildKpaAxes)
   *   - OperatorRoleGuideCard content — frontend static 유지
   *
   * 기존 /operator/summary 미변경 — frontend Adapter WO 단계에서 전환 전까지 양립.
   */
  router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const userId: string = user?.id ?? '';
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    const isAdmin = roles.some(
      (r) => r === 'kpa:admin' || r === 'platform:super_admin',
    );

    const data = await buildKpaOperatorDashboardConfig(
      dataSource,
      { contentService, signageService, forumService },
      userId,
      isAdmin,
    );

    res.json({ success: true, data });
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
   * canonical 데이터(kpa_members: 활성/pending)를 Operator scope에서 직접 조회.
   */
  router.get('/district-summary', asyncHandler(async (req: Request, res: Response) => {
    const memberRepo = dataSource.getRepository(KpaMember);

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE1-V1: unified table only
    // WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1: pendingApprovals 를 kpa_applications(dead) →
    //   canonical 승인 대기로 정합.
    // WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1:
    //   승인 대기 source 를 dead kpa_approval_requests(entity_type='membership', 프로덕션 0건) →
    //   canonical kpa_members.status='pending' 로 재정합. 프론트(KpaAdminDashboardPage '최근 가입 신청')는
    //   req.requested_role/request_type/created_at 를 fallback 과 함께 렌더 → shape 호환.
    const [
      totalMembers,
      pendingJoinUnifiedRows,
    ] = await Promise.all([
      memberRepo.count({ where: { status: 'active' } }),
      dataSource.query(`
        SELECT m.id, u.name AS requester_name, u.email AS requester_email,
               m.membership_type AS requested_role, m.status, m.created_at
        FROM kpa_members m
        LEFT JOIN users u ON u.id = m.user_id
        WHERE m.status = 'pending'
        ORDER BY m.created_at ASC
        LIMIT $1
      `, [limit]).catch(() => []),
    ]);

    const pendingItems = pendingJoinUnifiedRows;
    const pendingTotal = pendingJoinUnifiedRows.length;

    res.json({
      success: true,
      data: {
        kpis: {
          totalMembers,
          pendingApprovals: pendingTotal,
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
