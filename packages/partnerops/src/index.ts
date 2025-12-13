/**
 * PartnerOps App
 *
 * Partner Operations App for the O4O Platform
 * Manages partners, affiliate links, conversions, and commissions
 *
 * Phase 5 Refactoring: Partner-Core 기반
 *
 * @package @o4o/partnerops
 */

// Manifest
export { partneropsManifest, partneropsManifest as manifest } from './manifest.js';
export { partneropsManifest as default } from './manifest.js';

// Lifecycle hooks
export * from './lifecycle/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// DTOs
export * from './dto/index.js';

// Event handlers
export * from './hooks/index.js';

// Backend (Express routes factory)
export { createRoutes } from './backend/index.js';
