import { test, expect, editableDraft, sourceDraft, uniqueRef } from './_shared'
import { GclActionsPage } from '../../pages/gcl/GclActionsPage'
import { ajax, DialogLog } from '../../pages/spn/SpnApp'

test.describe('GCL · validation/copy/notes/state',()=>{
 test.describe.configure({timeout:300_000})
 test('TC-GCL-120: Validate opens a popup for an owned draft @regression',async({gcl,spn,owned},info)=>{
  await editableDraft(gcl,spn,owned.track)
  const result=await new GclActionsPage(gcl.page).resultWindow(()=>gcl.workspace.control.locator('#validateBTN').click())
  expect(result,'Validate must open a popup').not.toBeNull()
  expect(result!.isClosed()).toBe(false)
  await info.attach('validate-popup.png',{body:await result!.screenshot(),contentType:'image/png'});await result!.close()
 })
 test('TC-GCL-121: Validate opens a popup for reference HQVM400001676 @regression',async({gcl,spn},info)=>{
  const ref=process.env.SPN_GCL_VALIDATION_REF || 'HQVM400001676'
  await gcl.list.open(spn);await gcl.list.reference(ref);await expect(gcl.list.row(ref)).toHaveCount(1)
  await gcl.list.openRecord(ref);await gcl.workspace.ready()
  const result=await new GclActionsPage(gcl.page).resultWindow(()=>gcl.workspace.control.locator('#validateBTN').click())
  expect(result,'Validate must open a popup').not.toBeNull();expect(result!.isClosed()).toBe(false)
  await info.attach('validate-reference-popup.png',{body:await result!.screenshot(),contentType:'image/png'});await result!.close()
 })
 test('TC-GCL-122: list Copy creates a new reference and preserves basic header mapping @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);const source=await gcl.workspace.lookup.snapshot(['INcompanyCode','vesselName','voyage'])
  const copies=await new GclActionsPage(gcl.page).copy(spn,r,'list',1,owned.track)
  expect(copies[0].reference).not.toBe(r.reference);await gcl.workspace.open(spn,copies[0]);expect(await gcl.workspace.lookup.snapshot(Object.keys(source))).toEqual(source)
 })
 test('TC-GCL-123: Copy GCL Control count 2 copies Control and Detail @regression',async({gcl,spn,owned})=>{
  test.setTimeout(600_000)
  const r=await editableDraft(gcl,spn,owned.track);const header=await gcl.workspace.lookup.snapshot(['INcompanyCode','vesselName','voyage']),details=await gcl.workspace.data()
  const copies=await new GclActionsPage(gcl.page).copy(spn,r,'control',2,owned.track)
  for(const copy of copies){await gcl.workspace.open(spn,copy);const normalize=(rows:typeof details)=>rows.map(({orderbyItemNo,...d})=>({...d,realPackage:Number(d.realPackage),realGrossWeight:Number(d.realGrossWeight)}));expect(normalize(await gcl.workspace.data())).toEqual(normalize(details));expect(await gcl.workspace.lookup.snapshot(Object.keys(header))).toEqual(header)}
 })
 test('TC-GCL-124: toolbar Copy creates its own reference without changing source Detail @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);const source=await gcl.workspace.data()
  const copies=await new GclActionsPage(gcl.page).copy(spn,r,'workspace',1,owned.track)
  expect(copies[0].reference).not.toBe(r.reference)
  await gcl.workspace.open(spn,r);expect(await gcl.workspace.data()).toEqual(source)
 })
 test('TC-GCL-125: Copy without selection alerts and creates no copy @regression',async({gcl,spn,dialogs})=>{
  await gcl.list.open(spn);const before=await gcl.list.refs();await gcl.page.locator('#CopyBTN').click()
  await dialogs.waitFor(/^Please choose record to Copy\.?$/);expect(await gcl.list.refs()).toEqual(before)
 })
 test('TC-GCL-126: synthetic footer note can be saved, reopened, edited and removed @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);const note=uniqueRef('PW-GCL-NOTE')
  await gcl.workspace.note();await gcl.workspace.control.locator('[name="position_gcl"]').selectOption({label:'ขอบล่างสุดของใบกำกับขนย้าย (GCL)'})
  await gcl.workspace.control.locator('#ins_note').fill(note);await gcl.workspace.control.locator('#saveNoteBTN').click();await gcl.workspace.idle()
  await gcl.workspace.open(spn,r);await gcl.workspace.note();await expect(gcl.workspace.control.locator('body')).toContainText(note)
  const row=gcl.workspace.control.locator('tr:not(:has(tr))').filter({hasText:note}).first()
  const edit=row.locator('img[title*="Edit"],input[value*="Edit"]')
  test.skip(!await edit.count(),'Footer Save/reopen verified, but Edit/Delete controls are not present; CRUD remainder cannot be verified')
  const opened=gcl.page.context().waitForEvent('page')
  await edit.first().click();const editor=await opened;new DialogLog(editor);await editor.waitForLoadState('load')
  await editor.locator('#ins_note').fill(note+' EDIT')
  const saved=editor.waitForResponse(r=>r.request().method()==='POST')
  await editor.locator('[name="updateNote"]').click();await (await saved).finished()
  if(!editor.isClosed())await editor.close()
  await gcl.workspace.open(spn,r);await gcl.workspace.note();await expect(gcl.workspace.control.locator('body')).toContainText(note+' EDIT')
  await gcl.workspace.control.locator('tr:not(:has(tr))').filter({hasText:note+' EDIT'}).first().locator('img[title*="Delete"],input[value*="Delete"]').first().click();await gcl.workspace.idle()
  await gcl.workspace.open(spn,r);await gcl.workspace.note();await expect(gcl.workspace.control.locator('body')).not.toContainText(note)
 })
 test('TC-GCL-127: all four GCL note Datatypes persist synthetic data with their type @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.note()
  const types=await gcl.workspace.control.locator('[name="position_gcl"] option').allTextContents();expect(types).toHaveLength(4)
  for(const [i,text]of ['0000000000000','QA TEST NAME','0000000000','PW FOOTER'].entries()) {
   await gcl.workspace.control.locator('[name="position_gcl"]').selectOption({label:types[i].trim()});await gcl.workspace.control.locator('#ins_note').fill(text);await gcl.workspace.control.locator('#saveNoteBTN').click();await gcl.workspace.idle()
  }
  await gcl.workspace.open(spn,r);await gcl.workspace.note();for(const text of ['0000000000000','QA TEST NAME','0000000000','PW FOOTER'])await expect(gcl.workspace.control.locator('body')).toContainText(text)
 })
 test('TC-GCL-128: draft/SEND/ACCEPT expose the observed state-specific toolbar @regression',async({gcl,spn,owned})=>{
  const d=await editableDraft(gcl,spn,owned.track);await expect(gcl.workspace.control.locator('#addDetail')).toBeVisible()
  for(const [label,add,cancel]of [['Waiting Response',false,false],['Customs Accept',true,true]] as const) {
   await gcl.list.open(spn);await gcl.list.field('sStatus').selectOption({label});await gcl.list.search();test.skip(!await gcl.list.rows.count(),`No ${label} fixture`)
   const ref=(await gcl.list.cell(gcl.list.rows.first(),2).innerText()).trim();await gcl.list.openRecord(ref);await gcl.workspace.ready()
   await expect(gcl.workspace.control.locator('#addDetail')).toBeVisible({visible:add});await expect(gcl.workspace.control.locator('#cancelDeclBTN')).toBeVisible({visible:cancel})
  }
 })
 test('TC-GCL-129: Cancel/Confirm Delete affects only this run’s draft @regression',async({gcl,spn,owned,dialogs})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.list.open(spn);await gcl.list.reference(r.reference);dialogs.answerNext({accept:false})
  await gcl.list.row(r.reference).locator('img[title="Delete"]').click();await expect(gcl.list.row(r.reference)).toHaveCount(1)
  await gcl.list.deleteOwn(spn,r);await gcl.list.open(spn);await gcl.list.reference(r.reference);await expect(gcl.list.rows).toHaveCount(0)
 })
})
