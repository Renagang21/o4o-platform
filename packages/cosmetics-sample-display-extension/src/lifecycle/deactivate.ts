/**
 * Cosmetics Sample Display Extension - Deactivate Hook
 */
import type { DataSource } from 'typeorm';

export async function deactivate(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-sample-display-extension] Deactivating...');
  console.log('[cosmetics-sample-display-extension] Deactivation complete');
}

export default deactivate;
