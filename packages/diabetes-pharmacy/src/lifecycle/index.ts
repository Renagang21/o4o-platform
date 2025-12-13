/**
 * diabetes-pharmacy Lifecycle
 *
 * @package @o4o/diabetes-pharmacy
 */

export { install } from './install.js';
export type { InstallResult } from './install.js';

export { activate } from './activate.js';
export type { ActivateResult } from './activate.js';

export { deactivate } from './deactivate.js';
export type { DeactivateResult } from './deactivate.js';

export { uninstall } from './uninstall.js';
export type { UninstallResult } from './uninstall.js';

// Lifecycle handlers object for AppStore
export const lifecycle = {
  install: () => import('./install.js').then((m) => m.install),
  activate: () => import('./activate.js').then((m) => m.activate),
  deactivate: () => import('./deactivate.js').then((m) => m.deactivate),
  uninstall: () => import('./uninstall.js').then((m) => m.uninstall),
};
