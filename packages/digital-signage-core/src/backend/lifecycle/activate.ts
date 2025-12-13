import { ActivateContext } from '../types/context.js';

/**
 * Activate Hook
 *
 * digital-signage-core 앱 활성화 시 실행됩니다.
 */
export async function activate(context: ActivateContext): Promise<void> {
  const { manifest, logger } = context;

  logger.info(`[${manifest.appId}] Activating...`);

  // No special activation logic needed for Phase 3
  // Future phases may add initialization here

  logger.info(`[${manifest.appId}] Activated successfully.`);
}
