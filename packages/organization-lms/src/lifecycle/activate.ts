/**
 * Organization LMS Extension - Activate Hook
 */
import type { DataSource } from 'typeorm';

export async function activate(_dataSource: DataSource): Promise<void> {
  console.log('[organization-lms] Activating...');
  console.log('[organization-lms] Activation complete');
}

export default activate;
