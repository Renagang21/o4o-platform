/**
 * Phase PD-5: Seller Settlement Routes
 *
 * Routes for sellers to view their settlements
 * Updated from Phase 6-5 stub to full implementation
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import {
  getSellerSettlements,
  getSellerSettlementById,
  previewSellerSettlement,
} from '../../controllers/SellerSettlementController.js';

const router: Router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/seller/settlements
 * Get seller's own settlements with filters
 */
router.get('/', getSellerSettlements);

/**
 * GET /api/v1/seller/settlements/preview
 * Preview settlement calculation for current period
 * NOTE: Must be BEFORE /:id route to avoid conflict
 */
router.get('/preview', previewSellerSettlement);

/**
 * GET /api/v1/seller/settlements/:id
 * Get settlement by ID (seller can only view their own)
 */
router.get('/:id', getSellerSettlementById);

export default router;
