/**
 * Signage Pharmacy Extension - Activate Hook
 */
import type { DataSource } from 'typeorm';

export async function activate(_dataSource: DataSource): Promise<void> {
  console.log('[signage-pharmacy-extension] Activating...');
  console.log('[signage-pharmacy-extension] Activation complete');
}

export default activate;
