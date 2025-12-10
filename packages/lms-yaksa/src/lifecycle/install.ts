/**
 * LMS-Yaksa Install Hook
 *
 * Called when the app is installed
 */

import type { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  organizationId?: string;
  config?: Record<string, any>;
}

export async function install(context: InstallContext): Promise<void> {
  console.log('[lms-yaksa] Installing...');

  // TODO: Create tables via migration
  // TODO: Initialize default certificate templates

  console.log('[lms-yaksa] Installation complete');
}

export default install;
