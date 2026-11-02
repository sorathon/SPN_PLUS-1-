import { Page, expect } from '@playwright/test'
import { ExportWorkspacePage } from './WorkspacePage'

/** Open the Export Send screen separately from submitting its customs form. */
export class ExportSendPage {
 popup:Page|null=null
 constructor(readonly page:Page){}
 get host(){return this.popup || this.page}
 get scope(){return this.popup?this.popup.locator('body'):this.page.frameLocator('#detailfrm').locator('body')}
 async open() {
  const workspace=new ExportWorkspacePage(this.page)
  const opened=this.page.waitForEvent('popup',{timeout:5000}).catch(()=>null)
  await workspace.detail.locator('#sendCustomsBTN,#sendDeclarationBTN').filter({visible:true}).first().click()
  this.popup=await opened
  await expect(this.scope).toContainText('Send Export Declaration')
 }
}
