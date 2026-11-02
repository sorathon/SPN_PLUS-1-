import { expect, Page } from '@playwright/test'
import { SpnSession } from '../spn/SpnApp'
import { ExportListPage } from './ListPage'
import { ExportWorkspacePage } from './WorkspacePage'
import { ExportSendPage } from './SendPage'

export const EXPORT_SEND_FILE_FORMATS=[
 ['PDFformat','PDF format'],['XMLformat','XML format'],['TIFFformat','Tiff format'],
 ['Datatypeformat','Data'],['XLSformat','XLS Old format'],['XLSnewFormat','XLS format New'],
 ['INVXLSformat','Invoice XLS format'],['CSVformat','CSV format'],
] as const
export const EXPORT_SEND_PRINT_FORMS=[
 ['bis19Attachment','ใบแนบ 19 ทวิ','popup'],['numkeyReport','ใบนำคีย์','popup'],
 ['numkeyReportOnline','ใบนำคีย์ (Online)','download'],['numkeyReport2','ใบนำคีย์รูปแบบHTML','popup'],
 ['FORMATexcel','ขอรับเงินชดเชยค่าภาษีอากร','download'],
] as const

/** File and print controls only; does not submit customs or email forms. */
export class ExportSendFilesPage {
 readonly send:ExportSendPage
 constructor(readonly page:Page){this.send=new ExportSendPage(page)}
 get host(){return this.send.host}
 get scope(){return this.send.scope}
 async open(session:SpnSession,reference:string) {
  const list=new ExportListPage(this.page);await list.open(session);await list.search({referenceNo:reference})
  await expect(list.row(reference)).toHaveCount(1)
  await new ExportWorkspacePage(this.page).open(session,await list.idOf(reference));await this.send.open()
  await expect(this.scope.locator('#exportToFiles')).toBeVisible()
  await expect(this.scope.locator('#printForms')).toBeVisible()
 }
 async exportFile(value:string) {
  await this.scope.locator('#exportToFiles').selectOption(value)
  await expect(this.scope.locator('#exportToFiles')).toHaveValue(value)
  await this.scope.locator('#submitExportToFiles').click({noWaitAfter:true})
 }
 async printForm(value:string) {
  await this.scope.locator('#printForms').selectOption(value)
  await expect(this.scope.locator('#printForms')).toHaveValue(value)
  await this.scope.locator('#submitPrintForm').click({noWaitAfter:true})
 }
}
