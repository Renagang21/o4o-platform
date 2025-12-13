/**
 * LMS-Marketing Install Hook
 *
 * Executed when the Marketing LMS extension is installed.
 * Phase R5: Bootstrap - no tables to create
 * Phase R6+: May add marketing-specific tables
 */

import type { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function onInstall(dataSource: DataSource): Promise<void> {
  console.log('[lms-marketing] Installing Marketing LMS Extension...');

  try {
    // Phase R5: No custom tables
    // This extension uses LMS-Core tables (ContentBundle, Quiz, Survey, EngagementLog)

    console.log('[lms-marketing] Marketing LMS Extension installed successfully');
    console.log('[lms-marketing] Features (Phase R5 Bootstrap):');
    console.log('  - Health check endpoint');
    console.log('  - Hook placeholders for R6-R9');
    console.log('[lms-marketing] Pending Features:');
    console.log('  - Phase R6: Product Info Delivery');
    console.log('  - Phase R7: Quiz Campaign Module');
    console.log('  - Phase R8: Survey Campaign Module');
    console.log('  - Phase R9: Engagement Analytics Dashboard');
  } catch (error) {
    console.error('[lms-marketing] Installation failed:', error);
    throw error;
  }
}

// Default export for compatibility
export default onInstall;
