/**
 * Cosmetics Filter Routes
 *
 * Defines API routes for cosmetics filter management
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { CosmeticsFilterController } from '../controllers/cosmetics-filter.controller.js';
import { CosmeticsFilterService } from '../services/cosmetics-filter.service.js';
import {
  requirePermission,
  CosmeticsPermissions,
} from '../middleware/permissions.middleware.js';

export function createCosmeticsFilterRoutes(dataSource: DataSource): Router {
  const router = Router();
  const filterService = new CosmeticsFilterService(dataSource);
  const controller = new CosmeticsFilterController(filterService);

  // GET /api/v1/cosmetics/filters - Get all filter configurations
  router.get('/filters', (req, res) => controller.getAllFilters(req, res));

  // GET /api/v1/cosmetics/filters/:id - Get filter by ID
  router.get('/filters/:id', (req, res) => controller.getFilterById(req, res));

  // PUT /api/v1/cosmetics/filters/:id - Update filter configuration
  // Required permission: cosmetics:manage_filters
  router.put(
    '/filters/:id',
    requirePermission(CosmeticsPermissions.MANAGE_FILTERS),
    (req, res) => controller.updateFilter(req, res)
  );

  // POST /api/v1/cosmetics/products/filter - Filter products
  router.post('/products/filter', (req, res) =>
    controller.filterProducts(req, res)
  );

  // GET /api/v1/cosmetics/filters/statistics - Get filter statistics
  router.get('/filters/statistics', (req, res) =>
    controller.getFilterStatistics(req, res)
  );

  return router;
}

export default createCosmeticsFilterRoutes;
