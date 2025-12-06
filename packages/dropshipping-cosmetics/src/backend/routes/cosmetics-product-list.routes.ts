/**
 * CosmeticsProductList Routes
 *
 * API routes for cosmetics product list with filtering
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { CosmeticsProductListController } from '../controllers/cosmetics-product-list.controller.js';

export function createCosmeticsProductListRoutes(dataSource: DataSource): Router {
  const router = Router();
  const controller = new CosmeticsProductListController(dataSource);

  /**
   * GET /api/v1/cosmetics/products
   * Get product list with filtering, sorting, and pagination
   */
  router.get('/products', (req, res) => controller.listProducts(req, res));

  return router;
}

export default createCosmeticsProductListRoutes;
