import { Page, Locator, FrameLocator, expect} from '@playwright/test'
import { Autocomplete } from '../spn/Autocomplete'
import { SpnSession, PdfFile, serviceUrl, waitForReload, waitForFrameReady, ajax, capturePdf } from '../spn/SpnApp'
import type { InvoiceData, ConsignorInfo } from '../spn/InvoicePage'

/**
 * Export Declaration (ใบขนขาออก) — list, workspace header, invoice and item forms.
 * Same shell as Import (workspace + iframe "detailfrm", jQuery autocomplete into
 * #popupDiv, full-page form posts), different services and field names:
 * EXPORTDECLARATIONCONTROL / EXINVOICECONTROL / EXINVOICEITEM, key ExDclCtrl,
 * exporter + consignee instead of importer + consignor, FOB instead of CIF.
 * Only what the DB-default-0 suite needs is modelled.
 */

/**
 * Pick the suggestion whose code is `code`, ignoring padding. Some export lookups (package
 * unit, quantity unit) pad the radio value ("PK "), so Autocomplete.pick (exact value)
 * can't find it; the radio's own handler trims it when it is chosen.
 */
async function pickByCode(ac: Autocomplete, field: Locator, code: string) {
  const radio = ac.popup.locator(`xpath=.//input[@name="selList" and normalize-space(@value)="${code}"]`).first()
  for (let attempt = 1; ; attempt++) {
    await ac.type(field, code)
    try {
      await radio.waitFor({ state: 'visible', timeout: 5_000 })
      break
    } catch (e) {
      if (attempt >= 3) throw e
    }
  }
  await radio.focus()
  await radio.press('Enter')
  await expect(field, `Autocomplete · field takes "${code}"`).toHaveValue(code)
  await ajax(ac.page).idle()
}

/** F7 [New] on the Export Declaration list. */
export class ExportListPage {
  readonly page: Page
  readonly newButton: Locator

  constructor(page: Page) {
    this.page = page
    this.newButton = page.locator('#newBTN')
  }

  async open(session: SpnSession) {
    await this.page.goto(serviceUrl(session, { SERVICENAME: 'EXPORTDECLARATIONCONTROL' }))
  }

  /** F7 [New] reserves a reference no, creates the draft and opens its workspace. */
  async createNew() {
    await this.newButton.click()
    await this.page.waitForURL(/ACTION=WORKSPACE.*ExDclCtrl(:|%3A)\d+/, { timeout: 45_000 })
  }
}

/** Header ("Declaration Control") of an export declaration. */
export type ExportHeader = {
  jobNo: string
  /** typed into the exporter autocomplete; the FIRST suggestion is picked ("%" = all) */
  exporterSearch: string
  /** value of ins_transportMode: 1 = ทางเรือ … */
  transportMode: string
  vesselSearch: string
  voyage: string
  mawb: string
  hawb: string
  purchaseCountry: string
  destinationCountry: string
  loadPort: string
  releasePort: string
  packageAmount: string
  packageUnit: string
  netWeight: string
  grossWeight: string
  /** dd-mm-yyyy */
  departureDate: string
  /** dd-mm-yyyy — the exchange rate is looked up by departure AND submit date */
  submitDate: string
  shippingMark: string
}

/** Workspace of an export declaration (ACTION=WORKSPACE&SELITEM=ExDclCtrl:<id>). */
export class ExportWorkspacePage {
  readonly page: Page
  readonly detail: FrameLocator
  readonly autocomplete: Autocomplete
  readonly referenceNo: Locator
  readonly tree: Locator
  readonly reAvgAndCalcTax: Locator
  readonly calculateTax: Locator
  readonly sumItemToInvoice: Locator
  readonly saveButton: Locator
  readonly printButton: Locator
  readonly addInvoiceButton: Locator

