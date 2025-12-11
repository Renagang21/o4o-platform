/**
 * Forum-Yaksa Activate Hook
 *
 * Called when the app is activated
 */

import type { DataSource } from 'typeorm';

export interface ActivateContext {
  dataSource: DataSource;
  organizationId?: string;
}

export async function activate(context: ActivateContext): Promise<void> {
  console.log('[forum-yaksa] Activating...');

  // TODO: Register event handlers
  // TODO: Enable scheduled tasks

  console.log('[forum-yaksa] Activation complete');
}

export default activate;
