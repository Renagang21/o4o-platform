import { defineConfig, devices } from '@playwright/test'

/**
 * O4O Platform E2E Testing Configuration
 * 관리자 인증 및 권한 제어 시스템 테스트를 위한 Playwright 설정
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: process.env.CI ? true : false,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev:api',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        DB_NAME: 'o4o_platform_test'
      }
    },
    {
      command: 'npm run dev:main-site',
      port: 3000, 
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev:admin',
      port: 3012,
      reuseExistingServer: !process.env.CI,
    }
  ],

  expect: {
    timeout: 10000,
  },
  
  timeout: 30000,
  
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
})