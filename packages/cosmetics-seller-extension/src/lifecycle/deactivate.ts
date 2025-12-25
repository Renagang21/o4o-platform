/**
 * Cosmetics Seller Extension - Deactivate Hook
 */
import type { DataSource } from 'typeorm';

export async function deactivate(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-seller-extension] Deactivating...');
  console.log('[cosmetics-seller-extension] Deactivation complete');
}

export default deactivate;
