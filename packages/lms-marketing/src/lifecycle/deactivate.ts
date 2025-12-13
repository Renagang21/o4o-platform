/**
 * LMS-Marketing Deactivate Hook
 *
 * Executed when the Marketing LMS extension is deactivated.
 */

import type { DataSource } from 'typeorm';

export interface DeactivateContext {
  dataSource: DataSource;
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function onDeactivate(dataSource: DataSource): Promise<void> {
  console.log('[lms-marketing] Deactivating Marketing LMS Extension...');

  try {
    // Phase R5: No deactivation logic needed
    // Phase R6+: Cleanup services, unregister event handlers, etc.

    console.log('[lms-marketing] Marketing LMS Extension deactivated successfully');
  } catch (error) {
    console.error('[lms-marketing] Deactivation failed:', error);
    throw error;
  }
}

// Default export for compatibility
export default onDeactivate;
