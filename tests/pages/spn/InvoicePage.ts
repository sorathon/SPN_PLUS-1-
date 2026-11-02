import { Page, Locator, FrameLocator, expect } from '@playwright/test'
import { Autocomplete } from './Autocomplete'
import { waitForReload, waitForFrameReady, ajax } from './SpnApp'

export type InvoiceData = {
  invoiceNo: string
  /** dd-mm-yyyy */
  invoiceDate: string
  /** typed into the consignor (ผู้ขาย) autocomplete; the FIRST suggestion is picked ("%" = all) */
  consignorSearch: string
  totalInvoice: string
  currency: string
}

/** Consignor the autocomplete picked (customer data — differs per site). */
export type ConsignorInfo = { code: string; name: string }

/**
 * "Add invoice/สร้างอินวอยส์" landing and the Invoice Control form — both rendered in
 * the workspace iframe "detailfrm". Saving a new invoice moves straight on to item 0001.
 */
export class InvoicePage {
  readonly page: Page
  readonly detail: FrameLocator
  readonly autocomplete: Autocomplete
  readonly addInvoiceHeading: Locator
  readonly createNewButton: Locator
  readonly invoiceControlHeading: Locator
  readonly invoiceNo: Locator
  readonly invoiceDate: Locator
  readonly consignorCode: Locator
  readonly consignorName: Locator
  readonly totalInvoice: Locator
  readonly currency: Locator
  readonly saveButton: Locator
  readonly itemForm: Locator
  readonly addNewItemLink: Locator

  constructor(page: Page) {
    this.page = page
    this.detail = page.frameLocator('#detailfrm')
    this.autocomplete = new Autocomplete(page, this.detail)
    this.addInvoiceHeading = this.detail.getByText('Add invoice/สร้างอินวอยส์')
    this.createNewButton = this.detail.locator('#ImportFile2')
    this.invoiceControlHeading = this.detail.getByText('Invoice Control', { exact: true })
    this.invoiceNo = this.detail.locator('#ins_invoiceNo')
    this.invoiceDate = this.detail.locator('#ins_invoiceDate')
    this.consignorCode = this.detail.locator('#ins_INconsignorCode')
    this.consignorName = this.detail.locator('#ins_consignorName')
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

  /** Pick the first consignor listed for `search`; Enter loads its name/address. */
  async pickConsignor(search = '%'): Promise<ConsignorInfo> {
    const code = await this.autocomplete.pickFirst(this.consignorCode, search)
    await this.consignorCode.press('Enter')
    await ajax(this.page).idle()
    await expect(this.consignorName, 'Consignor · name is filled from master data').not.toHaveValue('')
    // whitespace collapsed: master records may hold double spaces, which the app stores as one
    return { code, name: (await this.consignorName.inputValue()).replace(/\s+/g, ' ').trim() }
  }

  /** Fill the invoice; returns the consignor the autocomplete picked. */
  async fill(inv: InvoiceData): Promise<ConsignorInfo> {
    await this.invoiceNo.fill(inv.invoiceNo)
    await this.invoiceDate.fill(inv.invoiceDate)
    const consignor = await this.pickConsignor(inv.consignorSearch)
    await this.totalInvoice.fill(inv.totalInvoice)
    await this.autocomplete.pick(this.currency, inv.currency, inv.currency)
    return consignor
  }

  /**
   * Save → the item form of the new invoice opens.
   * Sites differ here: some open item 0001 by themselves right after the save, others stay
   * on the invoice and list "[Add new item]" under it in the tree — then that link is
   * clicked, as a user would. Either way the item form is open afterwards.
   */
  async save() {
    await waitForReload(this.page, () => this.saveButton.click(), 'detailfrm')
    await waitForFrameReady(this.page, 'detailfrm')
    // the two live in different frames (iframe vs tree), so they can't be combined with .or()
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
