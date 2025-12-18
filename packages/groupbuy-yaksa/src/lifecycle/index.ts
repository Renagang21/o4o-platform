/**
 * Groupbuy-Yaksa Lifecycle Hooks
 * Phase 2: Operational Flow Completion
 */

import { install } from './install.js';
import { activate } from './activate.js';
import { deactivate } from './deactivate.js';
import { uninstall } from './uninstall.js';

export { install } from './install.js';
export { activate } from './activate.js';
export { deactivate } from './deactivate.js';
export { uninstall, type UninstallOptions } from './uninstall.js';

export const lifecycle = {
  install,
  activate,
  deactivate,
  uninstall,
};

export default lifecycle;
