import { Request, Response, NextFunction } from 'express';
import { OrderService, OrderFilters } from '../services/OrderService.js';
import { OrderStatus } from '../entities/Order.js';
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
   * Get single order by ID with events (admin only - Phase 5)
   */
  getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Admin can see any order with events (no buyer filter)
      const order = await this.orderService.getOrderWithEvents(id);

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

  /**
   * PATCH /api/v1/admin/orders/:id/status
   * Update order status (admin only - Phase 5)
   */
  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, message } = req.body;

      // Validate status
      if (!status || !Object.values(OrderStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status value'
        });
        return;
      }

      // Get actor information from authenticated user
      const user = (req as any).user;

      const order = await this.orderService.updateOrderStatus(id, status, {
        actorId: user?.id,
        actorName: user?.name,
        actorRole: user?.role,
        message,
        source: 'admin'
      });

      res.json({
        success: true,
        data: order,
        message: 'Order status updated successfully'
      });

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Order not found') {
          res.status(404).json({ success: false, message: 'Order not found' });
          return;
        }
        if (error.message.includes('Cannot change status')) {
          res.status(400).json({ success: false, message: error.message });
          return;
        }
      }
      logger.error('Error updating order status:', error);
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/orders/:id/shipping
   * Update shipping information (admin only - Phase 5)
   */
  updateShipping = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { shippingCarrier, trackingNumber, trackingUrl, message } = req.body;

      // Get actor information from authenticated user
      const user = (req as any).user;

      const order = await this.orderService.updateOrderShipping(
        id,
        {
          shippingCarrier,
          trackingNumber,
          trackingUrl
        },
        {
          actorId: user?.id,
          actorName: user?.name,
          actorRole: user?.role,
          message,
          source: 'admin'
        }
      );

      res.json({
        success: true,
        data: order,
        message: 'Shipping information updated successfully'
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }
      logger.error('Error updating shipping information:', error);
      next(error);
    }
  };
}
