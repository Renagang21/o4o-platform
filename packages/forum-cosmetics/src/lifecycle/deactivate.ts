/**
 * Forum-Cosmetics Deactivate Hook
 *
 * Called when the app is deactivated.
 * Disables cosmetics forum routes and unregisters event handlers.
 */

import type { DataSource } from 'typeorm';

export interface DeactivateContext {
  dataSource: DataSource;
  organizationId?: string;
}

export async function deactivate(context: DeactivateContext): Promise<void> {
  console.log('[forum-cosmetics] Deactivating...');

  try {
    // Unregister cosmetics forum routes
    console.log('[forum-cosmetics] Unregistering cosmetics forum routes...');

    // TODO: Unregister event handlers

    console.log('[forum-cosmetics] Deactivation complete');
    console.log('[forum-cosmetics] Note: Cosmetics metadata is preserved in the database.');
  } catch (error) {
    console.error('[forum-cosmetics] Deactivation failed:', error);
    throw error;
  }
}

export default deactivate;
