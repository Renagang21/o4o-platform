/**
 * Cosmetics Sample Display Extension - Uninstall Hook
 */
import type { DataSource } from 'typeorm';

export async function uninstall(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-sample-display-extension] Uninstalling...');
  console.log('[cosmetics-sample-display-extension] Uninstallation complete');
}

export default uninstall;
