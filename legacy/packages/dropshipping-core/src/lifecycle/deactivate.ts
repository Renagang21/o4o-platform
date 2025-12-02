/**
 * Dropshipping Core - Deactivate Lifecycle Hook
 *
 * Executed when dropshipping-core is deactivated (disabled).
 * Responsibilities:
 * - Unregister admin menu items
 * - Disable routes
 * - Clear caches
 *
 * NOTE: Does NOT delete data - only disables the app functionality
 */

import type { DeactivateContext } from '@o4o/types';

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { logger, options = {} } = context;

  logger.info('[dropshipping-core] Deactivating...');

  // TODO: Unregister menu
  // TODO: Disable routes
  // TODO: Clear caches

  logger.info('[dropshipping-core] Deactivation completed successfully.');
}

export default deactivate;
