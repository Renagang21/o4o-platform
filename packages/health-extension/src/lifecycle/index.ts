/**
 * Health Extension Lifecycle
 *
 * @package @o4o/health-extension
 */

export { install } from './install.js';
export { activate } from './activate.js';
export { deactivate } from './deactivate.js';
export { uninstall } from './uninstall.js';

export type { InstallContext } from './install.js';
export type { ActivateContext } from './activate.js';
export type { DeactivateContext } from './deactivate.js';
export type { UninstallContext } from './uninstall.js';
