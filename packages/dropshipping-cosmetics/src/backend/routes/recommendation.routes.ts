/**
 * Recommendation Routes
 *
 * Routes for cosmetics product recommendations
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { RecommendationController } from '../controllers/recommendation.controller.js';

export function createRecommendationRoutes(dataSource: DataSource): Router {
  const router = Router();
  const controller = new RecommendationController(dataSource);

  /**
   * GET /api/v1/cosmetics/recommendations
   * Get product recommendations based on criteria
   */
  router.get('/recommendations', controller.getRecommendations);

  /**
   * GET /api/v1/cosmetics/recommendations/similar/:productId
   * Get products similar to a specific product
   */
  router.get('/recommendations/similar/:productId', controller.getSimilarProducts);

  return router;
}

export default createRecommendationRoutes;
