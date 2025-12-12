/**
 * Cosmetics Supplier Extension - Backend Entry Point
 *
 * Module Loader Integration
 */

// Routes
export { createRoutes, createSupplierExtensionRoutes } from './routes';

// Entities
export * from './entities';

// Services
export * from './services';

// Controllers
export * from './controllers';

// Lifecycle
export { lifecycle, onInstall, onActivate, onDeactivate, onUninstall } from './lifecycle';
