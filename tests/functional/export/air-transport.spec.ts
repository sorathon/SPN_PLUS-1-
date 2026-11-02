import { test, expect, completeData, accept } from './_shared'

test.use({ trace: 'on' })

test('TC-EXP-081: air transport mode 4 exposes Create Short, Print Air GCL and Print Change Flight after ACCEPT @regression', async ({ ui, spn, tracked }, info) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  ui.page.on('pageerror', error => errors.push(error.message))
  const d = await test.step('Create Export with transport mode 4 and save Control, Invoice and Item', async () => {
    const record = await completeData(ui, spn, tracked.track, { transportMode: '4' })
    await expect(ui.item.field('tariffSequence'), 'Item has the configured Seq').toHaveValue(record.item.tariffSequence!)
    await ui.workspace.open(spn, record.id)
    await expect(ui.workspace.field('transportMode'), 'Saved transport mode is Air').toHaveValue('4')
    await expect(ui.workspace.field('transportMode').locator('option:checked')).toHaveText(/4\s*=\s*ทางเครื่องบิน/)
    expect(await ui.workspace.counts()).toEqual({ invoices: 1, items: 1 })
    await info.attach('01-air-control-draft.png', { body: await ui.page.screenshot({ fullPage: true }), contentType: 'image/png' })
    return record
  })
  const declaration = await test.step('Assign declaration number and confirm ACCEPT', () => accept(ui, spn, d))
  info.annotations.push({ type: 'declaration', description: `${d.referenceNo}; ${declaration}; transportMode=4 (Air)` })
  await ui.workspace.open(spn, d.id)
  const inspect = async () => {
    await expect(ui.workspace.field('transportMode')).toHaveValue('4')
    const actions = ui.workspace.airActions()
    for (const [name, button] of Object.entries(actions)) {
      await expect(button, `Accepted Air Export: ${name} is displayed once`).toHaveCount(1)
      await expect(button, `Accepted Air Export: ${name} is visible`).toBeVisible()
      await expect(button, `Accepted Air Export: ${name} is enabled`).toBeEnabled()
    }
    return Object.fromEntries(await Promise.all(Object.entries(actions).map(async ([name, button]) => [name, {
      label: await button.getAttribute('value') || await button.innerText(), visible: await button.isVisible(), enabled: await button.isEnabled(),
    }])))
  }
  const first = await test.step('Verify the three requested buttons on the accepted Air workspace', inspect)
  await ui.page.reload()
  await ui.workspace.waitForDetail()
  const reopened = await test.step('Reopen and confirm Air mode and the same buttons persist', inspect)
  expect(reopened).toEqual(first)
  expect(errors, 'No browser JavaScript errors').toEqual([])
  await expect(ui.workspace.detail.locator('body')).not.toContainText(/Fatal error|PDOException|Internal Server Error/i)
  await info.attach('02-air-accepted-buttons.png', { body: await ui.page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await info.attach('air-buttons.json', { body: JSON.stringify({ exportReference: d.referenceNo, exportId: d.id, declaration,
    transportMode: '4', first, reopened, errors, scope: 'Visibility/enabled/persistence only; none of these three buttons was clicked.' }, null, 2), contentType: 'application/json' })
})
