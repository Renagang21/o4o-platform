/**
 * Neture Controller - P2 Implementation
 *
 * Work Order: WO-NETURE-SMOKE-STABILIZATION-V1
 * Phase: P2 (CRUD Operations)
 *
 * Public endpoints (no auth):
 * - GET /suppliers
 * - GET /suppliers/:slug
 *
 * (은퇴) /partnership/requests* — Legacy Partnership (WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1)
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { NetureService } from '../../../modules/neture/neture.service.js';
import { ContentQueryService } from '../../../modules/content/index.js';
import { SignageQueryService } from '../../../modules/signage/index.js';
import { ForumQueryService } from '../../../modules/forum/index.js';
import { SupplierStatus } from '../../../modules/neture/entities/index.js';
import { requireAuth, optionalAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import logger from '../../../utils/logger.js';

/**
 * Create Neture Controller (P1 - GET Only)
 */
export function createNetureController(dataSource: DataSource): Router {
  const router = Router();
  const service = new NetureService();

  // APP-CONTENT Phase 2: shared content query service
  const contentService = new ContentQueryService(dataSource, {
    serviceKeys: ['neture'],
    defaultTypes: ['notice', 'news', 'hero', 'guide', 'knowledge'],
  });

  // APP-SIGNAGE Phase 1: shared signage query service
  const signageService = new SignageQueryService(dataSource, {
    serviceKey: 'neture',
    sources: ['hq', 'supplier'],
  });

  // APP-FORUM Phase 1: shared forum query service
  const forumService = new ForumQueryService(dataSource, {
    scope: 'community',
  });

  // ============================================================================
  // PUBLIC ENDPOINTS (No Auth Required - Public Information Platform)
  // ============================================================================

  /**
   * GET /suppliers
   * List all suppliers
   *
   * Query Parameters:
   * - category (optional): Filter by category
   * - status (optional): Filter by status (default: ACTIVE)
   */
  router.get('/suppliers', async (req: Request, res: Response) => {
    try {
      const { category, status } = req.query;

      const filters: { category?: string; status?: SupplierStatus } = {};

      if (category && typeof category === 'string') {
        filters.category = category;
      }

      if (status && typeof status === 'string') {
        filters.status = status as SupplierStatus;
      }

      const suppliers = await service.getSuppliers(filters);

      res.json({
        suppliers,
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching suppliers:', error);
      res.status(500).json({
        error: 'Failed to fetch suppliers',
        details: (error as Error).message,
      });
    }
  });

  /**
   * GET /suppliers/:slug
   * Get supplier detail by slug
   */
  router.get('/suppliers/:slug', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;

      const supplier = await service.getSupplierBySlug(slug);

      if (!supplier) {
        return res.status(404).json({
          error: 'Supplier not found',
        });
      }

      res.json(supplier);
    } catch (error) {
      logger.error('[Neture API] Error fetching supplier detail:', error);
      res.status(500).json({
        error: 'Failed to fetch supplier detail',
        details: (error as Error).message,
      });
    }
  });

  // ============================================================================
  // CONTENT ENDPOINTS (APP-CONTENT Phase 2 → Phase 3A: 추천/조회수)
  // ============================================================================

  /**
   * GET /content
   * List published content with sort/filter/pagination + 추천 정보
   */
  router.get('/content', optionalAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const result = await contentService.listPublishedWithRecommendations({
        type: req.query.type as string,
        sort: (req.query.sort as string) as any || 'latest',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 12,
        userId,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('[Neture API] Error fetching content:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
  });

  /**
   * GET /content/:id
   * Get content detail + 추천 정보
   */
  router.get('/content/:id', optionalAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const content = await contentService.getByIdWithRecommendations(req.params.id, userId);
      if (!content) {
        return res.status(404).json({ success: false, error: { message: 'Content not found' } });
      }
      res.json({ success: true, data: content });
    } catch (error) {
      logger.error('[Neture API] Error fetching content detail:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch content detail' });
    }
  });

  /**
   * POST /content/:id/recommend
   * 추천 토글 (Phase 3A)
   */
  router.post('/content/:id/recommend', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      }
      const result = await contentService.toggleRecommendation(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('[Neture API] Error toggling recommendation:', error);
      res.status(500).json({ success: false, error: 'Failed to toggle recommendation' });
    }
  });

  /**
   * POST /content/:id/view
   * 조회수 증가 (Phase 3A, public)
   */
  router.post('/content/:id/view', async (req: Request, res: Response) => {
    try {
      await contentService.incrementViewCount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      logger.error('[Neture API] Error incrementing view count:', error);
      res.status(500).json({ success: false, error: 'Failed to increment view count' });
    }
  });

  // ============================================================================
  // SIGNAGE ENDPOINTS (APP-SIGNAGE Phase 1: SignageQueryService)
  // ============================================================================

  /**
   * GET /home/signage
   * Home page signage preview (media + playlists)
   */
  router.get('/home/signage', async (req: Request, res: Response) => {
    try {
      const mediaLimit = parseInt(req.query.mediaLimit as string) || 6;
      const playlistLimit = parseInt(req.query.playlistLimit as string) || 4;
      const data = await signageService.listForHome(mediaLimit, playlistLimit);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('[Neture API] Error fetching signage:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch signage' });
    }
  });

  // ============================================================================
  // FORUM ENDPOINTS (APP-FORUM Phase 1: ForumQueryService)
  // ============================================================================

  /**
   * GET /home/forum
   * Home page forum preview (recent posts)
   */
  router.get('/home/forum', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const posts = await forumService.listRecentPosts(limit);
      res.json({ success: true, data: { posts } });
    } catch (error) {
      logger.error('[Neture API] Error fetching forum posts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch forum posts' });
    }
  });

  // ============================================================================
  // ADMIN DASHBOARD ENDPOINT (운영자 실사용 화면 1단계)
  // ============================================================================

  /**
   * GET /admin/dashboard/summary
   * 운영자 대시보드 통합 요약: Stats + APP-CONTENT + APP-SIGNAGE + APP-FORUM
   */
  router.get('/admin/dashboard/summary', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      // Parallel fetch: Neture stats + APP summaries
      const [
        supplierCount,
        contentPublishedCount,
        recentContent,
        signageHome,
        recentPosts,
        signageMediaCount,
        signagePlaylistCount,
        forumPostCount,
      ] = await Promise.all([
        dataSource.query(`SELECT COUNT(*) as count FROM neture_suppliers WHERE status = 'ACTIVE'`),
        dataSource.query(`SELECT COUNT(*) as count FROM cms_contents WHERE "serviceKey" = 'neture' AND status = 'published'`),
        contentService.listForHome(['notice', 'news', 'hero'], 5),
        signageService.listForHome(3, 3),
        forumService.listRecentPosts(5),
        dataSource.query(`SELECT COUNT(*) as count FROM signage_media WHERE "serviceKey" = 'neture' AND status = 'active'`),
        dataSource.query(`SELECT COUNT(*) as count FROM signage_playlists WHERE "serviceKey" = 'neture' AND status = 'active'`),
        dataSource.query(`SELECT COUNT(*) as count FROM forum_post WHERE status = 'publish' AND organization_id IS NULL`), // DESIGN-ACCEPT: Community domain shared (F6)
      ]);

      res.json({
        success: true,
        data: {
          stats: {
            activeSuppliers: parseInt(supplierCount[0]?.count || '0', 10),
            // WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1: 제휴 요청 통계 은퇴 (0 고정 — 응답 shape 유지)
            totalRequests: 0,
            pendingRequests: 0,
            publishedContents: parseInt(contentPublishedCount[0]?.count || '0', 10),
          },
          content: {
            totalPublished: parseInt(contentPublishedCount[0]?.count || '0', 10),
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
          serviceStatus: [],
          recentApplications: [],
          recentActivities: [],
        },
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching admin dashboard summary:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard summary' });
    }
  });

  return router;
}

export default createNetureController;
