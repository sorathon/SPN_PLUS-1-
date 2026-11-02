import { test, expect, manualDraft, GclUI, GclTrack } from './_shared'
import { GclCsvPage } from '../../pages/gcl/GclCsvPage'
import type { SpnSession } from '../../pages/spn/SpnApp'
import { CONTROL_COLUMNS } from '../../data/gcl/workspace-csv'

async function start(gcl:GclUI,spn:SpnSession,track:GclTrack) {
  const draft=await manualDraft(gcl,spn,track)
  const record={id:draft.id,reference:draft.reference}
  // Exercise the requested path: go back to the list, then click this Ref.
  await gcl.list.open(spn);await gcl.list.reference(record.reference);await gcl.list.openRecord(record.reference);await gcl.workspace.ready()
  await expect(gcl.workspace.control.locator('#uploadCSV')).toBeVisible()
  const header=await control(gcl),details=await gcl.workspace.data()
  const csv=new GclCsvPage(gcl.page);await csv.existing()
  return {record,csv,header,details}
}
async function control(gcl:GclUI) {
  const values:Record<string,string>={}
  for(const name of CONTROL_COLUMNS){
    const input=gcl.workspace.control.locator(`[name="ins_${name}" i]`).first()
    if(await input.count())values[name]=await input.inputValue()
  }
  return values
}

test.describe('GCL · Upload CSV after opening Ref',()=>{
  test.describe.configure({timeout:300_000})
  test('TC-GCL-180: open Ref then CSV toolbar icon exposes the workspace upload form @regression',async({gcl,spn,owned})=>{
    const {record,csv}=await start(gcl,spn,owned.track)
    await expect(csv.scope.locator('#uploadFile')).toBeVisible()
    await expect(csv.scope.getByRole('button',{name:/Upload/})).toBeVisible()
    expect(decodeURIComponent(gcl.page.url())).toContain('gtcid:'+record.id)
  })
  test('TC-GCL-181: workspace Upload without a file warns and preserves this GCL @regression',async({gcl,spn,owned,dialogs})=>{
    const {record,csv,header:before,details}=await start(gcl,spn,owned.track)
    const n=dialogs.records.length
    await csv.scope.getByRole('button',{name:/Upload/}).click()
    await expect.poll(()=>dialogs.records.slice(n).map(row=>row.message).join(' ')).toMatch(/(?:select|upload).*file|เลือก.*ไฟล์/i)
    await gcl.workspace.open(spn,record)
    expect(await control(gcl)).toEqual(before);expect(await gcl.workspace.data()).toEqual(details)
  })
  test('TC-GCL-182: workspace Upload rejects empty CSV and wrong extension without changing this GCL @regression',async({gcl,spn,owned,dialogs})=>{
    const {record,csv,header:before,details}=await start(gcl,spn,owned.track)
    for(const kind of ['empty','extension'] as const)await test.step(kind,async()=>{
      await csv.existing()
      await csv.scope.locator('#uploadFile').setInputFiles({name:kind==='empty'?'empty.csv':'wrong.txt',mimeType:'text/plain',buffer:kind==='empty'?Buffer.alloc(0):Buffer.from('not a CSV')})
      const n=dialogs.records.length
      await csv.scope.getByRole('button',{name:/Upload/}).click()
      await expect.poll(()=>dialogs.records.slice(n).map(row=>row.message).join(' '),{timeout:45_000,message:kind+' CSV validation completes'}).toMatch(kind==='empty'?/empty|not found data|ว่าง|ไม่พบ.*ข้อมูล/i:/only.*csv|\.csv|นามสกุล/i)
      // Empty CSV is rejected by the server, then its alert redirects the top
      // window to this workspace. Let that navigation finish before reopening.
      if(kind==='empty')await gcl.workspace.ready()
      await gcl.workspace.open(spn,record)
      expect(await control(gcl)).toEqual(before);expect(await gcl.workspace.data()).toEqual(details)
    })
  })
})
