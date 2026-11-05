import { defineConfig, devices } from '@playwright/test';

/**
 * Real Fabric e2e against the demo host.
 * Default: Chromium. Also: Firefox + WebKit (Safari engine).
 * Playwright is a development dependency only (no runtime impact).
 *
 * Examples:
 *   npm run test:e2e
 *   npm run test:e2e -- --project=firefox
 *   npm run test:e2e -- --project=webkit
 *   npm run test:e2e:browsers
 */
const e2ePort = process.env['E2E_PORT'] ?? (process.env['E2E_CSP'] === '1' ? '4201' : '4200');
const e2eBaseUrl = process.env['E2E_BASE_URL'] ?? `http://127.0.0.1:${e2ePort}`;
const e2eCsp = process.env['E2E_CSP'] === '1';

export default defineConfig({
  testDir: './e2e',
  testMatch: e2eCsp
    ? '**/h-g04-csp.spec.ts'
    : [
        '**/h-g04.spec.ts',
        '**/ux-i1.spec.ts',
        '**/ux-i2.spec.ts',
        '**/ux-i3.spec.ts',
        '**/ux-i4.spec.ts',
        '**/ux-i5.spec.ts',
        '**/plugin-lazy-load.spec.ts',
        '**/stickers.spec.ts',
        '**/exposure-sharpen.spec.ts',
        '**/compare-original.spec.ts',
        '**/webp-stage-background.spec.ts',
        '**/multi-select-group.spec.ts',
        '**/global-z-order.spec.ts',
      ],
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
  },
  webServer: {
    command: e2eCsp
      ? `npx ng serve demo --configuration=csp --host 127.0.0.1 --port ${e2ePort}`
      : `npx ng serve demo --host 127.0.0.1 --port ${e2ePort}`,
    url: e2eBaseUrl,
    reuseExistingServer: !process.env['CI'] && !process.env['E2E_PORT'],
    timeout: 180_000,
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
  ],
});
