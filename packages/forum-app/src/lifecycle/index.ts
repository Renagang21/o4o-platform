/**
 * Forum Core - Lifecycle Hooks
 *
 * Exports all lifecycle hooks for the forum-core app.
 * These hooks are called by AppManager during app lifecycle events.
 */

export { install } from './install.js';
export { activate } from './activate.js';
export { deactivate } from './deactivate.js';
export { uninstall } from './uninstall.js';

export type { InstallContext } from './install.js';
export type { ActivateContext } from './activate.js';
export type { DeactivateContext } from './deactivate.js';
export type { UninstallContext } from './uninstall.js';
