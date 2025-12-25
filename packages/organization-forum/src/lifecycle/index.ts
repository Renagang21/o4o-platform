/**
 * Organization-Forum Lifecycle Exports
 *
 * All lifecycle hooks for the organization-forum integration extension
 */

export { onInstall } from './install.js';
export { activate } from './activate.js';
export { deactivate } from './deactivate.js';
export { uninstall } from './uninstall.js';

// Alias for install function (standard naming)
export { onInstall as install } from './install.js';
