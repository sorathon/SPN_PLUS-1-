import { test,expect,filled,addInvoice,addItem,completeData,uniqueRef } from './_shared'
import { ajax } from '../../pages/spn/SpnApp'
import { expectFieldText } from '../../pages/reportedExpect'

test.describe('Export · Invoice and Item',()=>{
  test.describe.configure({timeout:240_000})
  test('TC-EXP-020: Add Invoice loads Consignee and currency and opens item 0001 @smoke',async({ui,spn,tracked})=>{
    const d=await filled(ui,spn,tracked.track),v=await addInvoice(ui)
    expect(v.consignee.code,'Exporter must have a selectable consignee').not.toBe('')
    expect(v.consignee.name,'Consignee name loaded from master').not.toBe('')
    await expect(ui.item.itemNo).toHaveValue('0001');await expect(ui.item.field('currency')).toHaveValue(v.invoice.currency)
    // Invoice saves reload detailfrm; the outer tree can still show its old counts.
    // Reopen the workspace before checking the persisted invoice tree.
    await ui.workspace.open(spn,d.id)
    await expect(ui.workspace.treeInvoice(v.invoice.invoiceNo)).toBeVisible()
    await ui.workspace.openTreeInvoice(v.invoice.invoiceNo)
    await expect(ui.invoice.invoiceNo).toHaveValue(v.invoice.invoiceNo)
    await expectFieldText(ui.invoice.consigneeName,v.consignee.name,'Saved consignee name')
  })
  test('TC-EXP-021: saved Export item converts amount using its exchange rate @smoke',async({ui,spn,tracked})=>{
    const d=await completeData(ui,spn,tracked.track)
    await ui.workspace.open(spn,d.id);await ui.workspace.openTreeItem('0001')
    for(const [name,value] of Object.entries({tariffCode:d.item.tariff.value,tariffSequence:d.item.tariffSequence!,englishDescriptionOfGoods:d.item.englishDescription,thaiDescriptionOfGoods:d.item.thaiDescription,
      originCountry:d.item.originCountry,netWeight:d.item.netWeight,invoiceQuantity:d.item.invoiceQuantity,quantity:d.item.quantity,invoiceAmountForeign:d.item.amountForeign}))
      await expect(ui.item.field(name),name).toHaveValue(value)
    const rate=Number(await ui.item.field('exchangeRate').inputValue())
    expect(rate,'Exchange rate for the test date must exist').toBeGreaterThan(0)
    expect(Number(await ui.item.field('invoiceAmountBaht').inputValue())).toBeCloseTo(Number(d.item.amountForeign)*rate,2)
    await expect(ui.item.detail.locator('body'),'Tariff/stat/privilege must resolve to a duty master').not.toContainText('Duty Code Not Found')
  })
  test('TC-EXP-022: copy, add and delete Export Items @regression',async({ui,spn,tracked})=>{
    const d=await completeData(ui,spn,tracked.track)
    await ui.item.copyItem();await expect(ui.item.itemNo).toHaveValue('0002')
    await expect(ui.item.field('englishDescriptionOfGoods')).toHaveValue(d.item.englishDescription)
    await expect(ui.item.field('invoiceAmountForeign')).toHaveValue(d.item.amountForeign)
    await ui.item.addItem();await expect(ui.item.itemNo).toHaveValue('0003')
    await expect(ui.item.field('englishDescriptionOfGoods')).toHaveValue('')
    await ui.item.deleteItem()
    await ui.workspace.open(spn,d.id)
    await expect(ui.workspace.treeItems()).toHaveCount(2)
    await expect(ui.workspace.treeItem('0003')).toHaveCount(0)
  })
  test('TC-EXP-023: delete an Invoice and remove its Items @regression',async({ui,spn,tracked})=>{
    const d=await completeData(ui,spn,tracked.track)
    await ui.workspace.open(spn,d.id);await ui.workspace.invoiceList();await ui.workspace.deleteInvoice(d.invoice.invoiceNo)
    await ui.workspace.open(spn,d.id)
    expect(await ui.workspace.counts()).toEqual({invoices:0,items:0})
    await expect(ui.workspace.treeInvoice(d.invoice.invoiceNo)).toHaveCount(0)
  })
  test('TC-EXP-024: Calculate Tax, Re-Avg and Sum Item to Inv complete for Export @regression',async({ui,spn,tracked})=>{
    const d=await completeData(ui,spn,tracked.track)
    await ui.workspace.run(ui.workspace.calculateTax,/ระบบคำนวนภาษีให้เรียบร้อยแล้ว/)
    await ui.workspace.run(ui.workspace.reAvgAndCalcTax,/ระบบเฉลี่ยค่า charge และคำนวนภาษีให้เรียบร้อยแล้ว/)
    await ui.workspace.run(ui.workspace.sumItemToInvoice,/ระบบรวมยอดในอินวอย์และน้ำหนักจากทุกรายการให้เรียบร้อยแล้ว/)
    await ui.workspace.openTreeInvoice(d.invoice.invoiceNo)
    expect(Number(await ui.invoice.totalInvoice.inputValue())).toBe(Number(d.item.amountForeign))
  })
  test('TC-EXP-025: Validate identifies missing required fields for this Export item @regression',async({ui,spn,tracked})=>{
    const d=await completeData(ui,spn,tracked.track)
    await ui.workspace.open(spn,d.id);const popup=await ui.workspace.validate()
    await expect(popup.locator('body')).toContainText(d.referenceNo)
    await expect(popup.locator('body')).toContainText(d.invoice.invoiceNo)
    await expect(popup.locator('body')).toContainText(/Failed|ไม่ครบ|ต้องระบุ/i)
    await expect(popup.locator('body')).not.toContainText(/PDOException|Fatal error|Internal Server Error/)
    await popup.close()
  })
  test('TC-EXP-026: Match Master File presents options or completes matching @regression',async({ui,spn,tracked,dialogs})=>{
    await filled(ui,spn,tracked.track)
    await ui.page.locator('#AutoMap').click()
    await expect(ui.workspace.detail.locator('body')).toContainText(/Match ข้อมูล|ระบบจับคู่กับฐานข้อมูลที่มีอยู่ให้เรียบร้อยแล้ว/, {timeout:60_000})
    expect(dialogs.records.filter(d=>/error|ผิดพลาด/i.test(d.message))).toHaveLength(0)
  })
  test('TC-EXP-027: add, reopen and delete an Export extra note @regression',async({ui,spn,tracked})=>{
    const d=await filled(ui,spn,tracked.track),note=uniqueRef('EXNOTE')
    await ui.workspace.notes()
    const position=(await ui.workspace.detail.locator('#position option:checked').innerText()).trim()
    await ui.workspace.addNote(note);await expect(ui.workspace.noteRow(note)).toContainText(position)
    await ui.workspace.open(spn,d.id);await ui.workspace.notes();await expect(ui.workspace.noteRow(note)).toHaveCount(1)
    await expect(ui.workspace.noteRow(note)).toContainText(position)
    await ui.workspace.deleteNote(note);await ui.workspace.open(spn,d.id);await ui.workspace.notes()
    await expect(ui.workspace.noteRow(note)).toHaveCount(0);await ajax(ui.page).idle()
  })
})
