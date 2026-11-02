import { Page, Locator, FrameLocator } from '@playwright/test'
import { Autocomplete } from './Autocomplete'
import { waitForReload, waitForFrameReady, ajax } from './SpnApp'
import { ItemDutyPanel } from './ItemDutyPanel'
import { ItemPreparationPage } from './ItemPreparationPage'

export type ItemData = {
  /** text typed into the tariff field and the 12-digit code to pick */
  tariff: { type: string; value: string }
  englishDescription: string
  thaiDescription: string
  originCountry: string
  packageAmount: string
  packageUnit: string
  netWeight: string
  invoiceQuantity: string
  invoiceQuantityUnit: string
  quantity: string
  quantityUnit: string
  amountForeign: string
}

export type ImportItemMasterSelection = { statisticalCode: string; privilegeCode: string; tariffSequence: string }

/** Item (รายการ) form of an invoice — iframe "detailfrm" (SERVICENAME=IMINVOICEITEM). */
export class ItemPage {
  readonly page: Page
  readonly detail: FrameLocator
  readonly autocomplete: Autocomplete
  readonly itemNo: Locator
  readonly tariffCode: Locator
  readonly statisticalCode: Locator
  readonly privilegeCode: Locator
  readonly tariffSequence: Locator
  readonly englishDescription: Locator
  readonly thaiDescription: Locator
  readonly originCountry: Locator
  readonly packageAmount: Locator
  readonly packageUnit: Locator
  readonly netWeight: Locator
  readonly invoiceQuantity: Locator
  readonly invoiceQuantityUnit: Locator
  readonly quantity: Locator
  readonly quantityUnit: Locator
  readonly currency: Locator
  readonly exchangeRate: Locator
  readonly amountForeign: Locator
  readonly amountBaht: Locator
  readonly saveButton: Locator
  readonly addItemButton: Locator
  readonly deleteItemButton: Locator
  readonly copyItemButton: Locator

  constructor(page: Page) {
    this.page = page
    this.detail = page.frameLocator('#detailfrm')
    this.autocomplete = new Autocomplete(page, this.detail)
    this.itemNo = this.detail.locator('input[name="ins_invoiceItem"]')
    this.tariffCode = this.detail.locator('#ins_tariffCode')
    this.statisticalCode = this.detail.locator('#ins_statisticalCode')
    this.privilegeCode = this.detail.locator('#ins_privilegeCode')
    this.tariffSequence = this.detail.locator('#ins_tariffSequence')
    this.englishDescription = this.detail.locator('#IDins_englishDescriptionOfGoods')
    this.thaiDescription = this.detail.locator('#IDins_thaiDescriptionOfGoods')
    this.originCountry = this.detail.locator('#ins_originCountry')
    this.packageAmount = this.detail.locator('#ins_packageAmount')
    this.packageUnit = this.detail.locator('#ins_packageUnit')
    this.netWeight = this.detail.locator('#ins_netWeight')
    this.invoiceQuantity = this.detail.locator('#ins_invoiceQuantity')
    this.invoiceQuantityUnit = this.detail.locator('#ins_invoiceQuantityUnit')
    this.quantity = this.detail.locator('#ins_quantity')
    this.quantityUnit = this.detail.locator('#ins_quantityUnit')
    this.currency = this.detail.locator('#ins_currency')
    this.exchangeRate = this.detail.locator('input[name="ins_exchangeRate"]')
    this.amountForeign = this.detail.locator('#ins_invoiceAmountForeign')
    this.amountBaht = this.detail.locator('input[name="ins_invoiceAmountBaht"]')
    this.saveButton = this.detail.locator('#saveBTN')
    this.addItemButton = this.detail.locator('#insertBTN')
    this.deleteItemButton = this.detail.locator('#deleteBTN')
    this.copyItemButton = this.detail.locator('#copyBTN')
  }

  async fill(item: ItemData) {
    await this.autocomplete.pick(this.tariffCode, item.tariff.type, item.tariff.value)
    const selected: ImportItemMasterSelection = { statisticalCode: '', privilegeCode: '', tariffSequence: '' }
    for (const name of ['statisticalCode', 'privilegeCode', 'tariffSequence'] as const) {
      selected[name] = await this.autocomplete.pickFirst(this[name], '%')
      await this[name].press('Enter')
      await ajax(this.page).idle()
    }
    await this.englishDescription.fill(item.englishDescription)
    await this.thaiDescription.fill(item.thaiDescription)
    await this.autocomplete.pick(this.originCountry, item.originCountry, item.originCountry)
    await this.packageAmount.fill(item.packageAmount)
    await this.autocomplete.pick(this.packageUnit, item.packageUnit, item.packageUnit)
    await this.netWeight.fill(item.netWeight)
    await this.invoiceQuantity.fill(item.invoiceQuantity)
    await this.autocomplete.pick(this.invoiceQuantityUnit, item.invoiceQuantityUnit, item.invoiceQuantityUnit)
    await this.quantity.fill(item.quantity)
    await this.autocomplete.pick(this.quantityUnit, item.quantityUnit, item.quantityUnit)
    await this.amountForeign.fill(item.amountForeign)
    // the Baht amount is recalculated on blur of the foreign amount
    await this.amountForeign.press('Tab')
    await ajax(this.page).idle()
    return selected
  }

  private async reloadAfter(button: Locator) {
    await waitForReload(this.page, () => button.click(), 'detailfrm')
    await waitForFrameReady(this.page, 'detailfrm')
  }

  async save() {
    await this.reloadAfter(this.saveButton)
  }

  async openDuty() {
    const panel = new ItemDutyPanel(this.page)
    await panel.open()
    return panel
  }

  preparation() { return new ItemPreparationPage(this.page, 'INPROCESS') }

  /** Add Item — saves the current item and opens a blank next item. */
  async addItem() {
    await this.reloadAfter(this.addItemButton)
  }

  /** Copy Item — saves the current item and opens its copy as the next item. */
  async copyItem() {
    await this.reloadAfter(this.copyItemButton)
  }

  /** Delete Item — confirm "ต้องการลบรายการนี้หรือไม่ ?" then the item is removed. */
  async deleteItem() {
    await this.reloadAfter(this.deleteItemButton)
  }
}
