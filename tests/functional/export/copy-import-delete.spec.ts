import fs from 'node:fs'
import path from 'node:path'
import { test,expect,filled,completeData,RecordRef } from './_shared'
import { exported } from './_downloads'
import { ExportViewPage } from '../../pages/export/ViewPage'
import { waitForReload } from '../../pages/spn/SpnApp'

test.describe('Export · Copy, Import, Delete and Event',()=>{
  test.describe.configure({timeout:240_000})
  test('TC-EXP-060: list Copy creates a second Export reference with the same Header @smoke',async({ui,spn,tracked})=>{
    const d=await filled(ui,spn,tracked.track)
    await ui.list.open(spn);await ui.list.search({keyword:d.header.jobNo,by:'jobNo'});await ui.list.select(d.id);await ui.list.copy()
    await ui.list.search({keyword:d.header.jobNo,by:'jobNo'});await expect(ui.list.rows).toHaveCount(2)
    const ref=(await ui.list.references()).find(r=>r!==d.referenceNo)!
    expect(ref).toMatch(/^[A-Z]{4}\d{9}$/);tracked.track({id:await ui.list.idOf(ref),referenceNo:ref})
    await expect(ui.list.cell(ui.list.row(ref),'mawb')).toHaveText(d.header.mawb)
    await expect(ui.list.cell(ui.list.row(ref),'hawb')).toHaveText(d.header.hawb)
  })
  test('TC-EXP-061: Copy with no selected Export asks to choose a record @regression',async({ui,spn,dialogs})=>{
    await ui.list.open(spn);await ui.page.locator('#CopyBTN').click()
    expect((await dialogs.waitFor(/choose record to Copy/i)).type).toBe('alert')
  })
  test('TC-EXP-062: Copy Decl Control copies only the Export Header @regression',async({ui,spn,tracked})=>{
    const d=await completeData(ui,spn,tracked.track)
    await ui.workspace.open(spn,d.id);await ui.workspace.copyHeader()
    const copy={id:ui.workspace.idFromUrl(),referenceNo:(await ui.workspace.referenceNo.innerText()).trim()};tracked.track(copy)
    expect(copy.id).not.toBe(d.id);expect(copy.referenceNo).not.toBe(d.referenceNo)
    expect(await ui.workspace.counts()).toEqual({invoices:0,items:0})
    await expect(ui.workspace.field('masterBillOfLading')).toHaveValue(d.header.mawb)
    await expect(ui.workspace.field('INcompanyCode')).toHaveValue(d.exporter.INcompanyCode)
  })
  test('TC-EXP-063: Copy New copies the Export Header, Invoice and Items @regression',async({ui,spn,tracked,dialogs})=>{
    const d=await completeData(ui,spn,tracked.track)
    await ui.workspace.open(spn,d.id);dialogs.answerNext({accept:true,promptText:'1'});await ui.workspace.copyNew()
    const copy={id:ui.workspace.idFromUrl(),referenceNo:(await ui.workspace.referenceNo.innerText()).trim()};tracked.track(copy)
    expect(copy.id).not.toBe(d.id);expect(copy.referenceNo).not.toBe(d.referenceNo)
    await expect(ui.workspace.field('masterBillOfLading')).toHaveValue(d.header.mawb)
    await expect(ui.workspace.treeInvoice(d.invoice.invoiceNo)).toBeVisible();await expect(ui.workspace.treeItems()).toHaveCount(1)
  })
  for(const c of [{id:'064',button:'Save XML',ext:'xml'},{id:'068',button:'Save Dat',ext:'dat'}] as const){
    test(`TC-EXP-${c.id}: Import exported ${c.ext.toUpperCase()} creates a new Export with the same data @regression`,async({ui,spn,tracked,dialogs},info)=>{
      const d=await completeData(ui,spn,tracked.track)
      const entries=await exported(ui,spn,d,c.button,info.outputPath()),file=info.outputPath('round-trip.'+c.ext)
      expect(entries,'One selected Export produces one round-trip file').toHaveLength(1)
      const xmlStats=c.ext==='xml'?await ui.page.evaluate(xml=>{
        const doc=new DOMParser().parseFromString(xml,'application/xml')
        const details=[...doc.getElementsByTagNameNS('*','GoodsShipment')].flatMap(e=>[...e.children].filter(c=>c.localName==='Detail'))
        return {parserErrors:doc.getElementsByTagName('parsererror').length,detailCount:details.length,detailChildCounts:details.map(d=>d.children.length)}
      },entries[0].data.toString('utf8')):undefined
      if(xmlStats){expect(xmlStats.parserErrors).toBe(0);expect(xmlStats.detailCount).toBe(1)}
      fs.writeFileSync(file,entries[0].data)
      await ui.list.open(spn);await ui.list.importFile(file)
      expect((await dialogs.waitFor(/Upload Completed/i)).message).toMatch(/Upload Completed/i)
      await ui.list.search({keyword:d.header.mawb,by:'masterBillOfLading'});await expect(ui.list.rows).toHaveCount(2)
      const ref=(await ui.list.references()).find(r=>r!==d.referenceNo)!,id=await ui.list.idOf(ref);tracked.track({id,referenceNo:ref})
      await expect(ui.list.cell(ui.list.row(ref),'hawb')).toHaveText(d.header.hawb)
      await ui.workspace.open(spn,id)
      await expect(ui.workspace.treeInvoice(d.invoice.invoiceNo)).toBeVisible()
      const importedNodes=await ui.workspace.treeItems().allTextContents()
      await info.attach('round-trip-mapping.json',{body:JSON.stringify({sourceReference:d.referenceNo,importedReference:ref,xmlStats,importedNodes},null,2),contentType:'application/json'})
      await expect(ui.workspace.treeItems()).toHaveCount(1)
    })
  }
  test('TC-EXP-065: cancel Delete keeps the Export draft and confirm removes it @regression',async({ui,spn,tracked,dialogs})=>{
    const d=await filled(ui,spn,tracked.track)
    await ui.list.open(spn);await ui.list.search({referenceNo:d.referenceNo})
    dialogs.answerNext({accept:false});await ui.list.row(d.referenceNo).locator('img[title="Delete"]').click()
    await ui.list.search({referenceNo:d.referenceNo});await expect(ui.list.row(d.referenceNo)).toHaveCount(1)
    await ui.list.remove(d.referenceNo);await ui.list.search({referenceNo:d.referenceNo});await expect(ui.list.rows).toHaveCount(0)
  })
  test('TC-EXP-066: Event view contains this Export Header, Invoice and Item @regression',async({ui,spn,tracked})=>{
    const d=await completeData(ui,spn,tracked.track)
    await ui.list.open(spn);await ui.list.search({referenceNo:d.referenceNo})
    await waitForReload(ui.page,()=>ui.list.row(d.referenceNo).locator('img[title="Event"]').click())
    await expect(ui.page).toHaveURL(/ACTION=VIEW/i)
    const view=new ExportViewPage(ui.page),headers=await view.table('Reference No.'),invoices=await view.table('Invoice No.'),items=await view.table('invoiceItem')
    expect(headers[0]['Reference No.']).toBe(d.referenceNo)
    expect(headers[0]['MAWB']).toBe(d.header.mawb)
    expect(invoices).toHaveLength(1);expect(invoices[0]['Invoice No.']).toBe(d.invoice.invoiceNo)
    expect(items).toHaveLength(1);expect(items[0]['tariffCode']).toBe(d.item.tariff.value)
  })
  test('TC-EXP-067: XML without an Invoice is rejected without creating a broken Export @regression',async({ui,spn,tracked,dialogs},info)=>{
    const d=await filled(ui,spn,tracked.track),entries=await exported(ui,spn,d,'Save XML',info.outputPath())
    const file=path.join(info.outputPath(),'no-invoice.xml');fs.writeFileSync(file,entries[0].data)
    await ui.list.open(spn);await ui.list.importFile(file)
    const message=(await dialogs.waitFor(/invoice|ไม่มีข้อมูล/i)).message
    expect(message).not.toMatch(/Upload Completed/i)
    await ui.list.search({keyword:d.header.mawb,by:'masterBillOfLading'});await expect(ui.list.rows).toHaveCount(1)
  })
})
