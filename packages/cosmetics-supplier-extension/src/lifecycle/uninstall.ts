/**
 * Cosmetics Supplier Extension - Uninstall Hook
 */
import type { DataSource } from 'typeorm';

export async function uninstall(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-supplier-extension] Uninstalling...');
  console.log('[cosmetics-supplier-extension] Uninstallation complete');
}

export default uninstall;
