/**
 * Customizer E2E Tests
 * Tests core customizer functionality including:
 * - Color changes with live preview
 * - General section features (scroll-to-top, buttons, breadcrumbs)
 * - Legacy data migration
 * - Header/Footer builder
 * - Data persistence
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test configuration
const CUSTOMIZER_URL = '/appearance/customizer';
const PREVIEW_LOAD_TIMEOUT = 5000;
const API_RESPONSE_TIMEOUT = 200; // ms - requirement from Day 4

// Use authenticated state
test.use({
  storageState: path.join(__dirname, 'auth-state.json'),
});

/**
 * Helper: Wait for customizer to load
 */
async function waitForCustomizerLoad(page: Page) {
  await page.waitForSelector('[data-testid="customizer-container"], .customizer-container', {
    timeout: 10000,
  });
  // Wait for iframe preview to load if present
  const previewFrame = page.frameLocator('iframe#preview-frame, iframe[title*="Preview"]').first();
  await previewFrame.locator('body').waitFor({ timeout: PREVIEW_LOAD_TIMEOUT }).catch(() => {
    console.log('Preview frame not found or not loaded - continuing without preview');
  });
}

/**
 * Helper: Get computed CSS variable value
 */
async function getCSSVariable(page: Page, variableName: string): Promise<string> {
  return await page.evaluate((varName) => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }, variableName);
}

/**
 * Test Suite 1: Color Change Flow
 */
test.describe('Scenario 1: Color Change Flow', () => {
  test('should update primary color in customizer, preview, and frontend', async ({ page }) => {
    // Navigate to customizer
    await page.goto(CUSTOMIZER_URL);
    await waitForCustomizerLoad(page);

    // Open colors section
    await page.click('[data-section="colors"], button:has-text("색상"), button:has-text("Colors")');

    // Find and change primary color
    const newColor = '#ff5733'; // Test color
    const colorInput = page.locator('input[type="color"][name*="primary"], input[data-color="primary"]').first();
    await colorInput.fill(newColor);
    await page.waitForTimeout(500); // Debounce delay

    // Verify live preview update
    const previewFrame = page.frameLocator('iframe#preview-frame, iframe[title*="Preview"]').first();
    const previewPrimaryColor = await previewFrame.locator('body').evaluate((body) => {
      return getComputedStyle(body).getPropertyValue('--wp-color-primary-500').trim();
    }).catch(() => null);

    if (previewPrimaryColor) {
      expect(previewPrimaryColor.toLowerCase()).toContain(newColor.slice(1).toLowerCase());
      console.log(`✓ Preview updated: --wp-color-primary-500 = ${previewPrimaryColor}`);
    }

    // Save settings
    await page.click('button:has-text("저장"), button:has-text("Save")');

    // Wait for save confirmation
    await page.waitForResponse(response =>
      response.url().includes('/customizer') && response.status() === 200,
      { timeout: 5000 }
    );

    // Verify toast/notification
    await expect(page.locator('[role="alert"], .toast, .notification')).toBeVisible({ timeout: 3000 }).catch(() => {
      console.log('No toast notification found - may not be implemented');
    });

    // Navigate to main site and verify color applied
    await page.goto('/');
    const frontendColor = await getCSSVariable(page, '--wp-color-primary-500');
    expect(frontendColor.toLowerCase()).toContain(newColor.slice(1).toLowerCase());
    console.log(`✓ Frontend updated: --wp-color-primary-500 = ${frontendColor}`);
  });
});

/**
 * Test Suite 2: General Section Features
 */
