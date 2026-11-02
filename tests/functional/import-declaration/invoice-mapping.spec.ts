import path from 'node:path'
import { test as base, expect, createDeclaration } from './_shared'
import { Page } from '@playwright/test'
import { WorkspacePage } from '../../pages/spn/WorkspacePage'
import { ImportListPage } from '../../pages/spn/ImportListPage'
import { InvoicePage } from '../../pages/spn/InvoicePage'
import { ItemPage } from '../../pages/spn/ItemPage'
import type { SpnSession } from '../../pages/spn/SpnApp'
import { waitForReload } from '../../pages/spn/SpnApp'

class MappingWorkspace extends WorkspacePage {
  async counts() {
    const text = await this.page.locator('body').innerText()
    return { invoices: Number(text.match(/(\d+) Invoice\(s\)/)?.[1]), items: Number(text.match(/(\d+) Item\(s\)/)?.[1]) }
  }
  async openTreeInvoice(invoice: string) {
    await waitForReload(this.page, () => this.treeInvoice(invoice).click(), 'detailfrm')
    await this.waitForDetail()
  }
}
class MappingItem extends ItemPage {
  field(name: string) {
    if (name.endsWith('DescriptionOfGoods')) return this.detail.locator(`textarea[name="ins_${name}"]`)
    return this.detail.locator(`input[name="ins_${name}"]:visible`).first()
  }
}
type MappingUI = { page: Page; workspace: MappingWorkspace; invoice: InvoicePage; item: MappingItem }
const test = base.extend<{ui: MappingUI; tracked: {track: (id: string) => void}}>({
  ui: async ({page}, use) => use({page, workspace: new MappingWorkspace(page), invoice: new InvoicePage(page), item: new MappingItem(page)}),
  tracked: async ({declarations}, use) => use({track: declarations.track}),
})
async function filled(ui: MappingUI, spn: SpnSession, track: (id: string) => void) {
  return createDeclaration(new ImportListPage(ui.page), ui.workspace, spn, track)
}
import { CsvImportPage } from '../../pages/spn/CsvImportPage'
import { ajax } from '../../pages/spn/SpnApp'

const file = path.resolve(__dirname, '../../data/import/Import_01_Integer_All.csv')
const mappingName = process.env.SPN_IMPORT_INVOICE_MAPPING || 'TestMapping_CSVImport'
const invoiceNo = 'QA-Import-01-INV'
const products = Array.from({ length: 5 }, (_, i) => `20210824-135018-0${i + 1}`)

