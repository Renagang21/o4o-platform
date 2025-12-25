/**
 * Signage Pharmacy Extension - Deactivate Hook
 */
import type { DataSource } from 'typeorm';

export async function deactivate(_dataSource: DataSource): Promise<void> {
  console.log('[signage-pharmacy-extension] Deactivating...');
  console.log('[signage-pharmacy-extension] Deactivation complete');
}

export default deactivate;
