import { test,expect,filled,accept,today } from './_shared'

test.describe('Export · Search and filters',()=>{
  test.describe.configure({timeout:180_000})
  for(const c of [
    {id:'031',by:'jobNo',field:'job',value:'jobNo'},
    {id:'032',by:'masterBillOfLading',field:'mawb',value:'mawb'},
    {id:'033',by:'houseBillOfLading',field:'hawb',value:'hawb'},
  ] as const) {
    test(`TC-EXP-${c.id}: search Export by ${c.by} @regression`,async({ui,spn,sharedExport:d})=>{
      await ui.list.open(spn);await ui.list.search({keyword:d.header[c.value],by:c.by})
      await expect(ui.list.rows).toHaveCount(1)
      await expect(ui.list.cell(ui.list.row(d.referenceNo),c.field)).toHaveText(d.header[c.value])
    })
  }
  test('TC-EXP-035: today Reference Date filter includes the newly created Export @regression',async({ui,spn,sharedExport:d})=>{
    await ui.list.open(spn);await ui.list.search({dateType:'referenceDate',from:today().display,to:today().display,pageSize:'200'})
    await expect(ui.list.row(d.referenceNo)).toHaveCount(1)
    const dates=await ui.list.rows.evaluateAll(rs=>rs.map(r=>(r.querySelectorAll(':scope > td')[4] as HTMLElement).innerText.trim()))
    expect(dates.length).toBeGreaterThan(0);expect([...new Set(dates)]).toEqual([today().display])
  })
  test('TC-EXP-036: Export page size, Next and Prev preserve pagination @regression',async({ui,spn,sharedExport:_})=>{
    await ui.list.open(spn);await ui.list.search({pageSize:'15'})
    const first=await ui.list.references();expect(first).toHaveLength(15)
    await ui.list.next();const second=await ui.list.references()
    expect(second.length).toBeGreaterThan(0);expect(second.some(ref=>first.includes(ref))).toBe(false)
    await ui.list.prev();expect(await ui.list.references()).toEqual(first)
  })
  test('TC-EXP-037: check all selects and clears every Export row @regression',async({ui,spn})=>{
    await ui.list.open(spn);const count=await ui.list.rows.count();expect(count).toBeGreaterThan(0)
    await ui.list.checkAll.check();await expect(ui.page.locator('input[name="SELITEM[]"]:checked')).toHaveCount(count)
    await ui.list.checkAll.uncheck();await expect(ui.page.locator('input[name="SELITEM[]"]:checked')).toHaveCount(0)
  })
  test('TC-EXP-038: saved filter for today finds the new Export declaration @regression',async({ui,spn,sharedExport:d})=>{
    await ui.list.open(spn);await ui.list.filter.selectOption({label:'ใบขนที่ทำในวันนี้'})
    await ui.list.search({referenceNo:d.referenceNo})
    await expect(ui.list.filter).toHaveValue('6');await expect(ui.list.row(d.referenceNo)).toHaveCount(1)
    await expect(ui.list.cell(ui.list.row(d.referenceNo),'created')).toHaveText(today().display)
  })
  test('TC-EXP-039: search by assigned declaration number finds the same Export reference @regression',async({ui,spn,tracked})=>{
    const d=await filled(ui,spn,tracked.track),decl=await accept(ui,spn,d)
    await ui.list.open(spn);await ui.list.search({keyword:decl,by:'declarationNo'})
    await expect(ui.list.rows).toHaveCount(1);await expect(ui.list.cell(ui.list.row(d.referenceNo),'decl')).toHaveText(decl)
  })
})
