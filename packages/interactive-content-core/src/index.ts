/**
 * Interactive Content Core
 *
 * Quiz, Survey, ContentBundle 콘텐츠 엔진
 *
 * @package @o4o/interactive-content-core
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Entities
export * from './entities/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Entity list for TypeORM
import * as Entities from './entities/index.js';
export const entities = Object.values(Entities).filter(
  (item) => typeof item === 'function' && item.prototype
);

// Service initialization
import { initContentBundleService } from './services/ContentBundleService.js';

// Controller routes
import { createContentBundleRoutes } from './controllers/ContentBundleController.js';

/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // Initialize services with data source
  if (dataSource) {
    initContentBundleService(dataSource);
  }

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'interactive-content-core' });
  });

  // ContentBundle routes
  router.use('/bundles', createContentBundleRoutes());

  return router;
}

// Alias for manifest compatibility
export const createRoutes = routes;
