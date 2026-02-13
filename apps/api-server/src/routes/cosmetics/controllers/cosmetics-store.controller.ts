/**
 * Cosmetics Store Controller
 *
 * WO-KCOS-STORES-PHASE1-V1: K-Cosmetics Store Core
 * WO-KCOS-STORES-PHASE2-ORDER-ATTRIBUTION-V1: Store Summary
 * Express router for store management endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { CosmeticsStoreService } from '../services/cosmetics-store.service.js';
import { CosmeticsStoreSummaryService } from '../services/cosmetics-store-summary.service.js';
import { CosmeticsStorePlaylistService } from '../services/cosmetics-store-playlist.service.js';
import type { AuthRequest } from '../../../types/auth.js';

function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, any>,
): Response {
  return res.status(statusCode).json({
    error: { code, message, details },
  });
}

function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorResponse(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      fields: errors.mapped(),
    });
    return true;
  }
  return false;
}

export function createCosmeticsStoreController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  requireScope: (scope: string) => (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();
  const service = new CosmeticsStoreService(dataSource);
  const summaryService = new CosmeticsStoreSummaryService(dataSource);
  const playlistService = new CosmeticsStorePlaylistService(dataSource);

  // ============================================================================
  // ADMIN ENDPOINTS (cosmetics:admin scope required)
  // ============================================================================

  /**
   * GET /cosmetics/stores/admin/all
   * List all stores (admin)
   */
  router.get(
    '/admin/all',
    requireAuth,
    requireScope('cosmetics:admin'),
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('status').optional().isString(),
      query('region').optional().isString(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await service.getAllStores({
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          status: req.query.status as string | undefined,
          region: req.query.region as string | undefined,
        });

        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] List stores error:', error);
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * PATCH /cosmetics/stores/admin/:id/status
   * Update store status (admin)
   */
  router.patch(
    '/admin/:id/status',
    requireAuth,
    requireScope('cosmetics:admin'),
    [
      param('id').isUUID(),
      body('status').notEmpty().isString(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await service.updateStoreStatus(req.params.id, req.body.status);
        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Update store status error:', error);
        if (error.message === 'STORE_NOT_FOUND') {
          return errorResponse(res, 404, 'STORE_001', 'Store not found');
        }
        if (error.message === 'INVALID_STATUS') {
          return errorResponse(res, 400, 'STORE_011', 'Invalid status value');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * GET /cosmetics/stores/admin/applications
   * List all applications (admin)
   */
  router.get(
    '/admin/applications',
    requireAuth,
    requireScope('cosmetics:admin'),
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('status').optional().isString(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const result = await service.getAllApplications({
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          status: req.query.status as string | undefined,
        });

        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] List applications error:', error);
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * PATCH /cosmetics/stores/admin/applications/:id/review
   * Approve or reject application (admin)
   */
  router.patch(
    '/admin/applications/:id/review',
    requireAuth,
    requireScope('cosmetics:admin'),
    [
      param('id').isUUID(),
      body('action').notEmpty().isIn(['approve', 'reject']),
      body('rejection_reason').optional().isString(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const reviewedBy = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.reviewApplication(
          req.params.id,
          req.body.action,
          reviewedBy,
          req.body.rejection_reason,
        );

        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Review application error:', error);
        if (error.message === 'APPLICATION_NOT_FOUND') {
          return errorResponse(res, 404, 'STORE_002', 'Application not found');
        }
        if (error.message === 'APPLICATION_NOT_PENDING') {
          return errorResponse(res, 400, 'STORE_010', 'Application is not in pending status');
        }
        if (error.message === 'BUSINESS_NUMBER_ALREADY_REGISTERED') {
          return errorResponse(res, 409, 'STORE_007', 'A store with this business number already exists');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * GET /cosmetics/stores/admin/members
   * List all store members across all stores (admin)
   * WO-K-COSMETICS-OPERATOR-UI-REALIZATION-V1
   */
  router.get(
    '/admin/members',
    requireAuth,
    requireScope('cosmetics:admin'),
    [query('includeInactive').optional().isString()],
    async (req: Request, res: Response) => {
      try {
        const includeInactive = req.query.includeInactive === 'true';
        const result = await service.getAllMembers(includeInactive);
        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] List all members error:', error);
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * PATCH /cosmetics/stores/admin/members/:id/deactivate
   * Deactivate a store member (admin)
   */
  router.patch(
    '/admin/members/:id/deactivate',
    requireAuth,
    requireScope('cosmetics:admin'),
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;
        const authReq = req as AuthRequest;
        const adminUserId = authReq.user?.id || authReq.authUser?.id || '';
        const result = await service.adminDeactivateMember(req.params.id, adminUserId);
        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Deactivate member error:', error);
        if (error.message === 'MEMBER_NOT_FOUND') {
          return errorResponse(res, 404, 'STORE_015', 'Member not found');
        }
        if (error.message === 'CANNOT_REMOVE_SOLE_OWNER') {
          return errorResponse(res, 400, 'STORE_009', 'Cannot deactivate the sole owner');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * PATCH /cosmetics/stores/admin/members/:id/reactivate
   * Reactivate a store member (admin)
   */
  router.patch(
    '/admin/members/:id/reactivate',
    requireAuth,
    requireScope('cosmetics:admin'),
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;
        const result = await service.adminReactivateMember(req.params.id);
        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Reactivate member error:', error);
        if (error.message === 'MEMBER_NOT_FOUND') {
          return errorResponse(res, 404, 'STORE_015', 'Member not found');
        }
        if (error.message === 'MEMBER_ALREADY_ACTIVE') {
          return errorResponse(res, 400, 'STORE_016', 'Member is already active');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  // ============================================================================
  // AUTHENTICATED USER ENDPOINTS
  // ============================================================================

  /**
   * POST /cosmetics/stores/apply
   * Submit store application
   */
  router.post(
    '/apply',
    requireAuth,
    [
      body('store_name').notEmpty().isString().isLength({ min: 1, max: 200 }),
      body('business_number').notEmpty().isString().isLength({ min: 1, max: 100 }),
      body('owner_name').notEmpty().isString().isLength({ min: 1, max: 200 }),
      body('contact_phone').optional().isString().isLength({ max: 50 }),
      body('address').optional().isString(),
      body('region').optional().isString().isLength({ max: 100 }),
      body('note').optional().isString(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.submitApplication({
          storeName: req.body.store_name,
          businessNumber: req.body.business_number,
          ownerName: req.body.owner_name,
          contactPhone: req.body.contact_phone,
          address: req.body.address,
          region: req.body.region,
          note: req.body.note,
        }, userId);

        res.status(201).json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Submit application error:', error);
        if (error.message === 'PENDING_APPLICATION_EXISTS') {
          return errorResponse(res, 409, 'STORE_012', 'You already have a pending application');
        }
        if (error.message === 'BUSINESS_NUMBER_ALREADY_REGISTERED') {
          return errorResponse(res, 409, 'STORE_007', 'Business number is already registered');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * GET /cosmetics/stores/application/me
   * Get my applications
   */
  router.get(
    '/application/me',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.getMyApplications(userId);
        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Get my applications error:', error);
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * GET /cosmetics/stores/me
   * Get my stores (via membership)
   */
  router.get(
    '/me',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.getMyStores(userId);
        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Get my stores error:', error);
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * GET /cosmetics/stores/:storeId/summary
   * Get store KPI summary (member only)
   * WO-KCOS-STORES-PHASE2-ORDER-ATTRIBUTION-V1
   */
  router.get(
    '/:storeId/summary',
    requireAuth,
    [param('storeId').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        // Verify membership
        const storeDetail = await service.getStoreDetail(req.params.storeId, userId);
        if (!storeDetail) {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }

        const summary = await summaryService.getStoreSummary(req.params.storeId);
        res.json({ data: summary });
      } catch (error: any) {
        console.error('[CosmeticsStore] Get store summary error:', error);
        if (error.message === 'STORE_MEMBER_NOT_FOUND') {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        if (error.message === 'STORE_NOT_FOUND') {
          return errorResponse(res, 404, 'STORE_001', 'Store not found');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  // ============================================================================
  // PLAYLIST ENDPOINTS (WO-KCOS-STORES-PHASE4-SIGNAGE-INTEGRATION-V1)
  // ============================================================================

  /**
   * GET /cosmetics/stores/:storeId/playlists
   * Get store playlists (member only)
   */
  router.get(
    '/:storeId/playlists',
    requireAuth,
    [param('storeId').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        // Verify membership
        const storeDetail = await service.getStoreDetail(req.params.storeId, userId);
        if (!storeDetail) {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }

        const playlists = await playlistService.getPlaylistsByStoreId(req.params.storeId);
        res.json({ data: playlists });
      } catch (error: any) {
        console.error('[CosmeticsStore] Get playlists error:', error);
        if (error.message === 'STORE_MEMBER_NOT_FOUND') {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * POST /cosmetics/stores/:storeId/playlists/generate-default
   * Auto-generate playlist from top products (member only)
   * NOTE: Must be registered BEFORE /:storeId/playlists/:id/activate
   */
  router.post(
    '/:storeId/playlists/generate-default',
    requireAuth,
    [param('storeId').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        // Verify membership
        const storeDetail = await service.getStoreDetail(req.params.storeId, userId);
        if (!storeDetail) {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }

        const playlist = await playlistService.generateDefaultPlaylist(req.params.storeId);
        res.status(201).json({ data: playlist });
      } catch (error: any) {
        console.error('[CosmeticsStore] Generate default playlist error:', error);
        if (error.message === 'STORE_MEMBER_NOT_FOUND') {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * POST /cosmetics/stores/:storeId/playlists
   * Create a new playlist (member only)
   */
  router.post(
    '/:storeId/playlists',
    requireAuth,
    [
      param('storeId').isUUID(),
      body('name').notEmpty().isString().isLength({ min: 1, max: 200 }),
      body('items').isArray(),
      body('items.*.asset_type').isString().isIn(['product', 'campaign', 'image']),
      body('items.*.reference_id').isUUID(),
      body('items.*.sort_order').optional().isInt({ min: 0 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        // Verify membership
        const storeDetail = await service.getStoreDetail(req.params.storeId, userId);
        if (!storeDetail) {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }

        const playlist = await playlistService.createPlaylist(req.params.storeId, {
          name: req.body.name,
          items: (req.body.items || []).map((item: any) => ({
            assetType: item.asset_type,
            referenceId: item.reference_id,
            sortOrder: item.sort_order,
          })),
        });

        res.status(201).json({ data: playlist });
      } catch (error: any) {
        console.error('[CosmeticsStore] Create playlist error:', error);
        if (error.message === 'STORE_MEMBER_NOT_FOUND') {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * PATCH /cosmetics/stores/:storeId/playlists/:id/activate
   * Toggle playlist active status (owner/manager only — staff excluded)
   */
  router.patch(
    '/:storeId/playlists/:id/activate',
    requireAuth,
    [
      param('storeId').isUUID(),
      param('id').isUUID(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        // Verify membership and check role
        const storeDetail = await service.getStoreDetail(req.params.storeId, userId);
        if (!storeDetail) {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        if (storeDetail.data?.myRole === 'staff') {
          return errorResponse(res, 403, 'STORE_018', 'Staff cannot toggle playlist status');
        }

        const result = await playlistService.togglePlaylistActive(req.params.id, req.params.storeId);
        res.json({ data: result });
      } catch (error: any) {
        console.error('[CosmeticsStore] Toggle playlist active error:', error);
        if (error.message === 'PLAYLIST_NOT_FOUND') {
          return errorResponse(res, 404, 'STORE_017', 'Playlist not found');
        }
        if (error.message === 'STORE_MEMBER_NOT_FOUND') {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  // ============================================================================
  // STORE DETAIL & LISTING ENDPOINTS
  // ============================================================================

  /**
   * GET /cosmetics/stores/:storeId
   * Get store detail (member only)
   */
  router.get(
    '/:storeId',
    requireAuth,
    [param('storeId').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.getStoreDetail(req.params.storeId, userId);
        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Get store detail error:', error);
        if (error.message === 'STORE_MEMBER_NOT_FOUND') {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        if (error.message === 'STORE_NOT_FOUND') {
          return errorResponse(res, 404, 'STORE_001', 'Store not found');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * GET /cosmetics/stores/:storeId/listings
   * Get store listings (member only)
   */
  router.get(
    '/:storeId/listings',
    requireAuth,
    [
      param('storeId').isUUID(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.getStoreListings(req.params.storeId, {
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
        }, userId);

        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Get store listings error:', error);
        if (error.message === 'STORE_MEMBER_NOT_FOUND') {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * POST /cosmetics/stores/:storeId/listings
   * Add product listing to store (member only)
   */
  router.post(
    '/:storeId/listings',
    requireAuth,
    [
      param('storeId').isUUID(),
      body('product_id').notEmpty().isUUID(),
      body('price_override').optional().isInt({ min: 0 }),
      body('is_visible').optional().isBoolean(),
      body('sort_order').optional().isInt({ min: 0 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.addListing(req.params.storeId, {
          productId: req.body.product_id,
          priceOverride: req.body.price_override,
          isVisible: req.body.is_visible,
          sortOrder: req.body.sort_order,
        }, userId);

        res.status(201).json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Add listing error:', error);
        if (error.message === 'STORE_MEMBER_NOT_FOUND') {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        if (error.message === 'PRODUCT_NOT_FOUND') {
          return errorResponse(res, 404, 'STORE_005', 'Product not found');
        }
        if (error.message === 'LISTING_ALREADY_EXISTS') {
          return errorResponse(res, 409, 'STORE_008', 'This product is already listed in the store');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * PATCH /cosmetics/stores/:storeId/listings/:id
   * Update listing (member only)
   */
  router.patch(
    '/:storeId/listings/:id',
    requireAuth,
    [
      param('storeId').isUUID(),
      param('id').isUUID(),
      body('price_override').optional({ nullable: true }).isInt({ min: 0 }),
      body('is_visible').optional().isBoolean(),
      body('sort_order').optional().isInt({ min: 0 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.updateListing(req.params.storeId, req.params.id, {
          priceOverride: req.body.price_override,
          isVisible: req.body.is_visible,
          sortOrder: req.body.sort_order,
        }, userId);

        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Update listing error:', error);
        if (error.message === 'STORE_MEMBER_NOT_FOUND') {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        if (error.message === 'LISTING_NOT_FOUND') {
          return errorResponse(res, 404, 'STORE_006', 'Listing not found');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * POST /cosmetics/stores/:storeId/members
   * Add member to store (owner only)
   */
  router.post(
    '/:storeId/members',
    requireAuth,
    [
      param('storeId').isUUID(),
      body('user_id').notEmpty().isUUID(),
      body('role').notEmpty().isIn(['owner', 'manager', 'staff']),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const requestingUserId = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.addMember(req.params.storeId, {
          userId: req.body.user_id,
          role: req.body.role,
        }, requestingUserId);

        res.status(201).json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Add member error:', error);
        if (error.message === 'STORE_OWNER_REQUIRED') {
          return errorResponse(res, 403, 'STORE_004', 'Only store owner can manage members');
        }
        if (error.message === 'MEMBER_ALREADY_EXISTS') {
          return errorResponse(res, 409, 'STORE_013', 'User is already a member of this store');
        }
        if (error.message === 'INVALID_ROLE') {
          return errorResponse(res, 400, 'STORE_014', 'Invalid member role');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * DELETE /cosmetics/stores/:storeId/members/:id
   * Remove member from store (owner only)
   */
  router.delete(
    '/:storeId/members/:id',
    requireAuth,
    [
      param('storeId').isUUID(),
      param('id').isUUID(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const requestingUserId = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.removeMember(req.params.storeId, req.params.id, requestingUserId);
        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Remove member error:', error);
        if (error.message === 'STORE_OWNER_REQUIRED') {
          return errorResponse(res, 403, 'STORE_004', 'Only store owner can manage members');
        }
        if (error.message === 'MEMBER_NOT_FOUND') {
          return errorResponse(res, 404, 'STORE_015', 'Member not found');
        }
        if (error.message === 'CANNOT_REMOVE_SOLE_OWNER') {
          return errorResponse(res, 400, 'STORE_009', 'Cannot remove the sole owner of the store');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  /**
   * GET /cosmetics/stores/:storeId/members
   * Get store members (member only)
   */
  router.get(
    '/:storeId/members',
    requireAuth,
    [param('storeId').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id || authReq.authUser?.id || '';

        const result = await service.getStoreMembers(req.params.storeId, userId);
        res.json(result);
      } catch (error: any) {
        console.error('[CosmeticsStore] Get members error:', error);
        if (error.message === 'STORE_MEMBER_NOT_FOUND') {
          return errorResponse(res, 403, 'STORE_003', 'You are not a member of this store');
        }
        errorResponse(res, 500, 'STORE_500', 'Internal server error');
      }
    },
  );

  return router;
}
