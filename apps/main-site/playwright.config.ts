import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정
 * SSO 인증 시스템 및 주요 사용자 플로우 테스트
 */
export default defineConfig({
  testDir: './src/test/e2e',
  
  // Playwright 실행 옵션
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // 리포터 설정
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  // 글로벌 설정
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // API 관련 설정
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },

  // 테스트 프로젝트 설정
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
    
    // 모바일 테스트 (선택적)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // 로컬 개발 서버 설정
  webServer: [
    // API 서버
    {
      command: 'cd ../api-server && npm run dev',
      url: 'http://localhost:4000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    // 웹 서버
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],

  // 테스트 환경 설정
  expect: {
    timeout: 10000,
  },

  // 테스트 타임아웃
  timeout: 30000,
  
  // 글로벌 셋업/티어다운
  globalSetup: './src/test/e2e/global-setup.ts',
  globalTeardown: './src/test/e2e/global-teardown.ts',
});