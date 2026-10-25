import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "external-ai.spec.ts",
  workers: 1,
  reporter: "list",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3103",
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.O4O_TEST_CHROMIUM_PATH },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 3103 --strictPort",
    env: { VITE_API_BASE_URL: "http://127.0.0.1:3103" },
    url: "http://127.0.0.1:3103",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
