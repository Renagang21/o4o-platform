import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "my-home.spec.ts",
  workers: 1,
  outputDir: "../../test-results/my-home",
  use: {
    baseURL: "http://127.0.0.1:4211",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
    screenshot: "only-on-failure",
  },
  projects: [1440, 375, 320].map((width) => ({
    name: `width-${width}`,
    use: { viewport: { width, height: 900 } },
  })),
  webServer: {
    command:
      "pnpm --fail-if-no-match --filter @o4o/web-neture exec vite preview --host 127.0.0.1 --port 4211 --strictPort",
    url: "http://127.0.0.1:4211",
    reuseExistingServer: true,
  },
});
