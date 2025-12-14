/**
 * CosmeticsProductListController
 *
 * Phase 9-C: Core v2 정렬
 * - ProductType.COSMETICS 기반 제품 리스트
 * - 화장품 메타데이터 필터링
 *
 * HTTP request handler for product list endpoint
 * API: GET /api/v1/cosmetics/products
 */

import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { CosmeticsProductListService, ProductListParams } from '../services/cosmetics-product-list.service.js';
import type { CosmeticsFiltersDto } from '../dto/index.js';

export class CosmeticsProductListController {
  private service: CosmeticsProductListService;

  constructor(dataSource: DataSource) {
    this.service = new CosmeticsProductListService(dataSource);
  }

  /**
   * GET /api/v1/cosmetics/products
   *
   * Query params:
   * - page: number
   * - limit: number
   * - sort: 'newest' | 'price_asc' | 'price_desc' | 'popular'
   * - skinType: string[] (comma-separated)
   * - concerns: string[] (comma-separated)
   * - brand: string
   * - category: string
   * - certifications: string[] (comma-separated)
   * - ingredients: string[] (comma-separated)
   */
  async listProducts(req: Request, res: Response): Promise<void> {
    try {
      // Parse query params
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const sort = (req.query.sort as string) || 'newest';

      // Parse filters
      const filters: any = {};

      if (req.query.skinType) {
        filters.skinType = this.parseArray(req.query.skinType as string);
      }

      if (req.query.concerns) {
        filters.concerns = this.parseArray(req.query.concerns as string);
      }

      if (req.query.brand) {
        filters.brand = req.query.brand as string;
      }

      if (req.query.category) {
        filters.category = req.query.category as string;
      }

      if (req.query.certifications) {
        filters.certifications = this.parseArray(req.query.certifications as string);
      }

      if (req.query.ingredients) {
        filters.ingredients = this.parseArray(req.query.ingredients as string);
      }

      // Build params
      const params: ProductListParams = {
        page,
        limit,
        sort: sort as any,
        filters,
      };

      // Call service
      const result = await this.service.listProducts(params);

      // Return response
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching product list:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch product list',
      });
    }
  }

  /**
   * Parse comma-separated string to array
   */
  private parseArray(value: string): string[] {
    if (!value) return [];
    return value.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
  }
}

export default CosmeticsProductListController;
