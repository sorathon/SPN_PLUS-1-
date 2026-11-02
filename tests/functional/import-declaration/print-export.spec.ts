import fs from 'fs'
import { test, expect, SharedDeclaration } from './_shared'
import { readZip } from '../../data/zip'
import { EXPORT_BUTTONS, ExportButton } from '../../pages/spn/ImportListPage'
import { PrintSettingPopup } from '../../pages/spn/Popups'
import { expectValue } from '../../pages/reportedExpect'

/**
 * Import Declaration · [Print & Export] — Print (workspace toolbar, list Print icon →
 * Print Setting → Start Print) and every footer export of the list (Save XML, XML with
 * Decl No., PDF, Tiff, XLS, XLS New, Dat, Form Vat), incl. the "no row ticked" alerts.
 * Data: read-only — all cases share one declaration (`sharedDeclaration`).
 * Downloaded files are opened and checked (file name, file type, key values).
 */
const PDF = '%PDF'
const startsWith = (data: Buffer, magic: string | Buffer) => data.subarray(0, magic.length).equals(Buffer.from(magic))

test.describe('[Print & Export]', () => {
  test.describe.configure({ timeout: 120_000 })

  test('TC-FUNC-040: Print on the workspace toolbar downloads the declaration PDF @smoke', async ({ spn, workspacePage, sharedDeclaration: d }) => {
    await workspacePage.open(spn, d.id)

    const pdf = await test.step('Click Print', async () => workspacePage.print())

    await test.step('Verify the PDF of this declaration', async () => {
      await expectValue(pdf.fileName, `${d.referenceNo}.pdf`, 'Print · file name')
      expect(startsWith(pdf.data, PDF), 'Print · file is a PDF').toBe(true)
    })
  })

  test('TC-FUNC-041: list Print icon → Print Setting → Start Print downloads the PDF @regression', async ({
    page,
    spn,
    listPage,
    sharedDeclaration: d,
  }) => {
    await listPage.open(spn)
    await listPage.search({ referenceNo: d.referenceNo })

    const popup = await test.step('Click the row Print icon', async () => {
      const opened = page.waitForEvent('popup')
      await listPage.printIcon(d.referenceNo).click()
      return new PrintSettingPopup(await opened)
    })

    await test.step('Verify the Print Setting window', async () => {
      await expect(popup.title, 'Print Setting · title').toBeVisible()
      await expect(popup.startPrint, 'Print Setting · Start Print').toBeVisible()
    })

    const pdf = await test.step('Start Print with the default profile', async () => popup.print())

    await test.step('Verify the PDF of this declaration', async () => {
      await expectValue(pdf.fileName, `${d.referenceNo}.pdf`, 'Print · file name')
      expect(startsWith(pdf.data, PDF), 'Print · file is a PDF').toBe(true)
    })
  })

  const exports: { id: string; button: ExportButton; ext: string; check: (data: Buffer, d: SharedDeclaration) => void }[] = [
    {
      id: 'TC-FUNC-042',
      button: 'Save XML',
      ext: 'xml',
      check: (data, d) => {
        const xml = data.toString('utf8')
        expect(xml, 'XML · reference no').toContain(`<ReferenceNumber>${d.referenceNo}</ReferenceNumber>`)
        expect(xml, 'XML · importer tax no').toContain(`<TaxNumber>${d.picked.importer.companyTaxNo}</TaxNumber>`)
        expect(xml, 'XML · vessel').toContain(`<VesselName>${d.picked.vessel}</VesselName>`)
        expect(xml, 'XML · MAWB').toContain(`<Master>${d.header.mawb}</Master>`)
        expect(xml, 'XML · HAWB').toContain(`<House>${d.header.hawb}</House>`)
        expect(xml, 'XML · invoice no').toContain(`<Number><![CDATA[${d.invoice.invoiceNo}]]></Number>`)
        expect(xml, 'XML · tariff code').toContain(`<Code>${d.item.tariff.value}</Code>`)
      },
    },
    {
      id: 'TC-FUNC-043',
      button: 'Save XML with Decl No.',
      ext: 'xml',
      check: (data, d) => expect(data.toString('utf8'), 'XML · reference no').toContain(`<ReferenceNumber>${d.referenceNo}</ReferenceNumber>`),
    },
    { id: 'TC-FUNC-044', button: 'Save PDF', ext: 'pdf', check: (data) => expect(startsWith(data, PDF), 'PDF · file type').toBe(true) },
    {
      id: 'TC-FUNC-045',
      button: 'Save Tiff',
      ext: 'tif',
      check: (data) => expect(startsWith(data, 'II*\0') || startsWith(data, 'MM\0*'), 'Tiff · file type').toBe(true),
    },
    // .xlsx is itself a zip ("PK")
    { id: 'TC-FUNC-046', button: 'Save XLS', ext: 'xlsx', check: (data) => expect(startsWith(data, 'PK'), 'XLSX · file type').toBe(true) },
    { id: 'TC-FUNC-047', button: 'Save XLS New', ext: 'xlsx', check: (data) => expect(startsWith(data, 'PK'), 'XLSX · file type').toBe(true) },
    {
      id: 'TC-FUNC-048',
      button: 'Save Dat',
      ext: 'dat',
      check: (data, d) => {
        // a PHP array dump of the declaration (TIS-620 text) — the ASCII keys/values are checked
        const dat = data.toString('latin1')
        expect(dat, 'Dat · reference no').toContain(`'referenceNo' => '${d.referenceNo}'`)
        expect(dat, 'Dat · MAWB').toContain(`'masterBillOfLanding' => '${d.header.mawb}'`)
        expect(dat, 'Dat · invoice no').toContain(`'invoiceNo' => '${d.invoice.invoiceNo}'`)
      },
    },
  ]

  for (const e of exports) {
    test(`${e.id}: ${e.button} exports the ticked declaration @regression`, async ({ spn, listPage, sharedDeclaration: d }) => {
      await listPage.open(spn)
      await listPage.search({ referenceNo: d.referenceNo })

      const download = await test.step(`Tick the declaration and click ${e.button}`, async () => {
        await listPage.select(d.id)
        return listPage.export(e.button)
      })

      await test.step(`Verify the zip holds ${d.referenceNo}.${e.ext} with the declaration data`, async () => {
        expect(download.suggestedFilename(), 'Export · a zip file').toMatch(/\.zip$/)
        const entries = readZip(await download.path())
        await expectValue(entries.map((x) => x.name), [`${d.referenceNo}.${e.ext}`], 'Export · files in the zip')
        e.check(entries[0].data, d)
      })
    })
  }

  test('TC-FUNC-049: Save Form Vat refuses a declaration that is not document type X0 @regression', async ({
    spn,
    listPage,
    dialogs,
    sharedDeclaration: d,
  }) => {
    await listPage.open(spn)
    await listPage.search({ referenceNo: d.referenceNo })

    await test.step('Tick the declaration (document type 0) and click Save Form Vat', async () => {
      await listPage.select(d.id)
      await listPage.exportButton('Save Form Vat').click()
    })

    await test.step('Verify the document-type error', async () => {
      const alert = await dialogs.waitFor(/Please choose file documentType X0/)
      await expectValue(alert.message, 'Error: Please choose file documentType X0', 'Form Vat · error message')
    })
  })

  test('TC-FUNC-050: every export button asks to choose a record when nothing is ticked @regression', async ({
    spn,
    listPage,
    dialogs,
    sharedDeclaration: _,
  }) => {
    await listPage.open(spn)

    for (const [button, message] of Object.entries(EXPORT_BUTTONS) as [keyof typeof EXPORT_BUTTONS, string][]) {
      await test.step(`${button} with no row ticked → "${message}"`, async () => {
        const before = dialogs.records.length
        await listPage.exportButton(button).click()
        await expect.poll(() => dialogs.records.length, { message: `${button} · an alert is shown` }).toBe(before + 1)
        await expectValue(dialogs.records[before].message, message, `${button} · alert text`)
      })
    }
  })

  test('TC-FUNC-051: "ชื่อไฟล์" option names the exported file by Job No @regression', async ({ spn, listPage, sharedDeclaration: d }) => {
    await listPage.open(spn)
    await listPage.search({ referenceNo: d.referenceNo })

    const download = await test.step('Choose ชื่อไฟล์ = jobNo, tick the declaration, Save XML', async () => {
      await listPage.fileNameOption.selectOption({ label: 'jobNo' })
      await listPage.select(d.id)
      return listPage.export('Save XML')
    })

    await test.step('Verify the XML inside the zip is named by the Job No', async () => {
      const entries = readZip(await download.path())
      await expectValue(entries.map((x) => x.name), [`${d.header.jobNo}.xml`], 'Export · file name by Job No')
    })
  })
})
