/**
 * Forum Yaksa Extension App
 *
 * Entry point for the Yaksa organization forum extension.
 * This app extends forum-core with pharmacy-specific features.
 *
 * @package @o4o/forum-core-yaksa
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { forumYaksaManifest, manifest, default as manifestDefault } from './manifest.js';

// Export entities
export * from './backend/entities/index.js';

// Export services
export * from './backend/services/index.js';

// Entity list for TypeORM
import * as Entities from './backend/entities/index.js';
export const entities = Object.values(Entities).filter(
  (item) => typeof item === 'function' && item.prototype
);

// Import route factories
import { createYaksaSearchRoutes } from './backend/routes/index.js';

/**
 * Routes factory compatible with Module Loader
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'forum-yaksa' });
  });

  // Mount search routes if dataSource is provided
  if (dataSource) {
    try {
      const searchRoutes = createYaksaSearchRoutes(dataSource);
      router.use('/search', searchRoutes);
    } catch (error) {
      console.error('[forum-yaksa] Failed to initialize search routes:', error);
    }
  }

  return router;
}

export const createRoutes = routes;

// Note: Admin UI components will be imported directly by admin-dashboard via:
// import('@o4o/forum-core-yaksa/src/admin-ui/pages/ForumYaksaApp')
