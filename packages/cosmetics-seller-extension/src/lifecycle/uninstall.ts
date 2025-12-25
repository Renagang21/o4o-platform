/**
 * Cosmetics Seller Extension - Uninstall Hook
 */
import type { DataSource } from 'typeorm';

export async function uninstall(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-seller-extension] Uninstalling...');
  console.log('[cosmetics-seller-extension] Uninstallation complete');
}

export default uninstall;
