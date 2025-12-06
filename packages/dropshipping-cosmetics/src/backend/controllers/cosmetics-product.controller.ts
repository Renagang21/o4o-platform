/**
 * CosmeticsProduct Controller
 *
 * Handles HTTP requests for cosmetics product detail
 */

import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { CosmeticsProductService } from '../services/cosmetics-product.service.js';

export class CosmeticsProductController {
  private service: CosmeticsProductService;

  constructor(private dataSource: DataSource) {
    this.service = new CosmeticsProductService(dataSource);
  }

  /**
   * GET /api/v1/cosmetics/product/:id
   * Get product detail with cosmetics metadata
   */
  async getProductDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
        return;
      }

      const product = await this.service.getProductDetail(id);

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        });
        return;
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error: any) {
      console.error('[CosmeticsProduct] Error in getProductDetail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product detail',
        error: error.message
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/recommendations
   * Get product recommendations based on filters
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { skinType, concerns, limit } = req.query;

      if (!skinType) {
        res.status(400).json({
          success: false,
          message: 'Skin type is required'
        });
        return;
      }

      const concernsArray = concerns
        ? (concerns as string).split(',').map(c => c.trim())
        : [];

      const limitNum = limit ? parseInt(limit as string, 10) : 5;

      const recommendations = await this.service.getRecommendations(
        skinType as string,
        concernsArray,
        limitNum
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error: any) {
      console.error('[CosmeticsProduct] Error in getRecommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recommendations',
        error: error.message
      });
    }
  }
}

export default CosmeticsProductController;
