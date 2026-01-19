/**
 * CGM Pharmacist App - Lifecycle Exports
 *
 * Note: Using only static exports to avoid Vite's dynamic/static import mixing warning.
 * Lazy loading is handled at the app-store level, not here.
 */

export { install } from './install.js';
export { activate } from './activate.js';
export { deactivate } from './deactivate.js';
export { uninstall } from './uninstall.js';

// Re-export as named object for convenience
export { install as lifecycleInstall } from './install.js';
export { activate as lifecycleActivate } from './activate.js';
export { deactivate as lifecycleDeactivate } from './deactivate.js';
export { uninstall as lifecycleUninstall } from './uninstall.js';