test.describe('Import · Add Invoice CSV Mapping', () => {
  test.describe.configure({ timeout: 300_000 })

  async function open(ui: Parameters<typeof filled>[0], spn: Parameters<typeof filled>[1], track: Parameters<typeof filled>[2]) {
    const draft = await filled(ui, spn, track)
    await ui.workspace.openAddInvoice()
    const csv = new CsvImportPage(ui.page)
    await expect(csv.form).toBeVisible()
    const id = await csv.mappingId(mappingName)
    expect(id, `Required Mapping: ${mappingName}`).not.toBeNull()
    await csv.mapping.selectOption(id!)
    await ajax(ui.page).idle()
    await expect(csv.fileInput.first()).toBeAttached()
    return { csv, draft, id: id! }
  }

  test('TC-FUNC-120: Add Invoice exposes Mapping and Product controls from the supplied screen @regression', async ({ ui, spn, tracked }) => {
    const { csv } = await open(ui, spn, tracked.track)
    await expect(csv.mapping.locator('option:checked')).toHaveText(mappingName)
    await expect(csv.form.getByRole('button', { name: 'Preview Data', exact: true })).toBeVisible()
    await expect(csv.importButton).toBeVisible()
    for (const text of ['ดึงข้อมูลจาก Master File', 'บันทึกข้อมูล Product ใหม่ลง Master File', 'Update existing product', 'Skip existing product']) {
      await expect(csv.form).toContainText(text)
    }
    await expect(csv.form.locator('input[type=checkbox]')).toHaveCount(4)
    await expect(csv.form.locator('input[type=radio][name="saveProductType"]')).toHaveCount(2)
  })

  test('TC-FUNC-121: Mapping accepts the original five-row CSV without changing its encoding @regression', async ({ ui, spn, tracked }, info) => {
    const { csv } = await open(ui, spn, tracked.track)
    await csv.fileInput.first().setInputFiles(file)
    expect(await csv.fileInput.first().evaluate((el: HTMLInputElement) => Array.from(el.files || [], f => f.name))).toEqual(['Import_01_Integer_All.csv'])
    await info.attach('input-original.csv', { path: file, contentType: 'text/csv' })
    // Selection/upload alone must not create an invoice.
    await expect(ui.workspace.treeInvoice(invoiceNo)).toHaveCount(0)
  })

  test('TC-FUNC-122: Import without a file rejects the request and creates no Invoice @regression', async ({ ui, spn, tracked, dialogs }) => {
    const { csv, draft } = await open(ui, spn, tracked.track)
    const before = dialogs.records.length
    await csv.importButton.click()
    await expect.poll(() => dialogs.records.slice(before).map(d => d.message).join(' '), { message: 'New missing-file validation dialog' }).toMatch(/file|ไฟล์/i)
    await ui.workspace.open(spn, draft.id)
    expect(await ui.workspace.counts()).toEqual({ invoices: 0, items: 0 })
  })

  test('TC-FUNC-123: Preview Data displays the CSV invoice and all five product codes without saving @regression', async ({ ui, spn, tracked }, info) => {
    const { csv, draft } = await open(ui, spn, tracked.track)
    await csv.fileInput.first().setInputFiles(file)
    const previews: typeof ui.page[] = []
    const onPopup = (page: typeof ui.page) => { previews.push(page) }
    ui.page.on('popup', onPopup)
    try {
      await csv.form.getByRole('button', { name: 'Preview Data', exact: true }).click()
      let text = ''
      await expect.poll(async () => {
        const pieces: string[] = []
        for (const page of [ui.page, ...previews]) for (const frame of page.frames()) {
          pieces.push(await frame.locator('body').innerText({ timeout: 2_000 }).catch(() => ''))
        }
        text = pieces.join('\n')
        return [invoiceNo, ...products].every(value => text.includes(value))
      }, { timeout: 60_000, message: 'Preview contains the invoice and every CSV product' }).toBe(true)
      expect(text).not.toMatch(/Fatal error|Warning:|NaN|Infinity/i)
      await info.attach('preview.txt', { body: text, contentType: 'text/plain' })
    } finally {
      ui.page.off('popup', onPopup)
      for (const page of previews) await page.close()
    }
    await ui.workspace.open(spn, draft.id)
    expect(await ui.workspace.counts()).toEqual({ invoices: 0, items: 0 })
  })

  test('TC-FUNC-124: Import mapped CSV persists one Invoice and five Import Items with integer amounts @regression', async ({ ui, spn, tracked }, info) => {
    const { csv, draft, id } = await open(ui, spn, tracked.track)
    // Do not read or write Product master in this case: compare CSV values directly.
    for (const checkbox of await csv.form.locator('input[type=checkbox]:checked').all()) await checkbox.uncheck()
    const result = await csv.importFile(id, file)
    expect(result).not.toMatch(/Fatal error|Warning:|SQLSTATE|NaN|Infinity/i)
    expect(result).toMatch(/success/i)
    await info.attach('input-original.csv', { path: file, contentType: 'text/csv' })
    await ui.workspace.open(spn, draft.id)
    expect(await ui.workspace.counts()).toEqual({ invoices: 1, items: 5 })
    await ui.workspace.openTreeInvoice(invoiceNo)
    await expect(ui.invoice.invoiceNo).toHaveValue(invoiceNo)
    await expect(ui.invoice.currency).toHaveValue('USD')
    for (let i = 0; i < 5; i++) {
      await ui.workspace.openTreeItem(String(i + 1).padStart(4, '0'))
      await expect.poll(() => ui.item.detail.locator('input').evaluateAll((inputs, code) => inputs.some(input => (input as HTMLInputElement).value === code), products[i]), { message: `Persisted CSV product ${products[i]}` }).toBe(true)
      await expect(ui.item.field('englishDescriptionOfGoods')).toHaveValue('CBC TRAY CLIP TRAY CLIP')
      await expect(ui.item.field('originCountry')).toHaveValue('JP')
      await expect(ui.item.field('tariffCode')).toHaveValue('000085423100')
      await expect(ui.item.field('statisticalCode')).toHaveValue('000')
      await expect(ui.item.field('privilegeCode')).toHaveValue('000')
      await expect(ui.item.field('tariffSequence')).toHaveValue(String(50070 + i))
      for (const [field, value] of Object.entries({ invoiceQuantity: 12, quantity: 12, netWeight: 12, invoiceAmountForeign: 120 })) {
        expect(Number(await ui.item.field(field).inputValue()), `CSV row ${i + 1}: ${field}`).toBe(value)
      }
    }
  })

  test('TC-FUNC-125: Master File lookup and Field Product selector are available on Add Invoice @regression', async ({ ui, spn, tracked }) => {
    const { csv } = await open(ui, spn, tracked.track)
    const checks = csv.form.locator('input[type=checkbox]')
    await expect(checks).toHaveCount(4)
    await checks.nth(0).check()
    await expect(checks.nth(0)).toBeChecked()
    const button = csv.form.getByRole('button', { name: 'เลือก Field Product', exact: true })
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
    await checks.nth(0).uncheck()
    await expect(checks.nth(0)).not.toBeChecked()
  })

  test('TC-FUNC-126: Product master Import Export and Update Skip options can be selected without saving master data @regression', async ({ ui, spn, tracked }) => {
    const { csv } = await open(ui, spn, tracked.track)
    const checks = csv.form.locator('input[type=checkbox]')
    await expect(checks).toHaveCount(4)
    await checks.nth(1).check()
    await expect(checks.nth(1)).toBeChecked()
    for (const index of [2, 3]) {
      await expect(checks.nth(index)).toBeEnabled()
      await checks.nth(index).check()
      await expect(checks.nth(index)).toBeChecked()
      await checks.nth(index).uncheck()
    }
    const modes = csv.form.locator('input[type=radio][name="saveProductType"]')
    await expect(modes).toHaveCount(2)
    await modes.nth(0).check()
    await expect(modes.nth(0)).toBeChecked()
    await expect(modes.nth(1)).not.toBeChecked()
    await modes.nth(1).check()
    await expect(modes.nth(1)).toBeChecked()
    await expect(modes.nth(0)).not.toBeChecked()
    await checks.nth(1).uncheck()
    // No Import click while master-save is selected: existing products stay untouched.
  })
})
