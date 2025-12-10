/**
 * Dropshipping-Core
 *
 * 산업 중립적·확장형·범용 Dropshipping 엔진 (Core Domain)
 *
 * @package @o4o/dropshipping-core
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { dropshippingCoreManifest, manifest, default as manifestDefault } from './manifest.js';

// Entities
export * from './entities/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Lifecycle
export * from './lifecycle/index.js';

// Hooks/Events
export * from './hooks/index.js';

// Entity list for TypeORM
import * as Entities from './entities/index.js';
export const entities = [
  Entities.Supplier,
  Entities.Seller,
  Entities.ProductMaster,
  Entities.SupplierProductOffer,
  Entities.SellerListing,
  Entities.OrderRelay,
  Entities.SettlementBatch,
  Entities.CommissionRule,
  Entities.CommissionTransaction,
];

// Service registry
import * as Services from './services/index.js';
export const services = Services;

// Controller registry
import * as Controllers from './controllers/index.js';
export const controllers = Controllers;

/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // TODO: Implement actual routes using controllers
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'dropshipping-core' });
  });

  return router;
}

// Alias for manifest compatibility
export const createRoutes = routes;