  constructor(page: Page) {
    this.page = page
    this.detail = page.frameLocator('#detailfrm')
    this.autocomplete = new Autocomplete(page, this.detail)
    this.referenceNo = page.locator('.oRef')
    this.tree = page.locator('#outLineTree')
    this.reAvgAndCalcTax = page.locator('#AutoRecalc')
    this.calculateTax = page.locator('#AutoRecalTax')
    this.sumItemToInvoice = page.locator('#sumFob2Inv')
    this.saveButton = this.detail.locator('#saveBTN')
    this.printButton = this.detail.locator('#printBTN')
    this.addInvoiceButton = this.detail.locator('#addInvoice').filter({ visible: true })
  }

  field(name: string): Locator {
    if (name === 'shippingMark') return this.detail.locator('textarea[name="ins_shippingMark"]')
    if (name === 'transportMode') return this.detail.locator('select[name="ins_transportMode"]')
    return this.detail.locator(`input[name="ins_${name}"]:visible`).first()
  }

  async open(session: SpnSession, id: string) {
    await this.page.goto(serviceUrl(session, { SERVICENAME: 'EXPORTDECLARATIONCONTROL', ACTION: 'WORKSPACE', SELITEM: `ExDclCtrl:${id}` }), { timeout: 90_000 })
    await this.waitForDetail()
  }

  async waitForDetail() {
    await waitForFrameReady(this.page, 'detailfrm')
  }

  idFromUrl(): string {
    const m = decodeURIComponent(this.page.url()).match(/ExDclCtrl:(\d+)/)
    if (!m) throw new Error(`no ExDclCtrl id in ${this.page.url()}`)
    return m[1]
  }

  /** Fill the header; returns the exporter code the autocomplete picked. */
  async fillHeader(h: ExportHeader): Promise<{ exporter: string; vessel: string }> {
    await this.field('jobNo').fill(h.jobNo)
    const exporter = await this.autocomplete.pickFirst(this.field('INcompanyCode'), h.exporterSearch)
    await this.field('INcompanyCode').press('Enter')
    await ajax(this.page).idle()
    await expect(this.field('companyName'), 'Exporter · company name is filled from master data').not.toHaveValue('')
    await this.field('transportMode').selectOption(h.transportMode)
    const vessel = await this.autocomplete.pickFirst(this.field('vesselName'), h.vesselSearch)
    await this.field('vesselVoyage').fill(h.voyage)
    await this.field('masterBillOfLading').fill(h.mawb)
    await this.field('houseBillOfLading').fill(h.hawb)
    await this.autocomplete.pick(this.field('purchaseCountry'), h.purchaseCountry, h.purchaseCountry)
    await this.autocomplete.pick(this.field('destinationCountry'), h.destinationCountry, h.destinationCountry)
    await this.autocomplete.pick(this.field('loadPort'), h.loadPort, h.loadPort)
    await this.autocomplete.pick(this.field('releasePort'), h.releasePort, h.releasePort)
    await this.field('totalPackageAmount').fill(h.packageAmount)
    await pickByCode(this.autocomplete, this.field('totalPackageUnit'), h.packageUnit)
    await this.field('netWeight').fill(h.netWeight)
    await this.field('grossWeight').fill(h.grossWeight)
    await this.field('submitDate').fill(h.submitDate)
    await this.field('submitDate').press('Tab')
    await ajax(this.page).idle()
    // Submit Date can derive Departure Date (+20 days on the support site).
    // Set the explicitly requested departure date after that handler finishes.
    await this.field('departureDate').fill(h.departureDate)
    await this.field('departureDate').press('Tab')
    await ajax(this.page).idle()
    await this.field('shippingMark').fill(h.shippingMark)
    return { exporter, vessel }
  }

  /** F12 Save — posts form1 and re-renders the header form. */
  async save() {
    await waitForReload(this.page, () => this.saveButton.click(), 'detailfrm')
    await this.waitForDetail()
  }

  async openAddInvoice() {
    await waitForReload(this.page, () => this.addInvoiceButton.click(), 'detailfrm')
    await this.waitForDetail()
  }

  async print(): Promise<PdfFile> {
    return capturePdf(this.page, () => this.printButton.click())
  }

