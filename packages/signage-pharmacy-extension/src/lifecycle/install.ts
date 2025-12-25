/**
 * Signage Pharmacy Extension - Install Hook
 */
import type { DataSource } from 'typeorm';

export async function install(_dataSource: DataSource): Promise<void> {
  console.log('[signage-pharmacy-extension] Installing...');
  console.log('[signage-pharmacy-extension] No tables (uses digital-signage-core)');
  console.log('[signage-pharmacy-extension] Installation complete');
}

export default install;
