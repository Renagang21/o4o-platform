/**
 * LMS-Yaksa Activate Hook
 *
 * Called when the app is activated
 */

import type { DataSource } from 'typeorm';

export interface ActivateContext {
  dataSource: DataSource;
  organizationId?: string;
}

export async function activate(context: ActivateContext): Promise<void> {
  console.log('[lms-yaksa] Activating...');

  // TODO: Register event handlers
  // TODO: Enable scheduled tasks

  console.log('[lms-yaksa] Activation complete');
}

export default activate;
