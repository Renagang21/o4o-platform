/**
 * LMS-Marketing Activate Hook
 *
 * Executed when the Marketing LMS extension is activated.
 */

import type { DataSource } from 'typeorm';

export interface ActivateContext {
  dataSource: DataSource;
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function onActivate(dataSource: DataSource): Promise<void> {
  console.log('[lms-marketing] Activating Marketing LMS Extension...');

  try {
    // Phase R5: No activation logic needed
    // Phase R6+: Initialize services, register event handlers, etc.

    console.log('[lms-marketing] Marketing LMS Extension activated successfully');
  } catch (error) {
    console.error('[lms-marketing] Activation failed:', error);
    throw error;
  }
}

// Default export for compatibility
export default onActivate;
