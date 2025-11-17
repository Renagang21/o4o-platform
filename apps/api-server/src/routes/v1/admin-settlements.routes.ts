/**
 * Phase PD-5: Admin Settlement Routes
 *
 * Admin-only routes for managing settlements
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
import {
  getAllSettlements,
  getSettlementById,
  createBatchSettlements,
  createSettlement,
  updateSettlementStatus,
  previewSettlement,
} from '../../controllers/admin/AdminSettlementController.js';

const router: Router = Router();

// Apply auth and admin middleware to all routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/v1/admin/settlements
 * Get all settlements with filters
 */
router.get('/', getAllSettlements);

/**
 * GET /api/v1/admin/settlements/preview
 * Preview settlement calculation without creating record
 * NOTE: Must be BEFORE /:id route to avoid conflict
 */
router.get('/preview', previewSettlement);

/**
 * GET /api/v1/admin/settlements/:id
 * Get settlement by ID with detailed items
 */
router.get('/:id', getSettlementById);

/**
 * POST /api/v1/admin/settlements/batch
 * Run batch settlement creation for a period
 */
router.post('/batch', createBatchSettlements);

/**
 * POST /api/v1/admin/settlements
 * Create a single settlement for a specific party
 */
router.post('/', createSettlement);

/**
 * PUT /api/v1/admin/settlements/:id/status
 * Update settlement status
 */
router.put('/:id/status', updateSettlementStatus);

export default router;
