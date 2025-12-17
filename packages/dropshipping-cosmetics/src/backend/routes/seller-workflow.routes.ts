/**
 * Seller Workflow Routes
 *
 * REST API endpoints for seller workflow (in-store consultation)
 *
 * Phase 10: Security hardening
 * - All routes require authentication (seller or admin role)
 * - sellerId is extracted from req.user, not query/params
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SellerWorkflowService } from '../services/seller-workflow.service.js';
import { SellerWorkflowController } from '../controllers/seller-workflow.controller.js';
import {
  requirePermission,
  CosmeticsPermissions,
} from '../middleware/permissions.middleware.js';

export function createSellerWorkflowRoutes(dataSource: DataSource): Router {
  const router = Router();
  const workflowService = new SellerWorkflowService(dataSource);
  const workflowController = new SellerWorkflowController(workflowService);

  // All seller-workflow routes require seller permission
  const requireSellerAccess = requirePermission(CosmeticsPermissions.SELLER_WORKFLOW);

  /**
   * POST /api/v1/cosmetics/seller-workflow/start
   * Start a new seller workflow session
   * - sellerId is extracted from authenticated user (req.user.id)
   */
  router.post('/seller-workflow/start', requireSellerAccess, (req, res) =>
    workflowController.startSession(req, res)
  );

  /**
   * GET /api/v1/cosmetics/seller-workflow/:id
   * Get session by ID
   * - Ownership verified in controller (session must belong to req.user)
   */
  router.get('/seller-workflow/:id', requireSellerAccess, (req, res) =>
    workflowController.getSession(req, res)
  );

  /**
   * GET /api/v1/cosmetics/seller-workflow/sessions
   * List sessions for the authenticated seller
   * - CHANGED: removed :sellerId param, uses req.user.id
   */
  router.get('/seller-workflow/sessions', requireSellerAccess, (req, res) =>
    workflowController.listSessionsBySeller(req, res)
  );

  /**
   * GET /api/v1/cosmetics/seller-workflow/stats
   * Get seller statistics
   * - CHANGED: removed :sellerId param, uses req.user.id
   */
  router.get('/seller-workflow/stats', requireSellerAccess, (req, res) =>
    workflowController.getSellerStats(req, res)
  );

  /**
   * PUT /api/v1/cosmetics/seller-workflow/:id
   * Update session
   * - Ownership verified in controller
   */
  router.put('/seller-workflow/:id', requireSellerAccess, (req, res) =>
    workflowController.updateSession(req, res)
  );

  /**
   * POST /api/v1/cosmetics/seller-workflow/:id/complete
   * Complete session
   * - Ownership verified in controller
   */
  router.post('/seller-workflow/:id/complete', requireSellerAccess, (req, res) =>
    workflowController.completeSession(req, res)
  );

  return router;
}
