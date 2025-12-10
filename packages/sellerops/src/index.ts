/**
 * SellerOps
 *
 * 범용 판매자 운영 앱 (Universal Seller Operations App)
 *
 * @package @o4o/sellerops
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { selleropsManifest, selleropsManifest as manifest } from './manifest.js';
export { selleropsManifest as default } from './manifest.js';

// DTOs
export * from './dto/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Lifecycle
export * from './lifecycle/index.js';

// Hooks/Events
export * from './hooks/index.js';

// Service registry
import * as Services from './services/index.js';
export const services = Services;

// Controller registry
import * as Controllers from './controllers/index.js';
export const controllers = Controllers;

/**
 * Create Express routes for SellerOps
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // TODO: Implement actual routes
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'sellerops' });
  });

  return router;
}
