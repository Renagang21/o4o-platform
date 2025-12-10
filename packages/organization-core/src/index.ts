/**
 * Organization-Core
 *
 * 전사 조직 관리 시스템 (Core Domain)
 *
 * @package @o4o/organization-core
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { organizationCoreManifest, manifest, default as manifestDefault } from './manifest.js';

// Types (needed by manifest)
export * from './types/index.js';

// Backend code (imported directly by API server from src/)
export * from './entities/index.js';
export * from './services/index.js';
export * from './controllers/index.js';
export * from './lifecycle/index.js';
export * from './guards/index.js';
export * from './utils/index.js';

// Entity list for TypeORM
import * as Entities from './entities/index.js';
export const entities = Object.values(Entities).filter(
  (item) => typeof item === 'function' && item.prototype
);

// Service registry
import * as Services from './services/index.js';
export const services = Services;

/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // TODO: Implement actual routes using controllers
  // For now, return a placeholder router
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'organization-core' });
  });

  return router;
}

// Alias for manifest compatibility
export const createRoutes = routes;
