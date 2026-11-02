import fs from 'fs'
import { Page, Locator } from '@playwright/test'
import { SpnSession, waitForReload } from './SpnApp'

/**
 * Configuration → Other Report (report_generator.php / report_generator_export.php).
 * The list page links every report to its query form — either
 * report_generator.php?ACTION=QUERYFORM&REPORT=… or data_defaulttemplate.php?SERVICENAME=CONFREPORT&ACTION=GEN_REPORT&SELITEM=RID:…
 * (sites differ). The form has a From/To pair per date field (Q_START_<field> / Q_STOP_<field>,
 * format yyyy-MM-dd) and five output buttons; each report adds its own criteria.
 */
export type ReportLink = { name: string; href: string }
/** A From/To date pair of a report form: field name + the two input names. */
export type DateRange = { field: string; from: string; to: string }
export type ReportList = 'import' | 'export'

/** The five output buttons, by the label the user sees. */
export const REPORT_BUTTONS = ['View Report', 'Export to Excel', 'Export to CSV', 'Export to newExcel', 'Export to XLSX'] as const
export type ReportButton = (typeof REPORT_BUTTONS)[number]

/** What a button produced: a downloaded file or a page (same tab or a new window). */
export type ReportOutput =
  | { kind: 'file'; fileName: string; data: Buffer }
  | { kind: 'page'; status: number; html: string; text: string }
  | { kind: 'dialog'; message: string }
  | { kind: 'none' }

export function reportListUrl(session: SpnSession, list: ReportList): string {
  const file = list === 'import' ? 'report_generator.php' : 'report_generator_export.php'
  const url = new URL(`../IE5DEV.shippingnet/${file}`, process.env.APP_BASE_URL)
  url.searchParams.set('UID', session.uid)
  url.searchParams.set('UCODE', session.ucode)
  return url.toString()
}

