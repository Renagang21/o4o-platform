/**
 * Forum-Yaksa Uninstall Hook
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
  console.log('[forum-yaksa] Uninstalling...');

  if (context.purgeData) {
    console.log('[forum-yaksa] Purging data...');
    // TODO: Drop tables or soft-delete data
  } else {
    console.log('[forum-yaksa] Keeping data (default mode)');
  }

  console.log('[forum-yaksa] Uninstall complete');
}

export default uninstall;
