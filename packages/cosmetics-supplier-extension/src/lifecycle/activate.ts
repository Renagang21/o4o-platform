/**
 * Cosmetics Supplier Extension - Activate Hook
 */
import type { DataSource } from 'typeorm';

export async function activate(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-supplier-extension] Activating...');
  console.log('[cosmetics-supplier-extension] Activation complete');
}

export default activate;
