/**
 * Organization LMS Extension - Deactivate Hook
 */
import type { DataSource } from 'typeorm';

export async function deactivate(_dataSource: DataSource): Promise<void> {
  console.log('[organization-lms] Deactivating...');
  console.log('[organization-lms] Deactivation complete');
}

export default deactivate;
