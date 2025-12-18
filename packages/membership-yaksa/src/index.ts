/**
 * Membership-Yaksa Extension App
 *
 * 약사회 회원 관리 시스템
 *
 * @package @o4o-apps/membership-yaksa
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { membershipYaksaManifest, manifest, default as manifestDefault } from './manifest.js';

// Entities
export * from './backend/entities/index.js';

// Services
export * from './backend/services/index.js';

// Controllers
export * from './backend/controllers/index.js';

// Routes
export * from './backend/routes/index.js';

// Ports (Phase R1: External access interfaces)
export * from './ports/index.js';

// Lifecycle
export { install } from './lifecycle/install.js';
export { activate } from './lifecycle/activate.js';
export { deactivate } from './lifecycle/deactivate.js';
export { uninstall } from './lifecycle/uninstall.js';

// Entity list for TypeORM
import * as Entities from './backend/entities/index.js';
export const entities = Object.values(Entities).filter(
  (item) => typeof item === 'function' && item.prototype
);

/**
 * Routes factory compatible with Module Loader
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'membership-yaksa' });
  });

  return router;
}

export const createRoutes = routes;
