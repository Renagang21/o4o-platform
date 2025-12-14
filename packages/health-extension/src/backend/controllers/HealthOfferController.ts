/**
 * Health Offer Controller
 *
 * Health 제품 Offer HTTP 요청 처리
 *
 * @package @o4o/health-extension
 */

import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { HealthOfferService } from '../services/HealthOfferService.js';

export class HealthOfferController {
  private service: HealthOfferService;

  constructor(private dataSource: DataSource) {
    this.service = new HealthOfferService(dataSource);
  }

  /**
   * GET /api/v1/health/offers
   * Get health offer list
   */
  async getOfferList(req: Request, res: Response): Promise<void> {
    try {
      const {
        sellerId,
        status,
        expirationWithinDays,
        page = '1',
        limit = '20',
      } = req.query;

      const filters: {
        sellerId?: string;
        status?: string;
        expirationWithinDays?: number;
      } = {};

      if (sellerId) {
        filters.sellerId = sellerId as string;
      }

      if (status) {
        filters.status = status as string;
      }

      if (expirationWithinDays) {
        filters.expirationWithinDays = parseInt(expirationWithinDays as string, 10);
      }

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await this.service.getOfferList(filters, pagination);

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
      console.error('[HealthOffer] Error in getOfferList:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch offer list',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/health/offers/:id
   * Get offer detail
   */
  async getOfferDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Offer ID is required',
        });
        return;
      }

      const offer = await this.service.getOfferDetail(id);

      if (!offer) {
        res.status(404).json({
          success: false,
          message: 'Offer not found',
        });
        return;
      }

      res.json({
        success: true,
        data: offer,
      });
    } catch (error: any) {
      console.error('[HealthOffer] Error in getOfferDetail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch offer detail',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/health/offers
   * Create health offer with validation
   */
  async createOffer(req: Request, res: Response): Promise<void> {
    try {
      const { productId, sellerId, price, metadata } = req.body;

      if (!productId || !sellerId || !price) {
        res.status(400).json({
          success: false,
          message: 'productId, sellerId, and price are required',
        });
        return;
      }

      // Get user from request (set by auth middleware)
      const user = (req as any).user || {
        id: 'unknown',
        role: 'seller',
        sellerId,
      };

      const result = await this.service.createOffer(
        { productId, sellerId, price, metadata },
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
        data: result.offer,
        warnings: result.warnings,
      });
    } catch (error: any) {
      console.error('[HealthOffer] Error in createOffer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create offer',
        error: error.message,
      });
    }
  }

  /**
   * PATCH /api/v1/health/offers/:id/status
   * Update offer status
   */
  async updateOfferStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Offer ID is required',
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

      const result = await this.service.updateOfferStatus(id, status, user);

      if (!result.success) {
        res.status(400).json({
          success: false,
          errors: result.errors,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Offer status updated',
      });
    } catch (error: any) {
      console.error('[HealthOffer] Error in updateOfferStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update offer status',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/health/offers/expiring
   * Get offers expiring soon
   */
  async getExpiringOffers(req: Request, res: Response): Promise<void> {
    try {
      const { withinDays = '30', sellerId } = req.query;

      const offers = await this.service.getExpiringOffers(
        parseInt(withinDays as string, 10),
        sellerId as string | undefined,
      );

      res.json({
        success: true,
        data: offers,
        count: offers.length,
      });
    } catch (error: any) {
      console.error('[HealthOffer] Error in getExpiringOffers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expiring offers',
        error: error.message,
      });
    }
  }
}

export default HealthOfferController;
