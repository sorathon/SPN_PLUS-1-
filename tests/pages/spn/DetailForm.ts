import { Page, Locator, FrameLocator } from '@playwright/test'

/**
 * Name-based access to the `ins_*` fields of the form shown in the workspace iframe
 * "detailfrm" (header, invoice and item forms of both Import and Export). Used where a
 * test needs many fields generically — reading every numeric field of an item, setting
 * invoice charges — instead of one locator per field.
 *
 * Several forms write a field twice (one variant per state) and hide one of them; the
 * visible one is the live field, otherwise the first.
 */
export class DetailForm {
  readonly page: Page
  readonly detail: FrameLocator

  constructor(page: Page) {
    this.page = page
    this.detail = page.frameLocator('#detailfrm')
  }

  /** The live (visible) element named `ins_<name>` (input, select or textarea) — for typing. */
  field(name: string): Locator {
    return this.detail.locator(`[name="ins_${name}"]:visible`).first()
  }

  /**
   * Current value of each `ins_<name>`; a field the form doesn't have is left out of the
   * result (so a caller can tell "not on this form" from "empty").
   */
  async read(names: readonly string[]): Promise<Record<string, string>> {
    const frame = this.page.frame({ name: 'detailfrm' })
    if (!frame) throw new Error('detail frame not found')
    return frame.evaluate((list) => {
      const out: Record<string, string> = {}
      for (const n of list) {
        const els = [...document.querySelectorAll<HTMLInputElement>(`[name="ins_${n}"]`)].filter((e) => e.type !== 'radio' && e.type !== 'checkbox')
        if (els.length === 0) continue
        const live = els.find((e) => e.offsetParent !== null) ?? els[0]
        out[n] = (live.value ?? '').trim()
      }
      return out
    }, names as string[])
  }

  /** Value of the checked radio of group `ins_<name>` ('' when none is checked). */
  async radioValue(name: string): Promise<string> {
    const frame = this.page.frame({ name: 'detailfrm' })
    if (!frame) throw new Error('detail frame not found')
    return frame.evaluate((n) => document.querySelector<HTMLInputElement>(`input[type=radio][name="ins_${n}"]:checked`)?.value ?? '', name)
  }

  async fill(name: string, value: string) {
    const f = this.field(name)
    await f.fill(value)
    // the forms recalculate and mark the form dirty (changeDetection) on change/blur
    await f.dispatchEvent('change')
    await f.press('Tab')
  }

  async select(name: string, value: string) {
    await this.field(name).selectOption(value)
  }

  async checkRadio(name: string, value: string) {
    await this.detail.locator(`input[type=radio][name="ins_${name}"][value="${value}"]`).first().check()
  }

  /** Whole text of the detail frame (process results, error pages). */
  async text(): Promise<string> {
    return this.detail.locator('body').innerText()
  }
}
