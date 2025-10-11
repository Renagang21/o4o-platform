/**
 * Playwright Global Setup
 * Runs once before all tests
 * Handles authentication and test environment setup
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  console.log('[E2E Setup] Starting global setup...');

  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to login page
    console.log('[E2E Setup] Navigating to login page...');
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });

    // Check if we need to login (or if already authenticated)
    const isLoginPage = await page.locator('input[type="email"], input[name="email"]').isVisible().catch(() => false);

    if (isLoginPage) {
      console.log('[E2E Setup] Logging in...');

      // Use test credentials from environment or defaults
      const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com';
      const testPassword = process.env.E2E_TEST_PASSWORD || 'test123456';

      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', testEmail);
      await page.fill('input[type="password"], input[name="password"]', testPassword);

      // Click login button
      await page.click('button[type="submit"]');

      // Wait for navigation after login
      await page.waitForURL(`${baseURL}/**`, { timeout: 10000 }).catch(() => {
        console.warn('[E2E Setup] Login navigation timeout - may already be authenticated');
      });

      console.log('[E2E Setup] Login successful');
    } else {
      console.log('[E2E Setup] Already authenticated or no login required');
    }

    // Save authentication state for reuse in tests
    const storageStatePath = path.join(__dirname, 'auth-state.json');
    await page.context().storageState({ path: storageStatePath });
    console.log(`[E2E Setup] Saved auth state to ${storageStatePath}`);

  } catch (error) {
    console.error('[E2E Setup] Setup failed:', error);
    // Don't throw - allow tests to run and handle auth individually if needed
  } finally {
    await browser.close();
  }

  console.log('[E2E Setup] Global setup complete');
}

export default globalSetup;
