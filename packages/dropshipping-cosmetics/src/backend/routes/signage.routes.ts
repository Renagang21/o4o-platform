/**
 * Digital Signage Routes for Cosmetics
 *
 * Provides API routes for digital signage displays
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SignageController } from '../controllers/signage.controller.js';
import { CosmeticsFilterService } from '../services/cosmetics-filter.service.js';
import { RoutineReaderService } from '../services/routine-reader.service.js';

export function createSignageRoutes(dataSource: DataSource): Router {
  const router = Router();
  const filterService = new CosmeticsFilterService(dataSource);
  // Use read-only RoutineReaderService for PartnerRoutine access (Phase 7-Y)
  const routineReader = new RoutineReaderService(dataSource);
  const controller = new SignageController(filterService, routineReader);

  // GET /api/v1/cosmetics/products/signage - Get products for signage
  // Query params: skinType, concerns, category, limit, featured
  router.get('/products/signage', (req, res) =>
    controller.getProductsForSignage(req, res)
  );

  // GET /api/v1/cosmetics/routines/signage - Get routines for signage
  // Query params: skinType, concerns, timeOfUse, limit
  router.get('/routines/signage', (req, res) =>
    controller.getRoutinesForSignage(req, res)
  );

  // GET /api/v1/cosmetics/signage/featured - Get featured content
  // Query params: storeId, displayType
  router.get('/signage/featured', (req, res) =>
    controller.getFeaturedForSignage(req, res)
  );

  return router;
}

export default createSignageRoutes;
