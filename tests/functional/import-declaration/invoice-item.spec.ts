import { test, expect } from '../../fixtures'
import { invoiceData, itemData, today } from '../../data/factories'
import { expectFieldText, expectFieldContains, expectFieldCount, expectValue } from '../../pages/reportedExpect'
import { ValidatePopup } from '../../pages/spn/Popups'
import { createDeclaration, addInvoiceWithItem } from './_shared'
import type { ImportItemMasterSelection } from '../../pages/spn/ItemPage'

/**
 * Import Declaration · [Invoice & Item] — Add Invoice (consignor/currency autocomplete),
 * item entry (tariff/country/unit autocomplete, Baht conversion), item copy/add/delete,
 * invoice list + delete, and the workspace processes (Calculate Tax, Re-Avg, Sum Item
 * to Inv., Validate, Match Master File, Extra note).
 * Data: every test creates its own declaration and deletes it afterwards.
 */
test.describe('[Invoice & Item]', () => {
  // Each test builds a declaration + invoice + item through ~15 full-page form posts
  // (≈ 60–90 s on the dev server) — the 30 s default can't hold one flow.
  test.describe.configure({ timeout: 180_000 })

  test.beforeEach(async ({ spn, listPage, workspacePage, declarations }) => {
    await createDeclaration(listPage, workspacePage, spn, declarations.track)
  })

  test('TC-FUNC-020: Add Invoice with consignor and currency autocomplete @smoke', async ({ spn, workspacePage, invoicePage, itemPage }) => {
    const invoice = invoiceData()

    await test.step('Open Add Invoice and start a new invoice', async () => {
      await workspacePage.openAddInvoice()
      await expect(invoicePage.addInvoiceHeading, 'Add invoice · landing page').toBeVisible()
      await invoicePage.startNewInvoice()
    })

    const consignor = await test.step('Fill invoice no/date, pick the first consignor ("%") and the currency', async () => {
      const picked = await invoicePage.fill(invoice)
      expect(picked.name, 'Invoice · consignor name is filled from the consignor record').not.toBe('')
      return picked
    })

    await test.step('Save the invoice', async () => {
      await invoicePage.save()
    })

    await test.step('Verify item 0001 of the new invoice opens and the tree shows the invoice', async () => {
      await expectFieldText(itemPage.itemNo, '0001', 'Item · first item no')
      await expectFieldText(itemPage.currency, invoice.currency, 'Item · currency inherited from the invoice')
      await expect(workspacePage.treeInvoice(invoice.invoiceNo), 'Tree · invoice node').toBeVisible()
    })

    await test.step('Verify the invoice list row', async () => {
      await workspacePage.open(spn, workspacePage.idFromUrl())
      await workspacePage.openInvoiceList()
      const row = workspacePage.invoiceRow(invoice.invoiceNo)
      await expectFieldCount(workspacePage.invoiceCheckboxes, 1, 'Invoice list · rows')
      await expectFieldText(workspacePage.invoiceCell(row, 'invoiceNo'), invoice.invoiceNo, 'Invoice list · invoice no')
      await expectFieldText(workspacePage.invoiceCell(row, 'invoiceDate'), today().display, 'Invoice list · invoice date')
      await expectFieldText(workspacePage.invoiceCell(row, 'consignor'), consignor.name, 'Invoice list · consignor')
      await expectFieldText(workspacePage.invoiceCell(row, 'amount'), `${invoice.totalInvoice} ${invoice.currency}`, 'Invoice list · total')
    })
  })

  test('TC-FUNC-021: item entry with autocomplete converts the amount to Baht @smoke', async ({ spn, workspacePage, invoicePage, itemPage }, info) => {
    const item = itemData()
    let selected: ImportItemMasterSelection

    await test.step('Add an invoice and fill item 0001', async () => {
      await workspacePage.openAddInvoice()
      await invoicePage.startNewInvoice()
      await invoicePage.fill(invoiceData())
      await invoicePage.save()
      selected = await itemPage.fill(item)
    })

    await test.step('Save the item', async () => {
      await itemPage.save()
    })

    await test.step('Verify the Baht amount = foreign amount × exchange rate of the day', async () => {
      // the rate is filled in by the save (it reads 0 while typing)
      const rate = Number(await itemPage.exchangeRate.inputValue())
      expect(rate, 'Item · exchange rate is loaded for the currency').toBeGreaterThan(0)
      await expectFieldText(itemPage.amountBaht, String(Math.round(Number(item.amountForeign) * rate * 100) / 100), 'Item · amount (Baht)')
    })

    await test.step('Verify the tree label shows qty and unit', async () => {
      // the label gets a trailing "Err." while the item still fails validation — not part of this check
      await expectFieldContains(workspacePage.treeItem('0001'), `0001(${item.quantity} ${item.quantityUnit})`, 'Tree · item label')
    })

    await test.step('Verify the item fields after re-opening it', async () => {
      await workspacePage.open(spn, workspacePage.idFromUrl())
      await workspacePage.openTreeItem('0001')
      await expectFieldText(itemPage.tariffCode, item.tariff.value, 'Item · tariff code')
      for (const name of ['statisticalCode', 'privilegeCode', 'tariffSequence'] as const)
        await expectFieldText(itemPage[name], selected[name], `Item · saved ${name} matches the first % suggestion`)
      await expectFieldText(itemPage.englishDescription, item.englishDescription, 'Item · English description')
      await expectFieldText(itemPage.thaiDescription, item.thaiDescription, 'Item · Thai description')
      await expectFieldText(itemPage.originCountry, item.originCountry, 'Item · origin country')
      await expectFieldText(itemPage.packageAmount, item.packageAmount, 'Item · package amount')
      await expectFieldText(itemPage.packageUnit, item.packageUnit, 'Item · package unit')
      await expectFieldText(itemPage.netWeight, item.netWeight, 'Item · net weight')
      await expectFieldText(itemPage.invoiceQuantity, item.invoiceQuantity, 'Item · invoice qty')
      await expectFieldText(itemPage.invoiceQuantityUnit, item.invoiceQuantityUnit, 'Item · invoice qty unit')
      await expectFieldText(itemPage.quantity, item.quantity, 'Item · qty')
      await expectFieldText(itemPage.quantityUnit, item.quantityUnit, 'Item · qty unit')
      await expectFieldText(itemPage.amountForeign, item.amountForeign, 'Item · amount (foreign)')
    })
    await info.attach('import-item-master-selection.json', { body: JSON.stringify({ tariffCode: item.tariff.value, ...selected!, lookup: '%', selection: 'First nonblank code in displayed order' }, null, 2), contentType: 'application/json' })
    await info.attach('import-item-complete.png', { body: await itemPage.page.screenshot({ fullPage: true }), contentType: 'image/png' })
  })

  test('TC-FUNC-022: copy, add and delete items @regression', async ({ workspacePage, invoicePage, itemPage, dialogs }) => {
    const { item } = await test.step('Add an invoice with item 0001', async () => addInvoiceWithItem(workspacePage, invoicePage, itemPage))

    await test.step('Copy Item → item 0002 with the same data', async () => {
      await itemPage.copyItem()
      await expectFieldText(itemPage.itemNo, '0002', 'Item · copy is item 0002')
      await expectFieldText(itemPage.tariffCode, item.tariff.value, 'Item 0002 · tariff copied')
      await expectFieldText(itemPage.englishDescription, item.englishDescription, 'Item 0002 · description copied')
      await expectFieldText(itemPage.amountForeign, item.amountForeign, 'Item 0002 · amount copied')
    })

    await test.step('Add Item → blank item 0003', async () => {
      await itemPage.addItem()
      await expectFieldText(itemPage.itemNo, '0003', 'Item · new item is 0003')
      await expectFieldText(itemPage.englishDescription, '', 'Item 0003 · blank description')
      await expectFieldCount(workspacePage.treeItems(), 3, 'Tree · items after add')
    })

    await test.step('Delete Item 0003 and confirm', async () => {
      await itemPage.deleteItem()
      const confirm = await dialogs.waitFor(/ต้องการลบรายการนี้หรือไม่/)
      expect(confirm.type, 'Delete item · asks for confirmation').toBe('confirm')
    })

    await test.step('Verify items 0001 and 0002 remain', async () => {
      await expectFieldCount(workspacePage.treeItems(), 2, 'Tree · items after delete')
      await expect(workspacePage.treeItem('0001'), 'Tree · item 0001').toBeVisible()
      await expect(workspacePage.treeItem('0002'), 'Tree · item 0002').toBeVisible()
      await expect(workspacePage.treeItem('0003'), 'Tree · item 0003 removed').toHaveCount(0)
    })
  })

  test('TC-FUNC-023: delete an invoice from the invoice list @regression', async ({ spn, workspacePage, invoicePage, itemPage, dialogs }) => {
    const { invoice } = await test.step('Add an invoice with one item', async () => addInvoiceWithItem(workspacePage, invoicePage, itemPage))
    const id = workspacePage.idFromUrl()

    await test.step('Open the invoice list (F9 switch)', async () => {
      await workspacePage.open(spn, id)
      await workspacePage.openInvoiceList()
      await expectFieldCount(workspacePage.invoiceCheckboxes, 1, 'Invoice list · rows before delete')
    })

    await test.step('Tick the invoice, Delete Invoice and confirm', async () => {
      await workspacePage.deleteInvoice(invoice.invoiceNo)
      const confirm = await dialogs.waitFor(/./)
      expect(confirm.type, 'Delete invoice · asks for confirmation').toBe('confirm')
    })

    await test.step('Verify the invoice is gone', async () => {
      await workspacePage.open(spn, id)
      await expectValue((await workspacePage.propertyCounts()).invoices, 0, 'Workspace · invoice counter')
      await expect(workspacePage.treeInvoice(invoice.invoiceNo), 'Tree · invoice removed').toHaveCount(0)
      await workspacePage.openInvoiceList()
      await expectFieldCount(workspacePage.invoiceCheckboxes, 0, 'Invoice list · rows after delete')
    })
  })

  test('TC-FUNC-024: Calculate Tax, Re-Avg and Calc Tax, Sum Item to Inv. complete @regression', async ({
    workspacePage,
    invoicePage,
    itemPage,
  }) => {
    await test.step('Add an invoice with one item', async () => addInvoiceWithItem(workspacePage, invoicePage, itemPage))

    await test.step('Calculate Tax', async () => {
      await workspacePage.runProcess(workspacePage.calculateTax, /ระบบคำนวนภาษีให้เรียบร้อยแล้ว/)
    })

    await test.step('Re-Avg and Calc Tax', async () => {
      await workspacePage.runProcess(workspacePage.reAvgAndCalcTax, /ระบบเฉลี่ยค่า charge และคำนวนภาษีให้เรียบร้อยแล้ว/)
    })

    await test.step('Sum Item to Inv.', async () => {
      await workspacePage.runProcess(workspacePage.sumItemToInvoice, /ระบบรวมยอดในอินวอย์และน้ำหนักจากทุกรายการให้เรียบร้อยแล้ว/)
    })
  })

  test('TC-FUNC-025: Validate opens the check results of the declaration @regression', async ({
    spn,
    workspacePage,
    invoicePage,
    itemPage,
  }) => {
    const { invoice } = await test.step('Add an invoice with one item (no item shipping mark)', async () =>
      addInvoiceWithItem(workspacePage, invoicePage, itemPage),
    )
    const referenceNo = (await workspacePage.referenceNo.innerText()).trim()

    const popup = await test.step('Click Validate on the header toolbar', async () => {
      await workspacePage.open(spn, workspacePage.idFromUrl())
      return workspacePage.validate()
    })
    const results = new ValidatePopup(popup)

    await test.step('Verify the results window for this reference no', async () => {
      await expect(results.title, 'Validate · title').toHaveText(new RegExp(`การตรวจสอบข้อมูล REFERENCE NO: ${referenceNo}`))
      await expect(results.errorCodeSection, 'Validate · error code section').toBeVisible()
      await expect(results.check('SHIPPING MARK IN ITEM MUST BE ENTERED'), 'Validate · item shipping mark check is listed').toBeVisible()
      await expectFieldText(
        results.checkResult('SHIPPING MARK IN ITEM MUST BE ENTERED'),
        `ITEM NO: 0001 Of INVOICE NO: ${invoice.invoiceNo} Failed`,
        'Validate · item 0001 without shipping mark fails',
      )
    })
  })

  test('TC-FUNC-026: Match Master File shows options or completes matching @regression', async ({ workspacePage, dialogs }) => {
    const mode = await test.step('Click Match Master File', async () => workspacePage.openMatchMasterFile())

    await test.step('Verify the match options and the Match button', async () => {
      if (mode === 'options') {
        await expect(workspacePage.matchMasterFileHeading, 'Match Master File · heading').toBeVisible()
        await expect(workspacePage.matchButton, 'Match Master File · Match button').toBeVisible()
      } else {
        await expect(workspacePage.processResult, 'Match Master File · completed').toContainText('ระบบจับคู่กับฐานข้อมูลที่มีอยู่ให้เรียบร้อยแล้วครับ')
      }
      await expectValue(dialogs.records.length, 0, 'Match Master File · no error dialog')
    })
  })

  test('TC-FUNC-027: add and delete an extra note @regression', async ({ spn, workspacePage }) => {
    const note = `NOTE ${Date.now()}`
    const id = workspacePage.idFromUrl()
    let defaultPosition = ''

    await test.step('Open Extra note and save a note', async () => {
      await workspacePage.openExtraNote()
      // The label differs by customer configuration. Verify that saving keeps the
      // position selected by this UI, rather than a label from another site.
      defaultPosition = (await workspacePage.detail.locator('#position option:checked').innerText()).trim()
      expect(defaultPosition, 'Extra note · default position is selected').not.toBe('')
      await workspacePage.saveNote(note)
    })

    await test.step('Verify the note is listed with the default position and shown on the declaration', async () => {
      const row = workspacePage.noteRow(note)
      await expectFieldText(workspacePage.noteCell(row, 'note'), note, 'Extra note · text')
      await expectFieldText(workspacePage.noteCell(row, 'position'), defaultPosition, 'Extra note · saved position matches the selected default')
      await expectFieldText(workspacePage.noteCell(row, 'display'), 'Y', 'Extra note · shown on the declaration')
    })

    await test.step('Verify the note is still there after re-opening the workspace', async () => {
      await workspacePage.open(spn, id)
      await workspacePage.openExtraNote()
      await expectFieldCount(workspacePage.noteRow(note), 1, 'Extra note · rows after re-open')
      await expectFieldText(workspacePage.noteCell(workspacePage.noteRow(note), 'position'), defaultPosition, 'Extra note · position persists after re-open')
    })

    await test.step('Delete the note', async () => {
      await workspacePage.deleteNote(note)
    })

    await test.step('Verify the note is gone', async () => {
      await workspacePage.open(spn, id)
      await workspacePage.openExtraNote()
      await expectFieldCount(workspacePage.noteRow(note), 0, 'Extra note · rows after delete')
    })
  })
})

