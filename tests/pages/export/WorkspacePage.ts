import { expect, Locator } from '@playwright/test'
import { ExportWorkspacePage as BaseWorkspace } from './DeclarationPages'
import { ajax, waitForReload } from '../spn/SpnApp'

export class ExportWorkspacePage extends BaseWorkspace {
  airActions() {
    return {
      createShort: this.page.getByRole('button', { name: 'Create Short', exact: true }),
      printAirGcl: this.page.getByRole('button', { name: 'Print Air GCL', exact: true }),
      printChangeFlight: this.page.getByRole('button', { name: 'Print Change Flight', exact: true }),
    }
  }
  async exporter() {
    const out: Record<string, string> = {}
    for (const name of ['INcompanyCode', 'companyName', 'companyEnglishName', 'companyTaxNo', 'companyBranch']) {
      out[name] = (await this.detail.locator(`input[name="ins_${name}"]`).first().inputValue()).replace(/\s+/g, ' ').trim()
    }
    return out
  }
  async counts() {
    const text = await this.page.locator('body').innerText()
    return { invoices: Number(text.match(/(\d+) Invoice\(s\)/)?.[1]), items: Number(text.match(/(\d+) Item\(s\)/)?.[1]) }
  }
  async run(button: Locator, message: RegExp) {
    await button.click()
    await expect(this.detail.locator('body'), 'Export process completed').toContainText(message, { timeout: 60_000 })
  }
  async copyHeader() { await waitForReload(this.page, () => this.page.locator('#copyRefID').click()); await this.waitForDetail() }
  async copyNew() { await waitForReload(this.page, () => this.detail.locator('#copyBTN').filter({ visible: true }).click()); await this.waitForDetail() }
  async validate() { const popup = this.page.waitForEvent('popup'); await this.detail.locator('#validateBTN').click(); return popup }
  async invoiceList() { await this.detail.locator('#switchInvBTN').click(); await ajax(this.page).idle() }
  async deleteInvoice(invoice: string) {
    const row = this.detail.locator('tr:not(:has(tr))').filter({ has: this.detail.locator('input[name="CINV[]"]') }).filter({ hasText: invoice })
    await row.locator('input[name="CINV[]"]').check()
    await waitForReload(this.page, () => this.detail.locator('#deleteInvBTN').filter({ visible: true }).click(), 'detailfrm')
    await this.waitForDetail()
  }
  async notes() { await this.detail.locator('#extranoteBTN').click(); await expect(this.detail.locator('#IDins_note')).toBeVisible(); await ajax(this.page).idle() }
  noteRow(note: string) { return this.detail.locator('.simpleTbody tr').filter({ hasText: note }) }
  async addNote(note: string) { await this.detail.locator('#IDins_note').fill(note); await this.detail.locator('#saveNoteBTN').click(); await ajax(this.page).idle() }
  async deleteNote(note: string) { await this.noteRow(note).locator('img[title="Delete"]').click(); await ajax(this.page).idle() }
}
