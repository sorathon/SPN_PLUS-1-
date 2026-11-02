import { Page, Locator, FrameLocator, expect } from '@playwright/test'
import { Autocomplete } from './Autocomplete'
import { SpnSession, PdfFile, serviceUrl, waitForReload, waitForFrameReady, ajax, capturePdf } from './SpnApp'

/** Header ("Declaration Control") fields a regression run fills and reads back. */
export type DeclarationHeader = {
  jobNo: string
  /** typed into the importer autocomplete; the FIRST suggestion is picked ("%" = all) */
  importerSearch: string
  /** value of ins_transportMode: 1 = ทางเรือ, 3 = ทางรถยนต์, 4 = ทางเครื่องบิน … */
  transportMode: string
  /** typed into the vessel autocomplete; the FIRST suggestion is picked ("%" = all) */
  vesselSearch: string
  voyage: string
  mawb: string
  hawb: string
  originCountry: string
  consignmentCountry: string
  releasePort: string
  dischargePort: string
  packageAmount: string
  packageUnit: string
  netWeight: string
  grossWeight: string
  /** dd-mm-yyyy, as the field shows it */
  arrivalDate: string
  shippingMark: string
}

/** Field name of each header value (ins_* inputs of form1 in the detail frame). */
export const HEADER_FIELDS = {
  jobNo: 'ins_jobNo',
  importerCode: 'ins_INcompanyCode',
  companyName: 'ins_companyName',
  companyTaxNo: 'ins_companyTaxNo',
  companyBranch: 'ins_companyBranch',
  companyEnglishName: 'ins_companyEnglishName',
  postCode: 'ins_postCode',
  customsClearanceCard: 'ins_customsClearanceCard',
  customsClearanceName: 'ins_customsClearanceName',
  transportMode: 'ins_transportMode',
  vessel: 'ins_vesselName',
  mawb: 'ins_masterBillOfLanding',
  hawb: 'ins_houseBillOfLanding',
  originCountry: 'ins_originCountry',
  consignmentCountry: 'ins_consignmentCountry',
  releasePort: 'ins_releasePort',
  dischargePort: 'ins_dischargePort',
  packageAmount: 'ins_totalPackageAmount',
  packageUnit: 'ins_totalPackageUnit',
  netWeight: 'ins_netWeight',
  grossWeight: 'ins_grossWeight',
  arrivalDate: 'ins_arrivalDate',
  shippingMark: 'ins_shippingMark',
} as const
export type HeaderField = keyof typeof HEADER_FIELDS

/** Importer fields the importer autocomplete fills from the customer's master file. */
export const IMPORTER_FIELDS = [
  'importerCode',
  'companyName',
  'companyTaxNo',
  'companyBranch',
  'companyEnglishName',
  'postCode',
  'customsClearanceCard',
] as const
export type ImporterInfo = Record<(typeof IMPORTER_FIELDS)[number], string>

/** Customer data picked by the header autocompletes. */
export type PickedHeader = { importer: ImporterInfo; vessel: string }

/** The list's COMPANY NAME column shows the first 35 characters of the Thai name. */
export function companyNameInList(companyName: string): string {
  return companyName.slice(0, 35).replace(/\s+/g, ' ').trim()
}

/**
 * Declaration workspace (ACTION=WORKSPACE&SELITEM=ImDclCtrl:<id>): a left panel
 * (reference no, property counters, action buttons, invoice/item tree) and the
 * iframe "detailfrm" that shows the header form, the invoice/item forms, the
 * extra-note editor, the invoice list and the process results.
 */
