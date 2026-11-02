import { Page, expect } from '@playwright/test'
import { DialogLog, waitForReload, waitForFrameReady } from '../spn/SpnApp'

/** Export workspace Create Short, its native dialogs, and the linked Short Control. */
export class ExportShortPage {
  readonly control
  readonly detail
  constructor(readonly page: Page) {
    this.control = page.frameLocator('#detailfrm')
    this.detail = this.control.frameLocator('#shortdeclarationdetail')
  }
  references() { return this.page.getByText(/^\s*[A-Z]{4}6\d{8}\s*$/) }
  async create(dialogs: DialogLog) {
    await expect(this.references(), 'New Export has no Short before creation').toHaveCount(0)
    const start = dialogs.records.length
    await this.page.getByRole('button', { name: 'Create Short', exact: true }).click()
    await expect(this.references(), 'Create Short produces one linked Short reference').toHaveCount(1, { timeout: 60_000 })
    const events = dialogs.records.slice(start)
    expect(events.some(d => d.type === 'confirm' && /^Do you want to create short\s*\?$/.test(d.message)), 'Create Short displays its confirmation popup').toBe(true)
    expect(events.some(d => d.type === 'alert' && /สร้างใบแจ้งของส่งออกไม่ครบจำนวน\(Short\)เรียบร้อยแล้ว/.test(d.message)), 'Create Short displays the success popup').toBe(true)
    return { referenceNo: (await this.references().innerText()).trim(), dialogs: events }
  }
  async open(reference: string) {
    await waitForReload(this.page, () => this.references().filter({ hasText: reference }).click())
    await this.ready()
  }
  async ready() {
    await waitForFrameReady(this.page, 'detailfrm')
    await expect(this.control.getByText('Short Declaration Control', { exact: true })).toBeVisible()
    await expect(this.control.locator('input[name="ins_companyTaxNo"]')).toBeVisible()
    await expect(this.detail.getByText('Tariff Code', { exact: true })).toBeVisible()
  }
  async read() {
    const fields: Record<string, string> = {}
    for (const name of ['jobNo', 'companyTaxNo', 'companyBranch', 'brokerTaxNo', 'brokerBranch', 'packageAmount', 'packageUnit',
      'grossWeightAfterShort', 'grossWeightUnitAfterShort', 'netWeightAfterShort', 'netWeightUnitAfterShort'])
      fields[name] = (await this.control.locator(`[name="ins_${name}"]`).inputValue()).trim()
    const rootText = await this.page.locator('body').innerText()
    const controlText = await this.control.locator('body').innerText()
    return { id: new URL(this.page.url()).searchParams.get('SELITEM'), fields,
      declaration: controlText.match(/EXPORT DECLARATION NO\s+([A-Z0-9]{14})/)?.[1] || '',
      exportReference: (await this.page.getByText(/^\s*[A-Z]{4}2\d{8}\s*$/).innerText()).trim(),
      shortDetailCount: Number(rootText.match(/(\d+)\s+Detail\(s\)/)?.[1]) }
  }
}
