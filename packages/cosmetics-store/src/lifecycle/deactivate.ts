/**
 * Cosmetics-Store Deactivate Hook
 *
 * Called when the app is deactivated
 */

import type { DataSource } from 'typeorm';

export interface DeactivateContext {
  dataSource: DataSource;
  organizationId?: string;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  console.log('[cosmetics-store] Deactivating...');

  // TODO: Unregister event handlers
  // TODO: Disable payment webhooks

  console.log('[cosmetics-store] Deactivation complete');
}

export default deactivate;
