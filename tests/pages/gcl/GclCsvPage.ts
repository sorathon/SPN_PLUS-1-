import { Page, expect } from '@playwright/test'
import { GclNewPage } from './GclNewPage'
import { GclListPage, GclRecord } from './GclListPage'
import { GclWorkspacePage } from './GclWorkspacePage'
import { GclScope } from './GclLookup'
import { SpnSession, waitForReload } from '../spn/SpnApp'
export class GclCsvPage {
 scope:GclScope
 constructor(readonly page:Page){this.scope=page}
 async open(session:SpnSession){await new GclNewPage(this.page).wizard(session);await this.page.locator('#withCsvRadio').check();this.scope=this.page;await expect(this.scope.locator('#uploadFile')).toBeVisible()}
 async existing(){const ws=new GclWorkspacePage(this.page);this.scope=ws.control;if(!await this.scope.locator('#uploadFile').isVisible())await ws.control.locator('#uploadCSV').click({noWaitAfter:true});await expect(this.scope.locator('#uploadFile')).toBeVisible({timeout:15000})}
 async inventory(session:SpnSession){const list=new GclListPage(this.page);await list.open(session);await list.field('slimit').selectOption('200');await list.search();return list.rows.evaluateAll(rows=>rows.map(row=>({id:(row.querySelector('input[type=checkbox]') as HTMLInputElement).value,reference:row.querySelectorAll(':scope > td')[2].textContent!.trim()})))}
 async submit(file:string){
  await this.scope.locator('#uploadFile').setInputFiles(file)
  const frameName=this.scope===this.page?undefined:'detailfrm'
  const pending=this.page.waitForResponse(r=>r.request().method()==='POST' && r.request().isNavigationRequest(),{timeout:90_000})
  // Match the proven full-document wait used by List/Search: do not leave the
  // response page before its scripts have displayed validation/redirects.
  await waitForReload(this.page,()=>this.scope.getByRole('button',{name:/Upload/}).click({noWaitAfter:true}),frameName,90_000)
  const response=await pending;await response.finished()
  const html=await response.text().catch(()=>{const frame=frameName?this.page.frame({name:frameName}):this.page.mainFrame();return frame?frame.content():this.page.content()})
  return {status:response.status(),html}
 }
 async created(session:SpnSession,before:GclRecord[],html:string,track:(r:GclRecord)=>void){
  const candidates=(await this.inventory(session)).filter(r=>!before.some(b=>b.id===r.id))
  const owned=candidates.filter(r=>html.includes(r.reference) || new RegExp('(?:gtcid[:=]|gtcid%3A|gtcid%3a)'+r.id+'(?:[^0-9]|$)').test(html))
  for(const r of owned)track(r)
  expect(owned.length,'New GCL ownership must be proven by upload response; candidates: '+JSON.stringify(candidates)).toBe(candidates.length)
  return owned
 }
}
