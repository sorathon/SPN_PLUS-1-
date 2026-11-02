import { Page, Locator } from '@playwright/test'
import { PdfFile, capturePdf } from './SpnApp'

/** "การตรวจสอบข้อมูล" window opened by the Validate toolbar button. */
export class ValidatePopup {
  readonly page: Page
  readonly title: Locator
  readonly errorCodeSection: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByText(/การตรวจสอบข้อมูล REFERENCE NO:/)
    this.errorCodeSection = page.getByText('การจำลองตรวจสอบ Error Code (NEW SCHEMA)')
  }

  /** Message box of a check, e.g. "SHIPPING MARK IN ITEM MUST BE ENTERED" — each one is a `div#error`. */
  check(text: string): Locator {
    return this.page.locator('div#error').filter({ hasText: text })
  }

  /** The box right after a check's message: where it happened ("ITEM NO: 0001 Of INVOICE NO: …") and Failed/Warning. */
  checkResult(text: string): Locator {
    return this.check(text).locator('xpath=following-sibling::div[1]')
  }
}

/** Window of an HTML print form opened from the Send page (Customs permit, สัญญาประกัน, …). */
export class PrintFormWindow {
  readonly page: Page
  readonly body: Locator
  readonly serverError: Locator

  constructor(page: Page) {
    this.page = page
    this.body = page.locator('body')
    this.serverError = page.getByText(/ERROR DETECTED|Internal Server Error/)
  }

  /** The form's title; some forms repeat it as a heading and a caption — the first one is the title. */
  title(text: string | RegExp): Locator {
    return this.page.getByText(text, { exact: typeof text === 'string' }).first()
  }
}

/** "Print Setting/รูปแบบการพิมพ์ใบขนสินค้า" window opened by a list row's Print icon. */
export class PrintSettingPopup {
  readonly page: Page
  readonly title: Locator
  readonly startPrint: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByText('Print Setting/รูปแบบการพิมพ์ใบขนสินค้า')
    this.startPrint = page.getByRole('button', { name: 'Start Print' })
  }

  async print(): Promise<PdfFile> {
    return capturePdf(this.page, () => this.startPrint.click())
  }
}
