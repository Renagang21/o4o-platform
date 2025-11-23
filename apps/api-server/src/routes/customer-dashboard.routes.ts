/**
 * Customer Dashboard Routes
 * R-6-4: Customer Dashboard v1 - Customer-specific endpoints
 *
 * Provides customer dashboard statistics and recent orders
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { query } from 'express-validator';
import { authenticateCookie, AuthRequest } from '../middleware/auth.middleware.js';
import { CustomerDashboardController } from '../controllers/CustomerDashboardController.js';
import logger from '../utils/logger.js';

const router: ExpressRouter = Router();
const customerDashboardController = new CustomerDashboardController();

/**
 * GET /api/v1/customer/dashboard/stats
 * Get dashboard summary statistics for logged-in customer
 * R-6-4: Supports date range filtering
 *
 * Query params:
 * - range=7d|30d|90d|1y|custom (default: 90d)
 * - start=YYYY-MM-DD (for custom range)
 * - end=YYYY-MM-DD (for custom range)
 */
router.get(
  '/stats',
  authenticateCookie,
  query('range').optional().isString(),
  query('start').optional().isISO8601(),
  query('end').optional().isISO8601(),
  async (req: AuthRequest, res: Response) => {
    await customerDashboardController.getStats(req, res);
  }
);

/**
 * GET /api/v1/customer/orders/recent
 * Get customer's recent orders
 * R-6-4: Returns recent orders with limit
 *
 * Query params:
 * - limit=5 (default: 5, max: 10)
 */
router.get(
  '/orders/recent',
  authenticateCookie,
  query('limit').optional().isInt({ min: 1, max: 10 }),
  async (req: AuthRequest, res: Response) => {
    await customerDashboardController.getRecentOrders(req, res);
  }
);

export default router;
