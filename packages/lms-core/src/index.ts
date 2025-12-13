/**
 * LMS-Core
 *
 * Learning Management System 핵심 엔진 (Core Domain)
 *
 * @package @o4o/lms-core
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { lmsCoreManifest, manifest, default as manifestDefault } from './manifest.js';

// Backend entities, services, and utils
export * from './entities/index.js';
export * from './services/index.js';
export * from './controllers/index.js';
export * from './utils/index.js';

// Entity list for TypeORM
import * as Entities from './entities/index.js';
export const entities = Object.values(Entities).filter(
  (item) => typeof item === 'function' && item.prototype
);

// Import routes factory
import { createRoutes as createBackendRoutes } from './backend/index.js';

/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'lms-core' });
  });

  // Mount quiz and survey routes if dataSource is available
  if (dataSource) {
    router.use('/', createBackendRoutes(dataSource));
  }

  return router;
}

// Alias for manifest compatibility
export const createRoutes = routes;
