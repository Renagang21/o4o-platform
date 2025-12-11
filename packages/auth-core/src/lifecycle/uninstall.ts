/**
 * Auth-Core Uninstall Hook
 *
 * Called when the app is uninstalled
 * Note: auth-core should generally not be uninstalled as it's a critical system component
 */

import type { DataSource } from 'typeorm';

export interface UninstallContext {
  dataSource: DataSource;
  organizationId?: string;
  purgeData?: boolean;
}

export async function uninstall(context: UninstallContext): Promise<void> {
  console.log('[auth-core] Uninstalling...');
  console.warn('[auth-core] Warning: Uninstalling auth-core is dangerous!');

  if (context.purgeData) {
    console.error('[auth-core] CRITICAL: purgeData is not allowed for auth-core!');
    console.error('[auth-core] User data must be preserved.');
    // Never purge auth tables - they are critical
  }

  console.log('[auth-core] Keeping all data (default mode for auth-core)');
  console.log('[auth-core] Uninstall complete');
}

export default uninstall;
