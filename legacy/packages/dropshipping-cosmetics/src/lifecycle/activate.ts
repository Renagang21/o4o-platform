import type { ActivateContext } from '@o4o/types';

/**
 * Cosmetics Extension - Activate Hook
 *
 * Executed when the cosmetics extension is activated.
 */
export async function activate(context: ActivateContext): Promise<void> {
  const { logger } = context;

  logger.info('[cosmetics-extension] Activating...');

  // Register ACF fields
  logger.info('[cosmetics-extension] Registering ACF fields for cosmetics metadata');

  // Enable cosmetics routes
  logger.info('[cosmetics-extension] Enabling cosmetics API routes');

  logger.info('[cosmetics-extension] Activation completed successfully');
}

export default activate;
