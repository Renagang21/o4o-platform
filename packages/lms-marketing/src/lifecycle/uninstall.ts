/**
 * LMS-Marketing Uninstall Hook
 *
 * Executed when the Marketing LMS extension is uninstalled.
 */

import type { DataSource } from 'typeorm';

export interface UninstallContext {
  dataSource: DataSource;
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function onUninstall(dataSource: DataSource): Promise<void> {
  console.log('[lms-marketing] Uninstalling Marketing LMS Extension...');

  try {
    // Phase R5: No cleanup needed (no custom tables)
    // Data in LMS-Core tables (ContentBundle, etc.) is preserved

    console.log('[lms-marketing] Marketing LMS Extension uninstalled successfully');
    console.log('[lms-marketing] Note: LMS-Core data (ContentBundle, Quiz, Survey, EngagementLog) preserved');
  } catch (error) {
    console.error('[lms-marketing] Uninstall failed:', error);
    throw error;
  }
}

// Default export for compatibility
export default onUninstall;
