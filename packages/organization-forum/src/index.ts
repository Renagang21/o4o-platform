/**
 * Organization-Forum Integration Extension
 *
 * Provides seamless integration between organization-core and forum-app.
 *
 * @package @o4o-extensions/organization-forum
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { organizationForumManifest, manifest, default as manifestDefault } from './manifest.js';

/**
 * Routes factory compatible with Module Loader
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'organization-forum' });
  });

  return router;
}

export const createRoutes = routes;