  /** Item nodes of the tree ("Go to Declaration list" shares the itemLink class — excluded). */
  treeItems(): Locator {
    return this.tree.locator('span.itemLink').filter({ hasText: /^\d{4}[-(]/ })
  }

  treeItem(itemNo: string): Locator {
    return this.tree.locator('span.itemLink').filter({ hasText: new RegExp(`^${itemNo}[-(]`) })
  }

  treeInvoice(invoiceNo: string): Locator {
    return this.tree.getByText(invoiceNo, { exact: true })
  }

  async openTreeItem(itemNo: string) {
    await waitForReload(this.page, () => this.treeItem(itemNo).click(), 'detailfrm')
    await this.waitForDetail()
  }

  async openTreeInvoice(invoiceNo: string) {
    await waitForReload(this.page, () => this.treeInvoice(invoiceNo).click(), 'detailfrm')
    await this.waitForDetail()
  }
}

/** Add Invoice landing + Invoice Control form of an export declaration (consignee = ผู้ซื้อ). */
export class ExportInvoicePage {
  readonly page: Page
  readonly detail: FrameLocator
  readonly autocomplete: Autocomplete
  readonly createNewButton: Locator
  readonly invoiceNo: Locator
  readonly invoiceDate: Locator
  readonly consigneeCode: Locator
  readonly consigneeName: Locator
  readonly totalInvoice: Locator
  readonly currency: Locator
  readonly saveButton: Locator
  readonly itemForm: Locator
  readonly addNewItemLink: Locator

  constructor(page: Page) {
    this.page = page
    this.detail = page.frameLocator('#detailfrm')
    this.autocomplete = new Autocomplete(page, this.detail)
    this.createNewButton = this.detail.locator('#ImportFile2')
    this.invoiceNo = this.detail.locator('#ins_invoiceNo')
    this.invoiceDate = this.detail.locator('#ins_invoiceDate')
    this.consigneeCode = this.detail.locator('#ins_INconsigneeCode')
    this.consigneeName = this.detail.locator('#ins_consigneeName')
    this.totalInvoice = this.detail.locator('#ins_totalInvoice')
    this.currency = this.detail.locator('#ins_invoiceCurrency')
    this.saveButton = this.detail.locator('#saveBTN')
    this.itemForm = this.detail.locator('input[name="ins_invoiceItem"]')
    this.addNewItemLink = page.locator('#outLineTree').getByText('[Add new item]', { exact: true })
  }

  async startNewInvoice() {
    await waitForReload(this.page, () => this.createNewButton.click(), 'detailfrm')
    await waitForFrameReady(this.page, 'detailfrm')
    await expect(this.invoiceNo, 'Invoice · new invoice form is shown').toBeVisible()
  }

  /**
   * Fill the invoice (`consignorSearch` of InvoiceData = the consignee search here).
   * The consignee lookup (LIST_CONSIGNEE) is scoped to the declaration — an exporter with
   * no consignees lists nothing; then the consignee stays empty (code '') — it is not
   * needed to save the invoice or to calculate.
   */
  async fill(inv: InvoiceData): Promise<ConsignorInfo> {
    await this.invoiceNo.fill(inv.invoiceNo)
    await this.invoiceDate.fill(inv.invoiceDate)
    await this.autocomplete.type(this.consigneeCode, inv.consignorSearch)
    const first = this.autocomplete.popup.locator('xpath=.//input[@name="selList" and normalize-space(@value)!=""]').first()
    let picked: ConsignorInfo = { code: '', name: '' }
    if (await first.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false)) {
      const code = ((await first.getAttribute('value')) ?? '').trim()
      await first.focus()
      await first.press('Enter')
      await this.consigneeCode.press('Enter')
      await ajax(this.page).idle()
      picked = { code, name: (await this.consigneeName.inputValue()).replace(/\s+/g, ' ').trim() }
    } else {
      await this.consigneeCode.fill('')
    }
    await this.totalInvoice.fill(inv.totalInvoice)
    await this.autocomplete.pick(this.currency, inv.currency, inv.currency)
    return picked
  }

