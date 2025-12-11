/**
 * Auth-Core Deactivate Hook
 *
 * Called when the app is deactivated
 * Note: auth-core should generally not be deactivated as it's a critical system component
 */

import type { DataSource } from 'typeorm';

export interface DeactivateContext {
  dataSource: DataSource;
  organizationId?: string;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  console.log('[auth-core] Deactivating...');
  console.warn('[auth-core] Warning: Deactivating auth-core may break authentication!');

  // No cleanup needed - auth tables should remain intact

  console.log('[auth-core] Deactivation complete');
}

export default deactivate;
