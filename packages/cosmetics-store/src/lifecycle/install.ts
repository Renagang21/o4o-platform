/**
 * Cosmetics-Store Install Hook
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
  console.log('[cosmetics-store] Installing...');

  // TODO: Create tables via migration
  // TODO: Initialize default categories
  // TODO: Setup default store settings

  console.log('[cosmetics-store] Installation complete');
}

export default install;
