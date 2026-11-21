import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  retries: isCi ? 1 : 0,
  ...(isCi ? { workers: 1 } : {}),
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @route-cost/api dev',
      // The browser suite recalculates faster than the production per-IP limit allows. The guard is covered by apps/api/test/throttling.int.test.ts.
      env: { THROTTLING_ENABLED: 'false' },
      url: 'http://127.0.0.1:3001/api/v1/health/ready',
      reuseExistingServer: !isCi,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @route-cost/web dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !isCi,
      timeout: 120_000,
    },
  ],
});
