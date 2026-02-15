/**
 * Neture Controller - P2 Implementation
 *
 * Work Order: WO-NETURE-SMOKE-STABILIZATION-V1
 * Phase: P2 (CRUD Operations)
 *
 * Public endpoints (no auth):
 * - GET /suppliers
 * - GET /suppliers/:slug
 * - GET /partnership/requests
 * - GET /partnership/requests/:id
 *
 * Authenticated endpoints:
 * - POST /partnership/requests (create)
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { NetureService } from '../../../modules/neture/neture.service.js';
import { ContentQueryService } from '../../../modules/content/index.js';
import { SignageQueryService } from '../../../modules/signage/index.js';
import { ForumQueryService } from '../../../modules/forum/index.js';
import { SupplierStatus, PartnershipStatus } from '../../../modules/neture/entities/index.js';
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
    defaultTypes: ['notice', 'news', 'hero'],
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
  // PARTNERSHIP ENDPOINTS
  // ============================================================================

  /**
   * GET /partnership/requests
   * List all partnership requests
   *
   * Query Parameters:
   * - status (optional): Filter by status ('OPEN', 'MATCHED', 'CLOSED')
   */
  router.get('/partnership/requests', async (req: Request, res: Response) => {
    try {
      const { status } = req.query;

      const filters: { status?: PartnershipStatus } = {};

      if (status && typeof status === 'string') {
        filters.status = status as PartnershipStatus;
      }

      const requests = await service.getPartnershipRequests(filters);

      res.json({
        requests,
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching partnership requests:', error);
      res.status(500).json({
        error: 'Failed to fetch partnership requests',
        details: (error as Error).message,
      });
    }
  });

  /**
   * GET /partnership/requests/:id
   * Get partnership request detail by ID
   */
  router.get('/partnership/requests/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const request = await service.getPartnershipRequestById(id);

      if (!request) {
        return res.status(404).json({
          error: 'Partnership request not found',
        });
      }

      res.json(request);
    } catch (error) {
      logger.error('[Neture API] Error fetching partnership request detail:', error);
      res.status(500).json({
        error: 'Failed to fetch partnership request detail',
        details: (error as Error).message,
      });
    }
  });

  // ============================================================================
  // P2: AUTHENTICATED ENDPOINTS
  // ============================================================================

  /**
   * POST /partnership/requests
   * Create a new partnership request (requires login)
   */
  router.post('/partnership/requests', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if user is logged in
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      const {
        sellerName,
        sellerServiceType,
        sellerStoreUrl,
        periodStart,
        periodEnd,
        revenueStructure,
        promotionSns,
        promotionContent,
        promotionBanner,
        promotionOther,
        contactEmail,
        contactPhone,
        contactKakao,
        products,
      } = req.body;

      // Validate required fields
      if (!sellerName) {
        return res.status(400).json({
          success: false,
          error: 'sellerName is required',
          code: 'VALIDATION_ERROR',
        });
      }

      const result = await service.createPartnershipRequest({
        sellerId: user.id,
        sellerName,
        sellerServiceType,
        sellerStoreUrl,
        periodStart,
        periodEnd,
        revenueStructure,
        promotionSns,
        promotionContent,
        promotionBanner,
        promotionOther,
        contactEmail: contactEmail || user.email,
        contactPhone,
        contactKakao,
        products,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('[Neture API] Error creating partnership request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create partnership request',
        details: (error as Error).message,
      });
    }
  });

  /**
   * PATCH /partnership/requests/:id
   * Update partnership request status (admin only)
   *
   * WO-P1-SERVICE-ROLE-PREFIX-ROLLING-IMPLEMENTATION-V1 (Phase 3: Neture)
   * - Requires neture:admin OR platform:admin/super_admin
   * - Legacy roles (admin, super_admin) are logged and denied
   */
  router.patch('/partnership/requests/:id', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be one of: pending, approved, rejected',
          code: 'VALIDATION_ERROR',
        });
      }

      const result = await service.updatePartnershipRequestStatus(id, status as PartnershipStatus);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Partnership request not found',
          code: 'NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('[Neture API] Error updating partnership request status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update partnership request status',
        details: (error as Error).message,
      });
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
        requestCount,
        pendingRequestCount,
        contentPublishedCount,
        recentContent,
        signageHome,
        recentPosts,
        signageMediaCount,
        signagePlaylistCount,
        forumPostCount,
      ] = await Promise.all([
        dataSource.query(`SELECT COUNT(*) as count FROM neture_suppliers WHERE status = 'ACTIVE'`),
        dataSource.query(`SELECT COUNT(*) as count FROM neture_partnership_requests`),
        dataSource.query(`SELECT COUNT(*) as count FROM neture_partnership_requests WHERE status = 'OPEN'`),
        dataSource.query(`SELECT COUNT(*) as count FROM cms_contents WHERE "serviceKey" = 'neture' AND status = 'published'`),
        contentService.listForHome(['notice', 'news', 'hero'], 5),
        signageService.listForHome(3, 3),
        forumService.listRecentPosts(5),
        dataSource.query(`SELECT COUNT(*) as count FROM signage_media WHERE "serviceKey" = 'neture' AND status = 'active'`),
        dataSource.query(`SELECT COUNT(*) as count FROM signage_playlists WHERE "serviceKey" = 'neture' AND status = 'active'`),
        dataSource.query(`SELECT COUNT(*) as count FROM forum_post WHERE status = 'publish' AND organization_id IS NULL`),
      ]);

      res.json({
        success: true,
        data: {
          stats: {
            activeSuppliers: parseInt(supplierCount[0]?.count || '0', 10),
            totalRequests: parseInt(requestCount[0]?.count || '0', 10),
            pendingRequests: parseInt(pendingRequestCount[0]?.count || '0', 10),
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

  // ============================================================================
  // ADMIN: OPERATOR MANAGEMENT (WO-NETURE-OPERATOR-UI-REALIZATION-V1)
  // ============================================================================

  /**
   * GET /admin/operators
   * Neture 역할 보유 사용자 목록 (neture:admin, neture:operator)
   */
  router.get('/admin/operators', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';

      const whereClause = includeInactive
        ? `WHERE u.roles && ARRAY['neture:admin', 'neture:operator']::text[]`
        : `WHERE u.roles && ARRAY['neture:admin', 'neture:operator']::text[] AND u."isActive" = true`;

      const operators = await dataSource.query(
        `SELECT u.id, u.name, u.email, u.roles, u."isActive", u."createdAt", u."updatedAt"
         FROM "user" u
         ${whereClause}
         ORDER BY u."createdAt" DESC`
      );

      res.json({
        success: true,
        data: operators.map((op: any) => ({
          id: op.id,
          name: op.name || '-',
          email: op.email || '-',
          roles: (op.roles || []).filter((r: string) => r.startsWith('neture:')),
          isActive: op.isActive,
          createdAt: op.createdAt,
        })),
      });
    } catch (error) {
      logger.error('[Neture API] Error fetching operators:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch operators' });
    }
  });

  /**
   * PATCH /admin/operators/:id/deactivate
   * 사용자 비활성화 (isActive = false)
   */
  router.patch('/admin/operators/:id/deactivate', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const targetId = req.params.id;

      // Prevent self-deactivation
      if (targetId === user.id) {
        return res.status(400).json({ success: false, error: 'Cannot deactivate yourself' });
      }

      const [target] = await dataSource.query(
        `SELECT id, "isActive", roles FROM "user" WHERE id = $1`,
        [targetId]
      );

      if (!target) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      if (!target.isActive) {
        return res.status(400).json({ success: false, error: 'User already inactive' });
      }

      await dataSource.query(
        `UPDATE "user" SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1`,
        [targetId]
      );

      res.json({ success: true, data: { id: targetId, deactivated: true } });
    } catch (error) {
      logger.error('[Neture API] Error deactivating operator:', error);
      res.status(500).json({ success: false, error: 'Failed to deactivate operator' });
    }
  });

  /**
   * PATCH /admin/operators/:id/reactivate
   * 사용자 재활성화 (isActive = true)
   */
  router.patch('/admin/operators/:id/reactivate', requireAuth, requireNetureScope('neture:admin'), async (req: Request, res: Response) => {
    try {
      const targetId = req.params.id;

      const [target] = await dataSource.query(
        `SELECT id, "isActive" FROM "user" WHERE id = $1`,
        [targetId]
      );

      if (!target) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      if (target.isActive) {
        return res.status(400).json({ success: false, error: 'User already active' });
      }

      await dataSource.query(
        `UPDATE "user" SET "isActive" = true, "updatedAt" = NOW() WHERE id = $1`,
        [targetId]
      );

      res.json({ success: true, data: { id: targetId, reactivated: true } });
    } catch (error) {
      logger.error('[Neture API] Error reactivating operator:', error);
      res.status(500).json({ success: false, error: 'Failed to reactivate operator' });
    }
  });

  return router;
}

export default createNetureController;
