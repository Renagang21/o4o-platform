/**
 * Platform-Core Deactivate Hook
 *
 * Called when the app is deactivated
 * Note: platform-core should generally not be deactivated
 */

import type { DataSource } from 'typeorm';

export interface DeactivateContext {
  dataSource: DataSource;
  organizationId?: string;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  console.log('[platform-core] Deactivating...');
  console.warn('[platform-core] Warning: Deactivating platform-core may break platform functionality!');

  console.log('[platform-core] Deactivation complete');
}

export default deactivate;
