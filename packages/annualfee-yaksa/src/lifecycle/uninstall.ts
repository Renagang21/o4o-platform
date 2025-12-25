/**
 * Annualfee Yaksa Extension - Uninstall Hook
 */
import type { DataSource } from 'typeorm';

export async function uninstall(_dataSource: DataSource): Promise<void> {
  console.log('[annualfee-yaksa] Uninstalling...');
  console.log('[annualfee-yaksa] Uninstallation complete');
}

export default uninstall;
