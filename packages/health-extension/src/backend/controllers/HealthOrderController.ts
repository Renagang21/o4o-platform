/**
 * Health Order Controller
 *
 * Health 제품 주문 HTTP 요청 처리
 *
 * @package @o4o/health-extension
 */

import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { HealthOrderService } from '../services/HealthOrderService.js';

export class HealthOrderController {
  private service: HealthOrderService;

  constructor(private dataSource: DataSource) {
    this.service = new HealthOrderService(dataSource);
  }

  /**
   * GET /api/v1/health/orders
   * Get health order list
   */
  async getOrderList(req: Request, res: Response): Promise<void> {
    try {
      const {
        buyerId,
        sellerId,
        status,
        page = '1',
        limit = '20',
      } = req.query;

      const filters: {
        buyerId?: string;
        sellerId?: string;
        status?: string;
      } = {};

      if (buyerId) {
        filters.buyerId = buyerId as string;
      }

      if (sellerId) {
        filters.sellerId = sellerId as string;
      }

      if (status) {
        filters.status = status as string;
      }

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await this.service.getOrderList(filters, pagination);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
      });
    } catch (error: any) {
      console.error('[HealthOrder] Error in getOrderList:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order list',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/health/orders/:id
   * Get order detail
   */
  async getOrderDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Order ID is required',
        });
        return;
      }

      const order = await this.service.getOrderDetail(id);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found',
        });
        return;
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      console.error('[HealthOrder] Error in getOrderDetail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order detail',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/health/orders
   * Create health order
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { offerId, buyerId, quantity, metadata } = req.body;

      if (!offerId || !buyerId || !quantity) {
        res.status(400).json({
          success: false,
          message: 'offerId, buyerId, and quantity are required',
        });
        return;
      }

      // Get user from request (set by auth middleware)
      const user = (req as any).user || {
        id: 'unknown',
        role: 'buyer',
      };

      const result = await this.service.createOrder(
        { offerId, buyerId, quantity, metadata },
        user,
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          errors: result.errors,
          warnings: result.warnings,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.order,
        warnings: result.warnings,
      });
    } catch (error: any) {
      console.error('[HealthOrder] Error in createOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: error.message,
      });
    }
  }

  /**
   * PATCH /api/v1/health/orders/:id/status
   * Update order status
   */
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Order ID is required',
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status is required',
        });
        return;
      }

      const user = (req as any).user || {
        id: 'unknown',
        role: 'admin',
      };

      const result = await this.service.updateOrderStatus(id, status, user);

      if (!result.success) {
        res.status(400).json({
          success: false,
          errors: result.errors,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Order status updated',
      });
    } catch (error: any) {
      console.error('[HealthOrder] Error in updateOrderStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/health/orders/seller/:sellerId/summary
   * Get seller order summary
   */
  async getSellerOrderSummary(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required',
        });
        return;
      }

      const summary = await this.service.getSellerOrderSummary(sellerId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('[HealthOrder] Error in getSellerOrderSummary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch seller order summary',
        error: error.message,
      });
    }
  }
}

export default HealthOrderController;
