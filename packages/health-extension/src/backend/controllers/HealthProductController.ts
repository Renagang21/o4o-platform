/**
 * Health Product Controller
 *
 * Health 제품 HTTP 요청 처리
 *
 * @package @o4o/health-extension
 */

import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { HealthProductService } from '../services/HealthProductService.js';
import type { HealthFilters } from '../../types.js';

export class HealthProductController {
  private service: HealthProductService;

  constructor(private dataSource: DataSource) {
    this.service = new HealthProductService(dataSource);
  }

  /**
   * GET /api/v1/health/products
   * Get health product list with filters
   */
  async getProductList(req: Request, res: Response): Promise<void> {
    try {
      const {
        healthCategory,
        targetGroup,
        certifications,
        form,
        allergyFree,
        search,
        page = '1',
        limit = '20',
      } = req.query;

      const filters: HealthFilters = {};

      if (healthCategory) {
        filters.healthCategory = healthCategory as any;
      }

      if (targetGroup) {
        filters.targetGroup = (targetGroup as string).split(',') as any[];
      }

      if (certifications) {
        filters.certifications = (certifications as string).split(',') as any[];
      }

      if (form) {
        filters.form = form as any;
      }

      if (allergyFree) {
        filters.allergyFree = (allergyFree as string).split(',') as any[];
      }

      if (search) {
        filters.search = search as string;
      }

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await this.service.getProductList(filters, pagination);

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
      console.error('[HealthProduct] Error in getProductList:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product list',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/health/products/:id
   * Get product detail with health metadata
   */
  async getProductDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Product ID is required',
        });
        return;
      }

      const product = await this.service.getProductDetail(id);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found',
        });
        return;
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      console.error('[HealthProduct] Error in getProductDetail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product detail',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/health/products/:id/validate
   * Validate health product metadata
   */
  async validateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Product ID is required',
        });
        return;
      }

      const result = await this.service.validateProduct(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[HealthProduct] Error in validateProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate product',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/health/products/expiring
   * Get products expiring soon
   */
  async getExpiringProducts(req: Request, res: Response): Promise<void> {
    try {
      const { withinDays = '90', supplierId } = req.query;

      const products = await this.service.getExpiringProducts(
        parseInt(withinDays as string, 10),
        supplierId as string | undefined,
      );

      res.json({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (error: any) {
      console.error('[HealthProduct] Error in getExpiringProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expiring products',
        error: error.message,
      });
    }
  }
}

export default HealthProductController;
