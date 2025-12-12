/**
 * PharmacyOps Lifecycle
 *
 * @package @o4o/pharmacyops
 */

export { install } from './install.js';
export type { InstallContext, InstallResult } from './install.js';

export { activate } from './activate.js';
export type { ActivateContext, ActivateResult } from './activate.js';

export { deactivate } from './deactivate.js';
export type { DeactivateContext, DeactivateResult } from './deactivate.js';

export { uninstall } from './uninstall.js';
export type { UninstallContext, UninstallResult } from './uninstall.js';

// Lifecycle handlers object for AppStore
export const lifecycle = {
  install: () => import('./install.js').then((m) => m.install),
  activate: () => import('./activate.js').then((m) => m.activate),
  deactivate: () => import('./deactivate.js').then((m) => m.deactivate),
  uninstall: () => import('./uninstall.js').then((m) => m.uninstall),
};
