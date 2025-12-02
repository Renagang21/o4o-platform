/**
 * Phase PD-5: Supplier Settlement Routes
 *
 * Routes for suppliers to view their settlements
 * Updated from Phase 6-5 stub to full implementation
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import {
  getSupplierSettlements,
  getSupplierSettlementById,
  previewSupplierSettlement,
} from '../../controllers/SupplierSettlementController.js';

const router: Router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/supplier/settlements
 * Get supplier's own settlements with filters
 */
router.get('/', getSupplierSettlements);

/**
 * GET /api/v1/supplier/settlements/preview
 * Preview settlement calculation for current period
 * NOTE: Must be BEFORE /:id route to avoid conflict
 */
router.get('/preview', previewSupplierSettlement);

/**
 * GET /api/v1/supplier/settlements/:id
 * Get settlement by ID (supplier can only view their own)
 */
router.get('/:id', getSupplierSettlementById);

export default router;
