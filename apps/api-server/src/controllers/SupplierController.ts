import { Request, Response } from 'express';
import { OrderService, OrderFilters } from '../services/OrderService.js';
import { OrderStatus, PaymentStatus } from '../entities/Order.js';
import logger from '../utils/logger.js';

/**
 * SupplierController
 * Phase PD-4: Dropshipping Order Pipeline Integration
 *
 * Handles HTTP requests for supplier operations
 */

const orderService = new OrderService();

export class SupplierController {
  /**
   * GET /api/v2/supplier/orders
   * Phase PD-4: Get orders for supplier
   */
  static async getSupplierOrders(req: Request, res: Response): Promise<void> {
    try {
      const supplierId = (req as any).user?.id;

      if (!supplierId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const filters: OrderFilters = {
        status: req.query.status as OrderStatus,
        paymentStatus: req.query.paymentStatus as PaymentStatus,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: (req.query.sortBy as any) || 'orderDate',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const result = await orderService.getOrdersForSupplier(supplierId, filters);

      res.json({
        success: true,
        orders: result.orders,
        total: result.total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(result.total / (filters.limit || 20))
      });

    } catch (error) {
      logger.error('[SupplierController] Error fetching supplier orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v2/supplier/settlements/preview
   * Phase PD-4: Preview settlement data (stub for PD-5)
   */
  static async getSettlementPreview(req: Request, res: Response): Promise<void> {
    try {
      const supplierId = (req as any).user?.id;

      if (!supplierId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // PD-4: Stub implementation
      // PD-5 will implement actual settlement calculation
      res.json({
        success: true,
        message: 'Settlement preview feature - Coming in PD-5',
        data: {
          supplierId,
          pendingSettlement: 0,
          totalSupplied: 0,
          totalEarnings: 0,
          note: 'This endpoint will be fully implemented in Phase PD-5'
        }
      });

    } catch (error) {
      logger.error('[SupplierController] Error fetching settlement preview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch settlement preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
