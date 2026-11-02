import { test, expect } from '../../fixtures'
import { declarationHeader, invoiceData, itemData } from '../../data/factories'
import { expectValue } from '../../pages/reportedExpect'
import { DetailForm } from '../../pages/spn/DetailForm'
import { ExportPrintPage } from '../../pages/spn/ExportPrintPage'
import { captureDownload, waitForReload, waitForFrameReady } from '../../pages/spn/SpnApp'
import { createDeclaration } from './_shared'

/**
 * Import Declaration · [Thai text] — free-text fields keyed with Thai must come back unchanged.
 * Every field below gets "Test ทดสอบ" (English + Thai); after saving, the declaration is reopened
 * and each field must read exactly the same, and the XML sent to Customs must carry the Thai
 * text intact (no "?" and no UTF-8-read-as-TIS-620 "à¸…" mojibake).
 *   Control: Shipping Mark, ข้อความเพิ่มเติม
 *   Invoice: หมายเหตุ รับรองถิ่นกำเนิดด้วยตนเอง, รายละเอียด Other Charge (ส่งกรมฯ)
 *   Detail : EN Description 1–4, TH Description 1–4, Shipping Mark, Remark (ส่งกรมฯ), Note (ไม่ส่งกรมฯ)
 * Data: the test creates its own declaration and deletes it afterwards.
 */
const TEXT = 'Test ทดสอบ'

/** Form field (ins_<name>) → what the user sees. Only fields the form has are keyed (desc 2–4 "ถ้ามี"). */
const CONTROL = { shippingMark: 'Control · Shipping Mark', INextraPermitText: 'Control · ข้อความเพิ่มเติม' }
const INVOICE = { certificationRemark: 'Invoice · หมายเหตุ รับรองถิ่นกำเนิดด้วยตนเอง', detailOtherCharge: 'Invoice · รายละเอียด Other Charge (ส่งกรมฯ)' }
const DETAIL = {
  englishDescriptionOfGoods: 'Detail · EN Description 1',
  endesc2: 'Detail · EN Description 2',
  endesc3: 'Detail · EN Description 3',
  endesc4: 'Detail · EN Description 4',
  thaiDescriptionOfGoods: 'Detail · TH Description 1',
  thdesc2: 'Detail · TH Description 2',
  thdesc3: 'Detail · TH Description 3',
  thdesc4: 'Detail · TH Description 4',
  shippingMark: 'Detail · Shipping Mark',
  remark: 'Detail · Remark (ส่งกรมฯ)',
  INnote: 'Detail · Note (ไม่ส่งกรมฯ)',
}

/** Key TEXT into every field of `fields` the current form has; returns the ones keyed. */
async function keyText(form: DetailForm, fields: Record<string, string>): Promise<string[]> {
  const keyed: string[] = []
  for (const name of Object.keys(fields)) {
    if ((await form.field(name).count()) === 0) continue
    await form.fill(name, TEXT)
    keyed.push(name)
  }
  return keyed
}

/** Each keyed field reads back exactly TEXT. */
async function expectText(form: DetailForm, fields: Record<string, string>, keyed: string[]) {
  const values = await form.read(keyed)
  for (const name of keyed) await expectValue(values[name], TEXT, `${fields[name]} (ins_${name})`)
}

test.describe('[Thai text]', () => {
  test.describe.configure({ timeout: 240_000 })

  test('TC-FUNC-091: Thai text in Control / Invoice / Detail free-text fields is saved and sent unchanged @regression', async ({
    page,
    spn,
    listPage,
    workspacePage,
    invoicePage,
    itemPage,
    declarations,
  }) => {
    const form = new DetailForm(page)
    const keyed: { control: string[]; invoice: string[]; detail: string[] } = { control: [], invoice: [], detail: [] }

    const { id, referenceNo } = await test.step(`Control · key "${TEXT}" in Shipping Mark and ข้อความเพิ่มเติม, Save`, async () => {
      // createDeclaration fills the header (Shipping Mark = TEXT) and saves it
      const created = await createDeclaration(listPage, workspacePage, spn, declarations.track, declarationHeader({ shippingMark: TEXT }))
      keyed.control = ['shippingMark', ...(await keyText(form, { INextraPermitText: CONTROL.INextraPermitText }))]
      await workspacePage.save()
      return created
    })

    const invoice = invoiceData()
    await test.step(`Invoice · key "${TEXT}" in หมายเหตุรับรองถิ่นกำเนิด and รายละเอียด Other Charge, Save`, async () => {
      await workspacePage.openAddInvoice()
      await invoicePage.startNewInvoice()
      await invoicePage.fill(invoice)
      keyed.invoice = await keyText(form, INVOICE)
      await invoicePage.save()
    })

    await test.step(`Detail · key "${TEXT}" in EN/TH Description 1–4, Shipping Mark, Remark, Note, Save`, async () => {
      // Description 1 (EN/TH) is keyed by the item form fill; the rest by name
      await itemPage.fill(itemData({ englishDescription: TEXT, thaiDescription: TEXT }))
      const { englishDescriptionOfGoods: _en, thaiDescriptionOfGoods: _th, ...rest } = DETAIL
      keyed.detail = ['englishDescriptionOfGoods', 'thaiDescriptionOfGoods', ...(await keyText(form, rest))]
      await itemPage.save()
    })

    await test.step('Verify Control fields after re-opening the declaration', async () => {
      await workspacePage.open(spn, id)
      await expectText(form, CONTROL, keyed.control)
    })

    await test.step('Verify Invoice fields after re-opening the invoice', async () => {
      await waitForReload(page, () => workspacePage.treeInvoice(invoice.invoiceNo).click(), 'detailfrm')
      await waitForFrameReady(page, 'detailfrm')
      await expectText(form, INVOICE, keyed.invoice)
    })

    await test.step('Verify Detail fields after re-opening item 0001', async () => {
      await workspacePage.open(spn, id)
      await workspacePage.openTreeItem('0001')
      await expectText(form, DETAIL, keyed.detail)
    })

    await test.step('Verify the XML sent to Customs carries the Thai text intact', async () => {
      const ui = new ExportPrintPage(page)
      await ui.open(spn, id)
      await ui.exportTo.selectOption('XMLformat')
      const file = await captureDownload(page, () => ui.exportButton.click())
      const xml = file.data.toString('utf8')
      await test.info().attach(`${referenceNo}.xml`, { body: xml, contentType: 'application/xml' })
      expect(xml, 'XML · reference no').toContain(referenceNo)
      expect(xml, `XML · "${TEXT}" is present`).toContain(TEXT)
      expect(xml, 'XML · no Thai turned into "?"').not.toMatch(/Test \?+/)
      expect(xml, 'XML · no mojibake (UTF-8 read as TIS-620/Latin-1)').not.toMatch(/à¸|Ã/)
    })
  })
})