export class WorkspacePage {
  readonly page: Page
  readonly detail: FrameLocator
  readonly autocomplete: Autocomplete
  // left panel
  readonly referenceNo: Locator
  readonly properties: Locator
  readonly tree: Locator
  readonly copyDeclControl: Locator
  readonly matchMasterFile: Locator
  readonly reAvgAndCalcTax: Locator
  readonly calculateTax: Locator
  readonly sumItemToInvoice: Locator
  // detail toolbar (header form)
  readonly saveButton: Locator
  readonly validateButton: Locator
  readonly printButton: Locator
  readonly copyNewButton: Locator
  readonly addInvoiceButton: Locator
  readonly extraNoteButton: Locator
  readonly invoiceListButton: Locator
  readonly voyage: Locator
  readonly originCountryName: Locator
  // detail views other than the header form
  readonly processResult: Locator
  readonly noteText: Locator
  readonly saveNoteButton: Locator
  readonly noteRows: Locator
  readonly invoiceListHeading: Locator
  readonly invoiceCheckboxes: Locator
  readonly deleteInvoiceButton: Locator
  readonly matchMasterFileHeading: Locator
  readonly matchButton: Locator

  constructor(page: Page) {
    this.page = page
    this.detail = page.frameLocator('#detailfrm')
    this.autocomplete = new Autocomplete(page, this.detail)

    this.referenceNo = page.locator('.oRef')
    this.properties = page.locator('#prop')
    this.tree = page.locator('#outLineTree')
    this.copyDeclControl = page.locator('#copyRefID')
    this.matchMasterFile = page.locator('#AutoMap')
    this.reAvgAndCalcTax = page.locator('#AutoRecalc')
    this.calculateTax = page.locator('#AutoRecalTax')
    this.sumItemToInvoice = page.locator('#sumCif2Inv')

    // Several toolbar buttons are written twice (one variant per declaration state) —
    // only the visible one is the live button.
    this.saveButton = this.detail.locator('#saveBTN')
    this.validateButton = this.detail.locator('#validateBTN')
    this.printButton = this.detail.locator('#printBTN')
    this.copyNewButton = this.detail.locator('#copyBTN').filter({ visible: true })
    this.addInvoiceButton = this.detail.locator('#addInvoice').filter({ visible: true })
    this.extraNoteButton = this.detail.locator('#extranoteBTN')
    this.invoiceListButton = this.detail.locator('#switchInvBTN')
    this.voyage = this.detail.locator('input[name="ins_voyage"]').filter({ visible: true })
    this.originCountryName = this.detail.locator('#originCountryDetail')

    this.processResult = this.detail.locator('body')
    this.noteText = this.detail.locator('#IDins_note')
    this.saveNoteButton = this.detail.locator('#saveNoteBTN')
    this.noteRows = this.detail.locator('.simpleTbody tr')
    this.invoiceListHeading = this.detail.getByText('Invoice List', { exact: true })
    this.invoiceCheckboxes = this.detail.locator('input[name="CINV[]"]')
    this.deleteInvoiceButton = this.detail.locator('#deleteInvBTN').filter({ visible: true })
    this.matchMasterFileHeading = this.detail.getByText('Match ข้อมูล Product จาก')
    this.matchButton = this.detail.getByRole('button', { name: 'Match', exact: true })
  }

  async open(session: SpnSession, id: string) {
    await this.page.goto(serviceUrl(session, { SERVICENAME: 'importdeclarationcontrol', ACTION: 'WORKSPACE', SELITEM: `ImDclCtrl:${id}` }))
    await this.waitForDetail()
  }

  /** The detail frame finished loading (handlers bound). */
  async waitForDetail() {
    await waitForFrameReady(this.page, 'detailfrm')
  }

  /** ImDclCtrl id from the workspace URL. */
  idFromUrl(): string {
    const m = decodeURIComponent(this.page.url()).match(/ImDclCtrl:(\d+)/)
    if (!m) throw new Error(`no ImDclCtrl id in ${this.page.url()}`)
    return m[1]
  }

  field(name: HeaderField): Locator {
    if (name === 'shippingMark') return this.detail.locator('textarea[name="ins_shippingMark"]')
    if (name === 'transportMode') return this.detail.locator('select[name="ins_transportMode"]')
    return this.detail.locator(`input[name="${HEADER_FIELDS[name]}"]`)
  }

  async headerValue(name: HeaderField): Promise<string> {
    return this.field(name).inputValue()
  }

