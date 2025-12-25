/**
 * Signage Pharmacy Extension - Uninstall Hook
 */
import type { DataSource } from 'typeorm';

export async function uninstall(_dataSource: DataSource): Promise<void> {
  console.log('[signage-pharmacy-extension] Uninstalling...');
  console.log('[signage-pharmacy-extension] Uninstallation complete');
}

export default uninstall;
