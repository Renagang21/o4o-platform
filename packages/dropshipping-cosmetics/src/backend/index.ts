/**
 * Cosmetics Extension Backend
 *
 * Main export for backend functionality
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { createCosmeticsModule, CosmeticsEntities } from './module.js';

export * from './entities/index.js';
export * from './services/cosmetics-filter.service.js';
// influencer-routine.service REMOVED (Phase 7-Y) - Routine CRUD moved to cosmetics-partner-extension
export * from './services/routine-reader.service.js'; // Read-only PartnerRoutine access (Phase 7-Y)
export * from './services/recommendation-engine.service.js';
export * from './services/brand.service.js';
export * from './controllers/cosmetics-filter.controller.js';
// influencer-routine.controller REMOVED (Phase 7-Y) - Routine CRUD moved to cosmetics-partner-extension
export * from './controllers/signage.controller.js';
export * from './controllers/recommendation.controller.js';
export * from './controllers/brand.controller.js';
export * from './middleware/permissions.middleware.js';
export * from './hooks/product-filter.hook.js';
export { createCosmeticsModule, CosmeticsEntities } from './module.js';
export { default as CosmeticsModule } from './module.js';

/**
 * Routes factory compatible with Module Loader
 *
 * Creates a combined router for all cosmetics routes
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  if (!dataSource) {
    throw new Error('DataSource is required for dropshipping-cosmetics routes');
  }

  const module = createCosmeticsModule(dataSource);
  const router = Router();

  // Register all cosmetics routes
  for (const route of module.routes) {
    router.use(route.path.replace('/api/v1/cosmetics', ''), route.router);
  }

  return router;
}

/**
 * Entity list for TypeORM
 */
export const entities = CosmeticsEntities;
