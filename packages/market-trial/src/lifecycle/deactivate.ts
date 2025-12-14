/**
 * Market Trial Deactivate Hook
 *
 * Called when the market-trial app is deactivated.
 * Phase 1: No specific deactivation logic.
 */

import { DataSource } from 'typeorm';

interface DeactivateContext {
  appId: string;
  manifest: any;
  dataSource: DataSource;
  logger: any;
  options?: Record<string, any>;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { logger } = context;

  logger?.info?.('[market-trial] Deactivating Market Trial...');

  // Phase 1: No specific deactivation logic needed
  // Future phases may unregister event handlers, stop background jobs, etc.

  logger?.info?.('[market-trial] Market Trial deactivated successfully');
}

// Legacy export
export const onDeactivate = deactivate;
