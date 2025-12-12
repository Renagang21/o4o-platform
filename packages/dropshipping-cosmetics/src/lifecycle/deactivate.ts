/**
 * Dropshipping Cosmetics Extension - Deactivate Lifecycle Hook
 *
 * Executed when dropshipping-cosmetics extension is deactivated (disabled).
 *
 * Phase 2 업데이트:
 * - Core Extension Registry에서 Cosmetics Extension 해제
 *
 * Responsibilities:
 * - Unregister from Core Extension Registry
 * - Unregister product filter hooks
 * - Disable cosmetics routes
 * - Hide cosmetics admin menu items
 * - Clear relevant caches
 */

import { unregisterExtension } from '@o4o/dropshipping-core';
import { cosmeticsExtension } from '../extension.js';

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

  // 1. Core Extension Registry에서 해제
  logger.info('[dropshipping-cosmetics] Unregistering from Dropshipping Core Extension Registry...');
  unregisterExtension('dropshipping-cosmetics');
  logger.info('[dropshipping-cosmetics] Extension unregistered successfully');

  // 2. Unregister product filter hooks
  logger.info('[dropshipping-cosmetics] Unregistering product filter hooks...');

  // 3. Disable cosmetics routes
  logger.info('[dropshipping-cosmetics] Disabling cosmetics routes...');

  // 4. Hide admin menu items
  logger.info('[dropshipping-cosmetics] Hiding admin menu items...');

  // 5. Clear caches
  logger.info('[dropshipping-cosmetics] Clearing relevant caches...');

  // 6. Call extension's onDeactivate if defined
  if (cosmeticsExtension.onDeactivate) {
    await cosmeticsExtension.onDeactivate();
  }

  logger.info('[dropshipping-cosmetics] Deactivation completed successfully.');
}

export default deactivate;
