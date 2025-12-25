/**
 * Organization LMS Extension - Uninstall Hook
 */
import type { DataSource } from 'typeorm';

export async function uninstall(_dataSource: DataSource): Promise<void> {
  console.log('[organization-lms] Uninstalling...');
  console.log('[organization-lms] Uninstallation complete');
}

export default uninstall;
