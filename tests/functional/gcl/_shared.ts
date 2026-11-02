import { test as base, expect } from '../../fixtures'
import { GclListPage, GclRecord } from '../../pages/gcl/GclListPage'
import { GclNewPage } from '../../pages/gcl/GclNewPage'
import { GclWorkspacePage } from '../../pages/gcl/GclWorkspacePage'
import { ajax, SpnSession } from '../../pages/spn/SpnApp'
import { UPPER_LOOKUPS } from '../../pages/gcl/GclLookup'
import { today, uniqueRef } from '../../data/factories'
import { users } from '../../data/users'
import { spnSession } from '../../data/session'
import { DialogLog, disablePrintDialog, waitForReload } from '../../pages/spn/SpnApp'
import type { Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

export { expect, today, uniqueRef }
export class GclUI {
 readonly list; readonly creation; readonly workspace
 constructor(readonly page:Page,readonly sources?:(count:number)=>Promise<{referenceNo:string;id:string}[]>) {this.list=new GclListPage(page);this.creation=new GclNewPage(page);this.workspace=new GclWorkspacePage(page)}
}
export type GclTrack=(r:GclRecord)=>void
export async function manualDraft(gcl:GclUI,spn:SpnSession,track:GclTrack) {
 await gcl.creation.open(spn)
 await gcl.creation.fillUpper()
 await gcl.creation.today()
 await gcl.creation.field('containerIndicator').selectOption('0')
 const initialValues=await gcl.creation.lookup.snapshot([...UPPER_LOOKUPS,'departureDate','containerIndicator'])
 await gcl.creation.save()
 const r=await gcl.workspace.record();track(r)
 await ajax(gcl.page).idle()
 return {...r,initialValues}
}
export async function sourceDraft(gcl:GclUI,spn:SpnSession,track:GclTrack,count=1,offset=0) {
 if(!gcl.sources)throw new Error('GCL source fixture provider is required; do not allocate existing user Exports')
 const exports=await gcl.sources(count+offset)
 await gcl.creation.wizard(spn)
 const refFilter=exports.slice(offset,count+offset).map(x=>x.referenceNo)
 await expect(gcl.creation.sourceRows().first()).toBeVisible()
 // Fresh owned sources normally appear directly. Search only when a seed is off-page;
 // an empty Reference query on this UI can return no rows even with a valid mode.
 if(!(await Promise.all(refFilter.map(ref=>gcl.creation.sourceRows().filter({hasText:ref}).count()))).every(n=>n===1)) {
  let prefix=refFilter[0]
  for(const ref of refFilter)while(!ref.startsWith(prefix))prefix=prefix.slice(0,-1)
  await gcl.page.locator('[name="transMode"]').selectOption('1')
  await gcl.page.locator('[name="exRef"]').fill(prefix)
  await gcl.page.locator('[name="slimit"]').selectOption('200')
  await gcl.page.locator('#searchBTN').click();await ajax(gcl.page).idle()
 }
 const sources=[]
 for(let i=0;i<count;i++) {
  const row=gcl.creation.sourceRows().filter({hasText:refFilter[i]})
  const cells=await row.locator(':scope > td').allTextContents()
  sources.push(cells.map(v=>v.trim()))
  await row.locator('input[type=checkbox]').check()
 }
 await gcl.creation.createSelected()
 const record=await gcl.workspace.record();track(record)
 await ajax(gcl.page).idle()
 await gcl.workspace.detail.locator('[name="rowDetail"]').waitFor()
 return {...record,sources}
}
/** Mutable cases use an owned source-linked draft with a valid port, not a blank manual row. */
export async function editableDraft(gcl:GclUI,spn:SpnSession,track:GclTrack,count=1,offset=0) {
 const r=await sourceDraft(gcl,spn,track,count,offset)
 // The Declaration wizard copies only part of Control; positive Save fixtures
 // must complete the remaining visible transport/packing fields through the UI.
 for(const name of ['containerLoader','dischargePort','loadPort','packingPort']) {
  if(!await gcl.workspace.field(name).inputValue()) {
   const selected=await gcl.workspace.lookup.percent(name)
   test.skip(selected.outcome==='empty',`Required positive GCL fixture lookup has no result: ${name}`)
  }
 }
 await gcl.workspace.field('modeOfMovement').selectOption('1')
 await gcl.workspace.field('containerStatus').selectOption('0')
 await gcl.workspace.field('containerIndicator').selectOption('0')
 const job=uniqueRef('PW-GCL').toUpperCase()
 await gcl.workspace.field('jobNo').fill('');await gcl.workspace.field('jobNo').pressSequentially(job)
 const date=await gcl.workspace.today()
 await gcl.workspace.save()
 await gcl.workspace.open(spn,r)
 await expect(gcl.workspace.field('jobNo')).toHaveValue(job)
 await expect(gcl.workspace.field('departureDate')).toHaveValue(date)
 return r
}
export const test=base.extend<{gcl:GclUI;owned:{track:GclTrack;records:GclRecord[]};gclErrors:void},{gclSources:(count:number)=>Promise<{referenceNo:string;id:string}[]>}>({
 gclSources:[async({browser},use)=>{
  const context=await browser.newContext({storageState:users.user1.statePath})
  context.setDefaultTimeout(45000);context.setDefaultNavigationTimeout(90000);await disablePrintDialog(context)
  const page=await context.newPage();ajax(page);new DialogLog(page)
  const {ExportUI,completeData,accept}=await import('../export/_shared')
  const ui=new ExportUI(page),spn=spnSession('user1'),pool:{referenceNo:string;id:string}[]=[]
  const ledger=path.resolve('../ai-support/evidence/gcl-owned-created-sources.json')
  const recorded:{referenceNo:string}[]=fs.existsSync(ledger)?JSON.parse(fs.readFileSync(ledger,'utf8')):[]
  const creationPath=path.resolve('../ai-support/evidence/gcl-source-creation-ledger.json')
  const created:{id:string;referenceNo:string;phase:string;updated?:string}[]=fs.existsSync(creationPath)?JSON.parse(fs.readFileSync(creationPath,'utf8')):[]
  const ownedIds=new Map(created.map(r=>[r.referenceNo,r.id]))
  const seeds=[...new Set([...(process.env.SPN_GCL_SOURCE_REFS || '').split(',').map(s=>s.trim()).filter(Boolean),...created.slice().reverse().map(r=>r.referenceNo),...recorded.slice().reverse().map(r=>r.referenceNo)])]
  // A single GCL worker may reuse an owned source only after the UI confirms
  // no active allocation. Failed workers must not consume a seed permanently.
  let seedCursor=0
  const nextSeed=()=>seeds[seedCursor++]
  let previousTest='',previousSensitive=false
  await use(async count=>{
   const currentTest=test.info().title,sensitive=/TC-GCL-(122|123|124|129)/.test(currentTest)
   if(currentTest!==previousTest && (sensitive || previousSensitive)){pool.length=0;seedCursor=0}
   previousTest=currentTest;previousSensitive=sensitive
   while(pool.length<count){
    const ref=nextSeed()
    if(ref) {
     await ui.creation.openList(spn);await ui.creation.searchReference(ref)
     if(await ui.creation.row(ref).count()!==1)continue
     const id=await ui.list.idOf(ref)
     if(ownedIds.has(ref) && ownedIds.get(ref)!==id)continue
     const exportRow=ui.creation.row(ref)
     if((await ui.creation.cell(exportRow,'declStatus').innerText()).trim()!=='ACCEPT')continue
     if(!/^[A-Z0-9]{14}$/.test((await ui.creation.cell(exportRow,'declaration').innerText()).trim()))continue
     const allocations=new GclListPage(page)
     await allocations.open(spn);await allocations.field('BY').selectOption({label:'Ref ใบขนขาออก'});await allocations.field('KEYWORD').fill(ref);await allocations.search()
     if(await allocations.rows.count())continue // never consume a seed with an active GCL allocation
     const saved=fs.existsSync(ledger)?JSON.parse(fs.readFileSync(ledger,'utf8')):[]
     if(!saved.some((r:{id:string})=>r.id===id)){saved.push({id,referenceNo:ref});fs.writeFileSync(ledger,JSON.stringify(saved,null,2))}
     const creationRows=fs.existsSync(creationPath)?JSON.parse(fs.readFileSync(creationPath,'utf8')):[]
     const recovered=creationRows.find((r:{id:string})=>r.id===id)
     if(recovered && recovered.phase!=='ACCEPT_CONFIRMED'){
      recovered.phase='ACCEPT_CONFIRMED';recovered.updated=new Date().toISOString();recovered.recoveredByStatusCheck=true
      fs.writeFileSync(creationPath,JSON.stringify(creationRows,null,2))
      test.info().annotations.push({type:'source-export',description:`Recovered owned source ${ref}: ACCEPT and declaration confirmed; no active GCL allocation`})
     }
     pool.push({referenceNo:ref,id});continue
    }
    const creationLedger=path.resolve('../ai-support/evidence/gcl-source-creation-ledger.json')
    const remember=(r:{id:string;referenceNo:string},phase:string)=>{
     const rows=fs.existsSync(creationLedger)?JSON.parse(fs.readFileSync(creationLedger,'utf8')):[]
     const prior=rows.findIndex((x:{id:string})=>x.id===r.id)
     const item={id:r.id,referenceNo:r.referenceNo,phase,updated:new Date().toISOString()}
     if(prior<0)rows.push(item);else rows[prior]=item
     fs.writeFileSync(creationLedger,JSON.stringify(rows,null,2))
    }
    const d=await completeData(ui,spn,r=>{
     remember(r,'CREATED_STATUS_NOT_YET_CONFIRMED')
     test.info().annotations.push({type:'source-export',description:`Owned source created ${r.referenceNo} (ExDclCtrl:${r.id}); acceptance not yet confirmed`})
    })
    await ui.item.fillCargo({packageAmount:d.header.packageAmount,packageUnit:d.header.packageUnit,grossWeight:d.header.grossWeight,shippingMark:d.header.shippingMark,purchaseCountry:d.header.purchaseCountry});await ui.item.save()
    await accept(ui,spn,d);remember(d,'ACCEPT_CONFIRMED');pool.push(d)
    const saved=fs.existsSync(ledger)?JSON.parse(fs.readFileSync(ledger,'utf8')):[]
    if(!saved.some((r:{id:string})=>r.id===d.id)){saved.push({id:d.id,referenceNo:d.referenceNo});fs.writeFileSync(ledger,JSON.stringify(saved,null,2))}
   }
   for(const d of pool.slice(0,count))test.info().annotations.push({type:'source-export',description:`Owned source ${d.referenceNo} (ExDclCtrl:${d.id}); retained ACCEPT fixture`})
   return pool.slice(0,count)
  })
  await context.close()
 },{scope:'worker',timeout:300000}],
 gcl:async({page,gclSources},use)=>use(new GclUI(page,gclSources)),
 owned:async({page,spn},use,info)=>{
  const records:GclRecord[]=[]
  await use({records,track:r=>{if(!records.some(x=>x.id===r.id)){records.push(r);info.annotations.push({type:'gcl-reference',description:r.reference})}}})
  if(info.status!==info.expectedStatus && !page.isClosed()) {
   try {await info.attach('gcl-before-cleanup.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'})}catch{}
  }
  for(const r of records) {
   try {
    const list=new GclListPage(page);await list.open(spn);await list.reference(r.reference)
    if(!await list.row(r.reference).count())continue
    if(!await list.row(r.reference).locator('img[title="Delete"]').isVisible())throw new Error('Not an editable Draft')
    const ws=new GclWorkspacePage(page);await ws.open(spn,r)
    const checks=ws.detail.locator('input[name="SYS_DEL[]"][value^="gtcdid:"]')
    if(await checks.count()) {
     for(const c of await checks.all())await c.check()
     await ws.deleteSelectedDetails()
     await expect(checks).toHaveCount(0)
    }
    await list.deleteOwn(spn,r)
   }
   catch {info.annotations.push({type:'cleanup-warning',description:`Own GCL draft retained: ${r.reference}`})}
  }
 },
 gclErrors:[async({page},use,info)=>{
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  await use()
  if(errors.length) await info.attach('gcl-page-errors.json',{body:JSON.stringify(errors,null,2),contentType:'application/json'})
 },{auto:true}],
})
