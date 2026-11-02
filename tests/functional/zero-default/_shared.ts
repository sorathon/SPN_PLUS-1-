import fs from 'fs'
import path from 'path'
import { Page } from '@playwright/test'
import { test as base, expect } from '../../fixtures'
import { declarationHeader, invoiceData, uniqueRef, CUSTOMER_SEARCH } from '../../data/factories'
import { readPdfText } from '../../data/pdf'
import { xmlLeaves, xmlDetails, leafValue, XmlLeaf } from '../../data/xml'
import { buildCsv, mappedFields } from '../../data/zero-default/csv'
import { Scenario, Leg, ItemInput, ChargeKind, LEG_MASTER, headerDate } from '../../data/zero-default/scenarios'
import {
  NOT_A_NUMBER,
  PHP_ERROR,
  UI_MAX_DECIMALS,
  UI_NUMBER,
  XML_NO_ZERO,
  XML_ZERO_KNOWN,
  XML_CODE_TAG,
  XML_MAX_DECIMALS,
  PREVIEW_FORBIDDEN,
  Rule,
} from '../../data/zero-default/rules'
import { SpnSession, PdfFile, serviceUrl, captureDownload, waitForReload, waitForFrameReady } from '../../pages/spn/SpnApp'
import { ImportListPage } from '../../pages/spn/ImportListPage'
import { WorkspacePage } from '../../pages/spn/WorkspacePage'
import { InvoicePage } from '../../pages/spn/InvoicePage'
import { ItemPage } from '../../pages/spn/ItemPage'
import { ExportListPage, ExportWorkspacePage, ExportInvoicePage, ExportItemPage } from '../../pages/export/DeclarationPages'
import { CsvImportPage } from '../../pages/spn/CsvImportPage'
import { DetailForm } from '../../pages/spn/DetailForm'

/**
 * DB DEFAULT 0 · shared flow for import.spec.ts (ขาเข้า) and export.spec.ts (ขาออก).
 * Each scenario (data/zero-default/scenarios.ts) builds one declaration from Key in or
 * Import CSV, runs the calculation processes, then checks four things — every check is a
 * soft assertion so one run reports all findings of a scenario:
 *   1. หน้าจอ   — keyed values come back equal; numeric fields are well-formed numbers
 *   2. คำนวณ   — Re-Avg and Calc Tax / Calculate Tax / Sum Item to Inv. finish without a
 *                PHP error (0 ÷ 0), values are finite and charges add up
 *   3. XML     — no optional tag sent as 0, no "0" code, item values equal the screen
 *   4. Preview — the printed declaration has no stray 0 labels / NaN
 * Created declarations are KEPT for Dev; every case's Ref No + result + errors is written to
 * reports/zero-default/<date>-<leg>.csv (SPN_CLEANUP=1 deletes them instead).
 */

// ─── leg adapter ──────────────────────────────────────────────────────
const CHARGE_NO: Record<ChargeKind, number> = { forwarding: 1, freight: 2, insurance: 3 }

/** Invoice charge fields of each leg (import shows the 2-side "_OT" charges). */
const CHARGE_FIELDS: Record<Leg, (n: number) => { amount: string; currency: string; avg: string; thb: string; sign: string }> = {
  import: (n) => ({
    amount: ({ 1: 'INfw_OT', 2: 'INf_OT', 3: 'INins_OT' } as Record<number, string>)[n],
    currency: ({ 1: 'INfwCur_OT', 2: 'INfCur_OT', 3: 'INinsCur_OT' } as Record<number, string>)[n],
    avg: `INavgMethodC${n}_OT`,
    thb: `INthbC${n}_OT`,
    sign: `INpresC${n}_OT`,
  }),
  export: (n) => ({
    amount: ({ 1: 'forwardingChargeForeign', 2: 'freightAmountForeign', 3: 'insuranceAmountForeign' } as Record<number, string>)[n],
    currency: ({ 1: 'forwardingChargeCurrency', 2: 'freightCurrency', 3: 'insuranceCurrency' } as Record<number, string>)[n],
    avg: `INavgMethodC${n}`,
    thb: `INthbC${n}`,
    sign: `INpresC${n}`,
  }),
}

/** Numeric item fields read back from the item form (a field a leg doesn't have is skipped). */
const ITEM_NUMBERS = [
  'quantity',
  'invoiceQuantity',
  'quantity2',
  'netWeight',
  'itemGrossWeight',
  'packageAmount',
  'exchangeRate',
  'unitPriceForeign',
  'unitPriceBaht',
  'invoiceAmountForeign',
  'invoiceAmountBaht',
  'increasedPriceForeign',
  'increasedPriceBaht',
  'cifValueForeign',
  'cifValueBaht',
  'cifValueAssess',
  'fobValueForeign',
  'fobValueBaht',
  'fobValueAssess',
  'deductedAmount',
  'assessQuantity',
  'duty_topay',
  'vat_topay',
] as const

export type ItemValues = Record<string, string> & { itemNo: string }

/**
 * Last line of the progress page (process.php?STAT=DONE|FAILED) — "Completed :)" in the
 * code, Thai "…เรียบร้อยแล้วครับ" on the redesigned site; "Sorry :(" when it failed.
 */