export class ReportGeneratorPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async openList(session: SpnSession, list: ReportList) {
    await this.page.goto(reportListUrl(session, list))
  }

  /** Every report link of the list (name = link text). Download icons and navigation links are left out. */
  async reports(): Promise<ReportLink[]> {
    const links = await this.page.locator('a').evaluateAll((as) =>
      as.map((a) => ({ name: (a as HTMLAnchorElement).innerText.replace(/\s+/g, ' ').trim(), href: (a as HTMLAnchorElement).href })),
    )
    return links.filter((l) => l.name && /ACTION=QUERYFORM|ACTION=GEN_REPORT/i.test(l.href))
  }

  /**
   * Date From/To pairs the form offers, in page order. Reports are configured per customer, so
   * three naming styles exist: Q_START_<f>/Q_STOP_<f> (standard), <f>From/<f>To (custom forms,
   * input type=date) and start<F>/stop<F>. Only pairs whose name says "date" count — the same
   * styles are used for Ref No / Tax No ranges.
   */
  async dateRanges(): Promise<DateRange[]> {
    const names = await this.page.locator('input[name]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).name))
    const has = new Set(names)
    const out: DateRange[] = []
    for (const n of names) {
      let pair: DateRange | null = null
      if (n.startsWith('Q_START_') && has.has(`Q_STOP_${n.slice(8)}`)) pair = { field: n.slice(8), from: n, to: `Q_STOP_${n.slice(8)}` }
      else if (/From$/.test(n) && has.has(n.replace(/From$/, 'To'))) pair = { field: n.replace(/From$/, ''), from: n, to: n.replace(/From$/, 'To') }
      else if (/^start/.test(n) && has.has(n.replace(/^start/, 'stop'))) pair = { field: n.replace(/^start/, ''), from: n, to: n.replace(/^start/, 'stop') }
      if (pair && /date/i.test(pair.field)) out.push(pair)
    }
    return out
  }

  /**
   * Reference-number inputs of the form (for reports searched by Ref No only): ranges like
   * startRefNo/stopRefNo, Q_START_ReferenceNo/Q_STOP_ReferenceNo, or a single referenceNo field.
   */
  async refFields(): Promise<string[]> {
    const names = await this.page.locator('input[type=text][name], input:not([type])[name]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).name))
    return [...new Set(names.filter((n) => /ref(erence)?_?no/i.test(n)))]
  }

  /** Put `ref` into every Ref No input (From and To get the same number). */
  async fillRef(fields: string[], ref: string) {
    for (const f of fields) await this.page.locator(`input[name="${f}"]`).first().fill(ref)
  }

  /**
   * A reference no that exists on this site: the declaration list of the same leg, searched
   * by `from`–`to` on its arrival/departure date (list dates are yyyy-mm-dd); the newest
   * declaration of the list when that window has none. Null when the list is empty.
   */
  async findReferenceNo(session: SpnSession, list: ReportList, from: string, to: string): Promise<{ ref: string; source: string } | null> {
    const url = new URL('../IE5DEV.shippingnet/data_defaulttemplate.php', process.env.APP_BASE_URL)
    url.searchParams.set('UID', session.uid)
    url.searchParams.set('UCODE', session.ucode)
    url.searchParams.set('SERVICENAME', list === 'import' ? 'IMPORTDECLARATIONCONTROL' : 'EXPORTDECLARATIONCONTROL')
    await this.page.goto(url.toString())
    const refs = () =>
      this.page
        .locator('tr:has(input[name="SELITEM[]"])')
        .evaluateAll((trs) => trs.map((tr) => ((tr.querySelectorAll(':scope > td')[2] as HTMLElement)?.innerText ?? '').trim()).filter(Boolean))
    const dateType = this.page.locator('select[name="searchDate"]')
    if ((await dateType.count()) > 0) {
      const options = await dateType.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))
      const pick = options.find((o) => /arrival|departure/i.test(o)) ?? options[0]
      if (pick) {
        await dateType.selectOption(pick)
        await this.page.locator('input[name="sFROM"]').fill(from)
        await this.page.locator('input[name="sTO"]').fill(to)
        await waitForReload(this.page, () => this.page.locator('#refreshBTN').click())
        const inWindow = await refs()
        if (inWindow.length) return { ref: inWindow[0], source: `รายการใบขน ${pick} ${from}–${to}` }
        await this.page.goto(url.toString())
      }
    }
    const newest = await refs()
    return newest.length ? { ref: newest[0], source: 'ใบขนล่าสุดในรายการ (ช่วงวันที่ไม่มีใบขน)' } : null
  }

  async fillRange(range: DateRange, from: string, to: string) {
    await this.page.locator(`input[name="${range.from}"]`).first().fill(from)
    await this.page.locator(`input[name="${range.to}"]`).first().fill(to)
  }

  /** Labels of the form's output buttons (Clear/Reset/Auto Report/Back are not outputs). */
  async buttonLabels(): Promise<string[]> {
    const labels = await this.page
      .locator('input[type=submit], input[type=button], button')
      .evaluateAll((els) => els.map((e) => ((e as HTMLInputElement).value || (e as HTMLElement).innerText || '').trim()))
    return [...new Set(labels.filter((l) => l && !/^(clear|reset|back|auto report|close)/i.test(l)))]
  }

  /** Output button by its label ("Export to CSV") — matched on the value the page shows. */
  button(label: string): Locator {
    return this.page.locator(`input[type=submit][value="${label}"], input[type=button][value="${label}"], button:text-is("${label}")`).first()
  }

  /**
   * Click an output button and take what it produces: a download, a new window, the reloaded
   * page, or a validation alert (a report with a required criterion the suite doesn't fill).
   */
  async run(label: string, timeout = 120_000): Promise<ReportOutput> {
    const context = this.page.context()
    // A response event precedes the new document's commit. Waiting for 'load'
    // alone can return immediately for the old, already-loaded query form.
    const marker = '__pwReportPreviousDocument'
    await this.page.evaluate((key) => { (window as unknown as Record<string, boolean>)[key] = true }, marker)
    let dialog: string | null = null
    const onDialog = (d: import('@playwright/test').Dialog) => {
      dialog = d.message()
      d.accept().catch(() => {})
    }
    this.page.on('dialog', onDialog)
    const download = this.page
      .waitForEvent('download', { timeout })
      .then(async (d) => ({ kind: 'file' as const, fileName: d.suggestedFilename(), data: fs.readFileSync(await d.path()) }))
    const popup = context.waitForEvent('page', { timeout }).then(async (p) => {
      // a new window either shows the report or turns into a download (handled above)
      const res = await p.waitForEvent('response', { predicate: (r) => r.request().resourceType() === 'document', timeout }).catch(() => null)
      await p.waitForLoadState('load').catch(() => {})
      return { kind: 'page' as const, status: res?.status() ?? 200, html: await p.content().catch(() => ''), text: await p.locator('body').innerText().catch(() => '') }
    })
    const samePage = this.page
      .waitForResponse((r) => r.request().resourceType() === 'document' && r.request().method() === 'POST', { timeout })
      .then(async (r) => {
        // an attachment / non-HTML answer is a file — the download promise takes it
        const type = r.headers()['content-type'] ?? ''
        if (/attachment/i.test(r.headers()['content-disposition'] ?? '') || (type && !/html/i.test(type))) throw new Error('file response')
        await this.page.waitForFunction(
          (key) => !(window as unknown as Record<string, boolean>)[key] && document.readyState === 'complete',
          marker, { timeout },
        )
        return { kind: 'page' as const, status: r.status(), html: await this.page.content().catch(() => ''), text: await this.page.locator('body').innerText().catch(() => '') }
      })
    const alerted = new Promise<ReportOutput>((resolve) => {
      const t = setInterval(() => {
        if (dialog !== null) {
          clearInterval(t)
          resolve({ kind: 'dialog', message: dialog })
        }
      }, 200)
      setTimeout(() => clearInterval(t), timeout)
    })
    // the waits that lose the race reject later (timeout / "file response") — keep those quiet
    for (const p of [download, popup, samePage]) p.catch(() => {})
    try {
      await this.button(label).click()
      let out: ReportOutput = await Promise.any([download, popup, samePage, alerted]).catch(() => ({ kind: 'none' as const }))
      // a validation alert (e.g. a required criterion) may still let the form post back the
      // empty form — the alert is the real answer, whichever came first
      await this.page.waitForTimeout(500)
      if (dialog !== null) out = { kind: 'dialog', message: dialog }
      // a window that only hands over a file shows an empty page first — wait for the file
      if (out.kind === 'page' && !out.text.trim()) return await Promise.race([download, new Promise<ReportOutput>((r) => setTimeout(() => r(out), 15_000))]).catch(() => out)
      return out
    } finally {
      this.page.off('dialog', onDialog)
      // pages a report opened are not needed after this button
      for (const p of context.pages()) if (p !== this.page) await p.close().catch(() => {})
    }
  }
}
