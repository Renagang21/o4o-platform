/**
 * LMS-Core Deactivate Hook
 *
 * Called when the LMS-Core app is deactivated
 */

import { DataSource } from 'typeorm';

export async function onDeactivate(dataSource: DataSource): Promise<void> {
  console.log('[lms-core] Deactivating LMS Core...');

  // Unregister event handlers
  // Clean up runtime resources
  // Note: Database tables are NOT removed on deactivate

  console.log('[lms-core] LMS Core deactivated successfully');
}
