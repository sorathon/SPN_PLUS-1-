import { test, expect } from './_shared'
import { ExportPrintPage, EXPORT_FORMATS, ExportFormat } from '../../pages/spn/ExportPrintPage'
import { captureDownload } from '../../pages/spn/SpnApp'
import { expectValue } from '../../pages/reportedExpect'

/**
 * Import Declaration · [ExportFile] — "Export to → Export File" of a declaration, every format.
 * Works on an EXISTING declaration with Status "เอกสารพร้อมส่ง" (first one the list finds),
 * read-only: the page is opened by URL and only Export File is clicked.
 * A site with no "เอกสารพร้อมส่ง" declaration skips this group.
 */
const startsWith = (data: Buffer, magic: string) => data.subarray(0, magic.length).equals(Buffer.from(magic, 'latin1'))

const IDS: Record<ExportFormat, string> = {
  PDFformat: 'TC-FUNC-071',
  XMLformat: 'TC-FUNC-072',
  TIFFformat: 'TC-FUNC-073',
  Datatypeformat: 'TC-FUNC-074',
  XLSformat: 'TC-FUNC-075',
  XLSnewFormat: 'TC-FUNC-076',
  INVXLSformat: 'TC-FUNC-077',
  CSVformat: 'TC-FUNC-078',
}

test.describe('[ExportFile]', () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ page, spn, validatedDeclaration: v }) => {
    test.skip(!v, 'no declaration with Status "เอกสารพร้อมส่ง" on this site')
    await new ExportPrintPage(page).open(spn, v!.id)
  })

  test('TC-FUNC-070: Export to lists every export format @smoke', async ({ page }) => {
    const ui = new ExportPrintPage(page)

    await test.step('Verify the Export to choices', async () => {
      await expect(ui.exportButton, 'Export File button').toBeVisible()
      await expectValue(await ui.exportOptions(), Object.keys(EXPORT_FORMATS), 'Export to · formats')
    })
  })

  for (const [format, { label, ext }] of Object.entries(EXPORT_FORMATS) as [ExportFormat, (typeof EXPORT_FORMATS)[ExportFormat]][]) {
    test(`${IDS[format]}: Export to "${label}" downloads the declaration as .${ext} @regression`, async ({ page, validatedDeclaration: v }) => {
      const ui = new ExportPrintPage(page)

      const file = await test.step(`Choose "${label}" and click Export File`, async () => {
        await ui.exportTo.selectOption(format)
        return captureDownload(page, () => ui.exportButton.click())
      })

      await test.step('Verify the file name, type and content', async () => {
        await expectValue(file.fileName, `${v!.referenceNo}.${ext}`, 'Export · file name')
        expect(file.data.length, 'Export · file is not empty').toBeGreaterThan(0)
        if (ext === 'pdf') expect(startsWith(file.data, '%PDF'), 'Export · PDF file').toBe(true)
        if (ext === 'tif') expect(startsWith(file.data, 'II*\0') || startsWith(file.data, 'MM\0*'), 'Export · TIFF file').toBe(true)
        // .xlsx is itself a zip ("PK")
        if (ext === 'xlsx') expect(startsWith(file.data, 'PK'), 'Export · XLSX file').toBe(true)
        if (ext === 'xml') {
          const xml = file.data.toString('utf8')
          expect(xml, 'XML · reference no').toContain(`<ReferenceNumber>${v!.referenceNo}</ReferenceNumber>`)
          expect(xml, 'XML · importer tax no').toContain(`<TaxNumber>${v!.importer.companyTaxNo}</TaxNumber>`)
        }
        if (ext === 'dat') {
          // PHP array dump (TIS-620 text) — the ASCII keys/values are checked
          expect(file.data.toString('latin1'), 'Dat · reference no').toContain(`'referenceNo' => '${v!.referenceNo}'`)
        }
        if (ext === 'csv') {
          const csv = file.data.toString('utf8')
          expect(csv, 'CSV · item columns header').toContain('"Item No."')
          expect(csv, 'CSV · reference no').toContain(v!.referenceNo)
        }
      })
    })
  }
})
