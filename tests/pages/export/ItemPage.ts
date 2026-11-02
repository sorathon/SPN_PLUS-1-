import { ExportItemPage as BaseItem, ExportItemData } from './DeclarationPages'
import { ajax, waitForReload } from '../spn/SpnApp'
import { DetailForm } from '../spn/DetailForm'
import { ItemDutyPanel } from '../spn/ItemDutyPanel'
import { ItemPreparationPage } from '../spn/ItemPreparationPage'

export class ExportItemPage extends BaseItem {
  preparation() { return new ItemPreparationPage(this.page, 'INPROCESS') }
  async openDuty() {
    const panel = new ItemDutyPanel(this.page)
    await panel.open()
    return panel
  }
  async fillCargo(data: { packageAmount: string; packageUnit: string; grossWeight: string; shippingMark: string; purchaseCountry: string }) {
    const form = new DetailForm(this.page)
    for (const [name, value] of Object.entries({ packageAmount: data.packageAmount, packageUnit: data.packageUnit,
      itemGrossWeight: data.grossWeight, itemGrossWeightUnit: 'KGM', shippingMark: data.shippingMark, purchaseCountry: data.purchaseCountry })) {
      await form.fill(name, value)
      await ajax(this.page).idle()
    }
  }
  async fill(item: ExportItemData) {
    await super.fill(item)
    for(const [name,value] of [['statisticalCode',item.statisticalCode],['exportTariff',item.exportTariff],['privilegeCode',item.privilegeCode],['tariffSequence',item.tariffSequence]] as const) {
      if(value && (await this.field(name).inputValue()).trim() !== value) {
        await this.field(name).fill(value)
        await this.field(name).press('Tab')
        await ajax(this.page).idle()
      }
    }
  }
  async copyItem() { await waitForReload(this.page, () => this.detail.locator('#copyBTN').click(), 'detailfrm') }
  async deleteItem() { await waitForReload(this.page, () => this.detail.locator('#deleteBTN').click(), 'detailfrm') }
}
