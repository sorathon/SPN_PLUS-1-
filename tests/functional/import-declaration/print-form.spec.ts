import { test, expect } from './_shared'
import { ExportPrintPage, PRINT_FORMS, PrintForm } from '../../pages/spn/ExportPrintPage'
import { captureDownload } from '../../pages/spn/SpnApp'
import { PrintFormWindow } from '../../pages/spn/Popups'
import { expectValue } from '../../pages/reportedExpect'

/**
 * Import Declaration · [PrintForm] — "Print Form → Print Form" of a declaration, every form.
 * Works on an EXISTING declaration with Status "เอกสารพร้อมส่ง" (first one the list finds):
 * the ใบนำคีย์ forms need a validated declaration. Read-only: the page is opened by URL and
 * only Print Form is clicked.
 * A site with no "เอกสารพร้อมส่ง" declaration skips this group.
 */
const startsWith = (data: Buffer, magic: string) => data.subarray(0, magic.length).equals(Buffer.from(magic, 'latin1'))

/** Forms that open a window with an HTML form → the title shown in it. */
const HTML_FORMS: Partial<Record<PrintForm, { id: string; title: string | RegExp }>> = {
  customPermitReport: { id: 'TC-FUNC-080', title: 'Customs permit' },
  Insurance: { id: 'TC-FUNC-081', title: 'สัญญาประกัน' },
  earlyReceive: { id: 'TC-FUNC-082', title: 'คำร้องขอผ่อนผันรับของ / ส่งของออกไปก่อน' },
  printExciseXLS: { id: 'TC-FUNC-083', title: 'แบบขออากรแสตมป์' },
  spiritImport: { id: 'TC-FUNC-084', title: 'ใบขออนุญาตขนสุรา' },
  numkeyReport2: { id: 'TC-FUNC-090', title: /คู่มือระบบพิธีการศุลกากรนำเข้าทางอิเล็กทรอนิกส์/ },
}

/** Forms that download a PDF → `named`: the file is "<reference no>.pdf" (others get a generated name). */
const PDF_FORMS: Partial<Record<PrintForm, { id: string; title: string; named: boolean }>> = {
  decl: { id: 'TC-FUNC-085', title: 'ใบขนปากระวาง', named: false },
  numkeyReport: { id: 'TC-FUNC-086', title: 'ใบนำคีย์', named: false },
  printExciseID: { id: 'TC-FUNC-087', title: 'แบบแสดงภาษีสุรา', named: false },
  printExcise_new: { id: 'TC-FUNC-088', title: 'แบบแสดงภาษีสุรา (New)', named: false },
  numkeyReportOnline: { id: 'TC-FUNC-089', title: 'ใบนำคีย์ (Online)', named: true },
}

test.describe('[PrintForm]', () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page, spn, validatedDeclaration: v }) => {
    test.skip(!v, 'no declaration with Status "เอกสารพร้อมส่ง" on this site')
    await new ExportPrintPage(page).open(spn, v!.id)
  })

  test('TC-FUNC-079: Print Form lists every form @smoke', async ({ page }) => {
    const ui = new ExportPrintPage(page)

    await test.step('Verify the Print Form choices', async () => {
      await expect(ui.printButton, 'Print Form button').toBeVisible()
      await expectValue(await ui.printOptions(), [...PRINT_FORMS], 'Print Form · forms')
    })
  })

  for (const [form, { id, title }] of Object.entries(HTML_FORMS) as [PrintForm, { id: string; title: string | RegExp }][]) {
    test(`${id}: Print Form "${form}" opens the form window @regression`, async ({ page, validatedDeclaration: v }) => {
      const ui = new ExportPrintPage(page)

      const popup = await test.step(`Choose "${form}" and click Print Form`, async () => {
        await ui.printForm.selectOption(form)
        const opened = page.waitForEvent('popup')
        await ui.printButton.click()
        return new PrintFormWindow(await opened)
      })

      await test.step('Verify the form window', async () => {
        await expect(popup.title(title), `${form} · title`).toBeVisible()
        await expect(popup.serverError, `${form} · no server error`).toHaveCount(0)
        if (form === 'Insurance') {
          // substring: the line also carries the importer's name and address
          await expect(popup.body, 'สัญญาประกัน · importer tax no').toContainText(v!.importer.companyTaxNo)
        }
      })
      await popup.page.close()
    })
  }

  for (const [form, { id, title, named }] of Object.entries(PDF_FORMS) as [PrintForm, { id: string; title: string; named: boolean }][]) {
    test(`${id}: Print Form "${title}" downloads a PDF @regression`, async ({ page, validatedDeclaration: v }) => {
      const ui = new ExportPrintPage(page)

      const file = await test.step(`Choose "${title}" and click Print Form`, async () => {
        await ui.printForm.selectOption(form)
        return captureDownload(page, () => ui.printButton.click())
      })

      await test.step('Verify the PDF', async () => {
        if (named) await expectValue(file.fileName, `${v!.referenceNo}.pdf`, `${title} · file name`)
        else expect(file.fileName, `${title} · .pdf file`).toMatch(/\.pdf$/)
        expect(startsWith(file.data, '%PDF'), `${title} · file is a PDF`).toBe(true)
      })
    })
  }
})
