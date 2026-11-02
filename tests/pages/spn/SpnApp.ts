import fs from 'fs'
import { test, Page, Frame, Dialog, Request, Route, BrowserContext, expect } from '@playwright/test'

/**
 * Shared plumbing for the ShippingNet Pluz+ legacy pages (PHP, full-page form posts,
 * frames, native alert/confirm/prompt, jQuery $.get autocomplete).
 */

export type SpnSession = { uid: string; ucode: string }

/**
 * Time budgets grow with SLOW_MO (playwright.config.ts → launchOptions.slowMo): a flow of
 * ~150 actions slowed by 500 ms each needs minutes more than the normal budget.
 * 0 → ×1, 500 ms → ×6.
 */
export const SLOW_FACTOR = 1 + (Number(process.env.SLOW_MO) || 0) / 100

/** Service pages live next to the SPN shell: …/standard/IE5DEV.shippingnet/data_defaulttemplate.php */
export function serviceBaseUrl(): string {
  if (process.env.IE5_BASE_URL) return process.env.IE5_BASE_URL
  return new URL('../IE5DEV.shippingnet/data_defaulttemplate.php', process.env.APP_BASE_URL).toString()
}

export function serviceUrl(session: SpnSession, params: Record<string, string>): string {
  const url = new URL(serviceBaseUrl())
  url.searchParams.set('UID', session.uid)
  url.searchParams.set('UCODE', session.ucode)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}

const STALE_FLAG = '__pwStaleDocument'

function frameOf(page: Page, frameName?: string): Frame {
  const frame = frameName ? page.frame({ name: frameName }) : page.mainFrame()
  if (!frame) throw new Error(`frame "${frameName}" not found`)
  return frame
}

/**
 * Run `action` and wait until the page (or the named frame) has loaded a NEW document.
 * The legacy forms post back to the same URL, so a URL wait can't tell old from new —
 * the current document is flagged first and we wait for a document without the flag.
 */
export async function waitForReload(page: Page, action: () => Promise<unknown>, frameName?: string, timeoutMs = 45_000) {
  await frameOf(page, frameName).evaluate((flag) => {
    ;(window as unknown as Record<string, boolean>)[flag] = true
  }, STALE_FLAG)
  await action()
  await expect
    .poll(
      async () => {
        const frame = frameName ? page.frame({ name: frameName }) : page.mainFrame()
        if (!frame) return false
        try {
          return await frame.evaluate(
            (flag) => !(window as unknown as Record<string, boolean>)[flag] && document.readyState === 'complete',
            STALE_FLAG,
          )
        } catch {
          return false // navigating — execution context replaced
        }
      },
      { message: `${frameName ?? 'page'} reloaded`, timeout: timeoutMs },
    )
    .toBe(true)
}

/**
 * Wait until the named frame holds a fully loaded document. Form fields get their
 * keyup/blur handlers (autocomplete, lookups) on document ready — typing before that
 * silently skips the lookup.
 */
export async function waitForFrameReady(page: Page, frameName: string) {
  await expect
    .poll(
      async () => {
        const frame = page.frame({ name: frameName })
        if (!frame) return false
        try {
          return await frame.evaluate(() => document.readyState === 'complete' && typeof (window as unknown as { jQuery?: unknown }).jQuery === 'function')
        } catch {
          return false
        }
      },
      { message: `${frameName} ready`, timeout: 45_000 },
    )
    .toBe(true)
}

/**
 * Counts in-flight XHR/fetch requests of a page (all frames). Autocomplete and
 * "load importer/consignor" lookups are jQuery $.get calls fired on keyup/Enter/blur;
 * waiting for zero in-flight requests is the only completion signal they give.
 */
class AjaxTracker {
  private inflight = new Map<Request, number>()
  constructor(page: Page) {
    const isAjax = (r: Request) => ['xhr', 'fetch'].includes(r.resourceType())
    page.on('request', (r) => {
      if (isAjax(r)) this.inflight.set(r, Date.now())
    })
    const done = (r: Request) => void this.inflight.delete(r)
    page.on('requestfinished', done)
    page.on('requestfailed', done)
  }
  /** Requests still running. One whose frame navigated away never reports back — after 15 s it is ignored. */
  private pending() {
    const now = Date.now()
    return [...this.inflight.values()].filter((t) => now - t < 15_000).length
  }
  async idle(timeout = 20_000) {
    await expect.poll(() => this.pending(), { message: 'pending lookups finished', timeout }).toBe(0)
  }
}

const trackers = new WeakMap<Page, AjaxTracker>()
export function ajax(page: Page): AjaxTracker {
  let t = trackers.get(page)
  if (!t) trackers.set(page, (t = new AjaxTracker(page)))
  return t
}

export type PdfFile = { fileName: string; data: Buffer }

/**
 * Run `action` and capture the PDF it produces. Headless Chromium turns the PDF
 * response into a download; headed Chromium (--headed / --ui) shows it in its PDF
 * viewer and no download happens — so whichever arrives first is taken.
 */
