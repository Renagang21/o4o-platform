/**
 * Health Settlement Controller
 *
 * Health 제품 정산 HTTP 요청 처리
 *
 * @package @o4o/health-extension
 */

import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { HealthSettlementService } from '../services/HealthSettlementService.js';

export class HealthSettlementController {
  private service: HealthSettlementService;

  constructor(private dataSource: DataSource) {
    this.service = new HealthSettlementService(dataSource);
  }

  /**
   * GET /api/v1/health/settlements
   * Get health settlement list
   */
  async getSettlementList(req: Request, res: Response): Promise<void> {
    try {
      const {
        sellerId,
        supplierId,
        status,
        startDate,
        endDate,
        page = '1',
        limit = '20',
      } = req.query;

      const filters: {
        sellerId?: string;
        supplierId?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
      } = {};

      if (sellerId) {
        filters.sellerId = sellerId as string;
      }

      if (supplierId) {
        filters.supplierId = supplierId as string;
      }

      if (status) {
        filters.status = status as string;
      }

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await this.service.getSettlementList(filters, pagination);

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
      console.error('[HealthSettlement] Error in getSettlementList:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch settlement list',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/health/settlements/:id
   * Get settlement detail
   */
  async getSettlementDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Settlement ID is required',
        });
        return;
      }

      const settlement = await this.service.getSettlementDetail(id);

      if (!settlement) {
        res.status(404).json({
          success: false,
          message: 'Settlement not found',
        });
        return;
      }

      res.json({
        success: true,
        data: settlement,
      });
    } catch (error: any) {
      console.error('[HealthSettlement] Error in getSettlementDetail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch settlement detail',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/health/settlements
   * Create settlement for health order
   */
  async createSettlement(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, commissionRate } = req.body;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: 'Order ID is required',
        });
        return;
      }

      const result = await this.service.createSettlement(
        orderId,
        commissionRate || 0.1,
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          errors: result.errors,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.settlement,
      });
    } catch (error: any) {
      console.error('[HealthSettlement] Error in createSettlement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create settlement',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/health/settlements/:id/process
   * Process settlement (mark as completed)
   */
  async processSettlement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Settlement ID is required',
        });
        return;
      }

      const user = (req as any).user || {
        id: 'unknown',
        role: 'admin',
      };

      const result = await this.service.processSettlement(id, user);

      if (!result.success) {
        res.status(400).json({
          success: false,
          errors: result.errors,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Settlement processed successfully',
      });
    } catch (error: any) {
      console.error('[HealthSettlement] Error in processSettlement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process settlement',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/health/settlements/seller/:sellerId/summary
   * Get seller settlement summary
   */
  async getSellerSettlementSummary(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { startDate, endDate } = req.query;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required',
        });
        return;
      }

      const summary = await this.service.getSellerSettlementSummary(
        sellerId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('[HealthSettlement] Error in getSellerSettlementSummary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch seller settlement summary',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/health/settlements/supplier/:supplierId/summary
   * Get supplier settlement summary
   */
  async getSupplierSettlementSummary(req: Request, res: Response): Promise<void> {
    try {
      const { supplierId } = req.params;
      const { startDate, endDate } = req.query;

      if (!supplierId) {
        res.status(400).json({
          success: false,
          message: 'Supplier ID is required',
        });
        return;
      }

      const summary = await this.service.getSupplierSettlementSummary(
        supplierId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('[HealthSettlement] Error in getSupplierSettlementSummary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supplier settlement summary',
        error: error.message,
      });
    }
  }
}

export default HealthSettlementController;
