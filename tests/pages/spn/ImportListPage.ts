import { Page, Locator, Download } from '@playwright/test'
import { SpnSession, serviceUrl, waitForReload } from './SpnApp'

export type ListSearch = {
  referenceNo?: string
  keyword?: string
  /** value of the "จาก" select: declarationNo, houseBillOfLanding, masterBillOfLanding, jobNo, … */
  by?: string
  /** value of the Status select: ACCEPT, PREPARE, SEND, VALIDATED, … */
  status?: string
  dateType?: 'arrivalDate' | 'referenceDate' | 'cancelDate'
  from?: string
  to?: string
  pageSize?: '15' | '30' | '50' | '100' | '200'
}

/** Footer export buttons → the alert shown when no row is ticked. */
export const EXPORT_BUTTONS = {
  'Save XML': 'Please choose record to generate XML',
  'Save XML with Decl No.': 'Please choose record to generate XML',
  'Save PDF': 'Please choose record to generate PDF',
  'Save Tiff': 'Please choose record to generate Tiff',
  'Save XLS': 'Please choose record to generate XLS',
  'Save Dat': 'Please choose record to generate DAT',
  'Save Form Vat': 'Please choose record to generate Form Vat',
} as const
export type ExportButton = keyof typeof EXPORT_BUTTONS | 'Save XLS New'

/**
 * Import Declaration list (SERVICENAME=IMPORTDECLARATIONCONTROL, ACTION=MAIN).
 * Search/filter/export are a classic form post of `form1` that re-renders the page;
 * the exports answer with a zip download.
 */
