import { test } from '../../fixtures'
import { uniqueRef } from '../../data/factories'
import { createDeclaration, addInvoiceWithItem } from './_shared'

test.use({ trace: 'on' })

test('TC-FUNC-029: mark Item preparation complete, edit a field and Save shows confirmation @regression', async ({ page, spn, listPage, workspacePage, invoicePage, itemPage, declarations, dialogs }, info) => {
  test.setTimeout(180_000)
  const d = await test.step('Prepare an Import declaration with Invoice and Item', async () => {
    const record = await createDeclaration(listPage, workspacePage, spn, declarations.track)
    info.annotations.push({ type: 'reference', description: `${record.referenceNo} (ImDclCtrl:${record.id})` })
    await addInvoiceWithItem(workspacePage, invoicePage, itemPage)
    return record
  })
  const preparation = itemPage.preparation()
  await test.step('Click the padlock to mark Item preparation complete', () => preparation.markComplete())
  const edited = uniqueRef('LOCKEDIT')
  await test.step('Edit the English description field', async () => {
    await itemPage.englishDescription.fill(edited)
    await itemPage.englishDescription.press('Tab')
  })
  await info.attach('import-item-edited-before-save.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  const dialog = await test.step('Click Save and check the completed-preparation confirmation popup', () => preparation.saveAndExpectConfirmation(dialogs))
  await info.attach('item-edit-confirmation.json', { body: JSON.stringify({ leg: 'import', referenceNo: d.referenceNo,
    editedField: 'englishDescriptionOfGoods', editedValue: edited, dialog, answer: 'Cancel',
    scope: 'Confirm popup type and message after padlock → edit → Save.' }, null, 2), contentType: 'application/json' })
})