  // ── header form ──────────────────────────────────────────────────────
  /**
   * Pick the first importer the autocomplete lists for `search`, then Enter loads its
   * master data into the importer fields. Returns what was filled in — importers are
   * customer data and differ per site, so tests compare against this, not fixed values.
   */
  async pickImporter(search = '%'): Promise<ImporterInfo> {
    await this.autocomplete.pickFirst(this.field('importerCode'), search)
    await this.field('importerCode').press('Enter')
    await ajax(this.page).idle()
    await expect(this.field('companyName'), 'Importer · company name is filled from master data').not.toHaveValue('')
    return this.readImporter()
  }

  async readImporter(): Promise<ImporterInfo> {
    const info = {} as ImporterInfo
    // whitespace collapsed: master records may hold double spaces, which the app stores as one
    for (const name of IMPORTER_FIELDS) info[name] = (await this.field(name).inputValue()).replace(/\s+/g, ' ').trim()
    return info
  }

  /** Fill the header; returns the customer data the autocompletes picked. */
  async fillHeader(h: DeclarationHeader): Promise<PickedHeader> {
    await this.field('jobNo').fill(h.jobNo)
    const importer = await this.pickImporter(h.importerSearch)
    await this.field('transportMode').selectOption(h.transportMode)
    const vessel = await this.autocomplete.pickFirst(this.field('vessel'), h.vesselSearch)
    await this.voyage.fill(h.voyage)
    await this.field('mawb').fill(h.mawb)
    await this.field('hawb').fill(h.hawb)
    await this.autocomplete.pick(this.field('originCountry'), h.originCountry, h.originCountry)
    await this.autocomplete.pick(this.field('consignmentCountry'), h.consignmentCountry, h.consignmentCountry)
    await this.autocomplete.pick(this.field('releasePort'), h.releasePort, h.releasePort)
    await this.autocomplete.pick(this.field('dischargePort'), h.dischargePort, h.dischargePort)
    await this.field('packageAmount').fill(h.packageAmount)
    await this.autocomplete.pick(this.field('packageUnit'), h.packageUnit, h.packageUnit)
    await this.field('netWeight').fill(h.netWeight)
    await this.field('grossWeight').fill(h.grossWeight)
    await this.field('arrivalDate').fill(h.arrivalDate)
    await this.field('shippingMark').fill(h.shippingMark)
    return { importer, vessel }
  }

  /** F12 Save — posts form1 and re-renders the header form. */
  async save() {
    await waitForReload(this.page, () => this.saveButton.click(), 'detailfrm')
    await this.waitForDetail()
  }

  async print(): Promise<PdfFile> {
    return capturePdf(this.page, () => this.printButton.click())
  }

  /** Validate opens a popup window with the check results. */
  async validate(): Promise<Page> {
    const popup = this.page.waitForEvent('popup')
    await this.validateButton.click()
    return popup
  }

  /** Copy New asks for the number of copies (prompt), then opens the new declaration. */
  async copyNew() {
    await waitForReload(this.page, () => this.copyNewButton.click())
    await this.waitForDetail()
  }

  /** Copy Decl Control (header only) — confirm, then the copy's workspace opens. */
  async copyHeaderOnly() {
    await waitForReload(this.page, () => this.copyDeclControl.click())
    await this.waitForDetail()
  }

  async openAddInvoice() {
    await waitForReload(this.page, () => this.addInvoiceButton.click(), 'detailfrm')
    await this.waitForDetail()
  }

  async openExtraNote() {
    await this.extraNoteButton.click()
    await expect(this.noteText, 'Extra note · editor is shown').toBeVisible()
    await ajax(this.page).idle()
  }

  async saveNote(text: string) {
    await this.noteText.fill(text)
    await this.saveNoteButton.click()
    await ajax(this.page).idle()
  }

  noteRow(text: string): Locator {
    return this.noteRows.filter({ hasText: text })
  }

  /** Extra note list columns: action (Delete/Edit/Set Display), note, ตำแหน่ง, แสดงในใบขนฯ, ขนาด. */
  noteCell(row: Locator, column: 'note' | 'position' | 'display' | 'size'): Locator {
    const order = ['action', 'note', 'position', 'display', 'size']
    return row.locator(':scope > td').nth(order.indexOf(column))
  }

