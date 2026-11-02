import { test, expect, editableDraft, manualDraft, sourceDraft } from './_shared'
import { waitForReload } from '../../pages/spn/SpnApp'

test.describe('GCL · Detail/source/totals',()=>{
 test.describe.configure({timeout:300_000})
 test('TC-GCL-080: Add Detail searches the selected Export and Back preserves the GCL @regression',async({gcl,spn,owned})=>{
  const d=await sourceDraft(gcl,spn,owned.track);const before=await gcl.workspace.data()
  const other=(await gcl.sources!(2))[1].referenceNo
  await gcl.workspace.addPage();await gcl.workspace.control.locator('[name="transMode"]').selectOption('1');await gcl.workspace.control.locator('[name="exRef"]').fill(other)
  await gcl.workspace.control.locator('#searchBTN').click();await gcl.workspace.idle()
  await expect(gcl.workspace.sourceRows()).toHaveCount(1);await expect(gcl.workspace.sourceRows()).toContainText(other)
  await gcl.workspace.control.locator('[name="back"]').click();await gcl.workspace.ready();expect(await gcl.workspace.data()).toEqual(before)
 })
 test('TC-GCL-081: adding one selected source preserves its reference and declaration @regression',async({gcl,spn,owned})=>{
  const source=(await gcl.sources!(1))[0];const r=await manualDraft(gcl,spn,owned.track);await gcl.workspace.addPage()
  await gcl.workspace.control.locator('[name="transMode"]').selectOption('1');await gcl.workspace.control.locator('[name="exRef"]').fill(source.referenceNo);await gcl.workspace.control.locator('#searchBTN').click();await gcl.workspace.idle()
  const row=gcl.workspace.sourceRows().filter({hasText:source.referenceNo}),cells=await row.locator(':scope > td').allTextContents()
  await row.locator('input[type=checkbox]').check();await gcl.workspace.addSelected()
  const data=await gcl.workspace.data();expect(data.some(d=>d.source===cells[1].trim() && d.declaration===cells[2].trim())).toBe(true)
  await gcl.workspace.open(spn,r);expect(await gcl.workspace.data()).toEqual(data)
 })
 test('TC-GCL-082: adding two sources keeps each Detail linked correctly @regression',async({gcl,spn,owned})=>{
  const refs=await gcl.sources!(2);const r=await manualDraft(gcl,spn,owned.track);await gcl.workspace.addPage();const sources=[]
  let prefix=refs[0].referenceNo;while(!refs[1].referenceNo.startsWith(prefix))prefix=prefix.slice(0,-1)
  await gcl.workspace.control.locator('[name="transMode"]').selectOption('1');await gcl.workspace.control.locator('[name="exRef"]').fill(prefix);await gcl.workspace.control.locator('[name="slimit"]').selectOption('200');await gcl.workspace.control.locator('#searchBTN').click();await gcl.workspace.idle()
  for(const source of refs){const row=gcl.workspace.sourceRows().filter({hasText:source.referenceNo});sources.push(await row.locator(':scope > td').allTextContents());await row.locator('input[type=checkbox]').check()}
  await gcl.workspace.addSelected();const data=await gcl.workspace.data()
  for(const s of sources)expect(data.some(d=>d.source===s[1].trim() && d.declaration===s[2].trim())).toBe(true)
  await gcl.workspace.open(spn,r);expect(await gcl.workspace.data()).toEqual(data)
 })
 test('TC-GCL-083: Add Detail with no selection changes no rows @regression',async({gcl,spn,owned,dialogs})=>{
  const r=await sourceDraft(gcl,spn,owned.track);const before=await gcl.workspace.data();await gcl.workspace.addPage()
  for(const checkbox of await gcl.workspace.control.locator('input[type=checkbox][name="Ex[]"]').all())await checkbox.uncheck()
  await expect(gcl.workspace.control.locator('input[type=checkbox][name="Ex[]"]:checked')).toHaveCount(0)
  const n=dialogs.records.length
  await gcl.workspace.control.locator('#createBTN').click();await expect.poll(()=>dialogs.records.length,{timeout:20_000,message:'Add Detail without selection shows a new dialog'}).toBeGreaterThan(n)
  await gcl.workspace.open(spn,r);expect(await gcl.workspace.data()).toEqual(before)
 })
 test('TC-GCL-084: duplicate-source behavior matches the configured expected row count @regression',async({gcl,spn,owned})=>{
  test.skip(!process.env.SPN_GCL_DUPLICATE_ROWS,'Duplicate/partial-shipment policy not confirmed; configure SPN_GCL_DUPLICATE_ROWS')
  const r=await sourceDraft(gcl,spn,owned.track);await gcl.workspace.addPage()
  const source=gcl.workspace.sourceRows().filter({hasText:r.sources[0][1]}).first();await source.locator('input[type=checkbox]').check();await gcl.workspace.addSelected()
  await expect(gcl.workspace.rows()).toHaveCount(Number(process.env.SPN_GCL_DUPLICATE_ROWS))
 })
 test('TC-GCL-085: New Row adds the requested one then two rows @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track)
  const before=await gcl.workspace.rows().count()
  await gcl.workspace.newRows('1');await expect(gcl.workspace.rows()).toHaveCount(before+1)
  await gcl.workspace.newRows('2');await expect(gcl.workspace.rows()).toHaveCount(before+3)
  await gcl.workspace.open(spn,r);await expect(gcl.workspace.rows()).toHaveCount(before+3)
 })
 // Quarantined: malformed New Row input caused uncontrolled server-side row creation.
 test.skip('TC-GCL-086: invalid New Row counts — disabled after uncontrolled row creation @regression',async()=>{})
 test('TC-GCL-087: Description/BL/Invoice/note edits persist without changing source identity @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);const before=(await gcl.workspace.data())[0]
  const values={description:'GCL ทดสอบรายการ',itemMasterBillOfLading:'PW-MASTER',itemHouseBillOfLading:'PW-HOUSE',invoiceNo:'PW-INVOICE',notation:'PW-NOTE'}
  for(const [n,v]of Object.entries(values))await gcl.workspace.rowField(n).fill(v)
  await gcl.workspace.save();await gcl.workspace.open(spn,r);const after=(await gcl.workspace.data())[0]
  for(const[n,v]of Object.entries(values))expect(after[n]).toBe(v)
  for(const n of ['source','declaration','tax','branch'])expect(after[n]).toBe(before[n])
 })
 test('TC-GCL-088: changing Item No keeps row-to-source mapping @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track,2);const before=await gcl.workspace.data()
  await expect(gcl.workspace.rowField('orderbyItemNo')).toHaveAttribute('maxlength','4')
  await gcl.workspace.rowField('orderbyItemNo',0).fill('0002');await gcl.workspace.rowField('orderbyItemNo',1).fill('0001')
  await gcl.workspace.save();await gcl.workspace.open(spn,r);const after=await gcl.workspace.data()
  for(const old of before)expect(after.some(n=>n.source===old.source && n.declaration===old.declaration && n.description===old.description)).toBe(true)
 })
 test('TC-GCL-089: Delete Detail with no selection preserves the row @regression',async({gcl,spn,owned,dialogs})=>{
  const r=await sourceDraft(gcl,spn,owned.track);const before=await gcl.workspace.data(),requests:string[]=[]
  const watch=(request:import('@playwright/test').Request)=>{if(request.method()==='POST' && /goodstransitiondetail/i.test(request.url()) && /ACTION=delete/i.test(request.url()+' '+(request.postData()||'')))requests.push('Delete POST')}
  gcl.page.on('request',watch)
  await gcl.workspace.detail.locator('[name="deleteDetail"]').click();await gcl.workspace.idle()
  await gcl.workspace.open(spn,r);expect(await gcl.workspace.data()).toEqual(before)
  gcl.page.off('request',watch);test.info().annotations.push({type:'warning',description:`No-selection Delete submitted ${requests.length} request(s); persisted rows unchanged`})
  if(!dialogs.records.length)test.info().annotations.push({type:'warning',description:'No-selection guard leaves data intact without a native alert'})
 })
 test('TC-GCL-090: cancel/confirm Delete Detail affects only the selected row @regression',async({gcl,spn,owned,dialogs})=>{
  const r=await sourceDraft(gcl,spn,owned.track,2);const before=await gcl.workspace.data()
  const n=dialogs.records.length
  await gcl.workspace.rows().first().locator('input[type=checkbox]').check();dialogs.answerNext({accept:false})
  await gcl.workspace.detail.locator('[name="deleteDetail"]').click();await gcl.workspace.idle()
  const confirmed=dialogs.records.slice(n).some(d=>d.type==='confirm')
  dialogs.clearPendingAnswers()
  await gcl.workspace.open(spn,r)
  if(confirmed) {
   expect(await gcl.workspace.data()).toEqual(before)
   await gcl.workspace.rows().first().locator('input[type=checkbox]').check();await gcl.workspace.deleteSelectedDetails()
  } else test.info().annotations.push({type:'warning',description:'Detail Delete has no confirmation dialog; Cancel branch does not apply'})
  await gcl.workspace.open(spn,r);const after=await gcl.workspace.data()
  expect(after).toHaveLength(before.length-1);expect(after.some(d=>d.source===before[1].source)).toBe(true)

 })
 test('TC-GCL-091: leaving Add Detail without adding preserves Header and Detail @regression',async({gcl,spn,owned})=>{
  const r=await sourceDraft(gcl,spn,owned.track);const before=await gcl.workspace.data(),header=await gcl.workspace.lookup.snapshot(['INcompanyCode','vesselName','voyage'])
  await gcl.workspace.addPage();await gcl.workspace.control.locator('[name="exRef"]').fill('NO-ADD');await gcl.workspace.control.locator('[name="back"]').click();await gcl.workspace.ready()
  expect(await gcl.workspace.data()).toEqual(before);expect(await gcl.workspace.lookup.snapshot(Object.keys(header))).toEqual(header)
 })
 test('TC-GCL-100: same-unit footer totals equal actual Package/Gross sum @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track,2)
  for(const [i,pkg,gross]of [[0,'10','120'],[1,'5','80']] as const){await gcl.workspace.rowField('realPackage',i).fill(pkg);await gcl.workspace.rowField('realGrossWeight',i).fill(gross)}
  await gcl.workspace.save();await gcl.workspace.open(spn,r)
  const footer=gcl.workspace.detail.locator('tr:not(:has(tr))').filter({has:gcl.workspace.detail.locator('td:nth-child(6) > a.classcolumntitle').filter({hasText:/^\s*[\d,.]+\s*$/})})
  await expect(footer).toHaveCount(1)
  expect(Number((await footer.locator(':scope > td').nth(5).innerText()).replace(/,/g,''))).toBe(15)
  expect(Number((await footer.locator(':scope > td').nth(7).innerText()).replace(/,/g,''))).toBe(200)
 })
 test('TC-GCL-101: source tree identities and quantities match Detail @regression',async({gcl,spn,owned})=>{
  await sourceDraft(gcl,spn,owned.track,2)
  const rows=await gcl.workspace.data(),tree=await gcl.page.locator('body').innerText()
  for(const row of rows){expect(tree).toContain(row.source);expect(tree).toContain(row.declaration);expect(tree).toContain(row.realPackage);expect(tree).toContain(row.realGrossWeight)}
 })
 test('TC-GCL-102: package proportion follows the supplied expected gross weight @regression',async({gcl,spn,owned})=>{
  test.skip(!process.env.SPN_GCL_PROPORTION_GROSS,'Proportion/rounding oracle not confirmed; set SPN_GCL_PROPORTION_GROSS for package=5')
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.detail.locator('[name="proportion"]').check();await gcl.workspace.rowField('realPackage').fill('5');await gcl.workspace.save();await gcl.workspace.open(spn,r)
  expect(Number((await gcl.workspace.data())[0].realGrossWeight)).toBe(Number(process.env.SPN_GCL_PROPORTION_GROSS))
 })
 test('TC-GCL-103: a zero planned-package source cannot produce NaN/Infinity @regression',async({gcl,spn,owned})=>{
  test.skip(!process.env.SPN_GCL_ZERO_PACKAGE_REF,'Need an explicitly supplied owned zero-package Export fixture; existing user sources are not allocated')
  await gcl.creation.wizard(spn)
  await gcl.creation.sourceSearch(process.env.SPN_GCL_ZERO_PACKAGE_REF!,'1')
  const row=gcl.creation.sourceRows().filter({hasText:process.env.SPN_GCL_ZERO_PACKAGE_REF!})
  await expect(row).toHaveCount(1)
  expect(Number((await row.locator(':scope > td').allTextContents()).at(-2))).toBe(0)
  await row.locator('input[type=checkbox]').check()
  await gcl.creation.createSelected();const r=await gcl.workspace.record();owned.track(r)
  test.skip(await gcl.workspace.rows().count()===0,'Zero-package Export has no Item/Detail for proportion')
  await gcl.workspace.detail.locator('[name="proportion"]').check();await gcl.workspace.rowField('realPackage').fill('0');await gcl.workspace.save();await gcl.workspace.open(spn,r)
  await expect(gcl.workspace.detail.locator('body')).not.toContainText(/NaN|Infinity|Division by zero/i)
 })
 test('TC-GCL-104: Package/Gross limits reject nonnumeric and negative saved values @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track)
  await expect(gcl.workspace.rowField('realPackage')).toHaveAttribute('maxlength','8');await expect(gcl.workspace.rowField('realGrossWeight')).toHaveAttribute('maxlength','15')
  const original=(await gcl.workspace.data())[0]
  for(const name of ['realPackage','realGrossWeight'])for(const value of ['-1','abc']) {
   await gcl.workspace.rowField(name).fill(value);await gcl.workspace.save();await gcl.workspace.open(spn,r)
   const saved=(await gcl.workspace.data())[0][name]
   test.info().annotations.push({type:'warning',description:`${name}: submitted ${value}; persisted ${saved}`})
   expect.soft(saved,`${name} rejects ${value}`).not.toBe(value);expect.soft(Number(saved),`${name} cannot persist a negative or nonnumeric quantity`).toBeGreaterThanOrEqual(0)
   await gcl.workspace.rowField(name).fill(original[name]);await gcl.workspace.save();await gcl.workspace.open(spn,r)
  }
 })
 test('TC-GCL-105: Thai/comma/newline text and 35-character BL survive saving @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);const text='สินค้าไทย, "GCL"\nบรรทัดใหม่'
  await gcl.workspace.rowField('description').fill(text);await gcl.workspace.rowField('invoiceNo').fill(text)
  for(const name of ['itemMasterBillOfLading','itemHouseBillOfLading']) {await expect(gcl.workspace.rowField(name)).toHaveAttribute('maxlength','35');await gcl.workspace.rowField(name).fill('A'.repeat(35))}
  await gcl.workspace.save();await gcl.workspace.open(spn,r);const row=(await gcl.workspace.data())[0]
  expect(row.description).toBe(text);expect(row.invoiceNo).toBe(text);expect(row.itemMasterBillOfLading).toBe('A'.repeat(35))
 })
 test('TC-GCL-106: mixed-unit aggregation matches a supplied footer oracle @regression',async({gcl,spn,owned})=>{
  test.skip(!process.env.SPN_GCL_MIXED_REFS || !process.env.SPN_GCL_MIXED_FOOTER,'Need mixed-unit source references and confirmed aggregation oracle')
  await gcl.creation.wizard(spn)
  for(const ref of process.env.SPN_GCL_MIXED_REFS!.split(','))await gcl.creation.sourceRows().filter({hasText:ref.trim()}).locator('input[type=checkbox]').check()
  await gcl.creation.createSelected();owned.track(await gcl.workspace.record());const rows=await gcl.workspace.data()
  expect(new Set(rows.map(r=>r.packageUnit+'|'+r.weightUnit)).size).toBeGreaterThan(1)
  await expect(gcl.workspace.detail.locator('body')).toContainText(process.env.SPN_GCL_MIXED_FOOTER!)
 })
 test('TC-GCL-107: GCL actual-weight edits do not change source Export header @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track)
  const source=r.sources[0][1]
  const {ExportUI}=await import('../export/_shared');const ui=new ExportUI(gcl.page)
  await ui.creation.openList(spn);await ui.creation.searchReference(source);await ui.creation.reopen(source)
  const before=await ui.workspace.field('grossWeight').inputValue()
  await gcl.workspace.open(spn,r);await gcl.workspace.rowField('realGrossWeight').fill('99');await gcl.workspace.save()
  await ui.creation.openList(spn);await ui.creation.searchReference(source);await ui.creation.reopen(source);await expect(ui.workspace.field('grossWeight')).toHaveValue(before)
 })
})
