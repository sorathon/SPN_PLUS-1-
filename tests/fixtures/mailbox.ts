import { APIRequestContext, APIResponse, TestInfo, request as pwRequest, test } from '@playwright/test'
import { uniqueRef } from '../data/factories'

/**
 * Disposable inbox on mail.tm (https://api.mail.tm) for tests that check
 * outgoing email.
 *
 * mail.tm rotates its domains, so every mailbox starts by fetching the active
 * domain list, then creates a brand-new account on it — one fresh address per
 * test. The account is deleted again in dispose().
 *
 * Verified live 2026-10-02 (first used on a share-invite flow): mail
 * arrived in ~8s with the full html/text body.
 *
 * Frontend-first: assert an email by RENDERING its html in a page
 * (page.setContent) and checking what the recipient sees; from/subject from the
 * API are secondary checks.
 *
 * mail.tm is a public third-party service. Its problems (down, rate-limited,
 * mail not delivered in time) must NOT fail a test: tests use EmailChannel
 * below, which turns them into a "warning" annotation (shown in the QA report)
 * and lets the test continue with the app-side checks. Tag such tests @email.
 */
// Overridable to rehearse the soft paths: MAILTM_API=<bad url> (service down),
// MAILBOX_WAIT_MS=<small> (mail not delivered in time).
const API = process.env.MAILTM_API ?? 'https://api.mail.tm'
// Delivery was ~8s when verified; 60s is generous and keeps the no-mail path (a warning) inside a test's timeout —
// a test using this fixture must set its timeout ABOVE (its own steps + this wait), or no-mail ends as a timeout, not a warning.
const WAIT_MS = Number(process.env.MAILBOX_WAIT_MS ?? 60_000)

export type Email = {
  id: string
  from: string
  subject: string
  text: string
  html: string
}

export class Mailbox {
  private constructor(
    private readonly api: APIRequestContext,
    readonly address: string,
    private readonly accountId: string,
    private readonly token: string,
  ) {}

  static async create(): Promise<Mailbox> {
    // Own request context: a different service (mail.tm), no app baseURL/auth.
    const api = await pwRequest.newContext()
    const domains = (await json(await call(() => api.get(`${API}/domains`))))['hydra:member'] as {
      domain: string
      isActive: boolean
      isPrivate: boolean
    }[]
    const domain = domains.find((d) => d.isActive && !d.isPrivate)?.domain
    if (!domain) throw new Error('mail.tm: no active public domain right now — test infrastructure, not the app')
    const address = `${uniqueRef('bot')}@${domain}`.toLowerCase()
    const password = `P${uniqueRef('pw')}!`
    const account = await json(await call(() => api.post(`${API}/accounts`, { data: { address, password } })))
    const { token } = await json(await call(() => api.post(`${API}/token`, { data: { address, password } })))
    return new Mailbox(api, address, account.id, token)
  }

  private get auth() {
    return { Authorization: `Bearer ${this.token}` }
  }

  /**
   * Poll the inbox until a message matching `match` arrives, then return it in
   * full. Hand-polls (not expect.poll): "not there yet" is the normal path.
   */
  async waitForMessage(
    match: { subjectIncludes?: string; from?: string } = {},
    timeout = 120_000,
  ): Promise<Email> {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      const list = (await json(await call(() => this.api.get(`${API}/messages`, { headers: this.auth }))))[
        'hydra:member'
      ] as { id: string; from: { address: string }; subject: string }[]
      const hit = list.find(
        (m) =>
          (!match.subjectIncludes || m.subject.includes(match.subjectIncludes)) &&
          (!match.from || m.from.address === match.from),
      )
      if (hit) {
        const full = await json(await call(() => this.api.get(`${API}/messages/${hit.id}`, { headers: this.auth })))
        return {
          id: full.id,
          from: full.from.address,
          subject: full.subject,
          text: full.text ?? '',
          html: Array.isArray(full.html) ? full.html.join('') : (full.html ?? ''),
        }
      }
      await new Promise((r) => setTimeout(r, 3000))
    }
    throw new Error(`mail.tm: no message for ${this.address} matching ${JSON.stringify(match)} within ${timeout} ms`)
  }

  async dispose() {
    try {
      await this.api.delete(`${API}/accounts/${this.accountId}`, { headers: this.auth })
    } catch {
      /* best-effort: mail.tm also expires idle accounts */
    }
    await this.api.dispose()
  }
}

/** Retry a mail.tm call on 429 (rate limit, ~8 req/s) with a short backoff. */
async function call(fn: () => Promise<APIResponse>): Promise<APIResponse> {
  for (let attempt = 1; ; attempt++) {
    const res = await fn()
    if (res.status() !== 429 || attempt >= 5) {
      if (!res.ok()) {
        // Surface mail.tm's own reason (e.g. 422 violations) — the warning is
        // truncated, so put the human-readable part first.
        const body = await res.text()
        let reason = body
        try {
          const j = JSON.parse(body)
          reason = (j.violations || []).map((v: { propertyPath: string; message: string }) => `${v.propertyPath}: ${v.message}`).join('; ') || j.detail || j.message || body
        } catch {}
        throw new Error(`mail.tm ${res.status()} ${reason} (${res.url()})`)
      }
      return res
    }
    // Backoff only on the rare rate-limited branch, never on the happy path.
    await new Promise((r) => setTimeout(r, 1000 * attempt))
  }
}

async function json(res: APIResponse) {
  return res.json()
}

/** Fallback recipient when mail.tm is unavailable — reserved domain, never delivered. */
const FALLBACK_DOMAIN = 'example.com'

/**
 * Soft wrapper the `mailbox` fixture hands to tests.
 *  - `address` is always usable (mail.tm address, or a never-delivered
 *    example.com address when mail.tm could not be set up).
 *  - `receive()` returns the email, or null after recording a warning — it
 *    never throws for mail-infrastructure reasons.
 */
export class EmailChannel {
  private constructor(
    private readonly box: Mailbox | null,
    readonly address: string,
    private readonly testInfo: TestInfo,
  ) {}

  static async open(testInfo: TestInfo): Promise<EmailChannel> {
    try {
      const box = await Mailbox.create()
      return new EmailChannel(box, box.address, testInfo)
    } catch (e) {
      const ch = new EmailChannel(null, `${uniqueRef('bot')}@${FALLBACK_DOMAIN}`.toLowerCase(), testInfo)
      ch.warn(`สร้างกล่องอีเมลทดสอบ (mail.tm) ไม่ได้ — ข้ามการตรวจอีเมล: ${String(e).slice(0, 200)}`)
      return ch
    }
  }

  get available() {
    return this.box !== null
  }

  warn(description: string) {
    this.testInfo.annotations.push({ type: 'warning', description })
    // eslint-disable-next-line no-console
    console.warn(`[email warning] ${description}`)
  }

  async receive(match: { subjectIncludes?: string; from?: string } = {}, timeout = WAIT_MS): Promise<Email | null> {
    if (!this.box) return null
    try {
      return await test.step(`Email · wait for message to ${this.address}`, () => this.box!.waitForMessage(match, timeout))
    } catch (e) {
      this.warn(
        `ไม่มีอีเมลส่งเข้ามาที่ ${this.address} ภายใน ${Math.round(timeout / 1000)} วินาที ตามที่คาดหวังไว้ — ข้ามการตรวจเนื้อหาอีเมล (${String(e).slice(0, 200)})`,
      )
      return null
    }
  }

  async dispose() {
    await this.box?.dispose()
  }
}