const PROCESS_DONE = /Completed|เรียบร้อยแล้ว/
const PROCESS_END = /Completed|เรียบร้อยแล้ว|Sorry|ขออภัย|Error/i
type ProcessKind = 'recalc' | 'tax' | 'sum'
export type ProcessResult = { kind: ProcessKind; status: number; body: string; frameText: string }

export const LEGS = {
  import: {
    leg: 'import' as Leg,
    service: 'IMPORTDECLARATIONCONTROL',
    key: 'ImDclCtrl',
    /** item value the charges are added to */
    value: 'cifValueBaht',
    subAction: { recalc: 'RECALCULATION', tax: 'RECALTAX', sum: 'SUMCIF2INV' } as Record<ProcessKind, string>,
    csvMappingEnv: 'SPN_CSV_MAPPING_IMPORT',
    csvMappingDefault: 'Test_T1_IMP16',
  },
  export: {
    leg: 'export' as Leg,
    service: 'EXPORTDECLARATIONCONTROL',
    key: 'ExDclCtrl',
    value: 'fobValueBaht',
    subAction: { recalc: 'RECALCULATION', tax: 'RECALTAX', sum: 'SUMFOB2INV' } as Record<ProcessKind, string>,
    csvMappingEnv: 'SPN_CSV_MAPPING_EXPORT',
    csvMappingDefault: 'CSVEXPORT_NEW',
  },
} as const
type LegDef = (typeof LEGS)[Leg]

/** One leg's pages behind one API, so both spec files run the same steps. */
export class DeclLeg {
  readonly def: LegDef
  readonly page: Page
  readonly spn: SpnSession
  readonly form: DetailForm
  readonly csv: CsvImportPage
  private readonly im: { list: ImportListPage; ws: WorkspacePage; inv: InvoicePage; item: ItemPage }
  private readonly ex: { list: ExportListPage; ws: ExportWorkspacePage; inv: ExportInvoicePage; item: ExportItemPage }
  id = ''
  referenceNo = ''
  invoiceNo = ''
  /** CSV fields the site's mapping has no column for — not imported, so not compared */
  notImported: string[] = []

  constructor(leg: Leg, page: Page, spn: SpnSession) {
    this.def = LEGS[leg]
    this.page = page
    this.spn = spn
    this.form = new DetailForm(page)
    this.csv = new CsvImportPage(page)
    this.im = { list: new ImportListPage(page), ws: new WorkspacePage(page), inv: new InvoicePage(page), item: new ItemPage(page) }
    this.ex = { list: new ExportListPage(page), ws: new ExportWorkspacePage(page), inv: new ExportInvoicePage(page), item: new ExportItemPage(page) }
  }

  get isImport() {
    return this.def.leg === 'import'
  }

  /** F7 [New] → header (date = `date`) → Save. */
  async create(date: string, track: (id: string, referenceNo: string, jobNo: string) => void) {
    const ref = uniqueRef('ZD').toUpperCase()
    if (this.isImport) {
      await this.im.list.open(this.spn)
      await this.im.list.createNew()
      this.id = this.im.ws.idFromUrl()
      await this.im.ws.waitForDetail()
      this.referenceNo = (await this.im.ws.referenceNo.innerText()).trim()
      track(this.id, this.referenceNo, ref)
      await this.im.ws.fillHeader(declarationHeader({ jobNo: ref, mawb: `M${ref}`, hawb: `H${ref}`, shippingMark: `MARK ${ref}`, arrivalDate: date }))
      await this.im.ws.save()
    } else {
      const m = LEG_MASTER.export
      await this.ex.list.open(this.spn)
      await this.ex.list.createNew()
      this.id = this.ex.ws.idFromUrl()
      await this.ex.ws.waitForDetail()
      this.referenceNo = (await this.ex.ws.referenceNo.innerText()).trim()
      track(this.id, this.referenceNo, ref)
      await this.ex.ws.fillHeader({
        jobNo: ref,
        exporterSearch: process.env.SPN_EXPORTER_SEARCH || CUSTOMER_SEARCH.importer,
        transportMode: '1',
        vesselSearch: CUSTOMER_SEARCH.vessel,
        voyage: 'V001',
        mawb: `M${ref}`,
        hawb: `H${ref}`,
        purchaseCountry: m.country,
        destinationCountry: m.country,
        loadPort: m.port,
        releasePort: m.port,
        packageAmount: '10',
        packageUnit: m.packageUnit,
        netWeight: '100',
        grossWeight: '120',
        departureDate: date,
        submitDate: date,
        shippingMark: `MARK ${ref}`,
      })
      await this.ex.ws.save()
    }
  }

  /**
   * Open the workspace. A declaration whose data breaks the header query answers the
   * detail frame with the site's 500 page (no jQuery → never "ready"); the PHP/SQL error
   * on that page is thrown instead of a bare frame timeout.
   */
  async openWorkspace() {
    try {
      if (this.isImport) await this.im.ws.open(this.spn, this.id)
      else await this.ex.ws.open(this.spn, this.id)
    } catch (e) {
      const page = await this.form.text().catch(() => '')
      const html = await this.form.detail.locator('html').innerHTML().catch(() => '')
      const error = phpError(html) ?? phpError(page)
      if (!error) throw e
      await test.info().attach('workspace-error.html', { body: html, contentType: 'text/html' })
      throw new Error(`เปิดใบขน ${this.referenceNo} ไม่ได้ (HTTP 500) — ${error}`)
    }
  }

