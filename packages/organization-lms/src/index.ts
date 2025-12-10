/**
 * Organization-LMS Integration Extension
 *
 * Provides integration between organization-core and lms-core.
 *
 * @package @o4o-extensions/organization-lms
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { organizationLmsManifest, manifest, default as manifestDefault } from './manifest.js';

/**
 * Routes factory compatible with Module Loader
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'organization-lms' });
  });

  return router;
}

export const createRoutes = routes;
