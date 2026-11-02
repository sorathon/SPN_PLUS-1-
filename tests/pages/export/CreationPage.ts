import { expect, Locator, Page } from '@playwright/test'
import { ExportListPage, ExportWorkspacePage } from './DeclarationPages'
import { SpnSession, waitForReload } from '../spn/SpnApp'


/** Observed on the support UI: this Job No plus Re-Avg assigns a declaration no. */
export const FORCE_EXPORT_DECLARATION_JOB = 'give me decl no'
export const EXPORT_ACCEPT_STATUS = 'ACCEPT'

/** Creation/status workflow observed in reports/export-exploration, not an Import clone. */
export class ExportCreationPage {
  readonly list: ExportListPage
  readonly workspace: ExportWorkspacePage
  readonly heading: Locator
  readonly rows: Locator

  constructor(readonly page: Page) {
    this.list = new ExportListPage(page)
    this.workspace = new ExportWorkspacePage(page)
    this.heading = page.getByText('Export Declaration', { exact: true })
    this.rows = page.locator('tr').filter({ has: page.locator('input[name="SELITEM[]"]') })
  }

  async openList(session: SpnSession) {
    await this.list.open(session)
    await expect(this.heading).toBeVisible()
  }

  async createDraft(session: SpnSession) {
    await this.openList(session)
    await this.list.createNew()
    await this.workspace.waitForDetail()
    const referenceNo = (await this.workspace.referenceNo.innerText()).trim()
    const id = this.workspace.idFromUrl()
    return { id, referenceNo }
  }

  row(referenceNo: string) {
    return this.rows.filter({ has: this.page.getByText(referenceNo, { exact: true }) })
  }

  /** Export column order differs from Import: CREATE DATE is before DECLARATION NO. */
  cell(row: Locator, name: 'reference' | 'job' | 'created' | 'declaration' | 'declStatus') {
    const indexes = { reference: 2, job: 3, created: 4, declaration: 5, declStatus: 14 }
    return row.locator(':scope > td').nth(indexes[name])
  }

  async searchReference(referenceNo: string) {
    await this.page.locator('input[name="sREF"]').fill(referenceNo)
    await waitForReload(this.page, () => this.page.locator('#refreshBTN').click())
  }

  async returnToList() {
    await waitForReload(this.page, () => this.page.getByText('Go to Declaration list', { exact: true }).click())
    await expect(this.heading).toBeVisible()
  }

  /** Fill then click directly, as observed: a separate Save is not required here. */
  async requestDeclarationNumber() {
    await this.workspace.detail.locator('input[name="ins_jobNo"]').fill(FORCE_EXPORT_DECLARATION_JOB)
    await waitForReload(this.page, () => this.workspace.reAvgAndCalcTax.click(), 'detailfrm')
    // The progress document reloads before the server finishes calculating.
    // GCL/Short preparation must wait for completion, not the default 5s assertion.
    await expect(this.workspace.detail.locator('body')).toContainText('ระบบเฉลี่ยค่า charge และคำนวนภาษีให้เรียบร้อยแล้วครับ', { timeout: 120_000 })
    await expect(this.workspace.reAvgAndCalcTax).toHaveValue('Re-Avg and Calc Tax')
  }

  async expectAccepted(referenceNo: string) {
    await this.searchReference(referenceNo)
    const row = this.row(referenceNo)
    await expect(row).toHaveCount(1)
    await expect(this.cell(row, 'job')).toHaveText(FORCE_EXPORT_DECLARATION_JOB)
    await expect(this.cell(row, 'declaration')).toHaveText(/^\s*[A-Z0-9]{14}\s*$/)
    await expect(this.cell(row, 'declStatus')).toHaveText(EXPORT_ACCEPT_STATUS)
    return (await this.cell(row, 'declaration').innerText()).trim()
  }

  async reopen(referenceNo: string) {
    await this.row(referenceNo).getByText(referenceNo, { exact: true }).click()
    await this.workspace.waitForDetail()
  }

  /** Only drafts exposing a Delete icon are removed. Accepted records remain as evidence. */
  async cleanupDraft(session: SpnSession, referenceNo: string) {
    await this.openList(session)
    await this.searchReference(referenceNo)
    const row = this.row(referenceNo)
    if (await row.count() !== 1) return
    const status = (await this.cell(row, 'declStatus').innerText()).trim()
    const remove = row.locator('img[title="Delete"]')
    if (!status && await remove.isVisible()) await waitForReload(this.page, () => remove.click())
  }
}
