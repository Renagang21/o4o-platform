/**
 * PartnerOps App
 *
 * Partner Operations App for the O4O Platform
 * Manages partners, affiliate links, conversions, and commissions
 */

// Manifest
export { manifest } from './manifest';

// Lifecycle hooks
export * from './lifecycle';

// Services
export * from './services';

// Controllers
export * from './controllers';

// DTOs
export * from './dto';

// Event handlers
export * from './hooks';

// Backend (Express routes factory)
export { createRoutes } from './backend';
