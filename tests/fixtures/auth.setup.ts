import { test as setup, Page } from '@playwright/test'
import dotenv from 'dotenv'
import { users, ROLES } from '../data/users'
import { LoginPage } from '../pages/spn/LoginPage'
dotenv.config()

/**
 * Browser Authentication Setup — one setup test per account.
 *
 * This file is auto-generated/updated by Kiro during UI test generation.
 * Kiro discovers the app's actual login flow via MCP Playwright and writes
 * the correct selectors and steps in `login()`.
 *
 * If you need to adjust manually:
 *   - Update selectors to match your app's login page
 *   - Ensure the post-login waitForURL pattern matches your app's redirect
 *   - Configure credentials via env vars in .env (never hardcode)
 *
 * Accounts (see data/users.ts):
 *   user1   TEST_USER_EMAIL   (or TEST_USER_USERNAME)   TEST_USER_PASSWORD     — required
 *   editor  TEST_EDITOR_EMAIL (or TEST_EDITOR_USERNAME) TEST_EDITOR_PASSWORD   — optional
 *   viewer  TEST_VIEWER_EMAIL (or TEST_VIEWER_USERNAME) TEST_VIEWER_PASSWORD   — optional
 *   LOGIN_URL (default: /login)
 *
 * Why one test per account: an account has ONE session — a new login replaces the
 * previous one. Each account is logged in by its own Playwright project (`setup`,
 * `setup-editor`, `setup-viewer` in playwright.config.ts) and saved to its own
 * storage-state file, so a login problem on an optional account never blocks the
 * single-user suites. Projects whose tests use an account list that account's setup
 * project in `dependencies`.
 *
 * Never retry a login that the app rejects as invalid credentials — repeated failures can
 * lock the account. A bounded retry is only for a race with another session of the same
 * account (see `playwright-coding-standards` → *Retrying a Whole Login Flow*).
 */

const LOGIN_URL = process.env.LOGIN_URL ?? 'login.php'

async function login(page: Page, user: { username: string; password: string }) {
  // ShippingNet Pluz+ (discovered on the live app): form post on login.php, then the
  // page turns into a shell with the content in iframe "infrm". The session is the
  // PHPSESSID cookie + UID/UCODE; the app keeps UCODE in localStorage
  // ("standard-<UID>-UCODE") and its pages redirect to wrong.php when it doesn't match.
  await new LoginPage(page).login(user.username, user.password)
}

for (const role of ROLES) {
  const user = users[role]
  setup(`authenticate ${role}`, async ({ page }) => {
    if (role === 'user1' && (!user.username || !user.password)) {
      throw new Error('Configure TEST_USER_USERNAME (or TEST_USER_EMAIL) and TEST_USER_PASSWORD in tests/.env')
    }
    setup.skip(!user.username, `${role} not configured in .env`)
    await page.goto(LOGIN_URL)
    await login(page, user)
    // Save authenticated state (one file per account)
    await page.context().storageState({ path: user.statePath })
  })
}
