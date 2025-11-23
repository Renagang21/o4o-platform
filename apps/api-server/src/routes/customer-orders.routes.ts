/**
 * Customer Orders Routes
 * R-6-9: Customer order viewing functionality
 *
 * Provides customer-facing order list and detail endpoints
 * Security: All routes require authentication
 */

import { Router, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { query, param } from 'express-validator';
import { authenticateCookie, AuthRequest } from '../middleware/auth.middleware.js';
import { customerOrderController } from '../controllers/CustomerOrderController.js';
import logger from '../utils/logger.js';

const router: ExpressRouter = Router();

/**
 * GET /api/v1/customer/orders
 * Get paginated order list for authenticated customer
 * R-6-9: Supports pagination, filtering, sorting
 *
 * Query params:
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 10, min: 1, max: 100)
 * - status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'all' (optional)
 * - startDate: ISO 8601 date string (optional)
 * - endDate: ISO 8601 date string (optional)
 * - sortBy: 'createdAt' | 'totalAmount' (default: 'createdAt')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 */
router.get(
  '/',
  authenticateCookie,
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'all'])
    .withMessage('Invalid status value'),
  query('startDate').optional().isISO8601().withMessage('startDate must be ISO 8601 format'),
  query('endDate').optional().isISO8601().withMessage('endDate must be ISO 8601 format'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'totalAmount'])
    .withMessage('sortBy must be createdAt or totalAmount'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sortOrder must be asc or desc'),
  async (req: AuthRequest, res: Response) => {
    await customerOrderController.getOrders(req, res, () => {});
  }
);

/**
 * GET /api/v1/customer/orders/:orderId
 * Get detailed order information for authenticated customer
 * R-6-9: Returns full order with items, timeline, and actions
 *
 * Path params:
 * - orderId: UUID (required)
 */
router.get(
  '/:orderId',
  authenticateCookie,
  param('orderId').isUUID().withMessage('orderId must be a valid UUID'),
  async (req: AuthRequest, res: Response) => {
    await customerOrderController.getOrderDetail(req, res, () => {});
  }
);

export default router;
