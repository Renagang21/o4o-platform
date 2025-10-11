/**
 * Playwright Global Teardown
 * Runs once after all tests complete
 * Cleans up test environment
 */

import { FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalTeardown(config: FullConfig) {
  console.log('[E2E Teardown] Starting global teardown...');

  try {
    // Clean up auth state file
    const storageStatePath = path.join(__dirname, 'auth-state.json');
    if (fs.existsSync(storageStatePath)) {
      fs.unlinkSync(storageStatePath);
      console.log('[E2E Teardown] Cleaned up auth state file');
    }

    // Add any other cleanup tasks here
    // e.g., reset test database, clean up test files, etc.

  } catch (error) {
    console.error('[E2E Teardown] Teardown error:', error);
  }

  console.log('[E2E Teardown] Global teardown complete');
}

export default globalTeardown;
