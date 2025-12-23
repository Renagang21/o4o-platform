/**
 * CGM Pharmacist App - Lifecycle Exports
 */

export { install } from './install.js';
export { activate } from './activate.js';
export { deactivate } from './deactivate.js';
export { uninstall } from './uninstall.js';

export const lifecycle = {
  install: () => import('./install.js').then((m) => m.install),
  activate: () => import('./activate.js').then((m) => m.activate),
  deactivate: () => import('./deactivate.js').then((m) => m.deactivate),
  uninstall: () => import('./uninstall.js').then((m) => m.uninstall),
};

export default lifecycle;
