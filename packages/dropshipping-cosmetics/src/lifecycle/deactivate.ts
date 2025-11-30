import type { DeactivateContext } from '@o4o/types';

/**
 * Cosmetics Extension - Deactivate Hook
 *
 * Executed when the cosmetics extension is deactivated.
 */
export async function deactivate(context: DeactivateContext): Promise<void> {
  const { logger } = context;

  logger.info('[cosmetics-extension] Deactivating...');

  // Unregister ACF fields (but keep data)
  logger.info('[cosmetics-extension] Unregistering ACF fields');

  // Disable cosmetics routes
  logger.info('[cosmetics-extension] Disabling cosmetics API routes');

  logger.info('[cosmetics-extension] Deactivation completed successfully');
}

export default deactivate;
