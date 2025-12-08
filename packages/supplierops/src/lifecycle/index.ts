/**
 * SupplierOps Lifecycle Hooks
 */

export { onInstall } from './install.js';
export { onActivate } from './activate.js';
export { onDeactivate } from './deactivate.js';
export { onUninstall } from './uninstall.js';

// Aliases for Module Loader compatibility
export { onInstall as install } from './install.js';
export { onActivate as activate } from './activate.js';
export { onDeactivate as deactivate } from './deactivate.js';
export { onUninstall as uninstall } from './uninstall.js';
