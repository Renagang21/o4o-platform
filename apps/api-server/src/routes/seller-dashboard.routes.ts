/**
 * Seller Dashboard Routes
 * Phase PD-1: Partner Dashboard v1 - Seller-specific endpoints
 *
 * Provides seller dashboard statistics, orders, and commission data
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { query } from 'express-validator';
import { authenticateCookie, AuthRequest } from '../middleware/auth.middleware.js';
import { SellerDashboardService } from '../services/SellerDashboardService.js';
import { OrderStatus } from '../entities/Order.js';
import logger from '../utils/logger.js';

const router: ExpressRouter = Router();
const sellerDashboardService = new SellerDashboardService();

/**
 * Middleware to check seller role
 * TODO: PD-2 - Enhance role checking with proper seller/partner/vendor roles
 */
const requireSellerRole = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = req.user as any;

    if (!user || !user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // TODO: PD-2 - Implement proper role checking
    // For now, allow all authenticated users
    // In production, check user.roles includes 'seller', 'partner', or 'vendor'

    next();
  } catch (error) {
    logger.error('[requireSellerRole] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * GET /api/v1/seller/dashboard/summary
 * Get dashboard summary statistics for logged-in seller
 */
router.get(
  '/summary',
  authenticateCookie,
  requireSellerRole,
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as any;
      const sellerId = user.userId;

      // Parse date range
      const dateRange: any = {};
      if (req.query.from) {
        dateRange.from = new Date(req.query.from as string);
      }
      if (req.query.to) {
        dateRange.to = new Date(req.query.to as string);
      }

      const summary = await sellerDashboardService.getSummaryForSeller(
        sellerId,
        Object.keys(dateRange).length > 0 ? dateRange : undefined
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      logger.error('[GET /seller/dashboard/summary] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch dashboard summary'
      });
    }
  }
);

/**
 * GET /api/v1/seller/dashboard/orders
 * Get orders for logged-in seller with pagination
 */
router.get(
  '/orders',
  authenticateCookie,
  requireSellerRole,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isString(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as any;
      const sellerId = user.userId;

      // Parse pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Parse status filter
      const statusFilter = req.query.status
        ? (req.query.status as string).split(',') as OrderStatus[]
        : undefined;

      // Parse date range
      const dateRange: any = {};
      if (req.query.from) {
        dateRange.from = new Date(req.query.from as string);
      }
      if (req.query.to) {
        dateRange.to = new Date(req.query.to as string);
      }

      const result = await sellerDashboardService.getOrdersForSeller(sellerId, {
        dateRange: Object.keys(dateRange).length > 0 ? dateRange : undefined,
        status: statusFilter,
        pagination: { page, limit }
      });

      res.json({
        success: true,
        data: {
          orders: result.orders,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });
    } catch (error: any) {
      logger.error('[GET /seller/dashboard/orders] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch orders'
      });
    }
  }
);

/**
 * GET /api/v1/seller/dashboard/commissions
 * Get commission details for logged-in seller
 */
router.get(
  '/commissions',
  authenticateCookie,
  requireSellerRole,
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user as any;
      const sellerId = user.userId;

      // Parse date range
      const dateRange: any = {};
      if (req.query.from) {
        dateRange.from = new Date(req.query.from as string);
      }
      if (req.query.to) {
        dateRange.to = new Date(req.query.to as string);
      }

      const commissionData = await sellerDashboardService.getCommissionDetailsForSeller(
        sellerId,
        Object.keys(dateRange).length > 0 ? dateRange : undefined
      );

      res.json({
        success: true,
        data: commissionData
      });
    } catch (error: any) {
      logger.error('[GET /seller/dashboard/commissions] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch commission details'
      });
    }
  }
);

export default router;
