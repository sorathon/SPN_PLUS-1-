import { test, completeData, uniqueRef } from './_shared'

test.use({ trace: 'on' })

test('TC-EXP-029: mark Item preparation complete, edit a field and Save shows confirmation @regression', async ({ ui, spn, tracked, dialogs }, info) => {
  test.setTimeout(180_000)
  const d = await test.step('Prepare an Export declaration with Invoice and Item', () => completeData(ui, spn, tracked.track))
  const preparation = ui.item.preparation()
  await test.step('Click the padlock to mark Item preparation complete', () => preparation.markComplete())
  const edited = uniqueRef('LOCKEDIT')
  await test.step('Edit the English description field', async () => {
    await ui.item.field('englishDescriptionOfGoods').fill(edited)
    await ui.item.field('englishDescriptionOfGoods').press('Tab')
  })
  await info.attach('export-item-edited-before-save.png', { body: await ui.page.screenshot({ fullPage: true }), contentType: 'image/png' })
  const dialog = await test.step('Click Save and check the completed-preparation confirmation popup', () => preparation.saveAndExpectConfirmation(dialogs))
  await info.attach('item-edit-confirmation.json', { body: JSON.stringify({ leg: 'export', referenceNo: d.referenceNo,
    editedField: 'englishDescriptionOfGoods', editedValue: edited, dialog, answer: 'Cancel',
    scope: 'Confirm popup type and message after padlock → edit → Save.' }, null, 2), contentType: 'application/json' })
})
