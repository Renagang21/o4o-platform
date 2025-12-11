/**
 * Auth-Core Activate Hook
 *
 * Called when the app is activated
 */

import type { DataSource } from 'typeorm';

export interface ActivateContext {
  dataSource: DataSource;
  organizationId?: string;
}

export async function activate(context: ActivateContext): Promise<void> {
  console.log('[auth-core] Activating...');

  // Auth-core is always active as it's a critical system component
  // No special activation logic needed

  console.log('[auth-core] Activation complete');
}

export default activate;
