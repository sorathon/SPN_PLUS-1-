import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
dotenv.config()

// Windows sandbox environments can redirect LOCALAPPDATA away from the installed browsers.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && process.platform === 'win32' && process.env.USERPROFILE) {
  const cache = path.join(process.env.USERPROFILE, 'AppData', 'Local', 'ms-playwright')
  if (fs.existsSync(cache)) process.env.PLAYWRIGHT_BROWSERS_PATH = cache
}

export default defineConfig({
  testDir: '.',
  outputDir: process.env.PW_OUTPUT_DIR || 'test-results',
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { outputFolder: process.env.PW_HTML_DIR || 'playwright-report', open: 'never' }],
    ['json', { outputFile: process.env.PW_RESULTS_FILE || 'test-results/results.json' }],
    ['list'],
    ['./scripts/qa-hooks-reporter.js'],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // SLOW_MO=<ms> pauses after every click/type/select so a headed run can be followed
    // by eye (`npm run test:import:watch` = headed + 500 ms). Unset = full speed.
    launchOptions: { slowMo: Number(process.env.SLOW_MO) || 0 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: 'fixtures/auth.setup.ts',
      grep: /authenticate user1/,
      use: {
        baseURL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
      },
    },
    // Optional extra accounts (a share recipient, an approver) — one setup project each,
    // so a login problem on them never skips the single-user suites. An account has ONE
    // session (a new login replaces the old one), so projects whose tests use an account
    // list its setup project in `dependencies` and the account is logged in right before
    // the run. Unset the account's env vars (data/users.ts) and its setup test skips itself.
    {
      name: 'setup-editor',
      testMatch: 'fixtures/auth.setup.ts',
      grep: /authenticate editor/,
      use: {
        baseURL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
      },
    },
    {
      name: 'setup-viewer',
      testMatch: 'fixtures/auth.setup.ts',
      grep: /authenticate viewer/,
      use: {
        baseURL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
      },
    },
    {
      name: 'api',
      testMatch: 'api/**/*.api.spec.ts',
      use: {
        baseURL: process.env.API_BASE_URL ?? 'http://localhost:3000',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      },
    },
    {
      name: 'functional',
      testMatch: 'functional/**/*.spec.ts',
      testIgnore: ['functional/export/**/*.spec.ts', 'functional/gcl/**/*.spec.ts'],
      dependencies: ['setup', 'setup-editor', 'setup-viewer'],
      use: {
        browserName: 'chromium',
        baseURL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
        storageState: 'playwright/.auth/user.json',
        // Bound every action. With Playwright's default (0 = no limit) a click on
        // an element that vanished mid-action waits out the WHOLE test budget —
        // a stuck cleanup step then fails an otherwise passing test.
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
      },
    },
    // Export is selected explicitly, separately from Import functional runs.
    {
      name: 'export',
      testMatch: 'functional/export/**/*.spec.ts',
      dependencies: ['setup', 'setup-editor', 'setup-viewer'],
      use: {
        browserName: 'chromium',
        baseURL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
        storageState: 'playwright/.auth/user.json',
        actionTimeout: 45_000,
        navigationTimeout: 90_000,
      },
    },
    {
      name: 'gcl',
      testMatch: 'functional/gcl/**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        browserName: 'chromium',
        baseURL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
        storageState: 'playwright/.auth/user.json',
        actionTimeout: 45_000,
        navigationTimeout: 90_000,
      },
    },
    // Journeys that chain several features/scenarios end to end (tests/e2e/**).
    // Kept apart from `functional` so the QA report types them as E2E and they
    // can be run on their own (`npm run test:e2e`).
    {
      name: 'e2e',
      testMatch: 'e2e/**/*.spec.ts',
      dependencies: ['setup', 'setup-editor', 'setup-viewer'],
      use: {
        browserName: 'chromium',
        baseURL: process.env.APP_BASE_URL ?? 'http://localhost:3000',
        storageState: 'playwright/.auth/user.json',
        // Same action/navigation bounds as `functional` (see the note there).
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
      },
    },
  ],
})