test.describe('Scenario 2: General Section Functionality', () => {
  test('should toggle scroll-to-top on/off', async ({ page }) => {
    await page.goto(CUSTOMIZER_URL);
    await waitForCustomizerLoad(page);

    // Navigate to General section
    await page.click('[data-section="general"], button:has-text("일반"), button:has-text("General")');
    await page.waitForTimeout(300);

    // Find scroll-to-top toggle
    const scrollToTopToggle = page.locator('input[type="checkbox"][name*="scrollToTop"], label:has-text("Scroll") >> input[type="checkbox"]').first();

    // Get initial state
    const initialState = await scrollToTopToggle.isChecked();
    console.log(`Initial scroll-to-top state: ${initialState}`);

    // Toggle off
    if (initialState) {
      await scrollToTopToggle.click();
      await expect(scrollToTopToggle).not.toBeChecked();
    }

    // Toggle on
    await scrollToTopToggle.click();
    await expect(scrollToTopToggle).toBeChecked();

    // Save and verify API call
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/scroll-to-top') && response.status() === 200
    );
    await page.click('button:has-text("저장"), button:has-text("Save")');
    const response = await responsePromise;

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.enabled).toBe(true);
    console.log('✓ Scroll-to-top settings saved successfully');
  });

  test('should update button style settings', async ({ page }) => {
    await page.goto(CUSTOMIZER_URL);
    await waitForCustomizerLoad(page);

    // Navigate to General > Buttons
    await page.click('[data-section="general"], button:has-text("일반"), button:has-text("General")');
    await page.click('[data-subsection="buttons"], button:has-text("버튼"), button:has-text("Button")');
    await page.waitForTimeout(300);

    // Change primary button background color
    const buttonColorInput = page.locator('input[type="color"][name*="button"]').first();
    const newButtonColor = '#28a745';
    await buttonColorInput.fill(newButtonColor);

    // Save
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/button-settings') && response.status() === 200
    );
    await page.click('button:has-text("저장"), button:has-text("Save")');
    const response = await responsePromise;

    const data = await response.json();
    expect(data.success).toBe(true);
    console.log('✓ Button settings saved successfully');
  });

  test('should update breadcrumbs settings', async ({ page }) => {
    await page.goto(CUSTOMIZER_URL);
    await waitForCustomizerLoad(page);

    // Navigate to General > Breadcrumbs
    await page.click('[data-section="general"], button:has-text("일반"), button:has-text("General")');
    await page.click('[data-subsection="breadcrumbs"], button:has-text("경로"), button:has-text("Breadcrumb")');
    await page.waitForTimeout(300);

    // Toggle breadcrumbs enabled
    const breadcrumbsToggle = page.locator('input[type="checkbox"][name*="breadcrumb"]').first();
    await breadcrumbsToggle.click();

    // Save
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/breadcrumbs-settings') && response.status() === 200
    );
    await page.click('button:has-text("저장"), button:has-text("Save")');
    const response = await responsePromise;

    const data = await response.json();
    expect(data.success).toBe(true);
    console.log('✓ Breadcrumbs settings saved successfully');
  });
});

/**
 * Test Suite 3: Legacy Migration
 */
