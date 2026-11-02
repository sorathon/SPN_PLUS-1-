import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './_shared'
import { GclSendPage } from '../../pages/gcl/GclSendPage'
import { captureDownload } from '../../pages/spn/SpnApp'
import type { Download } from '@playwright/test'

test.describe('GCL · Send screen exports and print popups',()=>{
 test.describe.configure({timeout:120_000})
 const reference=()=>process.env.SPN_GCL_SEND_FILES_REF || 'HQVM400001676'
 for(const [id,button,label,section] of [
  ['160','exportPDF','PDF format','Export to'],['161','exportXML','XML format','Export to'],
  ['162','exportTiff','Tiff format','Export to'],['163','exportDatatype','Data','Export to'],
  ['166','numkeyReportOnlineID','ใบนำคีย์ (Online)','Print Form'],
 ] as const) {
  test(`TC-GCL-${id}: Send ${section} ${label} downloads a file @regression`,async({gcl,spn},info)=>{
   const send=new GclSendPage(gcl.page);await send.open(spn,reference())
   const file=await captureDownload(send.host,()=>send.button(button).click({noWaitAfter:true}),45000)
   const saved=info.outputPath(path.basename(file.fileName) || `export-${id}.bin`)
   fs.writeFileSync(saved,file.data)
   expect(fs.existsSync(saved),'Downloaded file exists on disk').toBe(true)
   expect(fs.statSync(saved).size,'Downloaded file is not empty').toBeGreaterThan(0)
   await info.attach(path.basename(saved),{path:saved,contentType:'application/octet-stream'})
   await info.attach('download-result.json',{body:JSON.stringify({reference:reference(),button:label,fileName:path.basename(saved),bytes:file.data.length}),contentType:'application/json'})
   // Scope requested: file received and saved only; no content/format assertions.
  })
 }
 for(const [id,button,label] of [
  ['164','formOpenContainer','ขอเปิดตู้สินค้า'],['165','numkeyReportID','ใบนำคีย์'],
  ['167','numkeyReport2ID','ใบนำคีย์ (HTML)'],
 ] as const) {
  test(`TC-GCL-${id}: Send Print Form ${label} opens a popup @regression`,async({gcl,spn},info)=>{
   const send=new GclSendPage(gcl.page);await send.open(spn,reference())
   const downloads:Download[]=[],onDownload=(d:Download)=>downloads.push(d)
   send.host.on('download',onDownload)
   const opened=send.host.waitForEvent('popup',{timeout:30000}).catch(()=>null)
   await send.button(button).click({noWaitAfter:true})
   const popup=await opened
   send.host.off('download',onDownload)
   // Preserve an unexpected download as diagnostics; it cannot satisfy the popup assertion.
   const files=[]
   for(const d of downloads) {
    const saved=info.outputPath(path.basename(d.suggestedFilename()) || `unexpected-${id}.bin`)
    await d.saveAs(saved);files.push({fileName:path.basename(saved),bytes:fs.statSync(saved).size})
    await info.attach('unexpected-download-'+path.basename(saved),{path:saved,contentType:'application/octet-stream'})
   }
   await info.attach('popup-result.json',{body:JSON.stringify({reference:reference(),button:label,popupOpened:!!popup,unexpectedDownloads:files}),contentType:'application/json'})
   // Popup content, printing and generated file contents are outside this case.
   if(popup && !popup.isClosed())await popup.close()
   expect(popup,`${label} must open a browser popup; unexpected downloads: ${files.map(f=>f.fileName).join(', ') || 'none'}`).not.toBeNull()
  })
 }
})
