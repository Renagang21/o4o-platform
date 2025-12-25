/**
 * Cosmetics Seller Extension - Activate Hook
 */
import type { DataSource } from 'typeorm';

export async function activate(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-seller-extension] Activating...');
  console.log('[cosmetics-seller-extension] Activation complete');
}

export default activate;
