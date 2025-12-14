/**
 * Market Trial Install Hook
 *
 * Called when the market-trial app is installed.
 * Phase 1: Only verify table structure exists.
 */

import { DataSource } from 'typeorm';

interface InstallContext {
  appId: string;
  manifest: any;
  dataSource: DataSource;
  logger: any;
  options?: Record<string, any>;
}

export async function install(context: InstallContext): Promise<void> {
  const { dataSource, logger } = context;

  logger?.info?.('[market-trial] Installing Market Trial...');

  try {
    // Phase 1: Only check if tables exist (TypeORM handles creation via entities)
    const tables = ['market_trials', 'market_trial_participants', 'market_trial_forums'];

    for (const table of tables) {
      const exists = await dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = $1
        )
      `, [table]);

      if (exists[0]?.exists) {
        logger?.info?.(`[market-trial] Table ${table} exists`);
      } else {
        logger?.info?.(`[market-trial] Table ${table} will be created by TypeORM`);
      }
    }

    logger?.info?.('[market-trial] Market Trial installed successfully');
  } catch (error) {
    logger?.error?.('[market-trial] Error during installation:', error);
    throw error;
  }
}

// Legacy export
export const onInstall = install;
