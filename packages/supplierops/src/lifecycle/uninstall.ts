/**
 * SupplierOps Uninstall Hook
 *
 * Called when the app is uninstalled
 */

import type { DataSource } from 'typeorm';

/**
 * Uninstall hook - cleans up resources
 *
 * @param dataSource - TypeORM DataSource (optional)
 * @param purgeData - If true, delete all app data
 */
export async function onUninstall(
  dataSource?: DataSource,
  purgeData: boolean = false
): Promise<void> {
  console.log('[SupplierOps] Running uninstall hook...');

  if (purgeData && dataSource) {
    console.log('[SupplierOps] Purging data...');
    await dataSource.query('DROP TABLE IF EXISTS supplierops_notifications');
    await dataSource.query('DROP TABLE IF EXISTS supplierops_settings');
    console.log('[SupplierOps] Data purged');
  }

  console.log('[SupplierOps] Uninstall completed');
}

export default onUninstall;