  async deleteNote(text: string) {
    await this.noteRow(text).locator('img[title="Delete"]').click()
    await ajax(this.page).idle()
  }

  async openInvoiceList() {
    await this.invoiceListButton.click()
    await expect(this.invoiceListHeading, 'Invoice list · view is shown').toBeVisible()
    await ajax(this.page).idle()
  }

  invoiceRow(invoiceNo: string): Locator {
    // the list is a table nested in a layout row — take the innermost row
    return this.detail.locator('tr:not(:has(tr))').filter({ has: this.invoiceCheckboxes }).filter({ hasText: invoiceNo })
  }

  /** Invoice list columns: action, Status, Invoice No, Order, Invoice Date, Consignor, Job No, ยอดรวมเงิน, Charges, จำนวน Item. */
  invoiceCell(row: Locator, column: 'invoiceNo' | 'invoiceDate' | 'consignor' | 'amount' | 'itemCount'): Locator {
    const order = ['action', 'status', 'invoiceNo', 'order', 'invoiceDate', 'consignor', 'jobNo', 'amount', 'charges', 'itemCount']
    return row.locator(':scope > td').nth(order.indexOf(column))
  }

  async deleteInvoice(invoiceNo: string) {
    await this.invoiceRow(invoiceNo).locator('input[name="CINV[]"]').check()
    await waitForReload(this.page, () => this.deleteInvoiceButton.click(), 'detailfrm')
    await this.waitForDetail()
  }

  // ── left panel ───────────────────────────────────────────────────────
  /** "Property — N Invoice(s) / N Item(s)" counters (counted when the workspace loads). */
  async propertyCounts(): Promise<{ invoices: number; items: number }> {
    const text = await this.properties.innerText()
    return {
      invoices: Number(text.match(/(\d+) Invoice\(s\)/)?.[1] ?? NaN),
      items: Number(text.match(/(\d+) Item\(s\)/)?.[1] ?? NaN),
    }
  }

  treeInvoice(invoiceNo: string): Locator {
    return this.tree.getByText(invoiceNo, { exact: true })
  }

  /**
   * Item node of the tree — label "<itemNo>(<qty> <unit>)" ("<itemNo>-<itemNo>(…)" after
   * Sum Item to Inv.) plus "Err." while it fails validation.
   */
  treeItem(itemNo: string): Locator {
    return this.tree.locator('span.itemLink').filter({ hasText: new RegExp(`^${itemNo}[-(]`) })
  }

  /** All item nodes ("Go to Declaration list" shares the itemLink class — excluded). */
  treeItems(): Locator {
    return this.tree.locator('span.itemLink').filter({ hasText: /^\d{4}[-(]/ })
  }

  async openTreeItem(itemNo: string) {
    await waitForReload(this.page, () => this.treeItem(itemNo).click(), 'detailfrm')
    await this.waitForDetail()
  }

  /** Re-Avg / Calculate Tax / Sum Item to Inv. show a progress page in the detail frame that ends with a message. */
  async runProcess(button: Locator, doneMessage: RegExp) {
    await button.click()
    // substring: the page also prints "Elapsed Time : 0.075 sec." which differs per run
    await expect(this.processResult, 'Process · completion message is shown').toContainText(doneMessage, { timeout: 60_000 })
  }

  async openMatchMasterFile() {
    await this.matchMasterFile.click()
    // Customer configurations either show matching options or execute immediately.
    await expect.poll(async () => {
      if (await this.matchMasterFileHeading.isVisible()) return true
      return /ระบบจับคู่กับฐานข้อมูลที่มีอยู่ให้เรียบร้อยแล้วครับ/.test(await this.processResult.innerText())
    }, { message: 'Match Master File · options or successful completion', timeout: 60_000 }).toBe(true)
    return await this.matchMasterFileHeading.isVisible() ? 'options' as const : 'completed' as const
  }
}
