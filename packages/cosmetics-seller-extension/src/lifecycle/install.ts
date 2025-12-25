/**
 * Cosmetics Seller Extension - Install Hook
 */
import type { DataSource } from 'typeorm';

export async function install(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-seller-extension] Installing...');
  console.log('[cosmetics-seller-extension] Tables: seller_displays, seller_samples, seller_inventory, seller_consultation_logs, seller_kpi');
  console.log('[cosmetics-seller-extension] Installation complete');
}

export default install;
