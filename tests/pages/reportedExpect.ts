import { test, expect, Locator } from '@playwright/test'

/**
 * Value comparisons that put BOTH sides in the step title, so a passing run in the
 * QA report still shows what was actually compared.
 */
async function actualText(locator: Locator): Promise<string> {
  const tag = await locator.evaluate((e) => e.tagName)
  const raw = ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) ? await locator.inputValue() : ((await locator.textContent()) ?? '')
  return raw.replace(/\s+/g, ' ').trim()
}

export async function expectFieldText(locator: Locator, expected: string, label: string) {
  const actual = await actualText(locator)
  await test.step(`${label}: expected "${expected}" — got "${actual}"`, async () => {
    expect(actual, label).toBe(expected)
  })
}

export async function expectFieldContains(locator: Locator, expected: string, label: string) {
  const actual = await actualText(locator)
  await test.step(`${label}: expected to contain "${expected}" — got "${actual}"`, async () => {
    expect(actual, label).toContain(expected)
  })
}

export async function expectFieldCount(locator: Locator, expected: number, label: string) {
  const actual = await locator.count()
  await test.step(`${label}: expected ${expected} — got ${actual}`, async () => {
    expect(actual, label).toBe(expected)
  })
}

export async function expectValue(actual: unknown, expected: unknown, label: string) {
  await test.step(`${label}: expected ${JSON.stringify(expected)} — got ${JSON.stringify(actual)}`, async () => {
    expect(actual, label).toEqual(expected)
  })
}
