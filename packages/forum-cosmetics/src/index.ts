/**
 * Forum Cosmetics Extension App
 *
 * Entry point for the Cosmetics forum extension.
 * This app extends forum-core with cosmetics-specific features.
 *
 * @package @o4o/forum-core-cosmetics
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { forumCosmeticsManifest, manifest, default as manifestDefault } from './manifest.js';

// Export entities
export * from './backend/entities/index.js';

// Export services
export * from './backend/services/index.js';

// Export controllers
export * from './backend/controllers/index.js';

// Export lifecycle
export * from './lifecycle/index.js';

// Export frontend components (Phase 14-2)
export * from './frontend/index.js';

// Entity list for TypeORM
import * as Entities from './backend/entities/index.js';
export const entities = Object.values(Entities).filter(
  (item) => typeof item === 'function' && item.prototype
);

// Import route factory
import { createCosmeticsForumRoutes } from './backend/routes/index.js';

/**
 * Routes factory compatible with Module Loader
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // Health check (always available)
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'forum-cosmetics' });
  });

  // If dataSource is provided, mount the full routes
  if (dataSource) {
    try {
      const cosmeticsRoutes = createCosmeticsForumRoutes(dataSource);
      router.use('/', cosmeticsRoutes);
    } catch (error) {
      console.error('[forum-cosmetics] Failed to initialize routes:', error);
    }
  }

  return router;
}

export const createRoutes = routes;

// Note: Admin UI components will be imported directly by admin-dashboard via:
// import('@o4o/forum-core-cosmetics/src/admin-ui/pages/ForumCosmeticsApp')
