/**
 * Cosmetics Sample Display Extension - Activate Hook
 */
import type { DataSource } from 'typeorm';

export async function activate(_dataSource: DataSource): Promise<void> {
  console.log('[cosmetics-sample-display-extension] Activating...');
  console.log('[cosmetics-sample-display-extension] Activation complete');
}

export default activate;
