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

// Re-export context types from @o4o/types for convenience
export type { InstallContext, ActivateContext, DeactivateContext, UninstallContext } from '@o4o/types';
