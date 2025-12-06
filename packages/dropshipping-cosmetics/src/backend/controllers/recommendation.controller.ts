/**
 * RecommendationController
 *
 * Handles HTTP requests for product recommendations
 */

import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RecommendationEngineService } from '../services/recommendation-engine.service.js';

export class RecommendationController {
  private recommendationService: RecommendationEngineService;

  constructor(dataSource: DataSource) {
    this.recommendationService = new RecommendationEngineService(dataSource);
  }

  /**
   * GET /api/v1/cosmetics/recommendations
   *
   * Query params:
   * - skinType: string (comma-separated)
   * - concerns: string (comma-separated)
   * - brand: string
   * - category: string
   * - limit: number
   * - excludeProductId: string
   */
  getRecommendations = async (req: Request, res: Response) => {
    try {
      // Parse query parameters
      const skinTypesParam = req.query.skinType as string;
      const concernsParam = req.query.concerns as string;
      const brand = req.query.brand as string;
      const category = req.query.category as string;
      const limitParam = req.query.limit as string;
      const excludeProductId = req.query.excludeProductId as string;

      // Convert comma-separated strings to arrays
      const skinTypes = skinTypesParam
        ? skinTypesParam.split(',').map(s => s.trim()).filter(Boolean)
        : undefined;

      const concerns = concernsParam
        ? concernsParam.split(',').map(c => c.trim()).filter(Boolean)
        : undefined;

      const limit = limitParam ? parseInt(limitParam, 10) : 5;

      // Validate limit
      if (isNaN(limit) || limit < 1 || limit > 50) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit. Must be between 1 and 50.',
          code: 'INVALID_LIMIT'
        });
      }

      // Call recommendation service
      const recommendations = await this.recommendationService.recommendProducts({
        skinTypes,
        concerns,
        brand,
        category,
        limit,
        excludeProductId
      });

      return res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('[RecommendationController] Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate recommendations',
        code: 'RECOMMENDATION_ERROR'
      });
    }
  };

  /**
   * GET /api/v1/cosmetics/recommendations/similar/:productId
   *
   * Get products similar to a specific product
   */
  getSimilarProducts = async (req: Request, res: Response) => {
    try {
      const productId = req.params.productId;
      const limitParam = req.query.limit as string;
      const limit = limitParam ? parseInt(limitParam, 10) : 5;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required',
          code: 'MISSING_PRODUCT_ID'
        });
      }

      if (isNaN(limit) || limit < 1 || limit > 50) {
        return res.status(400).json({
          success: false,
          error: 'Invalid limit. Must be between 1 and 50.',
          code: 'INVALID_LIMIT'
        });
      }

      const similarProducts = await this.recommendationService.getSimilarProducts(
        productId,
        limit
      );

      return res.json({
        success: true,
        data: similarProducts
      });
    } catch (error) {
      console.error('[RecommendationController] Error getting similar products:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get similar products',
        code: 'SIMILAR_PRODUCTS_ERROR'
      });
    }
  };
}

export default RecommendationController;
