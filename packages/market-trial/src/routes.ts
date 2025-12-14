/**
 * Market Trial Routes
 *
 * Phase 1 API: Route configuration for Market Trial endpoints.
 * All routes are prefixed with /api/market-trials
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createMarketTrialController } from './controllers/index.js';

/**
 * Create all Market Trial routes
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Market Trial routes
  router.use('/', createMarketTrialController(dataSource));

  return router;
}

export default createRoutes;
