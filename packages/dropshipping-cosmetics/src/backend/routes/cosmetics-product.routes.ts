/**
 * CosmeticsProduct Routes
 *
 * API routes for cosmetics product detail
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { CosmeticsProductController } from '../controllers/cosmetics-product.controller.js';

export function createCosmeticsProductRoutes(dataSource: DataSource): Router {
  const router = Router();
  const controller = new CosmeticsProductController(dataSource);

  /**
   * GET /api/v1/cosmetics/product/:id
   * Get product detail with cosmetics metadata
   */
  router.get('/product/:id', (req, res) => controller.getProductDetail(req, res));

  /**
   * GET /api/v1/cosmetics/recommendations
   * Get product recommendations based on filters
   */
  router.get('/recommendations', (req, res) => controller.getRecommendations(req, res));

  return router;
}

export default createCosmeticsProductRoutes;
