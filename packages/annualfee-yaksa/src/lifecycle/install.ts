/**
 * Annualfee Yaksa Extension - Install Hook
 */
import type { DataSource } from 'typeorm';

export async function install(_dataSource: DataSource): Promise<void> {
  console.log('[annualfee-yaksa] Installing...');
  console.log('[annualfee-yaksa] Tables: fee_policies, fee_invoices, fee_payments, fee_exemptions, fee_settlements, fee_logs');
  console.log('[annualfee-yaksa] Installation complete');
}

export default install;
