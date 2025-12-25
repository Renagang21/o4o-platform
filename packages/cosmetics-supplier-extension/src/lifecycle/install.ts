/**
 * Cosmetics Supplier Extension - Install Hook
 */
import type { DataSource } from 'typeorm';

export async function install(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-supplier-extension] Installing...');
  console.log('[cosmetics-supplier-extension] Tables: supplier_profiles, price_policies, sample_supplies, supplier_approvals, supplier_campaigns');
  console.log('[cosmetics-supplier-extension] Installation complete');
}

export default install;
