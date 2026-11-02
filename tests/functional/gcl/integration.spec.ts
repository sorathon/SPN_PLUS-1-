import { test, expect } from './_shared'
import { GclActionsPage } from '../../pages/gcl/GclActionsPage'

test.describe('GCL · external status/transmission',()=>{
 test.describe.configure({timeout:180_000})
 test('TC-GCL-170: Check Status response is correlated with the configured GCL @integration',async({gcl,spn},info)=>{
  test.skip(!process.env.SPN_GCL_STATUS_REF,'Set SPN_GCL_STATUS_REF for an owned UAT external-status fixture')
  await gcl.list.open(spn);await gcl.list.reference(process.env.SPN_GCL_STATUS_REF!);await gcl.list.openRecord(process.env.SPN_GCL_STATUS_REF!);await gcl.workspace.ready()
  const result=await new GclActionsPage(gcl.page).resultWindow(()=>gcl.workspace.control.locator('#checkStatusBTN').click())
  expect(result).not.toBeNull();await expect(result!.locator('body')).toContainText(process.env.SPN_GCL_STATUS_REF!);await expect(result!.locator('body')).not.toContainText(/Fatal error|PDOException/i)
  await info.attach('check-status.png',{body:await result!.screenshot({fullPage:true}),contentType:'image/png'});await result!.close()
 })
})
