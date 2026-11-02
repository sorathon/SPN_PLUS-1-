import { test } from '../../fixtures'
import { createDeclaration, addInvoiceWithItem } from './_shared'
import { DUTY_TABLE_HEADERS } from '../../pages/spn/ItemDutyPanel'

test.use({ trace: 'on' })

test('TC-FUNC-028: Item View Duty displays the four-column header table @regression', async ({ page, spn, listPage, workspacePage, invoicePage, itemPage, declarations }, info) => {
  test.setTimeout(180_000)
  const d = await test.step('Prepare an Import declaration with Invoice and Item', async () => {
    const record = await createDeclaration(listPage, workspacePage, spn, declarations.track)
    info.annotations.push({ type: 'reference', description: `${record.referenceNo} (ImDclCtrl:${record.id})` })
    await addInvoiceWithItem(workspacePage, invoicePage, itemPage)
    return record
  })
  const panel = await test.step('Click the magnifying-glass View Duty button', () => itemPage.openDuty())
  await test.step('Check only the visible header table and its four columns', () => panel.expectHeaderTable())
  await info.attach('import-duty-table.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await info.attach('duty-table.json', { body: JSON.stringify({ leg: 'import', referenceNo: d.referenceNo,
    headers: DUTY_TABLE_HEADERS, visible: await panel.table.isVisible(),
    scope: 'Header table visibility only; no duty rows, tax types, amounts or rates are asserted.' }, null, 2), contentType: 'application/json' })
})
