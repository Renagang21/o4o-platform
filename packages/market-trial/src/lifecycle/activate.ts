/**
 * Market Trial Activate Hook
 *
 * Called when the market-trial app is activated.
 * Phase 1: No specific activation logic.
 */

import { DataSource } from 'typeorm';

interface ActivateContext {
  appId: string;
  manifest: any;
  dataSource: DataSource;
  logger: any;
  options?: Record<string, any>;
}

export async function activate(context: ActivateContext): Promise<void> {
  const { logger } = context;

  logger?.info?.('[market-trial] Activating Market Trial...');

  // Phase 1: No specific activation logic needed
  // Future phases may register event handlers, start background jobs, etc.

  logger?.info?.('[market-trial] Market Trial activated successfully');
}

// Legacy export
export const onActivate = activate;
