import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e/improvements',
  workers: 1,
  use: { baseURL: 'http://community.neture.co.kr:3103', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 3103 --strictPort',
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:3103' },
    url: 'http://127.0.0.1:3103', reuseExistingServer: false,
  },
});
