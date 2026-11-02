import { expect,Page,TestInfo } from '@playwright/test'
import { DialogLog } from '../spn/SpnApp'

export class ExportCancelPage {
 constructor(readonly page:Page){}
 async open(dialogs:DialogLog) {
  const opened=this.page.waitForEvent('popup',{timeout:15000})
  const watch=(p:Page)=>dialogs.watch(p)
  this.page.context().once('page',watch)
  try {
   await this.page.frameLocator('#detailfrm').locator('[title="Cancel Declaration"]').click()
   const popup=await opened;await popup.waitForLoadState('domcontentloaded')
   await expect(popup.getByText('Send Cancel Export Declaration',{exact:true})).toBeVisible()
   await expect(popup.locator('form[name="form1"] [name="ACTION"]')).toHaveValue('SEND_CANCEL')
   await expect(popup.locator('[name="ins_cancelReason"]')).toBeVisible()
   return popup
  } finally {this.page.context().off('page',watch)}
 }
 async send(popup:Page,reason:string,info:TestInfo) {
  await popup.locator('[name="type_cancel"]').selectOption('REVISED')
  await popup.locator('[name="ins_cancelReason"]').fill(reason)
  await expect(popup.locator('[name="ins_cancelReason"]')).toHaveValue(reason)
  await info.attach('cancel-filled.png',{body:await popup.screenshot(),contentType:'image/png'})
  const response=popup.waitForResponse(r=>r.request().method()==='POST' && r.request().isNavigationRequest(),{timeout:45000})
  await popup.getByRole('button',{name:'Send Cancel',exact:true}).click({noWaitAfter:true})
  const receipt=await response;await receipt.finished()
  await info.attach('cancel-response.txt',{body:await popup.locator('body').innerText(),contentType:'text/plain'})
  await info.attach('cancel-response.png',{body:await popup.screenshot(),contentType:'image/png'})
  expect(receipt.status(),'Cancel request returned successfully').toBe(200)
 }
}
