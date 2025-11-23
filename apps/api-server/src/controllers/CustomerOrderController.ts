/**
 * Customer Order Controller
 * R-6-9: Customer order viewing functionality
 *
 * Provides customer-facing API endpoints for order viewing
 * Security: All operations filtered by authenticated user ID
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { customerOrderService } from '../services/CustomerOrderService.js';
import type { CustomerOrderListQuery } from '../dto/customer-orders.dto.js';
import logger from '../utils/logger.js';

export class CustomerOrderController {
  /**
   * GET /api/v1/customer/orders
   * Get paginated order list for authenticated customer
   */
  getOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      // Check authentication
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Build query from request
      const query: CustomerOrderListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        status: req.query.status as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        sortBy: (req.query.sortBy as any) || 'createdAt',
        sortOrder: (req.query.sortOrder as any) || 'desc',
      };

      // Get orders
      const result = await customerOrderService.getOrdersForCustomer(userId, query);

      // Return response following R-6-2 pattern
      res.json({
        success: true,
        data: {
          orders: result.orders,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      logger.error('Error in CustomerOrderController.getOrders:', {
        userId: req.user?.id,
        query: req.query,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };

  /**
   * GET /api/v1/customer/orders/:orderId
   * Get detailed order information for authenticated customer
   */
  getOrderDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      // Check authentication
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const { orderId } = req.params;

      // Get order detail
      const order = await customerOrderService.getOrderDetailForCustomer(userId, orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      // Return response following R-6-2 pattern
      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      logger.error('Error in CustomerOrderController.getOrderDetail:', {
        userId: req.user?.id,
        orderId: req.params.orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };
}

// Export singleton instance
export const customerOrderController = new CustomerOrderController();
