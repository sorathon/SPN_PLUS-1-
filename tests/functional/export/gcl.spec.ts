import { test, expect, completeData, accept } from './_shared'
import { ExportGclPage } from '../../pages/export/GclPage'

test.use({ trace: 'on' })

test('TC-EXP-080: complete Control, Invoice and Detail then Create GCL and verify persisted copied data @regression', async ({ ui, spn, tracked, dialogs }, info) => {
  test.setTimeout(300_000)
  // ACCEPT documents and their GCL stay as evidence; references are recorded below.
  const errors: string[] = []
  ui.page.on('pageerror', e => errors.push(e.message))
  const d = await test.step('Fill Control, Invoice and Detail including item packaging', async () => {
    const record = await completeData(ui, spn, tracked.track)
    await ui.item.fillCargo({ packageAmount: record.header.packageAmount, packageUnit: record.header.packageUnit,
      grossWeight: record.header.grossWeight, shippingMark: record.header.shippingMark, purchaseCountry: record.header.purchaseCountry })
    await ui.item.save()
    return record
  })
  await test.step('Reopen and check the saved source in all three sections', async () => {
    await ui.workspace.open(spn, d.id)
    expect(await ui.workspace.counts()).toEqual({ invoices: 1, items: 1 })
    for (const [name, value] of Object.entries({ jobNo: d.header.jobNo, totalPackageAmount: d.header.packageAmount,
      totalPackageUnit: d.header.packageUnit, grossWeight: d.header.grossWeight, netWeight: d.header.netWeight, departureDate: d.header.departureDate }))
      await expect(ui.workspace.field(name), `Source Control: ${name}`).toHaveValue(value)
    await info.attach('01-export-control.png', { body: await ui.page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await ui.workspace.openTreeInvoice(d.invoice.invoiceNo)
    await expect(ui.invoice.invoiceNo).toHaveValue(d.invoice.invoiceNo)
    await expect(ui.invoice.totalInvoice).toHaveValue(d.invoice.totalInvoice)
    await expect(ui.invoice.currency).toHaveValue(d.invoice.currency)
    await info.attach('02-export-invoice.png', { body: await ui.page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await ui.workspace.openTreeItem('0001')
    for (const [name, value] of Object.entries({ tariffSequence: d.item.tariffSequence!, englishDescriptionOfGoods: d.item.englishDescription, thaiDescriptionOfGoods: d.item.thaiDescription,
      packageAmount: d.header.packageAmount, packageUnit: d.header.packageUnit, itemGrossWeight: d.header.grossWeight,
      invoiceAmountForeign: d.item.amountForeign, invoiceQuantity: d.item.invoiceQuantity, quantity: d.item.quantity }))
      await expect(ui.item.field(name), `Source Detail: ${name}`).toHaveValue(value)
    if ((await ui.item.detail.locator('body').innerText()).includes('Duty Code Not Found'))
      info.annotations.push({ type: 'warning', description: 'Current tariff master reports Duty Code Not Found; this case checks GCL creation/copy, not customs validation.' })
    await info.attach('03-export-detail.png', { body: await ui.page.screenshot({ fullPage: true }), contentType: 'image/png' })
  })
  const declaration = await test.step('Assign declaration number and confirm ACCEPT using the requested workflow', () => accept(ui, spn, d))
  await ui.workspace.open(spn, d.id)
  const creator = new ExportGclPage(ui.page)
  const reference = await test.step('Create GCL with count 1', () => creator.createOne())
  info.annotations.push({ type: 'gcl-reference', description: `${reference}; Export ${d.referenceNo}; Declaration ${declaration}` })
  expect(reference).not.toBe(d.referenceNo)
  await info.attach('04-export-gcl-link.png', { body: await ui.page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await ui.workspace.open(spn, d.id)
  await expect(creator.links()).toHaveCount(1)
  await expect(creator.links()).toHaveText(reference)
  const gcl = await test.step('Open the GCL linked to the Export and inspect actual controls/details', () => creator.open(reference))
  if (gcl.page !== ui.page) {
    dialogs.watch(gcl.page)
    gcl.page.on('pageerror', e => errors.push(e.message))
  }
  const first = await gcl.read()
  await gcl.page.reload()
  await gcl.ready()
  const reopened = await gcl.read()
  await info.attach('gcl-comparison.json', { body: JSON.stringify({ source: d, declaration, gclReference: reference, first, reopened, dialogs: dialogs.records, errors }, null, 2), contentType: 'application/json' })
  await info.attach('05-gcl-reopened.png', { body: await gcl.page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await test.step('Compare GCL with source and confirm persistence after reload', async () => {
    expect.soft(reopened, 'GCL fields persist after reopening').toEqual(first)
    expect.soft(reopened.id).toMatch(/^gtcid:\d+$/i)
    await expect.soft(gcl.page.locator('body'), 'GCL reference is displayed').toContainText(reference)
    for (const [name, expected] of Object.entries({ exportReference: d.referenceNo, declaration, description: `${d.item.englishDescription} ${d.item.thaiDescription}`,
      packageUnit: d.header.packageUnit, weightUnit: 'KGM', exporterTax: d.exporter.companyTaxNo, exporterBranch: d.exporter.companyBranch,
      mawb: d.header.mawb, hawb: d.header.hawb, invoice: d.invoice.invoiceNo }))
      expect.soft(reopened.row[name as keyof typeof reopened.row], `GCL Detail: ${name}`).toBe(expected)
    expect.soft(Number(reopened.row.packages), 'GCL actual packages copied from completed Detail').toBe(Number(d.header.packageAmount))
    expect.soft(Number(reopened.row.grossWeight), 'GCL actual gross weight').toBe(Number(d.header.grossWeight))
    for (const [name, expected] of Object.entries({ INcompanyCode: d.exporter.INcompanyCode, transportMode: d.header.transportMode,
      vesselName: d.vessel, voyage: d.header.voyage, releasePort: d.header.releasePort, loadPort: d.header.loadPort }))
      expect.soft(reopened.control[name], `GCL Control: ${name}`).toBe(expected)
    expect.soft(errors, 'No browser JavaScript errors').toEqual([])
    await expect.soft(gcl.control.locator('body')).not.toContainText(/Fatal error|PDOException|Internal Server Error/i)
    await expect.soft(gcl.detail.locator('body')).not.toContainText(/Fatal error|PDOException|Internal Server Error/i)
  })
})
