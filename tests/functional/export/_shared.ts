import { test as base, expect } from '../../fixtures'
import type { Page, TestInfo } from '@playwright/test'
import { uniqueRef, today, invoiceData, CUSTOMER_SEARCH } from '../../data/factories'
import { users } from '../../data/users'
import { spnSession } from '../../data/session'
import { ExportCreationPage } from '../../pages/export/CreationPage'
import { ExportListPage } from '../../pages/export/ListPage'
import { ExportWorkspacePage } from '../../pages/export/WorkspacePage'
import { ExportInvoicePage } from '../../pages/export/InvoicePage'
import { ExportItemPage } from '../../pages/export/ItemPage'
import type { ExportHeader, ExportItemData } from '../../pages/export/DeclarationPages'
import { SpnSession, DialogLog, ajax, disablePrintDialog } from '../../pages/spn/SpnApp'

export { expect, today, invoiceData, uniqueRef }
export type RecordRef = { id: string; referenceNo: string }
export type ExportRecord = RecordRef & { header: ExportHeader; exporter: Record<string, string>; vessel: string; invoice?: ReturnType<typeof invoiceData>; item?: ExportItemData; consignee?: { code: string; name: string } }
export type Track = (d: RecordRef) => void
export class ExportUI {
  readonly creation: ExportCreationPage
  readonly list: ExportListPage
  readonly workspace: ExportWorkspacePage
  readonly invoice: ExportInvoicePage
  readonly item: ExportItemPage
  constructor(readonly page: Page) {
    this.creation = new ExportCreationPage(page)
    this.list = new ExportListPage(page)
    this.workspace = new ExportWorkspacePage(page)
    this.invoice = new ExportInvoicePage(page)
    this.item = new ExportItemPage(page)
  }
}
export function headerData(): ExportHeader {
  const job = uniqueRef('PEX').toUpperCase()
  return { jobNo: job, exporterSearch: process.env.SPN_EXPORTER_SEARCH || CUSTOMER_SEARCH.importer,
    transportMode: '1', vesselSearch: CUSTOMER_SEARCH.vessel, voyage: 'EX001', mawb: 'M'+job, hawb: 'H'+job,
    purchaseCountry: 'CN', destinationCountry: 'CN', loadPort: '2801', releasePort: '2801', packageAmount: '10', packageUnit: 'PK',
    netWeight: '100', grossWeight: '120', departureDate: process.env.SPN_RATE_DATE || today().input,
    submitDate: process.env.SPN_RATE_DATE || today().input, shippingMark: 'EXPORT '+job }
}
export function itemData(): ExportItemData {
  return { tariff: { type: process.env.SPN_EX_TARIFF_SEARCH || '74152900', value: process.env.SPN_EX_TARIFF || '000074152900' },
    statisticalCode: process.env.SPN_EX_STAT || '090', exportTariff: process.env.SPN_EX_EXPORT_TARIFF || '9PART3', privilegeCode: process.env.SPN_EX_PRIVILEGE || '003',
    tariffSequence: process.env.SPN_EX_SEQUENCE || '50001',
    englishDescription: 'EXPORT AUTOMATION ITEM', thaiDescription: 'สินค้าทดสอบขาออก', originCountry: 'CN', netWeight: '100',
    invoiceQuantity: '10', invoiceQuantityUnit: 'EA', quantity: '10', quantityUnit: 'EA', amountForeign: '1000' }
}
export async function draft(ui: ExportUI, spn: SpnSession, track: Track) {
  const d = await ui.creation.createDraft(spn); track(d); return d
}
export async function filled(ui: ExportUI, spn: SpnSession, track: Track, headerOverrides: Partial<ExportHeader> = {}): Promise<ExportRecord> {
  const d = await draft(ui, spn, track)
  const header = { ...headerData(), ...headerOverrides }
  const picked = await ui.workspace.fillHeader(header)
  const exporter = await ui.workspace.exporter()
  await ui.workspace.save()
  return { ...d, header, exporter, vessel: picked.vessel }
}
export async function addInvoice(ui: ExportUI) {
  const invoice = invoiceData()
  await ui.workspace.openAddInvoice()
  await ui.invoice.startNewInvoice()
  const consignee = await ui.invoice.fill(invoice)
  await ui.invoice.save()
  return { invoice, consignee }
}
export async function addItem(ui: ExportUI, item = itemData()) { await ui.item.fill(item); await ui.item.save(); return item }
export async function completeData(ui: ExportUI, spn: SpnSession, track: Track, headerOverrides: Partial<ExportHeader> = {}) {
  const d = await filled(ui, spn, track, headerOverrides)
  const invoice = await addInvoice(ui)
  const item = await addItem(ui)
  return { ...d, ...invoice, item }
}
export async function accept(ui: ExportUI, spn: SpnSession, d: RecordRef) {
  await ui.workspace.open(spn, d.id)
  await ui.creation.requestDeclarationNumber()
  await ui.creation.returnToList()
  return ui.creation.expectAccepted(d.referenceNo)
}
function annotate(info: TestInfo, d: RecordRef) { info.annotations.push({ type: 'reference', description: `${d.referenceNo} (ExDclCtrl:${d.id})` }) }
export const test = base.extend<{ ui: ExportUI; tracked: { track: Track }; pageErrors: void }, { sharedExport: ExportRecord }>({
  pageErrors: [async ({ page }, use, info) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await use()
    if(errors.length) await info.attach('browser-page-errors.json',{body:JSON.stringify(errors,null,2),contentType:'application/json'})
  },{auto:true}],
  ui: async ({ page }, use) => use(new ExportUI(page)),
  tracked: async ({ page, spn }, use, info) => {
    const records: RecordRef[] = []
    await use({ track: d => { if (!records.some(r=>r.id===d.id)) { records.push(d); annotate(info,d) } } })
    if(info.status !== info.expectedStatus && process.env.SPN_EXPORT_KEEP_FAILURES === '1') {
      info.annotations.push({type:'retained',description:'Failed Export drafts retained for UI investigation'})
      return
    }
    for (const d of records) {
      try { await new ExportCreationPage(page).cleanupDraft(spn,d.referenceNo) }
      catch { info.annotations.push({ type:'warning', description:`Draft cleanup not confirmed: ${d.referenceNo}` }) }
    }
  },
  sharedExport: [async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: users.user1.statePath })
    context.setDefaultTimeout(45_000); context.setDefaultNavigationTimeout(90_000)
    await disablePrintDialog(context)
    const page = await context.newPage(); ajax(page); new DialogLog(page)
    const ui = new ExportUI(page), spn = spnSession('user1'), created: RecordRef[] = []
    try { const d=await completeData(ui,spn,r=>created.push(r)); await use(d) }
    finally { for(const d of created)try{await ui.creation.cleanupDraft(spn,d.referenceNo)}catch{} await context.close() }
  }, { scope:'worker', timeout:180_000 }],
})
