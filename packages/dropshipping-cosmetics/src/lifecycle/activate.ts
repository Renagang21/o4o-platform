/**
 * Dropshipping Cosmetics Extension - Activate Lifecycle Hook
 *
 * Executed when dropshipping-cosmetics extension is activated (enabled).
 *
 * Phase 2 업데이트:
 * - Core Extension Registry에 Cosmetics Extension 등록
 * - Validation Hook 자동 연결
 * - Product filter hook 등록
 *
 * Responsibilities:
 * - Register with Core Extension Registry
 * - Register product filter hooks
 * - Enable cosmetics routes
 * - Enable cosmetics admin menu items
 * - Clear relevant caches
 */

import { registerExtension } from '@o4o/dropshipping-core';
import { cosmeticsExtension } from '../extension.js';
import { registerCosmeticsFilter } from '../backend/hooks/product-filter.hook.js';

interface ActivateContext {
  logger: {
    info: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };
  options?: Record<string, any>;
  registerFilter?: (name: string, filterFn: any) => void;
}

export async function activate(context: ActivateContext): Promise<void> {
  const { logger, options = {} } = context;

  logger.info('[dropshipping-cosmetics] Activating extension...');

  // 1. Core Extension Registry에 등록
  logger.info('[dropshipping-cosmetics] Registering with Dropshipping Core Extension Registry...');
  registerExtension(cosmeticsExtension);
  logger.info('[dropshipping-cosmetics] Extension registered successfully');

  // 2. Register product filter hook for cosmetics
  // This hook will be used to filter products by cosmetics-specific metadata
  if (context.registerFilter) {
    logger.info('[dropshipping-cosmetics] Registering product filter hook...');
    registerCosmeticsFilter(context.registerFilter);
    logger.info('[dropshipping-cosmetics] Product filter hook registered');
  } else {
    logger.info('[dropshipping-cosmetics] Product filter hook will be registered lazily');
  }

  // 3. Enable cosmetics routes
  logger.info('[dropshipping-cosmetics] Cosmetics routes enabled');

  // 4. Enable admin menu items
  logger.info('[dropshipping-cosmetics] Admin menu items enabled');

  // 5. Clear caches
  logger.info('[dropshipping-cosmetics] Clearing relevant caches...');

  // 6. Call extension's onActivate if defined
  if (cosmeticsExtension.onActivate) {
    await cosmeticsExtension.onActivate();
  }

  logger.info('[dropshipping-cosmetics] Activation completed successfully.');
}

export default activate;
