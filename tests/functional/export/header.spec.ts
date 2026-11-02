import { test, expect, draft, filled, uniqueRef } from './_shared'
import { ajax } from '../../pages/spn/SpnApp'

test.describe('Export · Header', () => {
  test.describe.configure({ timeout:180_000 })
  test('TC-EXP-011: Header fields and Export list columns persist after Save @smoke', async ({ui,spn,tracked}) => {
    const d=await filled(ui,spn,tracked.track)
    await ui.workspace.open(spn,d.id)
    for(const [name,value] of Object.entries({ jobNo:d.header.jobNo, INcompanyCode:d.exporter.INcompanyCode, companyName:d.exporter.companyName,
      vesselName:d.vessel,vesselVoyage:d.header.voyage,masterBillOfLading:d.header.mawb,houseBillOfLading:d.header.hawb,
      purchaseCountry:d.header.purchaseCountry,destinationCountry:d.header.destinationCountry,loadPort:d.header.loadPort,releasePort:d.header.releasePort,
      totalPackageAmount:d.header.packageAmount,totalPackageUnit:d.header.packageUnit,netWeight:d.header.netWeight,grossWeight:d.header.grossWeight,
      departureDate:d.header.departureDate,submitDate:d.header.submitDate,shippingMark:d.header.shippingMark })) {
      await expect(ui.workspace.field(name),`Saved Header · ${name}`).toHaveValue(value)
    }
    await ui.list.open(spn);await ui.list.search({referenceNo:d.referenceNo})
    for(const [name,value] of [['job',d.header.jobNo],['mawb',d.header.mawb],['hawb',d.header.hawb],['vessel',d.vessel]] as const)
      await expect(ui.list.cell(ui.list.row(d.referenceNo),name)).toHaveText(value)
  })
  test('TC-EXP-012: exporter autocomplete loads master data and clears dependent fields @regression',async({ui,spn,tracked})=>{
    await draft(ui,spn,tracked.track)
    const code=await ui.workspace.autocomplete.pickFirst(ui.workspace.field('INcompanyCode'),'%')
    await ui.workspace.field('INcompanyCode').press('Enter');await ajax(ui.page).idle()
    const selected=await ui.workspace.exporter()
    expect(selected.INcompanyCode).toBe(code);expect(selected.companyName).not.toBe('');expect(selected.companyTaxNo).not.toBe('')
    await ui.workspace.field('INcompanyCode').fill('');await ui.workspace.field('INcompanyCode').press('Backspace');await ajax(ui.page).idle()
    for(const name of ['INcompanyCode','companyName','companyTaxNo','companyBranch'])
      await expect(ui.workspace.detail.locator(`input[name="ins_${name}"]`).first(),`Cleared exporter · ${name}`).toHaveValue('')
  })
  test('TC-EXP-013: unknown destination country is rejected with an alert @regression',async({ui,spn,tracked,dialogs})=>{
    await draft(ui,spn,tracked.track)
    await ui.workspace.field('destinationCountry').fill('QQ');await ui.workspace.field('destinationCountry').press('Tab')
    const alert=await dialogs.waitFor(/ประเทศ|country|not found|ไม่พบ/i)
    expect(alert.type).toBe('alert')
    expect(alert.message,'Unknown country must be reported as invalid').toMatch(/not found|ไม่พบ|ผิด|invalid/i)
  })
  test('TC-EXP-014: editing saved Header changes only the selected values @regression',async({ui,spn,tracked})=>{
    const d=await filled(ui,spn,tracked.track),changes={masterBillOfLading:uniqueRef('MAWB'),houseBillOfLading:uniqueRef('HAWB'),grossWeight:'150',shippingMark:'UPDATED EXPORT MARK'}
    for(const [name,value] of Object.entries(changes))await ui.workspace.field(name).fill(value)
    await ui.workspace.save();await ui.workspace.open(spn,d.id)
    for(const [name,value] of Object.entries({...changes,jobNo:d.header.jobNo,INcompanyCode:d.exporter.INcompanyCode,vesselName:d.vessel,netWeight:d.header.netWeight}))
      await expect(ui.workspace.field(name),name).toHaveValue(value)
  })
  test('TC-EXP-017: an ordinary Job No and Save keep the record in Draft @regression',async({ui,spn,tracked})=>{
    const d=await filled(ui,spn,tracked.track)
    await ui.creation.returnToList();await ui.list.search({referenceNo:d.referenceNo})
    await expect(ui.list.cell(ui.list.row(d.referenceNo),'job')).toHaveText(d.header.jobNo)
    await expect(ui.list.cell(ui.list.row(d.referenceNo),'decl')).toHaveText('')
    await expect(ui.list.cell(ui.list.row(d.referenceNo),'status')).toHaveText('')
  })
})
