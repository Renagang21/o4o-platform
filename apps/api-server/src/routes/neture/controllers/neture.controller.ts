/**
 * Neture Controller - P1 Implementation
 *
 * Work Order: WO-NETURE-CORE-P1
 * Phase: P1 (Backend Integration)
 *
 * HARD RULES:
 * - GET endpoints ONLY
 * - NO POST/PUT/DELETE operations
 * - Read-only information platform
 * - No authentication required (public information)
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { NetureService } from '../../../modules/neture/neture.service.js';
import { SupplierStatus, PartnershipStatus } from '../../../modules/neture/entities/index.js';
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
  // HARD RULES ENFORCEMENT - NO OTHER METHODS ALLOWED
  // ============================================================================
  // ❌ NO POST /suppliers
  // ❌ NO PUT /suppliers/:id
  // ❌ NO DELETE /suppliers/:id
  // ❌ NO POST /partnership/requests
  // ❌ NO PUT /partnership/requests/:id
  // ❌ NO DELETE /partnership/requests/:id
  // ❌ NO PATCH (status changes)
  // ❌ NO orders/payments/dashboard endpoints
  // ============================================================================

  return router;
}

export default createNetureController;
