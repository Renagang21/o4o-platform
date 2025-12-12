/**
 * Dropshipping Cosmetics Extension
 *
 * Main entry point for the cosmetics extension package
 *
 * @package @o4o-apps/dropshipping-cosmetics
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { cosmeticsExtensionManifest, manifest, default as manifestDefault } from './manifest.js';
export * from './types.js';
export * as lifecycle from './lifecycle/index.js';

// Extension (Phase 2)
export { cosmeticsExtension } from './extension.js';

/**
 * Routes factory compatible with Module Loader
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'dropshipping-cosmetics' });
  });

  return router;
}

export const createRoutes = routes;
