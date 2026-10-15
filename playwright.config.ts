import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';

loadEnv({ path: '.env' });

/**
 * End-to-end tests. By default they run against http://localhost:3000 (start the app first, or set
 * E2E_START_SERVER=1 to let Playwright run `npm run start`). To test a deployed site:
 *   E2E_BASE_URL=https://your-app.vercel.app DATABASE_URL=<that site's db url> npm run e2e
 * DATABASE_URL is only used to read invitation emails from the outbox table (no email inbox needed).
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const chromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const launchOptions = chromium ? { executablePath: chromium } : {};
// A deployed site is slower and less steady than localhost: allow more time and one retry.
const remote = !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(baseURL);

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: remote ? 120_000 : 60_000,
  expect: { timeout: remote ? 20_000 : 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI || remote ? 1 : 0,
  // Against a live site, stop after 10 failures instead of waiting out every timeout (set E2E_MAX_FAILURES=0 for no limit).
  maxFailures: remote ? Number(process.env.E2E_MAX_FAILURES ?? 10) || undefined : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: { baseURL, navigationTimeout: remote ? 60_000 : 30_000, actionTimeout: remote ? 30_000 : 0, trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions } },
    // Optional: E2E_ALL_BROWSERS=1 also runs Firefox and Safari's engine (first: npx playwright install firefox webkit).
    ...(process.env.E2E_ALL_BROWSERS
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 900 } } },
          { name: 'safari', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } } },
          { name: 'iphone', use: { ...devices['iPhone 14'] } },
        ]
      : []),
  ],
  webServer: process.env.E2E_START_SERVER ? { command: 'npm run start', url: baseURL, reuseExistingServer: true, timeout: 120_000 } : undefined,
});
