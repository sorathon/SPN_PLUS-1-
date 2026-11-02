import { Page, Locator } from '@playwright/test'
import { SpnSession, serviceUrl } from './SpnApp'

/** "Export to" formats → file extension of the download. */
export const EXPORT_FORMATS = {
  PDFformat: { label: 'PDF format', ext: 'pdf' },
  XMLformat: { label: 'XML format', ext: 'xml' },
  TIFFformat: { label: 'Tiff format', ext: 'tif' },
  Datatypeformat: { label: 'Data', ext: 'dat' },
  XLSformat: { label: 'XLS Old format', ext: 'xlsx' },
  XLSnewFormat: { label: 'XLS format New', ext: 'xlsx' },
  INVXLSformat: { label: 'Invoice XLS format', ext: 'xlsx' },
  CSVformat: { label: 'CSV format', ext: 'csv' },
} as const
export type ExportFormat = keyof typeof EXPORT_FORMATS

/** "Print Form" choices, in the order the select lists them. */
export const PRINT_FORMS = [
  'customPermitReport',
  'Insurance',
  'earlyReceive',
  'decl',
  'numkeyReport',
  'numkeyReportOnline',
  'numkeyReport2',
  'printExciseID',
  'printExciseXLS',
  'spiritImport',
  'printExcise_new',
] as const
export type PrintForm = (typeof PRINT_FORMS)[number]

/**
 * Page that holds a declaration's **Export to** and **Print Form** controls (ACTION=SEND).
 * Only those two controls are modelled. The page also has buttons that transmit the
 * declaration (to Customs, to the importer for signing, XML/draft by e-mail) — they are
 * deliberately left out and must never be clicked by the suite.
 *
 * In the app the page is reached from the workspace toolbar, but that button SAVES the
 * header first. The suite uses an existing "เอกสารพร้อมส่ง" declaration, so it opens the
 * page by URL instead — nothing of that declaration is saved or changed.
 */
export class ExportPrintPage {
  readonly page: Page
  readonly heading: Locator
  readonly exportTo: Locator
  readonly exportButton: Locator
  readonly printForm: Locator
  readonly printButton: Locator

  constructor(page: Page) {
    this.page = page
    // the page title as the app renders it
    this.heading = page.getByText('Send Import Declaration', { exact: true })
    this.exportTo = page.locator('#exportToFiles')
    this.exportButton = page.locator('#submitExportToFiles')
    this.printForm = page.locator('#printForms')
    this.printButton = page.locator('#submitPrintForm')
  }

  async open(session: SpnSession, id: string) {
    await this.page.goto(serviceUrl(session, { SERVICENAME: 'importdeclarationcontrol', ACTION: 'SEND', SELITEM: `ImDclCtrl:${id}` }))
  }

  async exportOptions(): Promise<string[]> {
    return this.exportTo.locator('option').evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value))
  }

  async printOptions(): Promise<string[]> {
    return this.printForm.locator('option').evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value))
  }
}