  async openAddInvoice() {
    if (this.isImport) await this.im.ws.openAddInvoice()
    else await this.ex.ws.openAddInvoice()
  }

  /** Add Invoice → new invoice → Save; the item form of item 0001 is open afterwards. */
  async addInvoice() {
    const inv = invoiceData({
      consignorSearch: this.isImport ? CUSTOMER_SEARCH.consignor : process.env.SPN_CONSIGNEE_SEARCH || CUSTOMER_SEARCH.consignor,
    })
    this.invoiceNo = inv.invoiceNo
    await this.openAddInvoice()
    const p = this.isImport ? this.im.inv : this.ex.inv
    await p.startNewInvoice()
    await p.fill(inv)
    await p.save()
  }

  /** Key in the items, one after another (Add Item between them), then Save. */
  async keyInItems(items: ItemInput[]) {
    for (let i = 0; i < items.length; i++) {
      if (i > 0) await (this.isImport ? this.im.item : this.ex.item).addItem()
      await this.fillItem(items[i])
    }
    await (this.isImport ? this.im.item : this.ex.item).save()
  }

  /** One item; '' fields are left untouched (DB default). Package/optional fields are never typed. */
  private async fillItem(it: ItemInput) {
    if (!this.isImport) {
      const m = LEG_MASTER.export
      await this.ex.item.fill({
        tariff: m.tariff,
        statisticalCode: m.statisticalCode,
        exportTariff: m.exportTariff,
        privilegeCode: m.privilegeCode,
        englishDescription: 'ZERO DEFAULT TEST ITEM',
        thaiDescription: 'สินค้าทดสอบ',
        originCountry: m.country,
        netWeight: it.netWeight,
        invoiceQuantity: it.invoiceQuantity,
        invoiceQuantityUnit: m.unit,
        quantity: it.quantity,
        quantityUnit: m.unit,
        amountForeign: it.amount,
      })
      return
    }
    const p = this.im.item
    const m = LEG_MASTER.import
    await p.autocomplete.pick(p.tariffCode, m.tariff.type, m.tariff.value)
    await p.englishDescription.fill('ZERO DEFAULT TEST ITEM')
    await p.thaiDescription.fill('สินค้าทดสอบ')
    await p.autocomplete.pick(p.originCountry, m.country, m.country)
    if (it.netWeight) await p.netWeight.fill(it.netWeight)
    if (it.invoiceQuantity) await p.invoiceQuantity.fill(it.invoiceQuantity)
    await p.autocomplete.pick(p.invoiceQuantityUnit, m.unit, m.unit)
    if (it.quantity) await p.quantity.fill(it.quantity)
    await p.autocomplete.pick(p.quantityUnit, m.unit, m.unit)
    if (it.amount) {
      await p.amountForeign.fill(it.amount)
      await p.amountForeign.press('Tab')
    }
  }

  /** Rows (logical field → value) of the scenario's CSV. */
  csvRows(items: ItemInput[]): Record<string, string>[] {
    const m = LEG_MASTER[this.def.leg]
    return items.map((it, i) => ({
      invoiceNo: this.invoiceNo,
      invoiceItem: String(i + 1),
      tariffCode: m.tariff.value,
      ...(this.isImport ? {} : { statisticalCode: LEG_MASTER.export.statisticalCode, exportTariff: LEG_MASTER.export.exportTariff, privilegeCode: LEG_MASTER.export.privilegeCode, purchaseCountry: m.country }),
      englishDescriptionOfGoods: 'ZERO DEFAULT TEST ITEM',
      thaiDescriptionOfGoods: 'ZERO DEFAULT TEST ITEM',
      originCountry: m.country,
      quantity: it.quantity,
      quantityUnit: m.unit,
      invoiceQuantity: it.invoiceQuantity,
      invoiceQuantityUnit: m.unit,
      netWeight: it.netWeight,
      netWeightUnit: 'KGM',
      unitPriceForeign: it.unitPrice ?? '',
      invoiceAmountForeign: it.amount,
      currency: m.currency,
    }))
  }

  treeItems() {
    return (this.isImport ? this.im.ws.treeItems() : this.ex.ws.treeItems())
  }

  async itemNumbers(): Promise<string[]> {
    const labels = await this.treeItems().allInnerTexts()
    return labels.map((l) => l.trim().slice(0, 4))
  }

  async openItem(itemNo: string) {
    if (this.isImport) await this.im.ws.openTreeItem(itemNo)
    else await this.ex.ws.openTreeItem(itemNo)
  }

  async openInvoice() {
    const node = this.isImport ? this.im.ws.treeInvoice(this.invoiceNo) : this.ex.ws.treeInvoice(this.invoiceNo)
    await waitForReload(this.page, () => node.click(), 'detailfrm')
    await waitForFrameReady(this.page, 'detailfrm')
  }

  /** Set the scenario's invoice charges (amount, currency, average method, sign "+") and Save. */
  async setCharges(charges: Scenario['charges']) {
    await this.openWorkspace()
    await this.openInvoice()
    for (const [kind, c] of Object.entries(charges) as [ChargeKind, { amount: string; avg: string }][]) {
      const f = CHARGE_FIELDS[this.def.leg](CHARGE_NO[kind])
      await this.form.fill(f.amount, c.amount)
      await this.form.fill(f.currency, LEG_MASTER[this.def.leg].currency)
      await this.form.select(f.avg, c.avg)
      await this.form.checkRadio(f.sign, '1')
    }
    await waitForReload(this.page, () => this.form.detail.locator('#saveBTN').click(), 'detailfrm')
    await waitForFrameReady(this.page, 'detailfrm')
  }

