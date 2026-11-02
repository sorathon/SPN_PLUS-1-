import fs from 'fs'
import path from 'path'
import { test, expect } from '../../fixtures'
import { today } from '../../data/factories'
import { companyNameInList } from '../../pages/spn/WorkspacePage'
import { readZip } from '../../data/zip'
import { expectFieldText, expectFieldCount, expectValue } from '../../pages/reportedExpect'
import { createDeclaration, addInvoiceWithItem, Created } from './_shared'
import type { ImportListPage } from '../../pages/spn/ImportListPage'
import type { SpnSession } from '../../pages/spn/SpnApp'

/**
 * Import Declaration · [Copy, Import, Delete & View] — Copy from the list, Copy Decl
 * Control (header only), Copy New (prompt), Import Data.dat/XML (round trip of an
 * exported XML), Delete with cancel/confirm, and the read-only Event view.
 * Data: every test creates its own declaration; copies/imports are tracked and deleted too.
 */
test.describe('[Copy, Import, Delete & View]', () => {
  // create + copy/import + re-open = many full-page form posts on the dev server
  test.describe.configure({ timeout: 180_000 })

  test('TC-FUNC-060: Copy on the list duplicates the ticked declaration @smoke', async ({ spn, listPage, workspacePage, declarations }) => {
    const original = await test.step('Create a declaration', async () => createDeclaration(listPage, workspacePage, spn, declarations.track))

    await test.step('Tick it on the list and click Copy', async () => {
      await listPage.open(spn)
      await listPage.search({ keyword: original.header.jobNo, by: 'jobNo' })
      await listPage.select(original.id)
      await listPage.copySelected()
    })

    const copyRef = await test.step('Verify a second declaration with the same Job No exists', async () => {
      await listPage.search({ keyword: original.header.jobNo, by: 'jobNo' })
      await expectFieldCount(listPage.rows, 2, 'List · original + copy')
      const refs = await listPage.referenceNumbers()
      const copy = refs.find((r) => r !== original.referenceNo)!
      expect(copy, 'Copy · has its own reference no').toMatch(/^[A-Z]{4}\d{9}$/)
      declarations.track(await listPage.idOf(copy))
      return copy
    })

    await test.step('Verify the copy carries the header data', async () => {
      const row = listPage.rowFor(copyRef)
      await expectFieldText(listPage.cell(row, 'job'), original.header.jobNo, 'Copy · Job No')
      await expectFieldText(listPage.cell(row, 'vessel'), original.picked.vessel, 'Copy · vessel')
      await expectFieldText(listPage.cell(row, 'mawb'), original.header.mawb, 'Copy · MAWB')
      await expectFieldText(listPage.cell(row, 'hawb'), original.header.hawb, 'Copy · HAWB')
      await expectFieldText(listPage.cell(row, 'company'), companyNameInList(original.picked.importer.companyName), 'Copy · importer')
    })
  })

  test('TC-FUNC-061: Copy without a ticked row asks to choose a record @regression', async ({ spn, listPage, dialogs }) => {
    await listPage.open(spn)

    await test.step('Click Copy with nothing ticked', async () => {
      await listPage.copyButton.click()
    })

    await test.step('Verify the alert', async () => {
      const alert = await dialogs.waitFor(/Please choose record to Copy/)
      await expectValue(alert.message, 'Please choose record to Copy', 'Copy · alert text')
    })
  })

  test('TC-FUNC-062: Copy Decl Control copies the header only @regression', async ({
    spn,
    listPage,
    workspacePage,
    invoicePage,
    itemPage,
    declarations,
    dialogs,
  }) => {
    const original = await test.step('Create a declaration with an invoice and an item', async () => {
      const created = await createDeclaration(listPage, workspacePage, spn, declarations.track)
      await addInvoiceWithItem(workspacePage, invoicePage, itemPage)
      return created
    })

    await test.step('Click Copy Decl Control and confirm', async () => {
      await workspacePage.open(spn, original.id)
      await workspacePage.copyHeaderOnly()
      const confirm = await dialogs.waitFor(/ยืนยันการคัดลอกใบขนสินค้าส่วน Control/)
      expect(confirm.type, 'Copy Decl Control · asks for confirmation').toBe('confirm')
    })

    await test.step('Verify the copy opens with the same header and no invoice', async () => {
      const copyId = workspacePage.idFromUrl()
      declarations.track(copyId)
      expect(copyId, 'Copy · a new record').not.toBe(original.id)
      await expect(workspacePage.referenceNo, 'Copy · own reference no').not.toHaveText(original.referenceNo)
      await expectValue(await workspacePage.propertyCounts(), { invoices: 0, items: 0 }, 'Copy · header only — no invoice, no item')
      await expectFieldText(workspacePage.field('importerCode'), original.picked.importer.importerCode, 'Copy · importer')
      await expectFieldText(workspacePage.field('vessel'), original.picked.vessel, 'Copy · vessel')
      await expectFieldText(workspacePage.field('mawb'), original.header.mawb, 'Copy · MAWB')
      await expectFieldText(workspacePage.field('hawb'), original.header.hawb, 'Copy · HAWB')
    })
  })

  test('TC-FUNC-063: Copy New creates one copy with the configured count prompt @regression', async ({
    spn,
    listPage,
    workspacePage,
    invoicePage,
    itemPage,
    declarations,
    dialogs,
  }) => {
    const original = await test.step('Create a declaration with an invoice and an item', async () => {
      const created = await createDeclaration(listPage, workspacePage, spn, declarations.track)
      const { invoice } = await addInvoiceWithItem(workspacePage, invoicePage, itemPage)
      return { ...created, invoice }
    })

    await test.step('Click Copy New; answer 1 when MultipleCopy is configured', async () => {
      await workspacePage.open(spn, original.id)
      dialogs.answerNext({ accept: true, promptText: '1' })
      await workspacePage.copyNew()
      // UAT copyDecl() only asks for a count when getParameter().MultipleCopy
      // exists; otherwise it defaults to one. The new id and copied data below
      // are required in both configurations.
      const prompt = dialogs.records.find((r) => /กรุณากรอกจำนวนที่ต้องการ copy/.test(r.message))
      if (prompt) expect(prompt.type, 'Copy New · count dialog').toBe('prompt')
      else test.info().annotations.push({ type: 'info', description: 'MultipleCopy prompt absent; site default is one copy' })
    })

    await test.step('Verify the copy opens with header, invoice and item', async () => {
      const copyId = workspacePage.idFromUrl()
      declarations.track(copyId)
      expect(copyId, 'Copy · a new record').not.toBe(original.id)
      await expect(workspacePage.referenceNo, 'Copy · own reference no').not.toHaveText(original.referenceNo)
      await expectFieldText(workspacePage.field('mawb'), original.header.mawb, 'Copy · MAWB')
      await expect(workspacePage.treeInvoice(original.invoice.invoiceNo), 'Copy · invoice copied').toBeVisible()
      await expectFieldCount(workspacePage.treeItems(), 1, 'Copy · items copied')
    })
  })

  test('TC-FUNC-064: Import Data.dat/XML loads an exported XML as a new declaration @regression', async ({
    spn,
    listPage,
    workspacePage,
    invoicePage,
    itemPage,
    declarations,
    dialogs,
  }, testInfo) => {
    const original = await test.step('Create a declaration with an invoice and an item', async () => {
      const created = await createDeclaration(listPage, workspacePage, spn, declarations.track)
      await addInvoiceWithItem(workspacePage, invoicePage, itemPage)
      return created
    })

    const xmlFile = await test.step('Export it with Save XML', async () => exportXml(listPage, spn, original, testInfo.outputPath()))

    await test.step('Choose the XML file and click Import', async () => {
      await listPage.open(spn)
      await listPage.importDataFile(xmlFile)
      const alert = await dialogs.waitFor(/Upload Completed/)
      await expectValue(alert.message, 'Upload Completed', 'Import · result')
    })

    await test.step('Verify a new declaration with the same MAWB/HAWB was created', async () => {
      await listPage.search({ keyword: original.header.mawb, by: 'masterBillOfLanding' })
      await expectFieldCount(listPage.rows, 2, 'List · original + imported')
      const imported = (await listPage.referenceNumbers()).find((r) => r !== original.referenceNo)!
      declarations.track(await listPage.idOf(imported))
      const row = listPage.rowFor(imported)
      await expectFieldText(listPage.cell(row, 'mawb'), original.header.mawb, 'Imported · MAWB')
      await expectFieldText(listPage.cell(row, 'hawb'), original.header.hawb, 'Imported · HAWB')
      await expectFieldText(listPage.cell(row, 'vessel'), original.picked.vessel, 'Imported · vessel')
      await expectFieldText(listPage.cell(row, 'company'), companyNameInList(original.picked.importer.companyName), 'Imported · importer')
    })
  })

  test('TC-FUNC-068: Import Data.dat/XML loads an exported .dat as a new declaration @regression', async ({
    spn,
    listPage,
    workspacePage,
    invoicePage,
    itemPage,
    declarations,
    dialogs,
  }, testInfo) => {
    const original = await test.step('Create a declaration with an invoice and an item', async () => {
      const created = await createDeclaration(listPage, workspacePage, spn, declarations.track)
      await addInvoiceWithItem(workspacePage, invoicePage, itemPage)
      return created
    })

    const datFile = await test.step('Export it with Save Dat', async () => exportFile(listPage, spn, original, 'Save Dat', testInfo.outputPath()))

    await test.step('Choose the .dat file and click Import', async () => {
      await listPage.open(spn)
      await listPage.importDataFile(datFile)
      const alert = await dialogs.waitFor(/Upload Completed/)
      await expectValue(alert.message, 'Upload Completed', 'Import · result')
    })

    await test.step('Verify a new declaration with the same MAWB/HAWB was created', async () => {
      await listPage.search({ keyword: original.header.mawb, by: 'masterBillOfLanding' })
      await expectFieldCount(listPage.rows, 2, 'List · original + imported')
      const imported = (await listPage.referenceNumbers()).find((r) => r !== original.referenceNo)!
      declarations.track(await listPage.idOf(imported))
      const row = listPage.rowFor(imported)
      await expectFieldText(listPage.cell(row, 'mawb'), original.header.mawb, 'Imported · MAWB')
      await expectFieldText(listPage.cell(row, 'hawb'), original.header.hawb, 'Imported · HAWB')
      await expectFieldText(listPage.cell(row, 'vessel'), original.picked.vessel, 'Imported · vessel')
      await expectFieldText(listPage.cell(row, 'company'), companyNameInList(original.picked.importer.companyName), 'Imported · importer')
    })
  })

  test('TC-FUNC-067: Import of an XML without invoices is rejected @regression', async ({
    spn,
    listPage,
    workspacePage,
    declarations,
    dialogs,
  }, testInfo) => {
    const original = await test.step('Create a declaration with a header only', async () =>
      createDeclaration(listPage, workspacePage, spn, declarations.track),
    )
    const xmlFile = await test.step('Export it with Save XML', async () => exportXml(listPage, spn, original, testInfo.outputPath()))

    await test.step('Import the XML', async () => {
      await listPage.open(spn)
      // waits for the page's own reload after the alert — navigating away earlier collides with it
      await listPage.importDataFile(xmlFile)
    })

    await test.step('Verify the "no invoices" alert and that nothing was created', async () => {
      const alert = await dialogs.waitFor(/ไม่มีข้อมูล invoices/)
      await expectValue(alert.message, 'ไม่มีข้อมูล invoices ในไฟล์ xml นี้', 'Import · rejection message')
      await listPage.open(spn)
      await listPage.search({ keyword: original.header.mawb, by: 'masterBillOfLanding' })
      await expectValue(await listPage.referenceNumbers(), [original.referenceNo], 'List · only the original has this MAWB')
    })
  })

  test('TC-FUNC-065: Delete asks for confirmation — cancel keeps, OK removes @regression', async ({
    spn,
    listPage,
    workspacePage,
    declarations,
    dialogs,
  }) => {
    const created = await test.step('Create a declaration', async () => createDeclaration(listPage, workspacePage, spn, declarations.track))

    await test.step('Click Delete and cancel the confirmation', async () => {
      await listPage.open(spn)
      await listPage.search({ referenceNo: created.referenceNo })
      dialogs.answerNext({ accept: false })
      await listPage.deleteIcon(created.referenceNo).click()
      const confirm = await dialogs.waitFor(/Do you want to delete this document/)
      expect(confirm.type, 'Delete · asks for confirmation').toBe('confirm')
    })

    await test.step('Verify the declaration is still listed', async () => {
      await listPage.search({ referenceNo: created.referenceNo })
      await expectFieldCount(listPage.rows, 1, 'List · rows after cancel')
    })

    await test.step('Click Delete and confirm', async () => {
      await listPage.deleteRow(created.referenceNo)
    })

    await test.step('Verify the declaration is gone', async () => {
      await listPage.search({ referenceNo: created.referenceNo })
      await expect(listPage.heading, 'List · search ran').toBeVisible()
      await expectFieldCount(listPage.rows, 0, 'List · rows after delete')
    })
  })

  test('TC-FUNC-066: Event view shows the header, invoice and item of the declaration @regression', async ({
    page,
    spn,
    listPage,
    workspacePage,
    invoicePage,
    itemPage,
    viewPage,
    declarations,
  }) => {
    const created = await test.step('Create a declaration with an invoice and an item', async () => {
      const c = await createDeclaration(listPage, workspacePage, spn, declarations.track)
      const lines = await addInvoiceWithItem(workspacePage, invoicePage, itemPage)
      return { ...c, ...lines }
    })

    await test.step('Click the row Event icon', async () => {
      await listPage.open(spn)
      await listPage.search({ referenceNo: created.referenceNo })
      await listPage.eventIcon(created.referenceNo).click()
      await expect(page, 'URL · VIEW action').toHaveURL(/ACTION=VIEW/)
      await expect(viewPage.heading, 'View · heading').toBeVisible()
    })

    await test.step('Verify the header values', async () => {
      const [header] = await viewPage.table('Reference No.')
      await expectValue(header['Reference No.'], created.referenceNo, 'View · Reference No.')
      await expectValue(header['Reference Date'], today().display, 'View · Reference Date')
      await expectValue(header['Vessel Name'], created.picked.vessel, 'View · Vessel Name')
      await expectValue(header['MAWB'], created.header.mawb, 'View · MAWB')
      await expectValue(header['HAWB'], created.header.hawb, 'View · HAWB')
      await expectValue(header['Importer Tax'], created.picked.importer.companyTaxNo, 'View · Importer Tax')
      await expectValue(header['Importer Name'], created.picked.importer.companyName, 'View · Importer Name')
      await expectValue(header['Origin Country'], created.header.originCountry, 'View · Origin Country')
      await expectValue(header['Total Package'], created.header.packageAmount, 'View · Total Package')
      await expectValue(header['Package Unit'], created.header.packageUnit, 'View · Package Unit')
      await expectValue(header['Shipping Mark'], created.header.shippingMark, 'View · Shipping Mark')
    })

    await test.step('Verify the invoice and item values', async () => {
      const invoices = await viewPage.table('Invoice No.')
      await expectValue(invoices.length, 1, 'View · invoices')
      await expectValue(invoices[0]['Invoice No.'], created.invoice.invoiceNo, 'View · Invoice No.')
      await expectValue(invoices[0]['consignorName'], created.consignor.name, 'View · consignor')
      const items = await viewPage.table('invoiceItem')
      await expectValue(items.length, 1, 'View · items')
      await expectValue(items[0]['tariffCode'], created.item.tariff.value, 'View · tariffCode')
      await expectValue(items[0]['englishDescriptionOfGoods'], created.item.englishDescription, 'View · English description')
      await expectValue(items[0]['quantityUnit'], created.item.quantityUnit, 'View · quantity unit')
    })
  })
})

/** Export one declaration from the list and write the file out of the zip (the Import field takes .xml/.dat). */
async function exportFile(listPage: ImportListPage, spn: SpnSession, decl: Created, button: 'Save XML' | 'Save Dat', dir: string): Promise<string> {
  await listPage.open(spn)
  await listPage.search({ referenceNo: decl.referenceNo })
  await listPage.select(decl.id)
  const download = await listPage.export(button)
  const [entry] = readZip(await download.path())
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, entry.name)
  fs.writeFileSync(file, entry.data)
  return file
}

function exportXml(listPage: ImportListPage, spn: SpnSession, decl: Created, dir: string): Promise<string> {
  return exportFile(listPage, spn, decl, 'Save XML', dir)
}
