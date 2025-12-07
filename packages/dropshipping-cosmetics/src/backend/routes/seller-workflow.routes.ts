/**
 * Seller Workflow Routes
 *
 * REST API endpoints for seller workflow (in-store consultation)
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SellerWorkflowService } from '../services/seller-workflow.service.js';
import { SellerWorkflowController } from '../controllers/seller-workflow.controller.js';

export function createSellerWorkflowRoutes(dataSource: DataSource): Router {
  const router = Router();
  const workflowService = new SellerWorkflowService(dataSource);
  const workflowController = new SellerWorkflowController(workflowService);

  /**
   * POST /api/v1/cosmetics/seller-workflow/start
   * Start a new seller workflow session
   */
  router.post('/seller-workflow/start', (req, res) =>
    workflowController.startSession(req, res)
  );

  /**
   * GET /api/v1/cosmetics/seller-workflow/:id
   * Get session by ID
   */
  router.get('/seller-workflow/:id', (req, res) =>
    workflowController.getSession(req, res)
  );

  /**
   * GET /api/v1/cosmetics/seller-workflow/seller/:sellerId
   * List sessions for a specific seller
   */
  router.get('/seller-workflow/seller/:sellerId', (req, res) =>
    workflowController.listSessionsBySeller(req, res)
  );

  /**
   * GET /api/v1/cosmetics/seller-workflow/seller/:sellerId/stats
   * Get seller statistics
   */
  router.get('/seller-workflow/seller/:sellerId/stats', (req, res) =>
    workflowController.getSellerStats(req, res)
  );

  /**
   * PUT /api/v1/cosmetics/seller-workflow/:id
   * Update session
   */
  router.put('/seller-workflow/:id', (req, res) =>
    workflowController.updateSession(req, res)
  );

  /**
   * POST /api/v1/cosmetics/seller-workflow/:id/complete
   * Complete session
   */
  router.post('/seller-workflow/:id/complete', (req, res) =>
    workflowController.completeSession(req, res)
  );

  return router;
}