  /** Baht value and sign (+1/0/-1) of each charge on the invoice form. */
  async readCharges(): Promise<{ kind: ChargeKind; thb: number; sign: number }[]> {
    await this.openWorkspace()
    await this.openInvoice()
    const out: { kind: ChargeKind; thb: number; sign: number }[] = []
    for (const kind of Object.keys(CHARGE_NO) as ChargeKind[]) {
      const f = CHARGE_FIELDS[this.def.leg](CHARGE_NO[kind])
      const v = await this.form.read([f.thb])
      out.push({ kind, thb: Number(v[f.thb] || 0), sign: Number((await this.form.radioValue(f.sign)) || 0) })
    }
    return out
  }

  /** Every item's numeric fields, in tree order. */
  async readItems(): Promise<ItemValues[]> {
    await this.openWorkspace()
    const out: ItemValues[] = []
    for (const no of await this.itemNumbers()) {
      await this.openItem(no)
      out.push({ ...(await this.form.read(ITEM_NUMBERS)), itemNo: no })
    }
    return out
  }

  /** Click a workspace process and return its AJAX answer + the progress page text. */
  async runProcess(kind: ProcessKind): Promise<ProcessResult> {
    await this.openWorkspace()
    const button = this.isImport
      ? { recalc: this.im.ws.reAvgAndCalcTax, tax: this.im.ws.calculateTax, sum: this.im.ws.sumItemToInvoice }[kind]
      : { recalc: this.ex.ws.reAvgAndCalcTax, tax: this.ex.ws.calculateTax, sum: this.ex.ws.sumItemToInvoice }[kind]
    const sub = this.def.subAction[kind]
    const answer = this.page.waitForResponse((r) => r.url().includes('data_defaulttemplate.php') && new URL(r.url()).searchParams.get('SUB_ACTION') === sub, {
      timeout: 180_000,
    })
    await button.click()
    const r = await answer
    const body = await r.text().catch(() => '')
    // the progress page in the detail frame ends with "Completed :)" (or stays on "Please wait")
    await expect(this.form.detail.locator('body'))
      .toContainText(PROCESS_END, { timeout: 60_000 })
      .catch(() => {})
    return { kind, status: r.status(), body, frameText: await this.form.text().catch(() => '') }
  }

  /** "Export to → XML format" of the SEND page (opened by URL — nothing is sent). */
  async exportXml(): Promise<string> {
    await this.page.goto(serviceUrl(this.spn, { SERVICENAME: this.def.service, ACTION: 'SEND', SELITEM: `${this.def.key}:${this.id}` }))
    await this.page.locator('#exportToFiles').selectOption('XMLformat')
    const file = await captureDownload(this.page, () => this.page.locator('#submitExportToFiles').click())
    return file.data.toString('utf8')
  }

  async print(): Promise<PdfFile> {
    await this.openWorkspace()
    return this.isImport ? this.im.ws.print() : this.ex.ws.print()
  }
}

// ─── fixtures ─────────────────────────────────────────────────────────
type CreatedDecl = { leg: Leg; id: string; referenceNo: string; jobNo: string }
type Created = { track: (leg: Leg, id: string, referenceNo: string, jobNo: string) => void }

