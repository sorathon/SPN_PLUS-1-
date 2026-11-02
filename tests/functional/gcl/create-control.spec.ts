import { test, expect, manualDraft, editableDraft, sourceDraft, today, uniqueRef } from './_shared'
import { UPPER_LOOKUPS } from '../../pages/gcl/GclLookup'
import { waitForReload } from '../../pages/spn/SpnApp'

test.describe('GCL · creation/control',()=>{
 test.describe.configure({timeout:300_000})
 test('TC-GCL-020: creation wizard has three routes and no reserved Ref @regression',async({gcl,spn})=>{
  await gcl.creation.wizard(spn)
  for(const id of ['withDeclaRadio','withoutDeclaRadio','withCsvRadio'])await expect(gcl.page.locator('#'+id)).toBeVisible()
  await expect(gcl.page.locator('#withDeclaRadio')).toBeChecked()
  expect(new URL(gcl.page.url()).searchParams.has('SELITEM')).toBe(false)
  await gcl.page.locator('[name="back"]').click();await expect(gcl.page.locator('#newBTN')).toBeVisible()
 })
 test('TC-GCL-021: create from one Export retains source/decl and quantities after reload @regression',async({gcl,spn,owned})=>{
  const d=await sourceDraft(gcl,spn,owned.track)
  const before=await gcl.workspace.data();expect(before.length).toBeGreaterThan(0)
  expect(before[0].source).toBe(d.sources[0][1]);expect(before[0].declaration).toBe(d.sources[0][2])
  expect(Number(before[0].realPackage)).toBe(Number(d.sources[0].at(-2)))
  await gcl.workspace.open(spn,d);expect(await gcl.workspace.data()).toEqual(before)
 })
 test('TC-GCL-022: two selected Exports remain linked to their own Detail rows @regression',async({gcl,spn,owned})=>{
  const d=await sourceDraft(gcl,spn,owned.track,2);const rows=await gcl.workspace.data()
  for(const source of d.sources)expect(rows.some(r=>r.source===source[1] && r.declaration===source[2])).toBe(true)
  await gcl.workspace.open(spn,d);expect(await gcl.workspace.data()).toEqual(rows)
 })
 test('TC-GCL-023: no selected Export cannot create a GCL @regression',async({gcl,spn,dialogs})=>{
  await gcl.creation.wizard(spn);await gcl.page.locator('#createBTN').click()
  await expect(gcl.page.locator('#withDeclaRadio')).toBeVisible();expect(gcl.page.url()).not.toContain('gtcid')
  await expect.poll(()=>dialogs.records.length).toBeGreaterThan(0)
 })
 test('TC-GCL-024: missing required manual data is not silently accepted as a ready document @regression',async({gcl,spn,dialogs,owned})=>{
  await gcl.creation.open(spn);await gcl.page.locator('#saveBTN').click()
  const result=await Promise.race([gcl.page.locator('#detailfrm').waitFor({timeout:10000}).then(()=> 'draft'),gcl.page.waitForEvent('dialog',{timeout:10000}).then(()=> 'guard')]).catch(()=> 'guard')
  if(result==='draft') {const r=await gcl.workspace.record();owned.track(r);await expect(gcl.workspace.control.locator('body')).not.toContainText('Status Customs Accept')}
  else {expect(dialogs.records.length).toBeGreaterThan(0);expect(gcl.page.url()).not.toContain('ACTION=WORKSPACE')}
 })
 test('TC-GCL-025: percent-selected New GCL saves as its own draft and reopens @smoke',async({gcl,spn,owned})=>{
  const r=await manualDraft(gcl,spn,owned.track)
  const expected=r.initialValues
  expect(r.reference).toMatch(/^[A-Z]{4}4\d{8}$/)
  await gcl.workspace.open(spn,r)
  expect(await gcl.workspace.lookup.snapshot(Object.keys(expected))).toEqual(expected)
 })
 test('TC-GCL-026: switch New/Declaration and Back creates no document implicitly @regression',async({gcl,spn})=>{
  await gcl.creation.open(spn);await gcl.creation.field('voyage').fill('UNSAVED')
  await gcl.page.locator('#withDeclaRadio').check();await expect(gcl.page.locator('#createBTN')).toBeVisible()
  expect(gcl.page.url()).not.toContain('gtcid');await gcl.page.locator('[name="back"]').click();await expect(gcl.page.locator('#newBTN')).toBeVisible()
 })
 test('TC-GCL-028: source filters select the actual Export reference/mode @regression',async({gcl,spn})=>{
  await gcl.creation.wizard(spn);const first=gcl.creation.sourceRows().first();const cells=await first.locator(':scope > td').allTextContents()
  const ref=cells[1].trim(),decl=cells[2].trim(),mode=cells[7].trim()
  await gcl.creation.sourceSearch(ref,mode)
  await expect(gcl.creation.sourceRows()).toHaveCount(1);await expect(gcl.creation.sourceRows()).toContainText(ref);await expect(gcl.creation.sourceRows()).toContainText(decl)
 })
 test('TC-GCL-029: Export Create GCL integration preserves mapped source data @integration',async({page,spn,owned},info)=>{
  const {ExportUI,completeData,accept}=await import('../export/_shared')
  const {ExportGclPage}=await import('../../pages/export/GclPage')
  const ui=new ExportUI(page);const d=await completeData(ui,spn,()=>{})
  info.annotations.push({type:'source-export',description:d.referenceNo})
  await ui.item.fillCargo({packageAmount:d.header.packageAmount,packageUnit:d.header.packageUnit,grossWeight:d.header.grossWeight,shippingMark:d.header.shippingMark,purchaseCountry:d.header.purchaseCountry});await ui.item.save()
  const decl=await accept(ui,spn,d);await ui.workspace.open(spn,d.id)
  const create=new ExportGclPage(page);const ref=await create.createOne();const ws=await create.open(ref);const result=await ws.read()
  expect(result.row.exportReference).toBe(d.referenceNo);expect(result.row.declaration).toBe(decl)
  expect(result.row.packages).toBe(d.header.packageAmount);expect(result.row.grossWeight).toBe(d.header.grossWeight)
  if(result.id)owned.track({id:result.id.split(':')[1],reference:ref})
  await info.attach('export-gcl.json',{body:JSON.stringify({source:d.referenceNo,gcl:ref,result},null,2),contentType:'application/json'})
 })
 test('TC-GCL-040: company lookup commits the literal first row @regression',async({gcl,spn})=>{
  await gcl.creation.open(spn);const picked=await gcl.creation.lookup.percent('INcompanyCode');await expect(gcl.creation.field('INcompanyCode')).toHaveValue(picked.value)
 })
 test('TC-GCL-041: company Info toggles details of the selected master @regression',async({gcl,spn})=>{
  await gcl.creation.open(spn);await gcl.creation.lookup.percent('INcompanyCode');await gcl.page.locator('#exporterShowHideBT').click()
  await expect(gcl.page.locator('[name="ins_companyName"]')).toBeVisible()
  const name=await gcl.page.locator('[name="ins_companyName"]').inputValue();expect(name).not.toBe('')
  await gcl.page.locator('#exporterShowHideBT').click();await expect(gcl.page.locator('[name="ins_companyName"]')).not.toBeVisible()
 })
 test('TC-GCL-042: clearing/reselecting company does not retain another master identity @regression',async({gcl,spn})=>{
  await gcl.creation.open(spn);const a=await gcl.creation.lookup.percent('INcompanyCode')
  await gcl.creation.field('INcompanyCode').fill('');await gcl.creation.field('INcompanyCode').press('Enter');await gcl.creation.field('INcompanyCode').press('Tab')
  await expect(gcl.creation.field('INcompanyCode')).toHaveValue('')
  const b=await gcl.creation.lookup.percent('INcompanyCode');expect(b.value).toBe(a.value)
 })
 test('TC-GCL-043: upper Control values and Job persist after Save @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);const data=await gcl.workspace.lookup.snapshot([...UPPER_LOOKUPS,'jobNo','departureDate'])
  await gcl.workspace.open(spn,r);expect(await gcl.workspace.lookup.snapshot([...UPPER_LOOKUPS,'jobNo','departureDate'])).toEqual(data)
  await gcl.list.open(spn);await gcl.list.reference(r.reference);await expect(gcl.list.cell(gcl.list.row(r.reference),4)).toHaveText(data.jobNo)
 })
 test('TC-GCL-044: ship/road/air transport values persist independently @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track)
  for(const mode of ['1','3','4']) {await gcl.workspace.field('transportMode').selectOption(mode);await gcl.workspace.save();await gcl.workspace.open(spn,r);await expect(gcl.workspace.field('transportMode')).toHaveValue(mode)}
 })
 test('TC-GCL-045: Departure Date calendar selection persists @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track)
  await gcl.workspace.control.getByRole('button',{name:'F2',exact:true}).click()
  const picker=gcl.workspace.control.locator('#ui-datepicker-div');await expect(picker).toBeVisible()
  await picker.getByRole('link',{name:'15',exact:true}).click();const date=await gcl.workspace.field('departureDate').inputValue();expect(date).toMatch(/^15[-/]\d{2}[-/]\d{4}$/)
  await gcl.workspace.save();await gcl.workspace.open(spn,r);await expect(gcl.workspace.field('departureDate')).toHaveValue(date)
 })
 test('TC-GCL-046: nonexistent master code gives feedback without adopting another code @regression',async({gcl,spn,dialogs})=>{
  await gcl.creation.open(spn);await gcl.creation.field('releasePort').fill('');await gcl.creation.field('releasePort').pressSequentially('ZZZZ');await gcl.creation.field('releasePort').press('Enter');await gcl.creation.field('releasePort').press('Tab')
  await expect.poll(async()=>dialogs.records.map(d=>d.message).join(' ')+' '+await gcl.page.locator('#popupDiv').innerText().catch(()=>'' )).toMatch(/not found|ไม่พบ|invalid|ถูกต้อง/i)
  expect(['','ZZZZ']).toContain(await gcl.creation.field('releasePort').inputValue())
 })
 test('TC-GCL-047: truck/trailer country and province fields remain distinct after Save @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track)
  await gcl.workspace.field('carLicense_2').fill('QA001');await gcl.workspace.field('trailerLicense').fill('QA002');await gcl.workspace.save()
  const values=await gcl.workspace.lookup.snapshot(['carLicense_2','trailerLicense','carProvince_2','carCountryCode','trailerProvinceCode','trailerCountryCode'])
  await gcl.workspace.open(spn,r);expect(await gcl.workspace.lookup.snapshot(Object.keys(values))).toEqual(values)
  expect(values.carLicense_2).not.toBe(values.trailerLicense)
 })
 test('TC-GCL-048: GPS/authorizer and sent/unsent remarks persist in separate fields @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);const values={GPSID:'PW-GPS',authorizer:'QA AUTOMATION',remarkGCL:'LOCAL ONLY',remark:'CUSTOMS REMARK'}
  for(const [n,v]of Object.entries(values))await gcl.workspace.field(n).fill(v)
  await gcl.workspace.save();await gcl.workspace.open(spn,r);expect(await gcl.workspace.lookup.snapshot(Object.keys(values))).toEqual(values)
 })
 test('TC-GCL-049: Thai and punctuation roundtrip through Control @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);const text=`ทดสอบ GCL ' & ${uniqueRef('NOTE')}`
  await gcl.workspace.field('remarkGCL').fill(text);await gcl.workspace.save();await gcl.workspace.open(spn,r);await expect(gcl.workspace.field('remarkGCL')).toHaveValue(text)
 })
 test('TC-GCL-050: schema 2016 is checked by default and retained on a new saved GCL @regression',async({gcl,spn,owned})=>{
  await gcl.creation.open(spn);await expect(gcl.creation.field('newSchema2016')).toBeChecked()
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.open(spn,r);await expect(gcl.workspace.field('newSchema2016')).toBeChecked()
 })
 test('TC-GCL-051: editing a header subset does not modify linked Detail @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);const details=await gcl.workspace.data(),vessel=await gcl.workspace.field('vesselName').inputValue()
  await gcl.workspace.field('jobNo').fill(uniqueRef('PW-GCL'));await gcl.workspace.field('remarkGCL').fill('HEADER CHANGE');await gcl.workspace.save();await gcl.workspace.open(spn,r)
  expect(await gcl.workspace.data()).toEqual(details);await expect(gcl.workspace.field('vesselName')).toHaveValue(vessel)
 })
})
