/**
 * @o4o/dropshipping-core
 *
 * Dropshipping Core App for O4O Platform
 *
 * A complete, installable app that provides multi-vendor dropshipping marketplace functionality.
 */

// Export manifest
export { dropshippingCoreManifest, dropshippingCoreManifest as default } from './manifest.js';

// Export backend
export * from './backend/index.js';

// Export lifecycle hooks
export * from './lifecycle/index.js';

// Export UI components (for selective importing)
// Note: UI components use React and should be imported separately by apps that need them
// export * from './admin-ui/index.js';
// export * from './main-site/index.js';
