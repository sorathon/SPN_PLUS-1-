import { test, completeData } from './_shared'
import { DUTY_TABLE_HEADERS } from '../../pages/spn/ItemDutyPanel'

test.use({ trace: 'on' })

test('TC-EXP-028: Item View Duty displays the four-column header table @regression', async ({ ui, spn, tracked }, info) => {
  test.setTimeout(180_000)
  const d = await test.step('Prepare an Export declaration with Invoice and Item', () => completeData(ui, spn, tracked.track))
  const panel = await test.step('Click the magnifying-glass View Duty button', () => ui.item.openDuty())
  await test.step('Check only the visible header table and its four columns', () => panel.expectHeaderTable())
  await info.attach('export-duty-table.png', { body: await ui.page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await info.attach('duty-table.json', { body: JSON.stringify({ leg: 'export', referenceNo: d.referenceNo,
    headers: DUTY_TABLE_HEADERS, visible: await panel.table.isVisible(),
    scope: 'Header table visibility only; no duty rows, tax types, amounts or rates are asserted.' }, null, 2), contentType: 'application/json' })
})
