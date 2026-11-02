import { Page, expect } from '@playwright/test'
import { SpnSession } from '../spn/SpnApp'
import { GclListPage } from './GclListPage'
import { GclWorkspacePage } from './GclWorkspacePage'
import { GclActionsPage } from './GclActionsPage'

/** File and print buttons on the Send screen; opening it does not submit Send. */
export class GclSendPage {
 private popup:Page|null=null
 constructor(readonly page:Page){}
 button(id:string) {
  return this.popup?this.popup.locator('#'+id):this.page.frameLocator('#detailfrm').locator('#'+id)
 }
 async open(session:SpnSession,reference:string) {
  const list=new GclListPage(this.page),workspace=new GclWorkspacePage(this.page)
  await list.open(session);await list.reference(reference)
  await expect(list.row(reference)).toHaveCount(1)
  await list.openRecord(reference);await workspace.ready()
  this.popup=await new GclActionsPage(this.page).resultWindow(()=>workspace.control.locator('#sendCustomsBTN').click())
  await expect(this.button('exportPDF')).toBeVisible()
 }
 get host(){return this.popup || this.page}
}
