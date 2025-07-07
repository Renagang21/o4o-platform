import { test, expect } from '@playwright/test';

test.describe('System Integration Tests', () => {
  test('API Server Health Check', async ({ page }) => {
    // Direct API health check
    const response = await page.request.get('http://localhost:4000/api/health');
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData).toMatchObject({
      status: 'ok',
      service: 'api-server-minimal',
      version: '1.0.0'
    });
  });

  test('Admin Dashboard Server Access', async ({ page }) => {
    // Check admin dashboard accessibility
    await page.goto('http://localhost:3001');
    await expect(page).toHaveTitle(/O4O Admin Dashboard/);
    
    // Check if main elements are present
    await expect(page.locator('h1')).toContainText('O4O Admin Dashboard');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[data-testid="login-button"]')).toBeVisible();
  });

  test('Basic Login Flow (Mock)', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Fill login form
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password');
    
    // Submit form
    await page.click('button[data-testid="login-button"]');
    
    // Check if dashboard view appears
    await expect(page.locator('[data-testid="user-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue"]')).toBeVisible();
  });

  test('API and Dashboard Communication', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Wait for API status check
    await page.waitForTimeout(2000);
    
    // Check if API status is shown as connected
    const apiStatus = await page.locator('#apiStatus').textContent();
    expect(apiStatus).toContain('Connected ✅');
  });

  test('Admin Dashboard Health Endpoint', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/health');
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData).toMatchObject({
      status: 'ok',
      service: 'admin-dashboard-mock',
      version: '1.0.0'
    });
  });
});