/**
 * Platform-Core Uninstall Hook
 *
 * Called when the app is uninstalled
 * Note: platform-core should generally not be uninstalled
 */

import type { DataSource } from 'typeorm';

export interface UninstallContext {
  dataSource: DataSource;
  organizationId?: string;
  purgeData?: boolean;
}

export async function uninstall(context: UninstallContext): Promise<void> {
  console.log('[platform-core] Uninstalling...');
  console.warn('[platform-core] Warning: Uninstalling platform-core is dangerous!');

  if (context.purgeData) {
    console.error('[platform-core] CRITICAL: purgeData is not allowed for platform-core!');
    // Never purge platform tables
  }

  console.log('[platform-core] Keeping all data (default mode for platform-core)');
  console.log('[platform-core] Uninstall complete');
}

export default uninstall;
