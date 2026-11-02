import { Page, expect } from '@playwright/test'
import { GclWorkspacePage } from '../gcl/GclWorkspacePage'
export { GclWorkspacePage } from '../gcl/GclWorkspacePage'

/** Create GCL is exposed on an accepted Export workspace. It creates a linked document. */
export class ExportGclPage {
  constructor(readonly page: Page) {}
  links() { return this.page.getByRole('link').filter({ hasText: /^[A-Z]{4}4\d{8}$/ }) }
  async createOne() {
    await expect(this.links(), 'New Export has no GCL before creation').toHaveCount(0)
    await this.page.locator('input[name="insertGCL"]').fill('1')
    await this.page.locator('input[name="createGcl"]').click()
    await expect(this.links(), 'Create GCL produces exactly one linked reference').toHaveCount(1, { timeout: 60_000 })
    return (await this.links().innerText()).trim()
  }
  async open(reference: string) {
    const popup = this.page.waitForEvent('popup', { timeout: 3_000 }).catch(() => null)
    await this.links().filter({ hasText: reference }).click()
    const destination = await popup || this.page
    await destination.waitForLoadState('load')
    const gcl = new GclWorkspacePage(destination)
    await gcl.ready()
    return gcl
  }
}

