/**
 * Organization-Dropshipping Integration Extension
 *
 * Provides seamless integration between organization-core and dropshipping-core.
 *
 * Features:
 * - Organization-scoped products and pricing
 * - Organization-based groupbuy campaigns
 * - Hierarchical dropshipping permissions
 * - Groupbuy participant tracking
 *
 * @package @o4o-extensions/organization-dropshipping
 * @version 0.1.0
 */

// Manifest
export { manifest } from './manifest.js';
export { manifest as default } from './manifest.js';

// Backend code (imported directly by API server from src/)
// export { OrganizationDropshippingService } from './services/OrganizationDropshippingService.js';
// export * from './entities';
// export { onInstall, onUninstall } from './lifecycle/install.js';
