import { test,expect,completeData,accept,uniqueRef } from './_shared'
import { ExportCancelPage } from '../../pages/export/CancelPage'

test.describe.configure({retries:0})
test('TC-EXP-071: Cancel popup accepts a reason and Send Cancel changes this owned Export status @integration @transmit',async({ui,spn,tracked,dialogs},info)=>{
 test.setTimeout(600000)
 test.skip(process.env.SPN_EXPORT_ALLOW_CANCEL!=='1','Actual Cancel is opt-in for a newly created owned UAT Export')
 const d=await completeData(ui,spn,tracked.track)
 await ui.item.fillCargo({packageAmount:d.header.packageAmount,packageUnit:d.header.packageUnit,grossWeight:d.header.grossWeight,shippingMark:d.header.shippingMark,purchaseCountry:d.header.purchaseCountry});await ui.item.save()
 // Cancel is available on ACCEPT. Prepare a fresh isolated UAT fixture with the
 // established support-site helper; never cancel an existing user declaration.
 const declaration=await accept(ui,spn,d)
 const status=async()=>{
  await ui.list.open(spn);await ui.list.search({referenceNo:d.referenceNo});const row=ui.list.row(d.referenceNo)
  await expect(row).toHaveCount(1)
  const src=await row.locator(':scope > td').nth(1).locator('img').first().getAttribute('src')
  const code=src?.match(/invstat_(.*?)\.(?:gif|png)/i)?.[1]?.toUpperCase()
  expect(code,'Status icon exposes a status code').toBeTruthy()
  return {code:code!,text:(await ui.list.cell(row,'status').innerText()).trim(),declaration:(await ui.list.cell(row,'decl').innerText()).trim()}
 }
 const before=await status();expect(before.code).toBe('ACCEPT');expect(before.declaration).toBe(declaration)
 await ui.workspace.open(spn,d.id)
 const cancel=new ExportCancelPage(ui.page),popup=await cancel.open(dialogs),reason='QA CANCEL EXPORT '+uniqueRef('PW-CANCEL').toUpperCase()
 await info.attach('cancel-popup.png',{body:await popup.screenshot(),contentType:'image/png'})
 let after=before
 try {
  await cancel.send(popup,reason,info)
  await expect.poll(async()=>{after=await status();return after.code},{timeout:60000,intervals:[1000,2000,5000],message:'Send Cancel changes the same Export reference to SEND_CANCEL'}).toBe('SEND_CANCEL')
  expect(after.declaration).toBe(declaration)
 } finally {
  after=await status()
  await info.attach('cancel-status.json',{body:JSON.stringify({reference:d.referenceNo,id:d.id,cancelType:'REVISED',reason,before,after},null,2),contentType:'application/json'})
  await info.attach('after-cancel-list.png',{body:await ui.page.screenshot(),contentType:'image/png'})
  if(!popup.isClosed())await popup.close()
 }
})
