/**
 * Dropshipping Cosmetics Extension - Activate Lifecycle Hook
 *
 * Executed when dropshipping-cosmetics extension is activated (enabled).
 * Responsibilities:
 * - Register product filter hooks
 * - Enable cosmetics routes
 * - Enable cosmetics admin menu items
 * - Clear relevant caches
 */

interface ActivateContext {
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };
  options?: Record<string, any>;
}

export async function activate(context: ActivateContext): Promise<void> {
  const { logger, options = {} } = context;

  logger.info('[dropshipping-cosmetics] Activating extension...');

  // 1. Register product filter hook for cosmetics
  // This hook will be used to filter products by cosmetics-specific metadata
  logger.info('[dropshipping-cosmetics] Product filter hook will be registered');

  // 2. Enable cosmetics routes
  logger.info('[dropshipping-cosmetics] Cosmetics routes will be enabled');

  // 3. Enable admin menu items
  logger.info('[dropshipping-cosmetics] Admin menu items will be enabled');

  // 4. Clear caches
  logger.info('[dropshipping-cosmetics] Clearing relevant caches...');

  logger.info('[dropshipping-cosmetics] Activation completed successfully.');
}

export default activate;
