/**
 * Digital Signage Controller for Cosmetics
 *
 * Provides API endpoints for displaying cosmetics products and routines
 * on digital signage displays in stores
 */

import type { Request, Response } from 'express';
import { CosmeticsFilterService } from '../services/cosmetics-filter.service.js';
import { InfluencerRoutineService } from '../services/influencer-routine.service.js';

export interface SignageProductData {
  id: string;
  name: string;
  price: number;
  image: string;
  skinType?: string[];
  concerns?: string[];
  certifications?: string[];
  category?: string;
}

export interface SignageRoutineData {
  id: string;
  title: string;
  partnerId: string;
  partnerName?: string;
  skinType: string[];
  concerns: string[];
  timeOfUse: string;
  steps: Array<{
    order: number;
    category: string;
    productName: string;
  }>;
  viewCount: number;
  recommendCount: number;
}

export class SignageController {
  private filterService: CosmeticsFilterService;
  private routineService: InfluencerRoutineService;

  constructor() {
    this.filterService = new CosmeticsFilterService();
    this.routineService = new InfluencerRoutineService();
  }

  /**
   * GET /api/v1/cosmetics/products/signage
   * Get products formatted for digital signage display
   */
  async getProductsForSignage(req: Request, res: Response): Promise<void> {
    try {
      const {
        skinType,
        concerns,
        category,
        limit = 10,
        featured = false,
      } = req.query;

      // Build filters
      const filters: any = {};
      if (skinType)
        filters.skinType = Array.isArray(skinType) ? skinType : [skinType];
      if (concerns)
        filters.concerns = Array.isArray(concerns) ? concerns : [concerns];
      if (category) filters.category = category;

      // TODO: Fetch products from database
      // For now, return mock data
      const products: SignageProductData[] = [];

      // Apply limit
      const limitedProducts = products.slice(0, Number(limit));

      res.json({
        success: true,
        data: limitedProducts,
        total: limitedProducts.length,
        displaySettings: {
          autoRotate: true,
          rotateInterval: 5000, // 5 seconds
          layout: 'grid',
          columns: 3,
        },
      });
    } catch (error) {
      console.error('Error fetching signage products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch products for signage',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/routines/signage
   * Get routines formatted for digital signage display
   */
  async getRoutinesForSignage(req: Request, res: Response): Promise<void> {
    try {
      const { skinType, concerns, timeOfUse, limit = 5 } = req.query;

      // Build filters
      const filters: any = {};
      if (skinType)
        filters.skinType = Array.isArray(skinType) ? skinType : [skinType];
      if (concerns)
        filters.concerns = Array.isArray(concerns) ? concerns : [concerns];
      if (timeOfUse) filters.timeOfUse = timeOfUse;

      // Get published routines
      const routines = await this.routineService.getPublishedRoutines(filters);

      // Format for signage
      const signageRoutines: SignageRoutineData[] = routines
        .slice(0, Number(limit))
        .map((routine) => ({
          id: routine.id,
          title: routine.title,
          partnerId: routine.partnerId,
          partnerName: undefined, // TODO: Get from partner service
          skinType: routine.skinType,
          concerns: routine.concerns,
          timeOfUse: routine.timeOfUse,
          steps: routine.routine.map((step) => ({
            order: step.orderInRoutine,
            category: step.category,
            productName: step.product?.name || 'Unknown Product',
          })),
          viewCount: routine.viewCount,
          recommendCount: routine.recommendCount,
        }));

      res.json({
        success: true,
        data: signageRoutines,
        total: signageRoutines.length,
        displaySettings: {
          autoRotate: true,
          rotateInterval: 10000, // 10 seconds
          layout: 'carousel',
        },
      });
    } catch (error) {
      console.error('Error fetching signage routines:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch routines for signage',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/signage/featured
   * Get featured products and routines for signage
   */
  async getFeaturedForSignage(req: Request, res: Response): Promise<void> {
    try {
      const { storeId, displayType = 'mixed' } = req.query;

      // TODO: Get store-specific featured content
      // For now, return mock response

      const response: any = {
        success: true,
        data: {
          products: [],
          routines: [],
        },
        displaySettings: {
          autoRotate: true,
          rotateInterval: 7000,
          layout: displayType === 'mixed' ? 'mixed' : 'split',
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching featured signage content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch featured content for signage',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default SignageController;
