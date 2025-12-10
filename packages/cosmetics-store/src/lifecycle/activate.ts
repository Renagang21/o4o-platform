/**
 * Cosmetics-Store Activate Hook
 *
 * Called when the app is activated
 */

import type { DataSource } from 'typeorm';

export interface ActivateContext {
  dataSource: DataSource;
  organizationId?: string;
}

export async function activate(context: ActivateContext): Promise<void> {
  console.log('[cosmetics-store] Activating...');

  // TODO: Register event handlers
  // TODO: Enable payment webhooks

  console.log('[cosmetics-store] Activation complete');
}

export default activate;
