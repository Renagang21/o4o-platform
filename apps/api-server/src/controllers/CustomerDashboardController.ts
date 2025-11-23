/**
 * Customer Dashboard Controller
 * R-6-4: Customer Dashboard v1 - Customer metrics and order tracking
 *
 * Provides dashboard statistics and recent orders for customers
 */

import { Request, Response } from 'express';
import { CustomerDashboardService } from '../services/CustomerDashboardService.js';
import { dashboardRangeService } from '../services/DashboardRangeService.js';
import {
  createDashboardError,
  createDashboardMeta
} from '../dto/dashboard.dto.js';
import logger from '../utils/logger.js';

export class CustomerDashboardController {
  private customerDashboardService = new CustomerDashboardService();

  /**
   * GET /api/v1/customer/dashboard/stats
   * Get customer dashboard statistics
   * R-6-4: Supports date range filtering
   *
   * Query params:
   * - range=7d|30d|90d|1y|custom (default: 90d)
   * - start=YYYY-MM-DD (for custom range)
   * - end=YYYY-MM-DD (for custom range)
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json(
          createDashboardError('UNAUTHORIZED', 'Authentication required')
        );
        return;
      }

      // R-6-4: Parse date range (default 90d for customers)
      const parsedRange = dashboardRangeService.parseDateRange(
        req.query.range ? req.query : { range: '90d' }
      );

      // Get customer summary
      const summary = await this.customerDashboardService.getSummaryForCustomer(
        userId,
        parsedRange
      );

      // Create metadata
      const meta = createDashboardMeta(
        { range: parsedRange.range },
        parsedRange.startDate,
        parsedRange.endDate
      );

      res.json({
        success: true,
        data: {
          ...summary,
          meta
        }
      });
    } catch (error: any) {
      logger.error('[CustomerDashboardController] Error fetching stats:', error);

      // Standard error response
      if (error.success === false) {
        res.status(400).json(error);
        return;
      }

      res.status(500).json(
        createDashboardError(
          'SERVER_ERROR',
          'Failed to fetch customer statistics',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }

  /**
   * GET /api/v1/customer/orders/recent
   * Get customer's recent orders
   * R-6-4: Returns recent orders with pagination
   *
   * Query params:
   * - limit=5 (default: 5, max: 10)
   */
  async getRecentOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json(
          createDashboardError('UNAUTHORIZED', 'Authentication required')
        );
        return;
      }

      // Parse limit parameter
      const limit = Math.min(
        parseInt(req.query.limit as string) || 5,
        10 // Max 10 orders
      );

      // Get recent orders
      const orders = await this.customerDashboardService.getRecentOrdersForCustomer(
        userId,
        limit
      );

      res.json({
        success: true,
        data: orders
      });
    } catch (error: any) {
      logger.error('[CustomerDashboardController] Error fetching recent orders:', error);

      // Standard error response
      if (error.success === false) {
        res.status(400).json(error);
        return;
      }

      res.status(500).json(
        createDashboardError(
          'SERVER_ERROR',
          'Failed to fetch recent orders',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }
}
