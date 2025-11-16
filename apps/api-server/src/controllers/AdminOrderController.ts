import { Request, Response, NextFunction } from 'express';
import { OrderService, OrderFilters } from '../services/OrderService.js';
import logger from '../utils/logger.js';

/**
 * Admin Order Controller (Phase 4)
 *
 * Admin-only endpoints for order management.
 * Requires administrator or operator role.
 */

export class AdminOrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * GET /api/v1/admin/orders
   * Get all orders with filtering (admin only)
   */
  getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Build filters from query params
      const filters: OrderFilters = {
        status: req.query.status as any,
        paymentStatus: req.query.paymentStatus as any,
        search: req.query.q as string,
        dateFrom: req.query.from as string,
        dateTo: req.query.to as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: (req.query.sortBy as any) || 'orderDate',
        sortOrder: (req.query.sortOrder as any) || 'desc'
      };

      const result = await this.orderService.getOrders(filters);

      res.json({
        success: true,
        data: {
          items: result.orders,
          total: result.total
        },
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (filters.limit || 20))
        }
      });

    } catch (error) {
      logger.error('Error getting admin orders:', error);
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/orders/:id
   * Get single order by ID (admin only)
   */
  getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Admin can see any order (no buyer filter)
      const order = await this.orderService.getOrderById(id);

      res.json({
        success: true,
        data: order
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }
      logger.error('Error getting admin order:', error);
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/orders/stats/summary
   * Get order statistics summary (admin only)
   */
  getOrderStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.orderService.getOrderStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error getting order stats:', error);
      next(error);
    }
  };
}
