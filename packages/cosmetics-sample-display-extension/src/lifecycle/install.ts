/**
 * Cosmetics Sample Display Extension - Install Hook
 */
import type { DataSource } from 'typeorm';

export async function install(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-sample-display-extension] Installing...');
  console.log('[cosmetics-sample-display-extension] Installation complete');
}

export default install;
