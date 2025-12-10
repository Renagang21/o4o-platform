/**
 * LMS-Yaksa Extension App
 *
 * 약사회 교육/연수 시스템
 *
 * @package @o4o/lms-yaksa
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { lmsYaksaManifest, lmsYaksaManifest as manifest } from './manifest.js';
export { lmsYaksaManifest as default } from './manifest.js';

// Lifecycle
export * from './lifecycle/index.js';

// Backend
export * from './backend/index.js';

// Types
export * from './types/index.js';

/**
 * Create Express routes for LMS-Yaksa
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // TODO: Implement actual routes
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'lms-yaksa' });
  });

  return router;
}
