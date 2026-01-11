/**
 * Admin Dashboard Routes (P0)
 *
 * WO-ADMIN-API-IMPLEMENT-P0
 * Real database queries for Admin Dashboard
 */

import { Router, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
import adminDashboardController from '../../controllers/admin/adminDashboardController.js';
import type { AuthRequest } from '../../types/auth.js';

const router: Router = Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(requireAdmin);

/**
 * Dashboard APIs
 */

// GET /api/v1/admin/dashboard/sales-summary
// Returns aggregated sales data from real orders
router.get(
  '/dashboard/sales-summary',
  (req, res: Response) => adminDashboardController.getSalesSummary(req as AuthRequest, res)
);

// GET /api/v1/admin/dashboard/order-status
// Returns order status distribution (real counts)
router.get(
  '/dashboard/order-status',
  (req, res: Response) => adminDashboardController.getOrderStatus(req as AuthRequest, res)
);

// GET /api/v1/admin/dashboard/user-growth
// Returns user registration counts by day/week
router.get(
  '/dashboard/user-growth',
  (req, res: Response) => adminDashboardController.getUserGrowth(req as AuthRequest, res)
);

/**
 * System APIs
 */

// GET /api/v1/admin/system/health
// Returns system health status
router.get(
  '/system/health',
  (req, res: Response) => adminDashboardController.getSystemHealth(req as AuthRequest, res)
);

/**
 * Partner APIs
 */

// NOTE: Partner routes removed - dependent on legacy Neture Partner Entity
// GET /api/v1/admin/partners
// Returns partner list
// router.get(
//   '/partners',
//   (req, res: Response) => adminDashboardController.getPartners(req as AuthRequest, res)
// );

// GET /api/v1/admin/partners/:id/summary
// Returns partner performance summary
// router.get(
//   '/partners/:id/summary',
//   (req, res: Response) => adminDashboardController.getPartnerSummary(req as AuthRequest, res)
// );

/**
 * Cosmetics APIs
 */

// GET /api/v1/admin/cosmetics/partner-metrics
// Returns cosmetics partner metrics
router.get(
  '/cosmetics/partner-metrics',
  (req, res: Response) => adminDashboardController.getCosmeticsPartnerMetrics(req as AuthRequest, res)
);

export default router;