  /** Save → the item form of the new invoice opens (directly, or via "[Add new item]"). */
  async save() {
    await waitForReload(this.page, () => this.saveButton.click(), 'detailfrm')
    await waitForFrameReady(this.page, 'detailfrm')
    await expect
      .poll(async () => (await this.itemForm.isVisible()) || (await this.addNewItemLink.isVisible()), {
        message: 'Invoice · saved (item form or "[Add new item]" shown)',
        timeout: 30_000,
      })
      .toBe(true)
    if (!(await this.itemForm.isVisible())) {
      await waitForReload(this.page, () => this.addNewItemLink.click(), 'detailfrm')
      await waitForFrameReady(this.page, 'detailfrm')
      await expect(this.itemForm, 'Item · form of the new invoice is open').toBeVisible()
    }
  }
}

export type ExportItemData = {
  tariff: { type: string; value: string }
  statisticalCode: string
  exportTariff: string
  privilegeCode: string
  tariffSequence?: string
  englishDescription: string
  thaiDescription: string
  originCountry: string
  netWeight: string
  invoiceQuantity: string
  invoiceQuantityUnit: string
  quantity: string
  quantityUnit: string
  amountForeign: string
}

/** Item (รายการ) form of an export invoice — iframe "detailfrm" (SERVICENAME=EXINVOICEITEM). */
export class ExportItemPage {
  readonly page: Page
  readonly detail: FrameLocator
  readonly autocomplete: Autocomplete
  readonly itemNo: Locator
  readonly saveButton: Locator
  readonly addItemButton: Locator

  constructor(page: Page) {
    this.page = page
    this.detail = page.frameLocator('#detailfrm')
    this.autocomplete = new Autocomplete(page, this.detail)
    this.itemNo = this.detail.locator('input[name="ins_invoiceItem"]')
    this.saveButton = this.detail.locator('#saveBTN')
    this.addItemButton = this.detail.locator('#insertBTN')
  }

  field(name: string): Locator {
    if (name === 'englishDescriptionOfGoods' || name === 'thaiDescriptionOfGoods') return this.detail.locator(`textarea[name="ins_${name}"]`)
    return this.detail.locator(`input[name="ins_${name}"]:visible`).first()
  }

  /** Fill an item. Empty strings are left untouched — the DB default applies to them. */
  async fill(item: ExportItemData) {
    await this.autocomplete.pick(this.field('tariffCode'), item.tariff.type, item.tariff.value)
    for (const [name, value] of [
      ['statisticalCode', item.statisticalCode],
      ['exportTariff', item.exportTariff],
      ['privilegeCode', item.privilegeCode],
    ] as const) {
      // the tariff pick may fill these; set them only when it didn't
      if (value && !(await this.field(name).inputValue())) await this.field(name).fill(value)
    }
    await this.field('englishDescriptionOfGoods').fill(item.englishDescription)
    await this.field('thaiDescriptionOfGoods').fill(item.thaiDescription)
    await this.autocomplete.pick(this.field('originCountry'), item.originCountry, item.originCountry)
    if (item.netWeight) await this.field('netWeight').fill(item.netWeight)
    if (item.invoiceQuantity) await this.field('invoiceQuantity').fill(item.invoiceQuantity)
    await pickByCode(this.autocomplete, this.field('invoiceQuantityUnit'), item.invoiceQuantityUnit)
    if (item.quantity) await this.field('quantity').fill(item.quantity)
    await pickByCode(this.autocomplete, this.field('quantityUnit'), item.quantityUnit)
    if (item.amountForeign) {
      await this.field('invoiceAmountForeign').fill(item.amountForeign)
      // the Baht amount is recalculated on blur of the foreign amount
      await this.field('invoiceAmountForeign').press('Tab')
    }
    await ajax(this.page).idle()
  }

  private async reloadAfter(button: Locator) {
    await waitForReload(this.page, () => button.click(), 'detailfrm')
    await waitForFrameReady(this.page, 'detailfrm')
  }

  async save() {
    await this.reloadAfter(this.saveButton)
  }

  /** Add Item — saves the current item and opens a blank next item. */
  async addItem() {
    await this.reloadAfter(this.addItemButton)
  }
}
