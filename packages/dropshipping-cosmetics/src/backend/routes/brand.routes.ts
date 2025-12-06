/**
 * Brand Routes
 *
 * REST API endpoints for brand management
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { BrandService } from '../services/brand.service.js';
import { BrandController } from '../controllers/brand.controller.js';

export function createBrandRoutes(dataSource: DataSource): Router {
  const router = Router();
  const brandService = new BrandService(dataSource);
  const brandController = new BrandController(brandService);

  /**
   * POST /api/v1/cosmetics/brands
   * Create a new brand
   */
  router.post('/brands', (req, res) => brandController.createBrand(req, res));

  /**
   * GET /api/v1/cosmetics/brands/all
   * Get all brands (no pagination)
   * Must come before /:id to avoid route conflict
   */
  router.get('/brands/all', (req, res) => brandController.getAllBrands(req, res));

  /**
   * GET /api/v1/cosmetics/brands/:id
   * Get brand by ID
   */
  router.get('/brands/:id', (req, res) => brandController.getBrandById(req, res));

  /**
   * GET /api/v1/cosmetics/brands
   * List brands with filtering and pagination
   */
  router.get('/brands', (req, res) => brandController.listBrands(req, res));

  /**
   * PUT /api/v1/cosmetics/brands/:id
   * Update brand
   */
  router.put('/brands/:id', (req, res) => brandController.updateBrand(req, res));

  /**
   * DELETE /api/v1/cosmetics/brands/:id
   * Delete brand
   */
  router.delete('/brands/:id', (req, res) => brandController.deleteBrand(req, res));

  return router;
}
