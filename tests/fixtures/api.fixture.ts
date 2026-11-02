import { test as base, APIRequestContext, APIResponse, request } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config()

/**
 * API Test Fixtures
 *
 * Provides pre-configured API request contexts for each Actor role.
 * All configuration is via environment variables — no hardcoded credentials or endpoints.
 *
 * Required env vars:
 *   API_BASE_URL          — API base URL (no default — must be set)
 *   AUTH_LOGIN_ENDPOINT   — login path (default: /auth/login)
 *   AUTH_TOKEN_FIELD      — token field in login response (default: access_token)
 *                           supports dot-notation for nested fields (e.g. data.token)
 *   AUTH_CREDENTIAL_FIELD — credential username field name sent in body (default: email)
 *
 *   TEST_USER_EMAIL (or TEST_USER_USERNAME) — user credentials
 *   TEST_USER_PASSWORD
 *   TEST_ADMIN_EMAIL (or TEST_ADMIN_USERNAME) — admin credentials
 *   TEST_ADMIN_PASSWORD
 */

// ─── Configuration ───────────────────────────────────────────────────

const BASE_URL = process.env.API_BASE_URL
if (!BASE_URL) {
  throw new Error('API_BASE_URL env var is required. Set it in .env file.')
}

const AUTH_LOGIN_ENDPOINT = process.env.AUTH_LOGIN_ENDPOINT ?? '/auth/login'
const AUTH_TOKEN_FIELD = process.env.AUTH_TOKEN_FIELD ?? 'access_token'
const AUTH_CREDENTIAL_FIELD = process.env.AUTH_CREDENTIAL_FIELD ?? 'email'

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Extract a value from a nested object using dot-notation path.
 * e.g. getNestedValue({ data: { token: 'abc' } }, 'data.token') → 'abc'
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

/**
 * Attach response details to the Playwright report for debugging.
 */
export async function attachResponse(response: APIResponse, label = 'API Response') {
  const status = response.status()
  const headers = response.headers()
  let body: string
  try {
    const json = await response.json()
    body = JSON.stringify(json, null, 2)
  } catch {
    body = await response.text()
  }

  const content = [
    `Status: ${status} ${response.statusText()}`,
    '',
    '--- Response Headers ---',
    ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
    '',
    '--- Response Body ---',
    body,
  ].join('\n')

  return { content, label }
}

async function createAuthenticatedClient(
  username: string,
  password: string
): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL: BASE_URL })
  const res = await context.post(AUTH_LOGIN_ENDPOINT, {
    data: { [AUTH_CREDENTIAL_FIELD]: username, password },
  })

  if (!res.ok()) {
    const text = await res.text()
    throw new Error(
      `Auth failed for ${username} at ${AUTH_LOGIN_ENDPOINT}: ${res.status()} ${text}`
    )
  }

  const json = await res.json()
  const token = getNestedValue(json, AUTH_TOKEN_FIELD)

  if (!token) {
    throw new Error(
      `Token not found at path "${AUTH_TOKEN_FIELD}" in login response: ${JSON.stringify(json)}`
    )
  }

  await context.dispose()

  return request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  })
}

// ─── Fixtures ────────────────────────────────────────────────────────

interface ApiFixtures {
  /** Guest — no authentication */
  api: APIRequestContext
  /** Authenticated as regular user */
  userApi: APIRequestContext
  /** Authenticated as admin */
  adminApi: APIRequestContext
}

export const test = base.extend<ApiFixtures>({
  api: async ({}, use) => {
    const context = await request.newContext({ baseURL: BASE_URL })
    await use(context)
    await context.dispose()
  },

  userApi: async ({}, use) => {
    const email = process.env.TEST_USER_EMAIL ?? process.env.TEST_USER_USERNAME
    const password = process.env.TEST_USER_PASSWORD
    if (!email || !password) {
      throw new Error('TEST_USER_EMAIL (or TEST_USER_USERNAME) and TEST_USER_PASSWORD are required.')
    }
    const context = await createAuthenticatedClient(email, password)
    await use(context)
    await context.dispose()
  },

  adminApi: async ({}, use) => {
    const email = process.env.TEST_ADMIN_EMAIL ?? process.env.TEST_ADMIN_USERNAME
    const password = process.env.TEST_ADMIN_PASSWORD
    if (!email || !password) {
      throw new Error(
        'TEST_ADMIN_EMAIL (or TEST_ADMIN_USERNAME) and TEST_ADMIN_PASSWORD are required.'
      )
    }
    const context = await createAuthenticatedClient(email, password)
    await use(context)
    await context.dispose()
  },
})

export { expect } from '@playwright/test'
