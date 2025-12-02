/**
 * Dropshipping Core - Activate Lifecycle Hook
 *
 * Executed when dropshipping-core is activated (enabled).
 * Responsibilities:
 * - Register admin menu items
 * - Enable routes
 * - Clear relevant caches
 */

import type { ActivateContext } from '@o4o/types';

export async function activate(context: ActivateContext): Promise<void> {
  const { logger, options = {} } = context;

  logger.info('[dropshipping-core] Activating...');

  // TODO: Register menu (when menu system is ready)
  // TODO: Enable routes (when route system is ready)
  // TODO: Clear caches

  logger.info('[dropshipping-core] Activation completed successfully.');
}

export default activate;
