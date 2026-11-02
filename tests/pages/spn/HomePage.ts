import { Page, Locator } from '@playwright/test'
import { SpnSession } from './SpnApp'

/**
 * Home (home.php) — the "บริการหลัก" service cards. In the logged-in shell it is loaded
 * inside iframe "infrm"; tests open it directly with the saved UID/UCODE, which renders
 * the same page without logging in again (a new login would kill the saved session).
 */
export class HomePage {
  readonly page: Page
  readonly importCardTitle: Locator
  readonly viewImport: Locator

  constructor(page: Page) {
    this.page = page
    this.importCardTitle = page.getByRole('heading', { name: 'IMPORT', exact: true })
    this.viewImport = page.getByRole('link', { name: /VIEW IMPORT/ })
  }

  async open(session: SpnSession) {
    await this.page.goto(`home.php?UID=${session.uid}&UCODE=${session.ucode}`)
  }
}
