import fs from 'node:fs'
import path from 'node:path'
import type { Download,TestInfo } from '@playwright/test'
import { test,expect } from './_shared'
import { ExportSendFilesPage,EXPORT_SEND_FILE_FORMATS,EXPORT_SEND_PRINT_FORMS } from '../../pages/export/SendFilesPage'
import { captureDownload } from '../../pages/spn/SpnApp'

const reference=()=>process.env.SPN_EXPORT_SEND_FILES_REF || 'HQVM200002038'
async function fileResult(ui:ExportSendFilesPage,action:()=>Promise<unknown>,label:string,info:TestInfo) {
 const file=await captureDownload(ui.host,action,45000),saved=info.outputPath(path.basename(file.fileName) || 'export-file.bin')
 fs.writeFileSync(saved,file.data)
 expect(fs.existsSync(saved),'Downloaded file exists on disk').toBe(true)
 expect(fs.statSync(saved).size,'Downloaded file is not empty').toBeGreaterThan(0)
 await info.attach(path.basename(saved),{path:saved,contentType:'application/octet-stream'})
 await info.attach('download-result.json',{body:JSON.stringify({reference:reference(),option:label,fileName:path.basename(saved),bytes:file.data.length}),contentType:'application/json'})
 // Receipt only, matching the GCL scope; no business-content or format validation.
}
test.describe('Export · Send screen Export to and Print Form',()=>{
 test.describe.configure({timeout:120000})
 for(const [i,[value,label]] of EXPORT_SEND_FILE_FORMATS.entries()) {
  test(`TC-EXP-${100+i}: Send Export to ${label} downloads a file @regression`,async({ui,spn},info)=>{
   const screen=new ExportSendFilesPage(ui.page);await screen.open(spn,reference())
   if(i===0)await expect(screen.scope.locator('#exportToFiles option')).toHaveText(EXPORT_SEND_FILE_FORMATS.map(x=>x[1]))
   await fileResult(screen,()=>screen.exportFile(value),label,info)
  })
 }
 for(const [i,[value,label,kind]] of EXPORT_SEND_PRINT_FORMS.entries()) {
  test(`TC-EXP-${108+i}: Send Print Form ${label} ${kind==='download'?'downloads a file':'opens a popup'} @regression`,async({ui,spn},info)=>{
   const screen=new ExportSendFilesPage(ui.page);await screen.open(spn,reference())
   if(i===0)await expect(screen.scope.locator('#printForms option')).toHaveText(EXPORT_SEND_PRINT_FORMS.map(x=>x[1]))
   if(kind==='download'){await fileResult(screen,()=>screen.printForm(value),label,info);return}
   const downloads:Download[]=[],onDownload=(d:Download)=>downloads.push(d)
   screen.host.on('download',onDownload)
   const opened=screen.host.waitForEvent('popup',{timeout:30000}).catch(()=>null)
   await screen.printForm(value);const popup=await opened;screen.host.off('download',onDownload)
   const unexpected=[]
   for(const d of downloads) {
    const saved=info.outputPath(path.basename(d.suggestedFilename()) || 'unexpected-download.bin')
    await d.saveAs(saved);unexpected.push({fileName:path.basename(saved),bytes:fs.statSync(saved).size})
    await info.attach('unexpected-download-'+path.basename(saved),{path:saved,contentType:'application/octet-stream'})
   }
   await info.attach('popup-result.json',{body:JSON.stringify({reference:reference(),option:label,popupOpened:!!popup,unexpectedDownloads:unexpected}),contentType:'application/json'})
   if(popup && !popup.isClosed())await popup.close()
   expect(popup,`${label} must open a browser popup`).not.toBeNull()
   // Popup creation only; popup contents and physical printing are outside scope.
  })
 }
})