export class ImportListPage {
  readonly page: Page
  readonly heading: Locator
  readonly newButton: Locator
  readonly copyButton: Locator
  readonly filterName: Locator
  readonly keyword: Locator
  readonly keywordBy: Locator
  readonly status: Locator
  readonly searchButton: Locator
  readonly referenceNo: Locator
  readonly dateType: Locator
  readonly dateFrom: Locator
  readonly dateTo: Locator
  readonly pageSize: Locator
  readonly importFile: Locator
  readonly importButton: Locator
  readonly checkAll: Locator
  readonly rows: Locator
  readonly rowCheckboxes: Locator
  readonly checkedRows: Locator
  readonly nextPage: Locator
  readonly prevPage: Locator
  readonly fileNameOption: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByText('Import Declaration', { exact: true })
    this.newButton = page.locator('#newBTN')
    this.copyButton = page.locator('#CopyBTN')
    this.filterName = page.locator('#FILTER')
    this.keyword = page.locator('input[name="KEYWORD"]')
    this.keywordBy = page.locator('select[name="BY"]')
    this.status = page.locator('select[name="sStatus"]')
    this.searchButton = page.locator('#refreshBTN')
    this.referenceNo = page.locator('#invno1TXT')
    this.dateType = page.locator('select[name="searchDate"]')
    this.dateFrom = page.locator('input[name="sFROM"]')
    this.dateTo = page.locator('input[name="sTO"]')
    this.pageSize = page.locator('select[name="slimit"]')
    this.importFile = page.locator('input[name="dataFile"]')
    this.importButton = page.locator('#importDatatype')
    this.checkAll = page.locator('#checkall')
    this.rowCheckboxes = page.locator('input[name="SELITEM[]"]')
    this.checkedRows = page.locator('input[name="SELITEM[]"]:checked')
    this.rows = page.locator('tr').filter({ has: this.rowCheckboxes })
    this.nextPage = page.getByRole('link', { name: 'Next' })
    this.prevPage = page.getByRole('link', { name: 'Prev' })
    this.fileNameOption = page.locator('#custom_filename')
  }

  async open(session: SpnSession) {
    await this.page.goto(serviceUrl(session, { SERVICENAME: 'IMPORTDECLARATIONCONTROL' }))
  }

  async search(criteria: ListSearch) {
    if (criteria.referenceNo !== undefined) await this.referenceNo.fill(criteria.referenceNo)
    if (criteria.keyword !== undefined) await this.keyword.fill(criteria.keyword)
    if (criteria.by) await this.keywordBy.selectOption(criteria.by)
    if (criteria.status) await this.status.selectOption(criteria.status)
    if (criteria.dateType) await this.dateType.selectOption(criteria.dateType)
    if (criteria.from !== undefined) await this.dateFrom.fill(criteria.from)
    if (criteria.to !== undefined) await this.dateTo.fill(criteria.to)
    if (criteria.pageSize) await this.pageSize.selectOption(criteria.pageSize)
    await waitForReload(this.page, () => this.searchButton.click())
  }

  /** "Filter Name" (saved filters) — applied by Search, like the other criteria. */
  async applyFilterName(value: string) {
    await this.filterName.selectOption(value)
    await waitForReload(this.page, () => this.searchButton.click())
  }

  async goToNextPage() {
    await waitForReload(this.page, () => this.nextPage.click())
  }

  async goToPrevPage() {
    await waitForReload(this.page, () => this.prevPage.click())
  }

  // ── rows ─────────────────────────────────────────────────────────────
  rowFor(referenceNo: string): Locator {
    return this.rows.filter({ has: this.page.getByText(referenceNo, { exact: true }) })
  }

  rowCheckbox(id: string): Locator {
    return this.page.locator(`input[name="SELITEM[]"][value="${id}"]`)
  }

  /**
   * Column cells of a row. Column order on the page: ACTION, STATUS, REFERENCE NO,
   * JOB NO, DECLARATION NO, COMPANY NAME, ชื่อเรือ, REFERENCE DATE, MAWB., HAWB., PK,
   * ยอดภาษี, ยอดเงินประกัน.
   */
  cell(row: Locator, column: 'status' | 'ref' | 'job' | 'decl' | 'company' | 'vessel' | 'refDate' | 'mawb' | 'hawb' | 'pk' | 'tax' | 'deposit'): Locator {
    const order = ['action', 'status', 'ref', 'job', 'decl', 'company', 'vessel', 'refDate', 'mawb', 'hawb', 'pk', 'tax', 'deposit']
    return row.locator(':scope > td').nth(order.indexOf(column))
  }

  /** Status picture of a row — images/invStat_<STATUS>.gif (empty = draft "กำลังเตรียมเอกสาร"). */
  statusPicture(row: Locator): Locator {
    return row.locator('img[name="statusPic[]"]')
  }

  /** ImDclCtrl id of the row's record (the checkbox value). */
  async idOf(referenceNo: string): Promise<string> {
    return (await this.rowFor(referenceNo).locator('input[name="SELITEM[]"]').getAttribute('value')) ?? ''
  }

  async referenceNumbers(): Promise<string[]> {
    // :scope > td — the rows also hold stray non-cell nodes written by document.write
    return this.rows.evaluateAll((trs) => trs.map((tr) => (tr.querySelectorAll(':scope > td')[2] as HTMLElement).innerText.trim()))
  }

  async columnValues(column: 'status' | 'job' | 'mawb' | 'hawb' | 'refDate'): Promise<string[]> {
    const order = ['action', 'status', 'ref', 'job', 'decl', 'company', 'vessel', 'refDate', 'mawb', 'hawb', 'pk', 'tax', 'deposit']
    const index = order.indexOf(column)
    return this.rows.evaluateAll((trs, i) => trs.map((tr) => (tr.querySelectorAll(':scope > td')[i] as HTMLElement).innerText.trim()), index)
  }

  async statusPictures(): Promise<string[]> {
    return this.page.locator('img[name="statusPic[]"]').evaluateAll((els) => els.map((e) => e.getAttribute('src') ?? ''))
  }

  printIcon(referenceNo: string): Locator {
    return this.rowFor(referenceNo).locator('img[title="Print"]')
  }

  eventIcon(referenceNo: string): Locator {
    return this.rowFor(referenceNo).locator('img[title="Event"]')
  }

  deleteIcon(referenceNo: string): Locator {
    return this.rowFor(referenceNo).locator('img[title="Delete"]')
  }

  referenceLink(referenceNo: string): Locator {
    return this.rowFor(referenceNo).getByText(referenceNo, { exact: true })
  }

  exportButton(name: ExportButton): Locator {
    return this.page.getByRole('button', { name, exact: true })
  }

  // ── actions ──────────────────────────────────────────────────────────
  /** F7 [New] reserves a reference no, creates the draft and opens its workspace. */
  async createNew() {
    await this.newButton.click()
    await this.page.waitForURL(/ACTION=WORKSPACE.*ImDclCtrl(:|%3A)\d+/, { timeout: 45_000 })
  }

  async select(id: string) {
    await this.rowCheckbox(id).check()
  }

  /** Click an export button with the ticked rows and return the download it produces. */
  async export(name: ExportButton): Promise<Download> {
    const download = this.page.waitForEvent('download', { timeout: 60_000 })
    await this.exportButton(name).click()
    return download
  }

  async deleteRow(referenceNo: string) {
    await waitForReload(this.page, () => this.deleteIcon(referenceNo).click())
  }

  async copySelected() {
    await waitForReload(this.page, () => this.copyButton.click())
  }

  async importDataFile(file: string) {
    await this.importFile.setInputFiles(file)
    await waitForReload(this.page, () => this.importButton.click())
  }
}
