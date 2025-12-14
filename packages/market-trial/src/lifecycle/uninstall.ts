/**
 * Market Trial Uninstall Hook
 *
 * Called when the market-trial app is uninstalled.
 * Data cleanup is handled by AppManager based on uninstallPolicy.
 */

import { DataSource } from 'typeorm';

interface UninstallContext {
  appId: string;
  manifest: any;
  dataSource: DataSource;
  logger: any;
  options?: {
    purgeData?: boolean;
  };
}

export async function uninstall(context: UninstallContext): Promise<void> {
  const { logger, options } = context;

  logger?.info?.('[market-trial] Uninstalling Market Trial...');

  if (options?.purgeData) {
    logger?.info?.('[market-trial] Data purge will be handled by AppManager');
  } else {
    logger?.info?.('[market-trial] Keeping data (keep-data mode)');
  }

  logger?.info?.('[market-trial] Market Trial uninstalled successfully');
}

// Legacy export
export const onUninstall = uninstall;
