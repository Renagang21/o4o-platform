/**
 * LMS-Marketing Extension
 *
 * Marketing LMS Extension for O4O Platform
 * - Product info delivery to sellers/consumers
 * - Marketing quiz/survey campaigns
 * - Engagement capture and analytics
 *
 * Phase R5: Bootstrap skeleton
 */

// Manifest
export { lmsMarketingManifest, manifest } from './manifest.js';

// Backend
export {
  routes,
  createRoutes,
  createServices,
  createHooks,
  entities,
} from './backend/index.js';

// Lifecycle
export { onInstall } from './lifecycle/install.js';
export { onActivate } from './lifecycle/activate.js';
export { onDeactivate } from './lifecycle/deactivate.js';
export { onUninstall } from './lifecycle/uninstall.js';
