/**
 * LMS-Yaksa Deactivate Hook
 *
 * Called when the app is deactivated
 */

import type { DataSource } from 'typeorm';

export interface DeactivateContext {
  dataSource: DataSource;
  organizationId?: string;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  console.log('[lms-yaksa] Deactivating...');

  // TODO: Unregister event handlers
  // TODO: Disable scheduled tasks

  console.log('[lms-yaksa] Deactivation complete');
}

export default deactivate;
