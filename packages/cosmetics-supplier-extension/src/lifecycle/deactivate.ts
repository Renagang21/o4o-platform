/**
 * Cosmetics Supplier Extension - Deactivate Hook
 */
import type { DataSource } from 'typeorm';

export async function deactivate(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-supplier-extension] Deactivating...');
  console.log('[cosmetics-supplier-extension] Deactivation complete');
}

export default deactivate;
