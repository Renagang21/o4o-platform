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
import { SupplierStatus, PartnershipStatus } from '../../../modules/neture/entities/index.js';
import { requireAuth, optionalAuth } from '../../../middleware/auth.middleware.js';
import logger from '../../../utils/logger.js';

/**
 * Create Neture Controller (P1 - GET Only)
 */
export function createNetureController(dataSource: DataSource): Router {
  const router = Router();
  const service = new NetureService();

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
  router.get('/suppliers', requireAuth, async (req: Request, res: Response) => {
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
  router.get('/suppliers/:slug', requireAuth, async (req: Request, res: Response) => {
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
  router.get('/partnership/requests/:id', requireAuth, async (req: Request, res: Response) => {
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
   */
  router.patch('/partnership/requests/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if user is logged in and is admin
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      // Check if user is admin
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
      }

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

  return router;
}

export default createNetureController;
