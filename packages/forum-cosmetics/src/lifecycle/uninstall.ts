/**
 * Forum-Cosmetics Uninstall Hook
 *
 * Called when the app is uninstalled.
 * Handles cleanup based on uninstall mode (keep-data or purge).
 */

import type { DataSource } from 'typeorm';

export interface UninstallContext {
  dataSource: DataSource;
  organizationId?: string;
  mode?: 'keep-data' | 'purge';
}

export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, mode = 'keep-data' } = context;
  console.log(`[forum-cosmetics] Uninstalling (mode: ${mode})...`);

  try {
    if (mode === 'purge') {
      // Remove all cosmetics forum data
      console.log('[forum-cosmetics] Purging all data...');

      // Drop cosmetics_forum_meta table
      await dataSource.query(`DROP TABLE IF EXISTS cosmetics_forum_meta CASCADE;`);
      console.log('[forum-cosmetics] Dropped cosmetics_forum_meta table');

      // Remove ACF group registration
      try {
        await dataSource.query(`
          DELETE FROM cms_acf_group WHERE group_id = 'cosmetics_meta';
        `);
        console.log('[forum-cosmetics] Removed cosmetics_meta ACF group');
      } catch (error) {
        console.warn('[forum-cosmetics] Could not remove ACF group:', error);
      }

      console.log('[forum-cosmetics] Data purge complete');
    } else {
      // Keep data mode - just log
      console.log('[forum-cosmetics] Keeping data. Tables and metadata preserved.');
      console.log('[forum-cosmetics] To remove data, use purge mode.');
    }

    console.log('[forum-cosmetics] Uninstallation complete');
  } catch (error) {
    console.error('[forum-cosmetics] Uninstallation failed:', error);
    throw error;
  }
}

export default uninstall;
