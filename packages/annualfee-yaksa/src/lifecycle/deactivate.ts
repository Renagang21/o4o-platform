/**
 * Annualfee Yaksa Extension - Deactivate Hook
 */
import type { DataSource } from 'typeorm';

export async function deactivate(_dataSource: DataSource): Promise<void> {
  console.log('[annualfee-yaksa] Deactivating...');
  console.log('[annualfee-yaksa] Deactivation complete');
}

export default deactivate;
