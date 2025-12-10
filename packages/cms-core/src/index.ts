/**
 * CMS-Core
 *
 * CMS 핵심 엔진 (Core Domain)
 * - 템플릿 시스템, CPT, ACF, 뷰, 메뉴, 미디어
 *
 * @package @o4o/cms-core
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { cmsCoreManifest, manifest, default as manifestDefault } from './manifest.js';

// Entities
export * from './entities/index.js';

// Entity list for TypeORM
import * as Entities from './entities/index.js';
export const entities = Object.values(Entities).filter(
  (item) => typeof item === 'function' && item.prototype
);

/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // TODO: Implement actual routes using controllers
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'cms-core' });
  });

  return router;
}

// Alias for manifest compatibility
export const createRoutes = routes;

// View System
export * from './view-system/index.js';
