/**
 * Cosmetics-Store Backend Exports
 *
 * Standardized backend exports for Module Loader integration
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Export entities (placeholder)
// export * from './entities/index.js';

// Export services (placeholder)
// export * from './services/index.js';

// Export controllers (placeholder)
// export * from './controllers/index.js';

/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // TODO: Implement routes
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'cosmetics-store' });
  });

  return router;
}

// Alias for manifest compatibility
export const createRoutes = routes;

/**
 * Entity list for TypeORM (placeholder)
 */
export const entities: any[] = [];

/**
 * Services registry (placeholder)
 */
export const services = {};
