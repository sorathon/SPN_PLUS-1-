import { test,expect,completeData,accept } from './_shared'
import { readZip } from '../../data/zip'
import { ExportDownload,EXPORT_DOWNLOADS } from '../../pages/export/ListPage'
import { PrintSettingPopup } from '../../pages/spn/Popups'
import { exported } from './_downloads'
test.describe('Export · Print and files',()=>{
  test.describe.configure({timeout:180_000})
  test('TC-EXP-040: workspace Print returns this Export declaration PDF @smoke',async({ui,spn,sharedExport:d},info)=>{
    await ui.workspace.open(spn,d.id);const pdf=await ui.workspace.print()
    expect(pdf.fileName).toBe(d.referenceNo+'.pdf');expect(pdf.data.subarray(0,4).toString()).toBe('%PDF')
    await info.attach(pdf.fileName,{body:pdf.data,contentType:'application/pdf'})
  })
  test('TC-EXP-041: list Print settings downloads this Export PDF @regression',async({ui,spn,sharedExport:d},info)=>{
    await ui.list.open(spn);await ui.list.search({referenceNo:d.referenceNo})
    const opened=ui.page.waitForEvent('popup');await ui.list.row(d.referenceNo).locator('img[title="Print"]').click()
    const popup=new PrintSettingPopup(await opened);await expect(popup.title).toBeVisible()
    const pdf=await popup.print();expect(pdf.data.subarray(0,4).toString()).toBe('%PDF');expect(pdf.fileName).toBe(d.referenceNo+'.pdf')
    await info.attach(pdf.fileName,{body:pdf.data,contentType:'application/pdf'});await popup.page.close()
  })
  const cases: {id:string;button:ExportDownload}[]=[{id:'042',button:'Save XML'},{id:'044',button:'Save PDF'},{id:'045',button:'Save TIFF'},{id:'046',button:'Save XLS'},{id:'047',button:'Save XLS New'},{id:'048',button:'Save Dat'}]
  for(const c of cases)test(`TC-EXP-${c.id}: ${c.button} exports the selected Export declaration @regression`,async({ui,spn,sharedExport:d},info)=>{
    const entries=await exported(ui,spn,d,c.button,info.outputPath()),ext=EXPORT_DOWNLOADS[c.button].ext
    expect(entries.map(e=>e.name)).toEqual([d.referenceNo+'.'+ext]);const data=entries[0].data
    expect(data.length).toBeGreaterThan(0)
    if(ext==='pdf')expect(data.subarray(0,4).toString()).toBe('%PDF')
    if(ext==='tif')expect(['49492a00','4d4d002a']).toContain(data.subarray(0,4).toString('hex'))
    if(ext==='xlsx')expect(data.subarray(0,2).toString()).toBe('PK')
    if(ext==='xml'){
      const xml=data.toString('utf8');expect(xml).toContain('CustomsExportDeclaration');expect(xml).toContain(`<ReferenceNumber>${d.referenceNo}</ReferenceNumber>`)
      expect(xml).toContain(d.exporter.companyTaxNo);expect(xml).toContain(d.header.mawb);expect(xml).toContain(d.header.hawb);expect(xml).toContain(d.invoice!.invoiceNo)
      expect(xml).toContain(d.item!.tariff.value)
    }
    if(ext==='dat'){const dat=data.toString('latin1');expect(dat).toContain(d.referenceNo);expect(dat).toContain(d.header.mawb);expect(dat).toContain(d.invoice!.invoiceNo)}
    await info.attach(entries[0].name,{body:data,contentType:ext==='xml'?'application/xml':'application/octet-stream'})
  })
  test('TC-EXP-043: Save XML with Decl No includes the assigned Export declaration number @regression',async({ui,spn,tracked},info)=>{
    const d=await completeData(ui,spn,tracked.track),decl=await accept(ui,spn,d)
    const entries=await exported(ui,spn,d,'Save XML with Decl No.',info.outputPath())
    const xml=entries[0].data.toString('utf8');expect(xml).toContain(d.referenceNo);expect(xml).toContain(decl)
  })
  test('TC-EXP-049: Save XML after short contains the Short declaration data @regression',async({ui,spn},info)=>{
    await ui.list.open(spn);await ui.list.search({status:'HAVESHORT',pageSize:'200'})
    const refs=await ui.list.references()
    test.skip(!refs.length,'No Export declaration with Short exists on this site; an actual Short fixture is required')
    const referenceNo=refs[0],id=await ui.list.idOf(referenceNo)
    info.annotations.push({type:'reference',description:`Existing Short ${referenceNo} (read only)`})
    const entries=await exported(ui,spn,{id,referenceNo},'Save XML after short',info.outputPath())
    expect(entries.some(e=>e.name.endsWith('.xml'))).toBe(true)
    const xml=entries.find(e=>e.name.endsWith('.xml'))!.data.toString('utf8')
    expect(xml).toContain('CustomsExportDeclaration');expect(xml).toContain(referenceNo)
    expect(xml).not.toMatch(/PDOException|Fatal error|Internal Server Error/)
  })
  test('TC-EXP-050: every Export download button asks to select a record @regression',async({ui,spn,dialogs})=>{
    for(const button of Object.keys(EXPORT_DOWNLOADS) as ExportDownload[]){
      // Each button starts on a fresh list, so one broken loading overlay does
      // not prevent checking the remaining no-selection paths.
      await ui.list.open(spn)
      for(const checkbox of await ui.page.locator('input[name="SELITEM[]"]').all()) await checkbox.uncheck()
      const n=dialogs.records.length;await ui.list.button(button).click()
      await expect.soft.poll(()=>dialogs.records.length, {message:button+' selection alert'}).toBe(n+1)
      if(dialogs.records[n]) expect.soft(dialogs.records[n].message,button).toMatch(/choose|เลือก/i)
    }
  })
  test('TC-EXP-051: selected Job No controls the exported XML file name @regression',async({ui,spn,sharedExport:d})=>{
    await ui.list.open(spn);await ui.list.search({referenceNo:d.referenceNo})
    await ui.page.locator('#custom_filename').selectOption('jobNo');await ui.list.select(d.id)
    const dl=await ui.list.download('Save XML');const entries=readZip(await dl.path())
    expect(entries.map(e=>e.name)).toEqual([d.header.jobNo+'.xml'])
  })
})
