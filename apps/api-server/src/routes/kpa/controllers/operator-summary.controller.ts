/**
 * KPA Operator Summary Controller
 *
 * 운영자 실사용 화면 1단계: APP-CONTENT / APP-SIGNAGE / APP-FORUM 요약 API
 * 기존 동결 QueryService 3개를 조합하여 단일 요약 응답을 반환.
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import type { ContentQueryService } from '../../../modules/content/index.js';
import type { SignageQueryService } from '../../../modules/signage/index.js';
import type { ForumQueryService } from '../../../modules/forum/index.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole, logLegacyRoleUsage } from '../../../utils/role.utils.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

interface OperatorSummaryServices {
  contentService: ContentQueryService;
  signageService: SignageQueryService;
  forumService: ForumQueryService;
}

function isKpaOperator(roles: string[] = [], userId: string = 'unknown'): boolean {
  const hasKpaRole = hasAnyServiceRole(roles, [
    'kpa:admin',
    'kpa:operator',
  ]);
  if (hasKpaRole) return true;

  // Detect and log legacy roles — DENY
  const legacyRoles = ['admin', 'operator', 'administrator', 'super_admin'];
  const detected = roles.filter(r => legacyRoles.includes(r));
  if (detected.length > 0) {
    detected.forEach(role => {
      logLegacyRoleUsage(userId, role, 'operator-summary.controller:isKpaOperator');
    });
  }
  return false;
}

export function createOperatorSummaryController(
  dataSource: DataSource,
  services: OperatorSummaryServices,
): Router {
  const router = Router();
  const { contentService, signageService, forumService } = services;

  /**
   * GET /operator/summary
   * 운영자 대시보드 통합 요약: Content + Signage + Forum
   */
  router.get('/summary', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'unknown';
    const userRoles = authReq.user?.roles || [];

    if (!isKpaOperator(userRoles, userId)) {
      res.status(403).json({
        success: false,
        error: 'KPA operator role required',
      });
      return;
    }

    // Parallel fetch: counts + recent items using existing QueryServices
    const [
      recentContent,
      signageHome,
      recentPosts,
      contentCount,
      signageMediaCount,
      signagePlaylistCount,
      forumPostCount,
    ] = await Promise.all([
      contentService.listForHome(['notice', 'news', 'hero', 'promo'], 5),
      signageService.listForHome(3, 3),
      forumService.listRecentPosts(5),
      // COUNT queries — inline, not modifying frozen QueryServices
      dataSource.query(`
        SELECT COUNT(*) as count FROM cms_contents
        WHERE "serviceKey" IN ('kpa', 'kpa-society') AND status = 'published'
      `),
      dataSource.query(`
        SELECT COUNT(*) as count FROM signage_media
        WHERE "serviceKey" = 'kpa-society' AND status = 'active'
      `),
      dataSource.query(`
        SELECT COUNT(*) as count FROM signage_playlists
        WHERE "serviceKey" = 'kpa-society' AND status = 'active'
      `),
      dataSource.query(`
        SELECT COUNT(*) as count FROM forum_post
        WHERE status = 'publish' AND organization_id IS NULL
      `),
    ]);

    res.json({
      success: true,
      data: {
        content: {
          totalPublished: parseInt(contentCount[0]?.count || '0', 10),
          recentItems: recentContent,
        },
        signage: {
          totalMedia: parseInt(signageMediaCount[0]?.count || '0', 10),
          totalPlaylists: parseInt(signagePlaylistCount[0]?.count || '0', 10),
          recentMedia: signageHome.media,
          recentPlaylists: signageHome.playlists,
        },
        forum: {
          totalPosts: parseInt(forumPostCount[0]?.count || '0', 10),
          recentPosts,
        },
      },
    });
  }));

  /**
   * GET /operator/forum-analytics
   * 포럼 운영 통계: KPI 4개 + Top 5 활성 포럼 + 무활동 포럼
   */
  router.get('/forum-analytics', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || 'unknown';
    const userRoles = authReq.user?.roles || [];

    if (!isKpaOperator(userRoles, userId)) {
      res.status(403).json({
        success: false,
        error: 'KPA operator role required',
      });
      return;
    }

    const data = await forumService.getForumAnalytics();
    res.json({ success: true, data });
  }));

  return router;
}
