/**
 * Dropshipping-Core
 *
 * 산업 중립적·확장형·범용 Dropshipping 엔진 (Core Domain)
 *
 * @package @o4o/dropshipping-core
 * @version 1.0.0
 */

// Manifest
export { manifest } from './manifest.js';
export { manifest as default } from './manifest.js';

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
