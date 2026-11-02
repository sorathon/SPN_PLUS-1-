import { Page, expect } from '@playwright/test'
import { DialogLog, waitForReload, waitForFrameReady } from './SpnApp'

export const ITEM_EDIT_CONFIRMATION = 'เดิมรายการอยู่ในสถานะที่เสร็จสิ้นการเตรียมแล้ว ท่านต้องการยืนยันการปรับปรุงข้อมูลนี้หรือไม่ ?'

/** The same Item preparation/Save confirmation workflow is used by Import and Export. */
export class ItemPreparationPage {
  readonly detail
  constructor(readonly page: Page, readonly completedStatus: 'COMPLETE' | 'INPROCESS') { this.detail = page.frameLocator('#detailfrm') }
  async markComplete() {
    await waitForReload(this.page, () => this.detail.locator('#completeBTN').click(), 'detailfrm')
    await waitForFrameReady(this.page, 'detailfrm')
    // This is the stored state that enables the completed-preparation Save confirmation.
    await expect(this.detail.locator('input[name="itemStatus"]'), 'Item is in the state requiring edit confirmation').toHaveValue(this.completedStatus)
  }
  async saveAndExpectConfirmation(dialogs: DialogLog) {
    const start = dialogs.records.length
    dialogs.answerNext({ accept: false })
    // Cancel intentionally leaves the form in place, so do not wait for a Save reload.
    await this.detail.locator('#saveBTN').click()
    await expect.poll(() => dialogs.records.length, { message: 'Save displays a new native confirmation popup' }).toBeGreaterThan(start)
    const dialog = dialogs.records[start]
    expect(dialog.type, 'Popup offers OK / Cancel').toBe('confirm')
    expect(dialog.message.replace(/\s+/g, ' ').trim(), 'Popup matches the completed-preparation edit message').toBe(ITEM_EDIT_CONFIRMATION)
    return dialog
  }
}
