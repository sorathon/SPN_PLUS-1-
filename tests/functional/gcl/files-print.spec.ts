import fs from 'node:fs'
import path from 'node:path'
import { randomInt } from 'node:crypto'
import { test, expect, sourceDraft, editableDraft } from './_shared'
import { GclFilesPage } from '../../pages/gcl/GclFilesPage'
import { GclActionsPage } from '../../pages/gcl/GclActionsPage'
import { captureDownload, DialogLog, waitForReload } from '../../pages/spn/SpnApp'
import { PrintSettingPopup } from '../../pages/spn/Popups'
import { GclCsvPage } from '../../pages/gcl/GclCsvPage'

test.describe('GCL · files and print (CSV deliberately excluded)',()=>{
 test.describe.configure({timeout:300_000})
 for(const [id,kind,count] of [['140','XML',1],['141','XML',2],['142','PDF',1],['143','PDF',2]] as const) {
  test(`TC-GCL-${id}: Save ${kind} contains exactly the selected ${count} GCL document(s) @regression`,async({gcl,spn,owned},info)=>{
   const records=[];for(let i=0;i<count;i++)records.push(await editableDraft(gcl,spn,owned.track,1,i))
   const filesPage=new GclFilesPage(gcl.page),entries=await filesPage.download(spn,records,kind,info.outputPath())
   expect(entries).toHaveLength(count)
   for(const record of records) {
    const matches=entries.filter(e=>kind==='XML'?e.name===`${record.reference}.xml`:e.name.startsWith(record.reference+'_')&&e.name.endsWith('.pdf'))
    expect(matches,record.reference+' maps to exactly one downloaded file').toHaveLength(1);const entry=matches[0]
    if(kind==='XML')await filesPage.assertXml(entry!.data,record,record.sources.map(s=>s[2]))
    else filesPage.assertPdf(entry!.data,record.reference)
    await info.attach(entry!.name,{body:entry!.data,contentType:kind==='XML'?'application/xml':'application/pdf'})
   }
  })
 }
 test('TC-GCL-144: XML/PDF without selection show a guard and start no download @regression',async({gcl,spn,dialogs})=>{
  for(const id of ['saveXmlBTN','savePdfBTN']) {
   await gcl.list.open(spn);let downloaded=false;const onDownload=()=>{downloaded=true};gcl.page.on('download',onDownload)
   const n=dialogs.records.length;await gcl.page.locator('#'+id).click();await expect.poll(()=>dialogs.records.length).toBeGreaterThan(n)
   expect(dialogs.records[n].message).toMatch(/เลือก|choose/i);expect(downloaded).toBe(false);gcl.page.off('download',onDownload)
  }
 })
 test('TC-GCL-145: Control Print returns a PDF for this GCL @regression',async({gcl,spn,owned},info)=>{
  const r=await editableDraft(gcl,spn,owned.track)
  const file=await captureDownload(gcl.page,()=>gcl.workspace.control.locator('#printBTN').click())
  new GclFilesPage(gcl.page).assertPdf(file.data,r.reference);expect(file.fileName).toContain(r.reference)
  await info.attach(file.fileName,{body:file.data,contentType:'application/pdf'})
 })
 test('TC-GCL-146: row Print opens the requested reference and returns its PDF @regression',async({gcl,spn,owned},info)=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.list.open(spn);await gcl.list.reference(r.reference)
  const file=await captureDownload(gcl.page,()=>gcl.list.row(r.reference).locator('img[title="Print"]').click())
  new GclFilesPage(gcl.page).assertPdf(file.data,r.reference);expect(file.fileName).toContain(r.reference)
  await info.attach(file.fileName,{body:file.data,contentType:'application/pdf'})
 })
 test('TC-GCL-147: Event opens VIEW for the chosen reference without changing Detail @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track),before=await gcl.workspace.data();await gcl.list.open(spn);await gcl.list.reference(r.reference)
  await waitForReload(gcl.page,()=>gcl.list.row(r.reference).locator('img[title="Event"]').click())
  const url=new URL(gcl.page.url());expect(url.searchParams.get('ACTION')?.toUpperCase()).toBe('VIEW')
  expect(url.searchParams.get('SELITEM')).toBe('gtcid:'+r.id)
  await expect(gcl.page.locator('body')).toContainText(r.reference)
  await expect(gcl.page.locator('body')).not.toContainText(/Fatal error|PDOException/i)
  await gcl.workspace.open(spn,r);expect(await gcl.workspace.data()).toEqual(before)
 })
 test('TC-GCL-148: Change Port requires a new port before NEXT @regression',async({gcl,spn,owned})=>{
  await sourceDraft(gcl,spn,owned.track);await gcl.page.locator('[name="changePort"]').click()
  await expect(gcl.workspace.control.getByText('คำร้องขอเปลี่ยนเขตท่าที่จะขนถ่ายสินค้า',{exact:true})).toBeVisible()
  const next=gcl.workspace.control.getByRole('button',{name:'NEXT',exact:true});await expect(next).toBeDisabled()
  const field=gcl.workspace.control.locator('[name="ins_new_dischargePort"]');await field.pressSequentially('%');await gcl.workspace.idle()
  const first=gcl.workspace.control.locator('#popupDiv input[name="selList"]').first();await expect(first).toBeVisible();await first.press('Enter');await field.press('Tab');await expect(next).toBeEnabled()
 })
 test('TC-GCL-149: Return Goods full/partial options retain the selected source @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.page.locator('[name="returnGoods"]').click()
  await expect(gcl.workspace.control.getByText('คำร้องขอตรวจรับสินค้ากลับคืน/ยกเลิกการส่งออก',{exact:true})).toBeVisible()
  const radios=gcl.workspace.control.locator('input[type=radio]');await expect(radios.first()).toBeChecked();await radios.nth(1).check();await expect(radios.nth(1)).toBeChecked()
  await expect(gcl.workspace.control.locator('select:visible')).toContainText(r.sources[0][1]);await expect(gcl.workspace.control.getByRole('button',{name:'NEXT',exact:true})).toBeVisible()
  // Stop at the form: this test must not submit a return/cancellation request.
 })
 test('TC-GCL-155: DAT missing file and invalid bytes do not create a GCL @regression',async({gcl,spn,dialogs},info)=>{
  await gcl.list.open(spn);const before=await gcl.list.refs(),n=dialogs.records.length
  await gcl.page.locator('#importDatatype').click();await expect.poll(()=>dialogs.records.length).toBeGreaterThan(n)
  await gcl.list.open(spn)
  const file=info.outputPath('invalid-gcl.dat');fs.writeFileSync(file,'NOT_A_GCL_DAT')
  await gcl.list.field('dataFile').setInputFiles(file);await gcl.page.locator('#importDatatype').click();await gcl.page.waitForLoadState('load')
  await gcl.list.open(spn);expect(await gcl.list.refs()).toEqual(before)
 })
 test('TC-GCL-157: upload supplied GCL DAT and verify a new Draft with matching Control and Details @integration',async({gcl,spn},info)=>{
  let input=process.env.SPN_GCL_DAT || path.resolve(__dirname,'../../data/gcl/GCL_single_detail.dat')
  if(!process.env.SPN_GCL_DAT && !process.env.SPN_GCL_DAT_RECOVERY){
   // Use a fresh fixture reference so the existing user's Ref is never targeted.
   let fresh=''
   for(let attempt=0;attempt<5;attempt++){
    fresh='HQVM4'+String(randomInt(90_000_000,100_000_000))
    await gcl.list.open(spn);await gcl.list.reference(fresh)
    if(await gcl.list.row(fresh).count()===0)break
    fresh=''
   }
   expect(fresh,'A new isolated DAT fixture reference is available').not.toBe('')
   const original=fs.readFileSync(input).toString('latin1'),split=original.indexOf("'DETAIL'")
   expect(split).toBeGreaterThan(0)
   const header=original.slice(0,split).replace(/('referenceNo'\s*=>\s*)'[^']*'/,"$1'"+fresh+"'")
   input=info.outputPath('GCL-single-detail.dat');fs.writeFileSync(input,Buffer.from(header+original.slice(split),'latin1'))
  }
  const bytes=fs.readFileSync(input),text=new TextDecoder('windows-874').decode(bytes)
  // DAT contains PHP array notation. Read scalar data only; never execute/eval it.
  const scalar=(section:string,key:string)=>[...section.matchAll(new RegExp("'"+key+"'\\s*=>\\s*'((?:\\\\.|[^'\\\\])*)'",'g'))].map(m=>m[1].replace(/\\'/g,"'").replace(/\\\\/g,'\\'))
  const [header,details]=text.split(/'DETAIL'\s*=>/)
  expect(details,'The supplied DAT has a DETAIL section').toBeTruthy()
  const expected={reference:scalar(header,'referenceNo')[0],vessel:scalar(header,'vesselName')[0],containerIndicator:scalar(header,'containerIndicator')[0],
   sources:scalar(details,'referenceNo'),invoices:scalar(details,'invoiceNo'),packages:scalar(details,'realPackage'),weights:scalar(details,'realGrossWeight'),descriptions:scalar(details,'description')}
  expect(expected.sources.length,'DAT contains source Details').toBeGreaterThan(0)
  if(!process.env.SPN_GCL_DAT)expect(expected.sources,'Default DAT fixture contains one Detail only').toHaveLength(1)
  for(const values of [expected.invoices,expected.packages,expected.weights,expected.descriptions])expect(values.length).toBe(expected.sources.length)
  await info.attach(path.basename(input),{body:bytes,contentType:'application/octet-stream'})
  await info.attach('dat-expected.json',{body:JSON.stringify(expected,null,2),contentType:'application/json'})
  let records: {id:string;reference:string}[]
  if(process.env.SPN_GCL_DAT_RECOVERY){
   // Resume verification of a successful upload after a response-capture failure.
   // Recovery evidence records before/after IDs from that upload's retained trace.
   const recovery=JSON.parse(fs.readFileSync(process.env.SPN_GCL_DAT_RECOVERY,'utf8')) as {beforeIds:string[];record:{id:string;reference:string};trace:string}
   expect(fs.existsSync(recovery.trace),'Original upload trace exists').toBe(true)
   expect(recovery.beforeIds).not.toContain(recovery.record.id)
   records=[recovery.record]
   await info.attach('dat-recovery.json',{path:process.env.SPN_GCL_DAT_RECOVERY,contentType:'application/json'})
  }else{
   const inventory=new GclCsvPage(gcl.page),before=await inventory.inventory(spn)
   await info.attach('dat-before.json',{body:JSON.stringify(before),contentType:'application/json'})
   await gcl.list.field('dataFile').setInputFiles(input)
   const pending=gcl.page.waitForResponse(r=>r.request().method()==='POST' && r.request().isNavigationRequest(),{timeout:90_000})
   await waitForReload(gcl.page,()=>gcl.page.locator('#importDatatype').click(),undefined,90_000)
   const response=await pending,answer=await response.body().catch(async()=>Buffer.from(await gcl.page.content()))
   const redact=(value:string)=>value.replace(/(UCODE|PHPSESSID)=([^&\s"<>]+)/gi,'$1=[redacted]')
   await info.attach('dat-upload-response.html',{body:redact(answer.toString('utf8')),contentType:'text/html'})
   const proof=answer.toString('latin1')+'\n'+await gcl.page.content()
   records=await inventory.created(spn,before,proof,()=>{})
   await info.attach('dat-created.json',{body:JSON.stringify({status:response.status(),records},null,2),contentType:'application/json'})
   expect(response.status(),'DAT upload HTTP status').toBeLessThan(400)
   expect(proof,'DAT upload has no server failure').not.toMatch(/Fatal error|Internal Server Error|PDOException|SQLSTATE/i)
  }
  expect(records,'Upload must create exactly one proven new GCL; existing references are not owned').toHaveLength(1)
  const record=records[0]
  info.annotations.push({type:'gcl-reference',description:`${record.reference} (gtcid:${record.id}); uploaded DAT draft retained for review`})
  await gcl.workspace.open(spn,record)
  await expect(gcl.workspace.field('vesselName')).toHaveValue(expected.vessel)
  await expect(gcl.workspace.field('containerIndicator')).toHaveValue(expected.containerIndicator)
  const actual=await gcl.workspace.data()
  expect(actual,'Imported DAT detail count').toHaveLength(expected.sources.length)
  for(let i=0;i<actual.length;i++){
   expect(actual[i].source,`Detail ${i+1} source`).toContain(expected.sources[i])
   expect(actual[i].invoiceNo).toBe(expected.invoices[i])
   expect(actual[i].description).toBe(expected.descriptions[i])
   expect(Number(actual[i].realPackage)).toBe(Number(expected.packages[i]))
   expect(Number(actual[i].realGrossWeight)).toBe(Number(expected.weights[i]))
  }
  await info.attach('dat-imported-details.json',{body:JSON.stringify({record,actual},null,2),contentType:'application/json'})
  await gcl.workspace.open(spn,record)
  expect(await gcl.workspace.data(),'Imported details persist after reopening').toEqual(actual)
 })
})