export async function capturePdf(page: Page, action: () => Promise<unknown>, timeout = 60_000): Promise<PdfFile> {
  const viaDownload = page.waitForEvent('download', { timeout }).then(async (d) => ({
    fileName: d.suggestedFilename(),
    data: fs.readFileSync(await d.path()),
  }))
  const viaViewer = page
    .waitForResponse((r) => /\.pdf(\?|$)/i.test(new URL(r.url()).pathname) && r.status() === 200, { timeout })
    // the body of a response shown in the PDF viewer isn't the file itself — fetch the same
    // (session-scoped) URL again with the page's cookies
    .then(async (r) => ({
      fileName: decodeURIComponent(new URL(r.url()).pathname.split('/').pop() ?? ''),
      data: await (await page.request.get(r.url())).body(),
    }))
  await action()
  return Promise.any([viaDownload, viaViewer])
}

/**
 * Run `action` and take the file it produces, from any page of the context (some print
 * forms open a blank window first and the file arrives there).
 *
 * Headless Chromium saves a PDF as a download; headed Chromium (--headed / --ui) shows it
 * in its PDF viewer instead — no download, and the viewer hides the bytes. So in a headed
 * run the app's page responses are also passed through a route that keeps a copy of any
 * PDF body. The response is handed to the browser unchanged (not mocked) — the route only
 * reads it. (Headless doesn't need it, and routing there would interrupt the download.)
 */
export async function captureDownload(page: Page, action: () => Promise<unknown>, timeout = 60_000): Promise<PdfFile> {
  const context = page.context()
  let done: (f: PdfFile) => void = () => {}
  const file = new Promise<PdfFile>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no file within ${timeout} ms`)), timeout)
    done = (f) => {
      clearTimeout(timer)
      resolve(f)
    }
  })

  const watch = (p: Page) =>
    p.once('download', async (d) => {
      try {
        done({ fileName: d.suggestedFilename(), data: fs.readFileSync(await d.path()) })
      } catch {
        // headed run: the route below already took the file and the download was cancelled
      }
    })
  context.pages().forEach(watch)
  context.on('page', watch)

  const headed = test.info().project.use.headless === false
  const pattern = /data_defaulttemplate\.php/
  const keepPdf = async (route: Route) => {
    if (route.request().resourceType() !== 'document') return route.fallback()
    const response = await route.fetch()
    const type = response.headers()['content-type'] ?? ''
    if (/application\/pdf/i.test(type)) {
      const body = await response.body()
      if (body.subarray(0, 4).toString('latin1') === '%PDF') {
        const named = (response.headers()['content-disposition'] ?? '').match(/filename="?([^";]+)"?/i)
        done({ fileName: named ? named[1] : `${new URL(route.request().url()).pathname.split('/').pop()?.replace(/\.php$/, '')}.pdf`, data: body })
      }
    }
    await route.fulfill({ response }).catch(() => {}) // window already closed — nothing to hand back
  }
  if (headed) await context.route(pattern, keepPdf)
  try {
    await action()
    return await file
  } finally {
    context.off('page', watch)
    if (headed) await context.unroute(pattern, keepPdf)
  }
}

/**
 * Pages of the app call window.print() on load (e.g. ใบนำคีย์ HTML). In a headed run the
 * browser's print dialog then blocks the window; printing on paper is outside the suite,
 * so print() is made a no-op for the test's browser context.
 */
export async function disablePrintDialog(context: BrowserContext) {
  await context.addInitScript(() => {
    window.print = () => {}
  })
}

export type DialogRecord = { type: string; message: string }
type DialogAnswer = { accept: boolean; promptText?: string }

/**
 * Records native dialogs (alert/confirm/prompt) raised by the page or any of its frames.
 * Every dialog is accepted unless `answerNext()` queued a different answer — the app
 * asks "are you sure" confirms on delete/copy, and alerts are its error channel.
 */
export class DialogLog {
  readonly records: DialogRecord[] = []
  private answers: DialogAnswer[] = []

  constructor(page: Page) {
    page.on('dialog', (d) => this.handle(d))
  }

  /** Attach to another page (e.g. a popup window) as well. */
  watch(page: Page) {
    page.on('dialog', (d) => this.handle(d))
  }

  clearPendingAnswers() { this.answers.length = 0 }

  answerNext(answer: DialogAnswer) {
    this.answers.push(answer)
  }

  /** Waits until a dialog matching `message` was shown and returns it. */
  async waitFor(message: RegExp, timeout = 20_000): Promise<DialogRecord> {
    await expect
      .poll(() => this.records.some((r) => message.test(r.message)), { message: `dialog ${message} shown`, timeout })
      .toBe(true)
    return this.records.filter((r) => message.test(r.message)).pop()!
  }

  private async handle(d: Dialog) {
    this.records.push({ type: d.type(), message: d.message() })
    const answer = this.answers.shift() ?? { accept: true }
    try {
      if (answer.accept) await d.accept(answer.promptText ?? d.defaultValue())
      else await d.dismiss()
    } catch {
      // the dialog was already handled (page closed) — nothing to answer
    }
  }
}