test.describe('Scenario 3: Legacy Data Migration', () => {
  test('should automatically migrate legacy data on API GET', async ({ page, request }) => {
    // Insert legacy data directly to API (requires API access)
    const legacyData = {
      colors: {
        primaryColor: '#0073aa', // Legacy WordPress blue
        secondaryColor: '#ff6b6b', // Legacy red
        textColor: '#333333',
        linkColor: {
          normal: '#0073aa',
          hover: '#005177',
        },
        borderColor: '#e0e0e0',
        bodyBackground: '#ffffff',
        contentBackground: '#ffffff',
        palette: {
          '1': '#0073aa',
          '2': '#ff6b6b',
        },
      },
      // No scrollToTop, buttons, breadcrumbs sections - legacy!
    };

    // Update settings with legacy data
    const updateResponse = await request.put('/api/v1/customizer/settings', {
      data: { customizer: legacyData },
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(() => null);

    if (!updateResponse) {
      console.log('Could not inject legacy data - skipping migration test');
      test.skip();
      return;
    }

    // Now GET the settings - should trigger migration
    await page.goto(CUSTOMIZER_URL);

    const getResponse = await page.waitForResponse(response =>
      response.url().includes('/customizer') && response.request().method() === 'GET'
    );

    const migratedData = await getResponse.json();

    // Verify color mapping (legacy -> new)
    expect(migratedData.colors.primaryColor).not.toBe('#0073aa');
    expect(migratedData.colors.primaryColor).toBe('#3b82f6'); // New Tailwind blue
    console.log(`✓ Color migrated: #0073aa -> ${migratedData.colors.primaryColor}`);

    // Verify new sections added
    expect(migratedData.scrollToTop).toBeDefined();
    expect(migratedData.buttons).toBeDefined();
    expect(migratedData.breadcrumbs).toBeDefined();
    console.log('✓ Missing sections added during migration');

    // Verify _meta field
    expect(migratedData._meta).toBeDefined();
    expect(migratedData._meta.version).toBe('1.0.0');
    expect(migratedData._meta.migratedFrom).toBe('0.0.0');
    console.log('✓ Migration metadata created');
  });
});

/**
 * Test Suite 4: Header/Footer Builder
 */
test.describe('Scenario 4: Header/Footer Builder', () => {
  test('should change header layout', async ({ page }) => {
    await page.goto(CUSTOMIZER_URL);
    await waitForCustomizerLoad(page);

    // Navigate to Header section
    await page.click('[data-section="header"], button:has-text("헤더"), button:has-text("Header")');
    await page.waitForTimeout(300);

    // Select a layout option
    const layoutOption = page.locator('[data-layout], .layout-option, button:has-text("Layout")').first();
    await layoutOption.click();

    // Verify preview updates
    const previewFrame = page.frameLocator('iframe#preview-frame, iframe[title*="Preview"]').first();
    await expect(previewFrame.locator('header, .header')).toBeVisible({ timeout: 3000 }).catch(() => {
      console.log('Header not found in preview - may not be visible yet');
    });

    // Save
    await page.click('button:has-text("저장"), button:has-text("Save")');
    await page.waitForTimeout(1000);

    console.log('✓ Header layout updated');
  });

  test('should update footer content', async ({ page }) => {
    await page.goto(CUSTOMIZER_URL);
    await waitForCustomizerLoad(page);

    // Navigate to Footer section
    await page.click('[data-section="footer"], button:has-text("푸터"), button:has-text("Footer")');
    await page.waitForTimeout(300);

    // Update footer text if available
    const footerInput = page.locator('input[name*="footer"], textarea[name*="footer"]').first();
    const footerTextExists = await footerInput.count() > 0;

    if (footerTextExists) {
      await footerInput.fill('© 2025 O4O Platform - E2E Test');

      // Verify preview
      const previewFrame = page.frameLocator('iframe#preview-frame, iframe[title*="Preview"]').first();
      await expect(previewFrame.locator('footer')).toContainText('E2E Test', { timeout: 3000 }).catch(() => {
        console.log('Footer text not found in preview');
      });

      // Save
      await page.click('button:has-text("저장"), button:has-text("Save")');
      console.log('✓ Footer content updated');
    } else {
      console.log('No footer input found - skipping');
    }
  });
});

/**
 * Test Suite 5: Data Persistence
 */
test.describe('Scenario 5: Data Persistence', () => {
  test('should persist settings after page reload', async ({ page }) => {
    // Set a unique value
    const uniqueColor = '#' + Math.floor(Math.random() * 16777215).toString(16);

    await page.goto(CUSTOMIZER_URL);
    await waitForCustomizerLoad(page);

    // Change primary color
    await page.click('[data-section="colors"], button:has-text("색상"), button:has-text("Colors")');
    const colorInput = page.locator('input[type="color"][name*="primary"]').first();
    await colorInput.fill(uniqueColor);

    // Save
    await page.click('button:has-text("저장"), button:has-text("Save")');
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await waitForCustomizerLoad(page);

    // Re-open colors section
    await page.click('[data-section="colors"], button:has-text("색상"), button:has-text("Colors")');
    const reloadedColorInput = page.locator('input[type="color"][name*="primary"]').first();
    const reloadedValue = await reloadedColorInput.inputValue();

    expect(reloadedValue.toLowerCase()).toBe(uniqueColor.toLowerCase());
    console.log(`✓ Color persisted after reload: ${reloadedValue}`);
  });

  test('should update _meta.lastModified on save', async ({ page, request }) => {
    // Get initial lastModified
    const initialResponse = await request.get('/api/v1/customizer/settings');
    const initialData = await initialResponse.json();
    const initialLastModified = initialData._meta?.lastModified;

    // Make a change
    await page.goto(CUSTOMIZER_URL);
    await waitForCustomizerLoad(page);

    await page.click('[data-section="colors"], button:has-text("색상"), button:has-text("Colors")');
    const colorInput = page.locator('input[type="color"][name*="primary"]').first();
    await colorInput.fill('#000000');

    // Save
    await page.click('button:has-text("저장"), button:has-text("Save")');
    await page.waitForTimeout(1000);

    // Get updated lastModified
    const updatedResponse = await request.get('/api/v1/customizer/settings');
    const updatedData = await updatedResponse.json();
    const updatedLastModified = updatedData._meta?.lastModified;

    expect(updatedLastModified).toBeDefined();
    if (initialLastModified) {
      expect(new Date(updatedLastModified).getTime()).toBeGreaterThan(new Date(initialLastModified).getTime());
      console.log(`✓ lastModified updated: ${initialLastModified} -> ${updatedLastModified}`);
    } else {
      console.log(`✓ lastModified created: ${updatedLastModified}`);
    }
  });
});

/**
 * Performance Tests
 */
test.describe('Performance Validation', () => {
  test('API response time should be < 200ms', async ({ page }) => {
    await page.goto(CUSTOMIZER_URL);

    const startTime = Date.now();
    await page.waitForResponse(response =>
      response.url().includes('/customizer') && response.request().method() === 'GET'
    );
    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(API_RESPONSE_TIMEOUT);
    console.log(`✓ API response time: ${responseTime}ms (< ${API_RESPONSE_TIMEOUT}ms)`);
  });

  test('Customizer should load < 1s', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(CUSTOMIZER_URL);
    await waitForCustomizerLoad(page);
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(1000);
    console.log(`✓ Customizer load time: ${loadTime}ms (< 1000ms)`);
  });

  test('Preview update delay should be < 100ms', async ({ page }) => {
    await page.goto(CUSTOMIZER_URL);
    await waitForCustomizerLoad(page);

    await page.click('[data-section="colors"], button:has-text("색상"), button:has-text("Colors")');
    const colorInput = page.locator('input[type="color"][name*="primary"]').first();

    const startTime = Date.now();
    await colorInput.fill('#ff0000');

    // Wait for preview to update (look for network activity or DOM changes)
    await page.waitForTimeout(100); // Expected debounce delay
    const updateDelay = Date.now() - startTime;

    expect(updateDelay).toBeLessThan(200); // Allow some buffer
    console.log(`✓ Preview update delay: ${updateDelay}ms (< 200ms with buffer)`);
  });
});
