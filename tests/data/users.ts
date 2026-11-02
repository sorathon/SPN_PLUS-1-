import dotenv from 'dotenv'
dotenv.config()

/**
 * Test accounts for UI tests. Credentials come from .env — never hardcode secrets.
 *
 * `user1` is the primary account (the one `storageState` in the Playwright projects
 * uses). `editor` and `viewer` are OPTIONAL extra accounts for flows that need a
 * second / third person — e.g. a share recipient with full access, and one with
 * view-only access. Leave their env vars unset and their setup tests skip
 * themselves. Rename or re-describe the roles to fit the app.
 *
 * One account = ONE session: logging an account in again replaces its previous
 * session everywhere. So each account has its own setup project and its own
 * storage-state file — see `playwright-coding-standards` → *More than one
 * account in one test*.
 */
export const users = {
  user1: {
    username: process.env.TEST_USER_EMAIL ?? process.env.TEST_USER_USERNAME ?? '',
    password: process.env.TEST_USER_PASSWORD ?? '',
    statePath: 'playwright/.auth/user.json',
  },
  editor: {
    username: process.env.TEST_EDITOR_EMAIL ?? process.env.TEST_EDITOR_USERNAME ?? '',
    password: process.env.TEST_EDITOR_PASSWORD ?? '',
    statePath: 'playwright/.auth/editor.json',
  },
  viewer: {
    username: process.env.TEST_VIEWER_EMAIL ?? process.env.TEST_VIEWER_USERNAME ?? '',
    password: process.env.TEST_VIEWER_PASSWORD ?? '',
    statePath: 'playwright/.auth/viewer.json',
  },
} as const

export type UserRole = keyof typeof users
export const ROLES = Object.keys(users) as UserRole[]
