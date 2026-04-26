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
import { KpaApplication } from '../entities/kpa-application.entity.js';
// WO-KPA-A-OPERATOR-DASHBOARD-FIRST-STABILIZATION-V1: CopilotEngineService import 제거
// /operator/dashboard 엔드포인트 삭제 — 프론트엔드 미사용 (프론트는 /operator/summary 사용)

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
      // WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V2: recentActivity
      recentMemberRows,
      recentPharmacyRows,
      recentApplicationRows,
      recentOrgJoinRows,
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
      // Membership pending (kpa_approval_requests)
      dataSource.query(`
        SELECT COUNT(*) AS count FROM kpa_approval_requests
        WHERE entity_type = 'membership' AND status = 'pending'
      `),
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
      dataSource.query(`
        SELECT id, pharmacy_name, status, created_at
        FROM kpa_pharmacy_requests
        ORDER BY created_at DESC LIMIT 5
      `).catch(() => []),
      dataSource.query(`
        SELECT a.id, u.name as applicant_name, a.status, a.created_at
        FROM kpa_applications a
        LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.created_at DESC LIMIT 5
      `).catch(() => []),
      dataSource.query(`
        SELECT r.id, r.requester_name AS name,
               r.payload->>'request_type' AS request_type, r.status, r.created_at
        FROM kpa_approval_requests r
        WHERE r.entity_type = 'membership'
        ORDER BY r.created_at DESC LIMIT 5
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
    for (const r of (recentPharmacyRows as any[]) || []) {
      recentActivity.push({
        type: 'pharmacy_request',
        label: `${r.pharmacy_name || '약국'} 서비스 신청`,
        timestamp: r.created_at,
        status: r.status,
      });
    }
    for (const r of (recentApplicationRows as any[]) || []) {
      recentActivity.push({
        type: 'application',
        label: `${r.applicant_name || '(이름 없음)'} 입회 신청`,
        timestamp: r.created_at,
        status: r.status,
      });
    }
    for (const r of (recentOrgJoinRows as any[]) || []) {
      recentActivity.push({
        type: 'org_join',
        label: `${r.name || '(이름 없음)'} 조직 가입 요청`,
        timestamp: r.created_at,
        status: r.status,
      });
    }
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
        approval: {
          instructorPending: parseInt(instructorPendingCount[0]?.count || '0', 10),
          coursePending: parseInt(coursePendingCount[0]?.count || '0', 10),
          membershipPending: parseInt(membershipPendingCount[0]?.count || '0', 10),
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
    const memberRepo = dataSource.getRepository(KpaMember);
    const appRepo = dataSource.getRepository(KpaApplication);

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // WO-KPA-AFFILIATION-TEXT-DECOUPLING-PHASE1-V1: unified table only
    const [
      totalMembers,
      pendingApprovals,
      pendingJoinUnifiedRows,
    ] = await Promise.all([
      memberRepo.count({ where: { status: 'active' } }),
      appRepo.count({ where: { status: 'submitted' } }),
      dataSource.query(`
        SELECT id, entity_type, organization_id, status, requester_id, requester_name, requester_email, created_at
        FROM kpa_approval_requests
        WHERE entity_type = 'membership' AND status = 'pending'
        ORDER BY created_at ASC
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
