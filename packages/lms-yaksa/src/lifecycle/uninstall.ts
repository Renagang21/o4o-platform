/**
 * LMS-Yaksa Uninstall Hook
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
  console.log('[lms-yaksa] Uninstalling...');

  if (context.purgeData) {
    console.log('[lms-yaksa] Purging data...');
    // TODO: Drop tables or soft-delete data
  } else {
    console.log('[lms-yaksa] Keeping data (default mode)');
  }

  console.log('[lms-yaksa] Uninstall complete');
}

export default uninstall;
