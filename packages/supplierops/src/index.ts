/**
 * SupplierOps
 *
 * 범용 공급자 운영 앱 (Universal Supplier Operations App)
 *
 * @package @o4o/supplierops
 * @version 1.0.0
 */

// Manifest
export { manifest } from './manifest.js';
export { manifest as default } from './manifest.js';

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
