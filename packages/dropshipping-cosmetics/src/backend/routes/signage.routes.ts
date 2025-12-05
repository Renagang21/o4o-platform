/**
 * Digital Signage Routes for Cosmetics
 *
 * Provides API routes for digital signage displays
 */

import { Router } from 'express';
import { SignageController } from '../controllers/signage.controller.js';

export function createSignageRoutes(): Router {
  const router = Router();
  const controller = new SignageController();

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
