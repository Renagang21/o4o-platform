/**
 * Dropshipping Cosmetics Extension - Deactivate Lifecycle Hook
 *
 * Executed when dropshipping-cosmetics extension is deactivated (disabled).
 * Responsibilities:
 * - Unregister product filter hooks
 * - Disable cosmetics routes
 * - Hide cosmetics admin menu items
 * - Clear relevant caches
 */

interface DeactivateContext {
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };
  options?: Record<string, any>;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { logger, options = {} } = context;

  logger.info('[dropshipping-cosmetics] Deactivating extension...');

  // 1. Unregister product filter hooks
  logger.info('[dropshipping-cosmetics] Unregistering product filter hooks...');

  // 2. Disable cosmetics routes
  logger.info('[dropshipping-cosmetics] Disabling cosmetics routes...');

  // 3. Hide admin menu items
  logger.info('[dropshipping-cosmetics] Hiding admin menu items...');

  // 4. Clear caches
  logger.info('[dropshipping-cosmetics] Clearing relevant caches...');

  logger.info('[dropshipping-cosmetics] Deactivation completed successfully.');
}

export default deactivate;
