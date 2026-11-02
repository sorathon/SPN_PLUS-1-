import { Download, Locator, Page } from '@playwright/test'
import { SpnSession, serviceUrl, waitForReload } from '../spn/SpnApp'

export const EXPORT_DOWNLOADS = {
  'Save XML': { id: 'saveXmlBTN', ext: 'xml' },
  'Save XML after short': { id: 'saveXmlShortBTN', ext: 'xml' },
  'Save XML with Decl No.': { id: 'saveXmlDeclBTN', ext: 'xml' },
  'Save PDF': { id: 'savePdfBTN', ext: 'pdf' },
  'Save TIFF': { id: 'saveTiffBTN', ext: 'tif' },
  'Save XLS': { id: 'saveXlsBTN', ext: 'xlsx' },
  'Save XLS New': { id: 'saveXlsBTNNEW', ext: 'xlsx' },
  'Save Dat': { id: 'saveDat', ext: 'dat' },
} as const
export type ExportDownload = keyof typeof EXPORT_DOWNLOADS
export type ExportSearch = { referenceNo?: string; keyword?: string; by?: string; status?: string; dateType?: string; from?: string; to?: string; pageSize?: string }

export class ExportListPage {
  readonly heading: Locator
  readonly rows: Locator
  readonly filter: Locator
  readonly checkAll: Locator
  constructor(readonly page: Page) {
    this.heading = page.getByText('Export Declaration', { exact: true })
    this.rows = page.locator('tr').filter({ has: page.locator('input[name="SELITEM[]"]') })
    this.filter = page.locator('select[name="FILTER"]')
    this.checkAll = page.locator('#checkall')
  }
  async open(spn: SpnSession) { await this.page.goto(serviceUrl(spn, { SERVICENAME: 'EXPORTDECLARATIONCONTROL' }), { timeout: 90_000 }) }
  async search(c: ExportSearch) {
    for (const [key, selector] of Object.entries({ referenceNo: 'input[name="sREF"]', keyword: 'input[name="KEYWORD"]', from: 'input[name="sFROM"]', to: 'input[name="sTO"]' })) {
      const value = c[key as keyof ExportSearch]
      if (value !== undefined) await this.page.locator(selector).fill(value)
    }
    for (const [key, name] of Object.entries({ by: 'BY', status: 'sStatus', dateType: 'searchDate', pageSize: 'slimit' })) {
      const value = c[key as keyof ExportSearch]
      if (value !== undefined) await this.page.locator(`select[name="${name}"]`).selectOption(value)
    }
    await waitForReload(this.page, () => this.page.locator('#refreshBTN').click({ noWaitAfter: true }))
  }
  row(ref: string) { return this.rows.filter({ has: this.page.getByText(ref, { exact: true }) }) }
  cell(row: Locator, name: 'ref' | 'job' | 'created' | 'decl' | 'company' | 'hawb' | 'mawb' | 'vessel' | 'departure' | 'package' | 'status') {
    const index = { ref: 2, job: 3, created: 4, decl: 5, company: 6, hawb: 7, mawb: 8, vessel: 9, departure: 10, package: 11, status: 14 }[name]
    return row.locator(':scope > td').nth(index)
  }
  async references() { return this.rows.evaluateAll(rows => rows.map(r => (r.querySelectorAll(':scope > td')[2] as HTMLElement).innerText.trim())) }
  async idOf(ref: string) { return (await this.row(ref).locator('input[name="SELITEM[]"]').getAttribute('value'))! }
  async select(id: string) { await this.page.locator(`input[name="SELITEM[]"][value="${id}"]`).check() }
  async copy() { await waitForReload(this.page, () => this.page.locator('#CopyBTN').click()) }
  async remove(ref: string) { await waitForReload(this.page, () => this.row(ref).locator('img[title="Delete"]').click()) }
  button(name: ExportDownload) { return this.page.locator('#' + EXPORT_DOWNLOADS[name].id).filter({ visible: true }) }
  async download(name: ExportDownload): Promise<Download> {
    const downloaded = this.page.waitForEvent('download', { timeout: 60_000 })
    await this.button(name).click()
    return downloaded
  }
  async importFile(file: string) {
    await this.page.locator('input[name="dataFile"]').setInputFiles(file)
    await waitForReload(this.page, () => this.page.locator('#importDatatype').click())
  }
  async next() { await waitForReload(this.page, () => this.page.getByRole('link', { name: 'Next', exact: true }).click()) }
  async prev() { await waitForReload(this.page, () => this.page.getByRole('link', { name: 'Prev', exact: true }).click()) }
}
