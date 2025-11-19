/**
 * Phase PD-5: Admin Settlement Routes
 *
 * Admin-only routes for managing settlements
 * Updated from Phase 6-5 stub to full implementation
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth.middleware.js';
import {
  getAllSettlements,
  getSettlementById,
  createBatchSettlements,
  createSettlement,
  updateSettlementStatus,
  previewSettlement,
  updateMemo,
  markSettlementAsPaid,
} from '../../controllers/admin/AdminSettlementController.js';

const router: Router = Router();

// Apply auth and admin middleware to all routes
router.use(authenticateToken);
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

// Legacy PATCH endpoint for backward compatibility
router.patch('/:id/status', updateSettlementStatus);

/**
 * PUT /api/v1/admin/settlements/:id/memo
 * Update settlement memo (Phase SETTLE-ADMIN)
 */
router.put('/:id/memo', updateMemo);

/**
 * POST /api/v1/admin/settlements/:id/mark-paid
 * Mark settlement as paid (Phase SETTLE-ADMIN)
 */
router.post('/:id/mark-paid', markSettlementAsPaid);

export default router;