/** Ref report of a run: reports/zero-default/<yyyy-mm-dd>-<leg>.csv (Excel-readable, UTF-8 BOM). */
const REF_REPORT_DIR = path.resolve('../ai-support/evidence', 'zero-default')
const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`

/**
 * Distinct first lines of a test's errors — what Dev needs next to the Ref No to see
 * where the declaration broke ("Calculate Tax · HTTP status — TypeError …").
 */
function errorSummary(errors: { message?: string }[]): string {
  const lines = errors
    .map((e) => (e.message ?? '').replace(/\x1b\[[0-9;]*m/g, '').split('\n')[0].replace(/^Error:\s*/, '').trim())
    .filter(Boolean)
  return [...new Set(lines)].join(' ⏎ ')
}

export const test = base.extend<{ created: Created }>({
  /**
   * Declarations a test created. They are KEPT (not deleted) so Dev can open the exact
   * Ref No that failed; each one is shown as a step + annotation in the report and
   * written, with the test's result and errors, to the Ref report CSV.
   * SPN_CLEANUP=1 deletes them after the test instead (e.g. a clean-up run).
   */
  created: async ({ page, spn }, use, testInfo) => {
    const decls: CreatedDecl[] = []
    await use({
      track: (leg, id, referenceNo, jobNo) => {
        decls.push({ leg, id, referenceNo, jobNo })
        testInfo.annotations.push({ type: 'reference', description: `${referenceNo} (${LEGS[leg].key}:${id}, Job ${jobNo})` })
      },
    })

    fs.mkdirSync(REF_REPORT_DIR, { recursive: true })
    const [caseId] = testInfo.title.split(':')
    const now = new Date()
    const stamp = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now)
    const time = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok' })
    // skipped first: a test.skip() makes expectedStatus 'skipped' too, so it would read as PASS
    const status = testInfo.status === 'skipped' ? 'SKIP' : testInfo.status === testInfo.expectedStatus ? 'PASS' : 'FAIL'
    const errors = errorSummary(testInfo.errors)
    for (const d of decls) {
      const file = path.join(REF_REPORT_DIR, `${stamp}-${d.leg}.csv`)
      if (!fs.existsSync(file)) fs.writeFileSync(file, '﻿' + ['เวลา', 'เคส', 'ขา', 'Ref No', 'ID', 'Job No', 'ผล', 'ชื่อเคส', 'จุดที่ผิด / Error'].map(csvCell).join(',') + '\r\n')
      const title = testInfo.title.slice(caseId.length + 1).trim()
      fs.appendFileSync(file, [time, caseId, d.leg, d.referenceNo, `${LEGS[d.leg].key}:${d.id}`, d.jobNo, status, title, errors].map(csvCell).join(',') + '\r\n')
    }

    if (process.env.SPN_CLEANUP !== '1') return
    for (const { leg, id } of decls) {
      try {
        const res = await page.request.get(serviceUrl(spn, { SERVICENAME: LEGS[leg].service, ACTION: 'DELETE', SELITEM: `${LEGS[leg].key}:${id}` }))
        if (!res.ok()) throw new Error(`HTTP ${res.status()}`)
      } catch {
        // one failed cleanup must not fail the test — the record carries a ZD job no.
      }
    }
  },
})
export { expect }

// ─── build ────────────────────────────────────────────────────────────
/** Build the scenario's declaration (Key in or CSV) and its charges. */
export async function buildScenario(d: DeclLeg, s: Scenario, track: (id: string, referenceNo: string, jobNo: string) => void) {
  await test.step(`สร้างใบขน (${d.def.leg}) วันที่ ${headerDate(s)}`, async () => {
    await d.create(headerDate(s), track)
  })
  // the Ref No as a step title — shown in both the Playwright and the QA report
  await test.step(`Ref No: ${d.referenceNo} (${d.def.key}:${d.id})`, async () => {})

  if (s.source === 'keyin') {
    await test.step(`Key in · invoice + ${s.items.length} รายการ`, async () => {
      await d.addInvoice()
      await d.keyInItems(s.items)
    })
  } else {
    await test.step(`Import CSV · ${s.items.length} รายการ`, async () => {
      d.invoiceNo = uniqueRef('ZDINV')
      await d.openAddInvoice()
      const name = process.env[d.def.csvMappingEnv] || d.def.csvMappingDefault
      const id = await d.csv.mappingId(name)
      test.skip(!id, `ไม่มี Mapping "${name}" บน site นี้ — ตั้งชื่อ mapping ที่ใช้ใน .env ${d.def.csvMappingEnv}`)
      const mapping = await d.csv.readMapping(d.spn, id!, name)
      const need = ['invoiceno', 'quantity', 'netweight', 'invoiceamountforeign', ...(s.checks.deriveInvoiceQty ? ['unitpriceforeign', 'invoicequantity'] : [])]
      const missing = need.filter((f) => !mappedFields(mapping).has(f))
      test.skip(missing.length > 0, `Mapping "${name}" ไม่มีคอลัมน์ ${missing.join(', ')} — เลือก mapping อื่นใน .env ${d.def.csvMappingEnv}`)
      const { text, dropped } = buildCsv(mapping, d.csvRows(s.items))
      const file = test.info().outputPath(`${s.id}-${d.def.leg}.csv`)
      fs.writeFileSync(file, text, 'latin1')
      await test.info().attach(`${s.id}-${d.def.leg}.csv`, { path: file, contentType: 'text/csv' })
      d.notImported = dropped
      // a warning so it shows in the QA report too: these fields are not checked against the CSV
      if (dropped.length) test.info().annotations.push({ type: 'warning', description: `mapping "${name}" ไม่มีคอลัมน์ ${dropped.join(', ')} — ไม่ได้นำเข้า จึงไม่ตรวจเทียบค่ากับ CSV (ระบบเติมค่าเอง เช่น ปริมาณ = 1)` })
      const result = await d.csv.importFile(id!, file)
      const serverError = phpError(result)
      if (serverError) await test.info().attach('csv-import-server-error.html', { body: result, contentType: 'text/html' })
      expect(serverError ?? 'ok', 'CSV import · ไม่มี PHP error').toBe('ok')
      expect(result, 'CSV import · result').toMatch(/success/i)
      await d.openWorkspace()
      await expect(d.treeItems(), 'CSV import · จำนวนรายการใน tree').toHaveCount(s.items.length)
    })
  }

  if (Object.keys(s.charges).length) {
    await test.step(`ใส่ charge ที่ invoice: ${Object.entries(s.charges).map(([k, c]) => `${k} ${c!.amount} (${c!.avg})`).join(', ')}`, async () => {
      await d.setCharges(s.charges)
    })
  }
}

// ─── checks ───────────────────────────────────────────────────────────
const num = (v: string | undefined) => (v === undefined || v === '' ? 0 : Number(v))
const decimals = (v: string) => (v.includes('.') ? v.split('.')[1].length : 0)
const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function firstBroken(value: string, rules: Rule[]): Rule | undefined {
  return rules.find((r) => r.re.test(value))
}

/**
 * The PHP error a response carries, as one line ("DivisionByZeroError: Division by zero
 * …\workspace.inc(312)"), or null. The site's error page wraps it in HTML with a
 * "REFERENCE ID" — tags are stripped and the reference id kept for the Dev team.
 */
function phpError(body: string): string | null {
  const text = body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ')
  const m = text.match(PHP_ERROR.re)
  if (!m) return null
  const ref = text.match(/REFERENCE ID\s*(\S+)/)
  return `${text.slice(m.index!, m.index! + 260).trim()}${ref ? ` [REFERENCE ID ${ref[1]}]` : ''}`
}

async function attachJson(name: string, data: unknown) {
  await test.info().attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' })
}

/** Run the three processes (and Re-Avg twice) — each must answer without a PHP error. */
export async function runCalculations(d: DeclLeg): Promise<{ first: ItemValues[]; second: ItemValues[] }> {
  for (const kind of ['recalc', 'tax', 'sum'] as const) {
    const label = { recalc: 'Re-Avg and Calc Tax', tax: 'Calculate Tax', sum: 'Sum Item to Inv.' }[kind]
    await test.step(`คำนวณ · ${label} ต้องไม่ error`, async () => {
      const r = await d.runProcess(kind)
      const error = phpError(r.body)
      if (r.status !== 200 || error) await test.info().attach(`${label}-response.html`, { body: r.body, contentType: 'text/html' })
      expect.soft(r.status, `${label} · HTTP status${error ? ` — ${error}` : ''}`).toBe(200)
      expect.soft(error ?? '(ไม่มี)', `${label} · คำตอบไม่มี PHP error (เช่น Division by zero)`).toBe('(ไม่มี)')
      expect.soft(r.frameText, `${label} · หน้า progress ไม่มี PHP error`).not.toMatch(PHP_ERROR.re)
      expect.soft(r.frameText, `${label} · จบด้วยข้อความทำเสร็จ`).toMatch(PROCESS_DONE)
      expect.soft(r.body, `${label} · tree ไม่มี NaN/INF`).not.toMatch(/\bNaN\b|\bINF\b/)
    })
  }
  const first = await test.step('อ่านค่ารายการหลังคำนวณ', async () => d.readItems())
  if (first.length && first.every((it) => num(it.exchangeRate) === 0)) {
    // not a failure of its own: ZD-04 wants exactly this; elsewhere Baht values are all 0
    // and the calculation checks prove little — set SPN_RATE_DATE to a date with rates
    test.info().annotations.push({ type: 'warning', description: `อัตราแลกเปลี่ยนของทุกรายการ = 0 (ไม่มี rate ของวันที่ใน header) — ตั้ง SPN_RATE_DATE เป็นวันที่ที่มี rate` })
  }
  const second = await test.step('Re-Avg and Calc Tax รอบ 2 — ค่าต้องเท่าเดิม (ไม่ drift)', async () => {
    const r = await d.runProcess('recalc')
    expect.soft(r.body, 'Re-Avg รอบ 2 · ไม่มี PHP error').not.toMatch(PHP_ERROR.re)
    const again = await d.readItems()
    for (let i = 0; i < Math.min(first.length, again.length); i++) {
      for (const f of [d.def.value, 'invoiceAmountBaht', 'netWeight', 'quantity', 'invoiceQuantity'])
        expect.soft(again[i][f], `รอบ 2 · item ${first[i].itemNo} ${f} เท่าเดิม`).toBe(first[i][f])
    }
    return again
  })
  return { first, second }
}

/** 1. หน้าจอ — keyed values equal, every numeric field a well-formed number with sane decimals, tree labels clean. */
export async function checkScreen(d: DeclLeg, s: Scenario, items: ItemValues[]) {
  await test.step('ตรวจหน้าจอ · ค่าที่กรอก/นำเข้า และรูปแบบตัวเลข (ทศนิยม)', async () => {
    await attachJson(`${s.id}-items.json`, items)
    expect.soft(items.length, 'จำนวนรายการ').toBe(s.items.length)
    items.forEach((it, i) => {
      const input = s.items[i]
      if (!input) return
      const keyed: [string, string][] = [
        ['quantity', input.quantity],
        ['invoiceQuantity', input.invoiceQuantity],
        ['netWeight', input.netWeight],
        ['invoiceAmountForeign', input.amount],
      ]
      for (const [f, v] of keyed) {
        if (v === '' || it[f] === undefined || d.notImported.includes(f)) continue
        expect.soft(num(it[f]), `item ${it.itemNo} · ${f}: กรอก "${v}" — แสดง "${it[f]}"`).toBe(Number(v))
      }
      for (const [f, v] of Object.entries(it)) {
        if (f === 'itemNo' || v === '') continue
        const bad = firstBroken(v, NOT_A_NUMBER)
        expect.soft(bad?.why ?? 'ok', `item ${it.itemNo} · ${f} = "${v}"`).toBe('ok')
        expect.soft(UI_NUMBER.test(v), `item ${it.itemNo} · ${f} = "${v}" เป็นตัวเลขรูปแบบปกติ`).toBe(true)
        if (UI_MAX_DECIMALS[f] !== undefined)
          expect.soft(decimals(v), `item ${it.itemNo} · ${f} = "${v}" ทศนิยมไม่เกิน ${UI_MAX_DECIMALS[f]} ตำแหน่ง`).toBeLessThanOrEqual(UI_MAX_DECIMALS[f])
      }
    })
    await d.openWorkspace()
    for (const label of await d.treeItems().allInnerTexts()) {
      // "0001(10 C62)" — a 0 / blank unit shows as "(0.000 )" — the stray label case
      // the label shows the invoice qty + unit — skipped when the mapping didn't import the unit
      if (!d.notImported.includes('invoiceQuantityUnit'))
        expect.soft(label, `tree · "${label}" ไม่มีหน่วยว่าง`).not.toMatch(/\(\s*[\d.,]+\s*\)/)
      expect.soft(label, `tree · "${label}" ไม่มี NaN`).not.toMatch(/NaN|INF/)
    }
  })
}

/** 2. คำนวณ — values finite, charges allocated as the scenario expects, VAT, derived qty. */
export async function checkCalculation(d: DeclLeg, s: Scenario, items: ItemValues[]) {
  await test.step(`ตรวจผลคำนวณ · ${s.checks.allocate}`, async () => {
    const charges = await d.readCharges()
    await attachJson(`${s.id}-charges.json`, charges)
    const value = d.def.value
    if (s.noRate) {
      // precondition — without it the scenario would pass without dividing by a 0 rate
      for (const it of items) expect.soft(num(it.exchangeRate), `เงื่อนไขเคส · item ${it.itemNo} exchangeRate = 0 (วันที่ ${headerDate(s)} ต้องไม่มี rate — ตั้ง SPN_NO_RATE_DATE)`).toBe(0)
    }
    for (const it of items) {
      for (const f of [value, 'invoiceAmountBaht', 'exchangeRate', 'duty_topay', 'vat_topay']) {
        if (it[f] === undefined) continue
        expect.soft(Number.isFinite(num(it[f])), `item ${it.itemNo} · ${f} = "${it[f]}" เป็นตัวเลข`).toBe(true)
      }
      // Baht amount = foreign amount × rate (2 decimals)
      const expectBaht = Math.round(num(it.invoiceAmountForeign) * num(it.exchangeRate) * 100) / 100
      expect.soft(Math.abs(num(it.invoiceAmountBaht) - expectBaht), `item ${it.itemNo} · invoiceAmountBaht ${it.invoiceAmountBaht} = ${it.invoiceAmountForeign} × ${it.exchangeRate}`).toBeLessThanOrEqual(0.01)
    }
    const n = items.length
    const sumAmount = items.reduce((a, it) => a + num(it.invoiceAmountBaht), 0)
    const sumValue = items.reduce((a, it) => a + num(it[value]), 0)
    const added = charges.reduce((a, c) => a + c.sign * c.thb, 0)
    for (const c of charges) expect.soft(Number.isFinite(c.thb), `charge ${c.kind} · Baht เป็นตัวเลข`).toBe(true)

    if (s.checks.allocate === 'exact' || s.checks.allocate === 'proportional') {
      expect.soft(Math.abs(sumValue - (sumAmount + added)), `Σ ${value} ${sumValue.toFixed(2)} = Σ invoiceAmountBaht ${sumAmount.toFixed(2)} + charges ${added.toFixed(2)}`).toBeLessThanOrEqual(0.01 * n)
    }
    if (s.checks.allocate === 'proportional' && sumAmount > 0) {
      for (const it of items) {
        const share = (added * num(it.invoiceAmountBaht)) / sumAmount
        const got = num(it[value]) - num(it.invoiceAmountBaht)
        expect.soft(Math.abs(got - share), `item ${it.itemNo} · charge ที่เฉลี่ยได้ ${got.toFixed(2)} ≈ ${share.toFixed(2)} (ตามสัดส่วนมูลค่า)`).toBeLessThanOrEqual(0.02 * Object.keys(s.charges).length)
      }
    }
    if (s.checks.allocate === 'noOverAllocation') {
      const allocated = sumValue - sumAmount
      const max = charges.reduce((a, c) => a + Math.abs(c.thb), 0)
      expect.soft(allocated, `charge ที่ลงรายการรวม ${allocated.toFixed(2)} ต้องไม่เกิน charge ของ invoice ${max.toFixed(2)} (0÷0 ต้องไม่ทำให้ซ้ำ/เกิน)`).toBeLessThanOrEqual(max + 0.01 * n)
      for (const it of items)
        expect.soft(num(it[value]), `item ${it.itemNo} · ${value} ไม่ติดลบ`).toBeGreaterThanOrEqual(0)
    }
    if (s.checks.vat && d.isImport) {
      for (const it of items) {
        if (it.vat_topay === undefined) continue
        const base = num(it.cifValueAssess) > 0 ? num(it.cifValueAssess) : num(it.cifValueBaht)
        const vat = (base + num(it.duty_topay)) * 0.07
        expect.soft(Math.abs(num(it.vat_topay) - vat), `item ${it.itemNo} · VAT ${it.vat_topay} ≈ 7% × (CIF ${base} + อากร ${it.duty_topay}) = ${vat.toFixed(2)}`).toBeLessThanOrEqual(1)
      }
    }
    if (s.checks.deriveInvoiceQty) {
      items.forEach((it, i) => {
        const input = s.items[i]
        if (!input?.unitPrice) return
        const expected = Number(input.amount) / Number(input.unitPrice)
        expect.soft(num(it.invoiceQuantity), `item ${it.itemNo} · invoiceQuantity = มูลค่า ${input.amount} ÷ ราคาต่อหน่วย ${input.unitPrice} = ${expected} (ต้องไม่เป็นราคาต่อหน่วย/0)`).toBe(expected)
      })
    }
  })
}

/** 3. XML ส่งกรม — no optional tag as 0, no "0" code, no NaN/garbage, item values = screen. */
export async function checkXml(d: DeclLeg, s: Scenario, items: ItemValues[]) {
  await test.step('ตรวจ XML ส่งกรม · ไม่มี tag ค่า 0 ที่ไม่ควรส่ง', async () => {
    const xml = await d.exportXml()
    await test.info().attach(`${s.id}-${d.referenceNo}.xml`, { body: xml, contentType: 'application/xml' })
    expect.soft(xml, 'XML · ไม่มี PHP error ปน').not.toMatch(PHP_ERROR.re)
    expect.soft(xml, 'XML · reference no').toContain(d.referenceNo)
    const leaves = xmlLeaves(xml)
    const zeroLeaves: XmlLeaf[] = []
    for (const l of leaves) {
      const isNum = /^-?[\d.]+([eE][+-]?\d+)?$|NaN|INF/.test(l.value)
      if (isNum && Number(l.value) === 0) zeroLeaves.push(l)
      if (isNum || /NaN|INF/.test(l.value)) {
        const bad = firstBroken(l.value, NOT_A_NUMBER)
        expect.soft(bad?.why ?? 'ok', `XML · ${l.path} = "${l.value}"`).toBe('ok')
        const max = /Rate$|ExchangeRate/.test(l.name) ? XML_MAX_DECIMALS.rate : XML_MAX_DECIMALS.other
        expect.soft(decimals(l.value), `XML · ${l.path} = "${l.value}" ทศนิยมไม่เกิน ${max}`).toBeLessThanOrEqual(max)
      }
      if (XML_CODE_TAG.test(l.name)) expect.soft(l.value, `XML · ${l.path} เป็นรหัส/ข้อความ — ห้ามเป็น "0"`).not.toBe('0')
    }
    for (const l of zeroLeaves) {
      const known = XML_ZERO_KNOWN.find((r) => r.re.test(l.path))
      if (known) {
        test.info().annotations.push({ type: 'warning', description: `XML ${l.path}=${l.value} — ${known.why}` })
        continue
      }
      const rule = XML_NO_ZERO.find((r) => r.re.test(l.path))
      if (rule) expect.soft(`${l.path}=${l.value}`, `XML · ไม่ควรส่ง tag ค่า 0 — ${rule.why}`).toBe('(ไม่มี tag นี้)')
    }
    await attachJson(`${s.id}-xml-zero-leaves.json`, zeroLeaves.map((l) => `${l.path}=${l.value}`))

    const details = xmlDetails(xml)
    expect.soft(details.length, 'XML · จำนวน <Detail> = จำนวนรายการ').toBe(items.length)
    details.forEach((dt, i) => {
      const it = items[i]
      if (!it) return
      for (const [path, f] of [
        ['NetWeight/Weight', 'netWeight'],
        ['Quantity/Quantity', 'quantity'],
        ['InvoiceQuantity/Quantity', 'invoiceQuantity'],
        ['InvoiceAmount/Foreign', 'invoiceAmountForeign'],
        ['InvoiceAmount/Baht', 'invoiceAmountBaht'],
      ] as const) {
        const v = leafValue(dt, path)
        if (v === undefined || it[f] === undefined) continue
        expect.soft(num(v), `XML · item ${it.itemNo} ${path} "${v}" = หน้าจอ ${f} "${it[f]}"`).toBe(num(it[f]))
      }
    })
  })
}

/** 4. Preview (PDF ใบขน) — readable, no stray 0 label / NaN, item values printed. */
export async function checkPreview(d: DeclLeg, s: Scenario, items: ItemValues[]) {
  await test.step('ตรวจ Preview (PDF ใบขน) · ไม่มี label 0 โผล่', async () => {
    let pdf: PdfFile
    try {
      pdf = await d.print()
    } catch (e) {
      const text = await d.form.text().catch(() => '')
      expect.soft(`${(e as Error).message}\n${text.slice(0, 500)}`, 'Preview · พิมพ์ใบขนได้ (ได้ไฟล์ PDF)').toBe('PDF')
      return
    }
    await test.info().attach(`${s.id}-${d.referenceNo}.pdf`, { body: pdf.data, contentType: 'application/pdf' })
    const text = readPdfText(pdf.data)
    await test.info().attach(`${s.id}-preview.txt`, { body: text, contentType: 'text/plain' })
    expect.soft(text, 'Preview · อ่านข้อความใน PDF ได้ (พบเลข reference)').toContain(d.referenceNo)
    expect.soft(text, 'Preview · ไม่มี PHP error').not.toMatch(PHP_ERROR.re)
    expect.soft(text, 'Preview · ไม่มี NaN/INF').not.toMatch(/\bNaN\b|\bINF\b/)
    for (const r of PREVIEW_FORBIDDEN) {
      const hit = text.match(r.re)
      expect.soft(hit?.[0] ?? '(ไม่พบ)', `Preview · ${r.why}`).toBe('(ไม่พบ)')
    }
    for (const it of items) {
      const v = num(it[d.def.value])
      if (v > 0) expect.soft(text, `Preview · พิมพ์มูลค่า item ${it.itemNo} = ${fmt2(v)}`).toContain(fmt2(v))
    }
  })
}
