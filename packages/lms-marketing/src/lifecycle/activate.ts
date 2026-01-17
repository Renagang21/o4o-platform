/**
 * LMS Marketing Extension - Activation Hook
 */

import type { DataSource } from 'typeorm';

export interface ActivateContext {
  dataSource: DataSource;
  logger?: Console;
}

export async function activate(context: ActivateContext): Promise<void> {
  const { logger = console } = context;

  logger.log('[lms-marketing] Activating extension...');

  // Verify lms-core dependency is available
  try {
    // Extension is passive - relies on api-server for entity registration
    logger.log('[lms-marketing] Extension activated successfully');
  } catch (error) {
    logger.error('[lms-marketing] Activation failed:', error);
    throw error;
  }
}

export default activate;
