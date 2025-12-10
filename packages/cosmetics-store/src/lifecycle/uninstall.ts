/**
 * Cosmetics-Store Uninstall Hook
 *
 * Called when the app is uninstalled
 */

import type { DataSource } from 'typeorm';

export interface UninstallContext {
  dataSource: DataSource;
  organizationId?: string;
  purgeData?: boolean;
}

export async function uninstall(context: UninstallContext): Promise<void> {
  console.log('[cosmetics-store] Uninstalling...');

  if (context.purgeData) {
    console.log('[cosmetics-store] Purging data...');
    // TODO: Drop tables or soft-delete data
    // WARNING: Order history should be preserved for legal reasons
  } else {
    console.log('[cosmetics-store] Keeping data (default mode)');
  }

  console.log('[cosmetics-store] Uninstall complete');
}

export default uninstall;
