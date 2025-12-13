import { DeactivateContext } from '../types/context.js';

/**
 * Deactivate Hook
 *
 * digital-signage-core 앱 비활성화 시 실행됩니다.
 */
export async function deactivate(context: DeactivateContext): Promise<void> {
  const { manifest, logger } = context;

  logger.info(`[${manifest.appId}] Deactivating...`);

  // No special deactivation logic needed for Phase 3
  // Future phases may add cleanup here

  logger.info(`[${manifest.appId}] Deactivated successfully.`);
}
