/**
 * Organization LMS Extension - Install Hook
 */
import type { DataSource } from 'typeorm';

export async function install(_dataSource: DataSource): Promise<void> {
  console.log('[organization-lms] Installing...');
  console.log('[organization-lms] No tables (integration extension)');
  console.log('[organization-lms] Installation complete');
}

export default install;
