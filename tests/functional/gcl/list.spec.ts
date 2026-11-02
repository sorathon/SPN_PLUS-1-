import { test, expect, editableDraft, uniqueRef } from './_shared'
import { GCL_COLUMNS } from '../../pages/gcl/GclListPage'
import { HomePage } from '../../pages/spn/HomePage'
import { waitForReload } from '../../pages/spn/SpnApp'

test.describe('GCL · list/search',()=>{
 test.describe.configure({timeout:300_000})
 test('TC-GCL-001: Home VIEW GCL opens Goods Transition List @smoke',async({gcl,spn})=>{
  await new HomePage(gcl.page).open(spn)
  await gcl.page.getByRole('link',{name:/VIEW GCL/}).click()
  await expect(gcl.page).toHaveTitle('Goods Transition List')
  await expect(gcl.page.locator('#newBTN')).toBeVisible()
 })
 test('TC-GCL-002: ten GCL columns and only the observed list actions @smoke',async({gcl,spn})=>{
  await gcl.list.open(spn)
  const headers=gcl.page.locator('tr').filter({has:gcl.page.locator('#checkall')}).locator(':scope > td')
  expect((await headers.allTextContents()).map(x=>x.replace(/\s+/g,' ').trim())).toEqual(GCL_COLUMNS)
  for(const id of ['newBTN','CopyBTN','refreshBTN','saveXmlBTN','savePdfBTN','importDatatype']) await expect(gcl.page.locator('#'+id)).toBeVisible()
 })
 test('TC-GCL-003: Reference No and GCL No find the same accepted row @regression',async({gcl,spn})=>{
  await gcl.list.open(spn)
  await gcl.list.field('sStatus').selectOption({label:'Customs Accept'});await gcl.list.search()
  test.skip(await gcl.list.rows.count()===0,'No accepted GCL fixture')
  const row=gcl.list.rows.first(),ref=(await gcl.list.cell(row,2).innerText()).trim(),no=(await gcl.list.cell(row,3).innerText()).trim()
  expect(no).not.toBe('')
  await gcl.list.open(spn);await gcl.list.reference(ref);await expect(gcl.list.row(ref)).toHaveCount(1)
  await gcl.list.open(spn);await gcl.list.keyword(no,'GCLNo');await expect(gcl.list.row(ref)).toHaveCount(1)
 })
 test('TC-GCL-004: keyword By variants match known fixture fields @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track)
  const job=await gcl.workspace.field('jobNo').inputValue(),vessel=await gcl.workspace.field('vesselName').inputValue()
  for(const [label,value] of [['เลขที่รับงาน',job],['ชื่อยานพาหนะ',vessel]]) {
   await gcl.list.open(spn);await gcl.list.field('BY').selectOption({label});await gcl.list.field('KEYWORD').fill(value);await gcl.list.search()
   await expect(gcl.list.row(r.reference)).toHaveCount(1)
   for(const row of await gcl.list.rows.all()) expect((await row.innerText()).includes(value)).toBeTruthy()
  }
 })
 test('TC-GCL-005: ACCEPT/SEND/draft filters match each returned row status @regression',async({gcl,spn})=>{
  for(const label of ['Customs Accept','Waiting Response','Draft Document']) {
   await gcl.list.open(spn);await gcl.list.field('sStatus').selectOption({label});const code=await gcl.list.field('sStatus').inputValue();await gcl.list.search()
   await expect(gcl.list.field('sStatus')).toHaveValue(code)
   for(const row of await gcl.list.rows.all()) {
    const expected=label==='Draft Document'?'':code
    await expect(gcl.list.cell(row,1).locator('img').first()).toHaveAttribute('src',new RegExp('invstat_'+expected+'\\.gif$','i'))
   }
  }
 })
 test('TC-GCL-006: Departure Date filters one known date and F2 is available @regression',async({gcl,spn})=>{
  await gcl.list.open(spn)
  const rows=await gcl.list.rows.all();let day=''
  for(const row of rows){const v=(await gcl.list.cell(row,8).innerText()).trim();if(/^\d{4}-\d\d-\d\d$/.test(v)){day=v;break}}
  test.skip(!day,'No departure-date fixture')
  await expect(gcl.page.getByRole('button',{name:'F2',exact:true}).first()).toBeVisible()
  const formatted=day
  await gcl.list.field('sFROM').fill(formatted);await gcl.list.field('sTO').fill(formatted);await gcl.list.search()
  expect(await gcl.list.rows.count()).toBeGreaterThan(0)
  for(const row of await gcl.list.rows.all()) expect((await gcl.list.cell(row,8).innerText()).trim()).toBe(day)
 })
 test('TC-GCL-007: own/today filter retains this run’s draft @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track)
  for(const label of ['ใบกำกับการขนที่เป็นเจ้าของ','ใบกำกับการขนที่ทำในวันนี้']) {
   await gcl.list.open(spn);await gcl.list.field('FILTER').selectOption({label});await gcl.list.reference(r.reference)
   await expect(gcl.list.row(r.reference)).toHaveCount(1)
  }
 })
 test('TC-GCL-008: page sizes bound row count without duplicate references @regression',async({gcl,spn})=>{
  await gcl.list.open(spn)
  for(const size of ['15','30','50','100','200']) {
   await gcl.list.field('slimit').selectOption(size);await gcl.list.search()
   const refs=(await gcl.list.refs()).map(x=>x.trim());expect(refs.length).toBeLessThanOrEqual(Number(size));expect(new Set(refs).size).toBe(refs.length)
   await expect(gcl.list.field('slimit')).toHaveValue(size)
  }
 })
 test('TC-GCL-009: Next/Prev returns the original page @regression',async({gcl,spn})=>{
  await gcl.list.open(spn);const before=await gcl.list.refs()
  test.skip(!await gcl.page.getByRole('link',{name:'Next',exact:true}).isVisible(),'Only one list page')
  await waitForReload(gcl.page,()=>gcl.page.getByRole('link',{name:'Next',exact:true}).click())
  expect(await gcl.list.refs()).not.toEqual(before)
  await waitForReload(gcl.page,()=>gcl.page.getByRole('link',{name:/Prev/,exact:false}).click())
  expect(await gcl.list.refs()).toEqual(before)
 })
 test('TC-GCL-010: checkall selects/deselects only visible rows @regression',async({gcl,spn})=>{
  await gcl.list.open(spn);const checks=gcl.list.rows.locator('input[type=checkbox]')
  expect(await checks.count()).toBeGreaterThan(0)
  await gcl.page.locator('#checkall').check();for(const c of await checks.all())await expect(c).toBeChecked()
  await gcl.page.locator('#checkall').uncheck();for(const c of await checks.all())await expect(c).not.toBeChecked()
  await checks.first().check();await expect(checks.first()).toBeChecked()
 })
 test('TC-GCL-011: no-match clears old rows and reset restores results @regression',async({gcl,spn})=>{
  await gcl.list.open(spn);await gcl.list.reference(uniqueRef('MISSING'));await expect(gcl.list.rows).toHaveCount(0)
  await gcl.list.field('sREF').fill('');await gcl.list.search();expect(await gcl.list.rows.count()).toBeGreaterThan(0)
 })
 test('TC-GCL-012: Thai, quotes and special-character searches do not return stale data @regression',async({gcl,spn})=>{
  for(const term of [`ไม่มีข้อมูล-${uniqueRef('GCL')}`,`PW'&${uniqueRef('GCL')}`]) {
   await gcl.list.open(spn);await gcl.list.field('BY').selectOption({label:'เลขที่รับงาน'});await gcl.list.field('KEYWORD').fill(term);await gcl.list.search()
   await expect(gcl.list.rows).toHaveCount(0);await expect(gcl.page.locator('body')).not.toContainText(/SQLSTATE|Fatal error|PDOException|syntax error/i)
  }
 })
})
