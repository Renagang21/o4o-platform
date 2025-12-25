/**
 * Annualfee Yaksa Extension - Activate Hook
 */
import type { DataSource } from 'typeorm';

export async function activate(_dataSource: DataSource): Promise<void> {
  console.log('[annualfee-yaksa] Activating...');
  console.log('[annualfee-yaksa] Activation complete');
}

export default activate;
