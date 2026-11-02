import { test, expect, completeData, accept } from './_shared'
import { ExportShortPage } from '../../pages/export/ShortPage'
import { FORCE_EXPORT_DECLARATION_JOB } from '../../pages/export/CreationPage'
import { DetailForm } from '../../pages/spn/DetailForm'

test.use({ trace: 'on' })

test('TC-EXP-082: Create Short shows confirmation/success popups and copies source Export data @regression', async ({ ui, spn, tracked, dialogs }, info) => {
  test.setTimeout(300_000)
  const errors: string[] = []
  ui.page.on('pageerror', e => errors.push(e.message))
  const d = await test.step('Create Air Export with saved Control, Invoice and complete Item packaging', async () => {
    const record = await completeData(ui, spn, tracked.track, { transportMode: '4' })
    await ui.item.fillCargo({ packageAmount: record.header.packageAmount, packageUnit: record.header.packageUnit,
      grossWeight: record.header.grossWeight, shippingMark: record.header.shippingMark, purchaseCountry: record.header.purchaseCountry })
    await ui.item.save()
    return record
  })
  const declaration = await test.step('Assign declaration number and confirm ACCEPT', () => accept(ui, spn, d))
  await ui.workspace.open(spn, d.id)
  await expect(ui.workspace.field('transportMode')).toHaveValue('4')
  expect(await ui.workspace.counts()).toEqual({ invoices: 1, items: 1 })
  for (const [name, value] of Object.entries({ totalPackageAmount: d.header.packageAmount, totalPackageUnit: d.header.packageUnit,
    grossWeight: d.header.grossWeight, netWeight: d.header.netWeight }))
    await expect(ui.workspace.field(name), `Source Export: ${name}`).toHaveValue(value)
  const sourceBroker = await new DetailForm(ui.page).read(['brokerTaxNo', 'brokerBranch'])
  const enteredBroker = Object.fromEntries(Object.entries(sourceBroker).filter(([, value]) => value !== ''))
  await info.attach('01-export-before-short.png', { body: await ui.page.screenshot(), contentType: 'image/png' })
  const short = new ExportShortPage(ui.page)
  const created = await test.step('Click Create Short, accept confirmation and verify success popup', () => short.create(dialogs))
  info.annotations.push({ type: 'short-reference', description: `${created.referenceNo}; Export ${d.referenceNo}; Declaration ${declaration}` })
  expect(created.referenceNo).not.toBe(d.referenceNo)
  await test.step('Open the newly created Short through its linked reference', () => short.open(created.referenceNo))
  const first = await short.read()
  await ui.page.reload()
  await short.ready()
  const reopened = await short.read()
  const expected = { jobNo: FORCE_EXPORT_DECLARATION_JOB, companyTaxNo: d.exporter.companyTaxNo, companyBranch: d.exporter.companyBranch,
    packageUnit: d.header.packageUnit, grossWeightUnitAfterShort: 'KGM', netWeightUnitAfterShort: 'KGM', ...enteredBroker }
  await info.attach('short-data-comparison.json', { body: JSON.stringify({ source: d, declaration, shortReference: created.referenceNo,
    expected, sourceBrokerFields: sourceBroker, first, reopened, dialogs: created.dialogs, errors,
    scope: 'Create Short and compare visible Short Control fields. No Add Item, Short quantity editing or Send Customs.' }, null, 2), contentType: 'application/json' })
  await info.attach('02-short-control-reopened.png', { body: await ui.page.screenshot(), contentType: 'image/png' })
  info.annotations.push({ type: 'observation', description: `New Short displays ${reopened.shortDetailCount} Detail(s); this case does not add Short Items.` })
  for (const [name, value] of Object.entries(sourceBroker)) if (value === '' && reopened.fields[name] !== '')
    info.annotations.push({ type: 'observation', description: `${name} is blank in source fields and populated as ${reopened.fields[name]} in Short; no source value was entered to compare.` })
  await test.step('Compare copied Short fields with the source and check persistence', async () => {
    expect.soft(reopened, 'Short data persists after reopening').toEqual(first)
    expect.soft(reopened.id).toMatch(/^shortId:\d+$/i)
    expect.soft(reopened.exportReference).toBe(d.referenceNo)
    expect.soft(reopened.declaration).toBe(declaration)
    await expect.soft(ui.page.getByText(created.referenceNo, { exact: true })).toBeVisible()
    for (const [name, value] of Object.entries(expected))
      expect.soft(reopened.fields[name], `Short Control: ${name}`).toBe(value)
    for (const [name, value] of Object.entries({ packageAmount: d.header.packageAmount, grossWeightAfterShort: d.header.grossWeight, netWeightAfterShort: d.header.netWeight }))
      expect.soft(Number(reopened.fields[name]), `Short Control: ${name}`).toBe(Number(value))
    expect.soft(errors, 'No browser JavaScript errors').toEqual([])
    await expect.soft(short.control.locator('body')).not.toContainText(/Fatal error|PDOException|Internal Server Error/i)
    await expect.soft(short.detail.locator('body')).not.toContainText(/Fatal error|PDOException|Internal Server Error/i)
  })
})
