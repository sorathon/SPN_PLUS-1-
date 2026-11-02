import { Page, expect } from '@playwright/test'

export const DUTY_TABLE_HEADERS = ['Type', 'ภาษีปกติ', 'ภาษีที่ต้องชำระ', 'อัตราภาษี(%)']

/** Shared Import/Export Item panel. Only the requested header table is checked. */
export class ItemDutyPanel {
  readonly detail
  readonly table
  constructor(readonly page: Page) {
    this.detail = page.frameLocator('#detailfrm')
    this.table = this.detail.locator('table').filter({
      hasText: /^\s*Type\s+ภาษีปกติ\s+ภาษีที่ต้องชำระ\s+อัตราภาษี\(%\)\s*$/,
    })
  }
  async open() {
    await this.detail.locator('#switchDutyBTN').click()
    await expect(this.table, 'Duty header table is displayed after clicking View Duty').toBeVisible()
  }
  async expectHeaderTable() {
    await expect(this.table).toBeVisible()
    await expect(this.table.locator('tr').first().locator(':scope > td'), 'Duty table has the four requested columns')
      .toHaveText(DUTY_TABLE_HEADERS)
  }
}
