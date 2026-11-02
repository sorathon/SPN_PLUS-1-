import { test as base, Page } from '@playwright/test'
import { users, UserRole } from '../data/users'
import { spnSession } from '../data/session'
import { deleteDeclaration } from '../data/factories'
import { SpnSession, DialogLog, ajax, disablePrintDialog, SLOW_FACTOR } from '../pages/spn/SpnApp'
import { HomePage } from '../pages/spn/HomePage'
import { ImportListPage } from '../pages/spn/ImportListPage'
import { WorkspacePage } from '../pages/spn/WorkspacePage'
import { InvoicePage } from '../pages/spn/InvoicePage'
import { ItemPage } from '../pages/spn/ItemPage'
import { DeclarationViewPage } from '../pages/spn/DeclarationViewPage'

import { EmailChannel } from './mailbox'

/**
 * `mailbox`: a fresh mail.tm inbox per test for flows that send email (see
 * fixtures/mailbox.ts). Soft by design — mail-service problems only add a
 * "warning" annotation (shown in the QA report); tag such tests @email
 * (`npm run test:email` / `npm run test:no-email`).
 */
/**
 * `actAs(role)`: open the app as ANOTHER account (e.g. the recipient of a share) in its OWN
 * browser context — the documented exception to "one page per test". The session comes from
 * that account's storage state, written by its setup project (`setup-editor`, `setup-viewer`),
 * so the project running the test must list that setup project in `dependencies`.
 * `opts.initScript` runs before the app boots — for apps that keep their session in
 * sessionStorage (seed it from the localStorage value the storage state restores).
 * Contexts are closed after the test.
 */
type ActAs = (role: Exclude<UserRole, 'user1'>, opts?: { initScript?: string }) => Promise<Page>

/**
 * ShippingNet Pluz+ fixtures.
 * `spn`       — the saved session (UID/UCODE) of user1; pages are opened directly with it.
 *               Never log in again inside a test: one account has ONE session and a new
 *               login invalidates the saved UCODE for every later test.
 * `dialogs`   — records alert/confirm/prompt of the page and its frames; accepts by default.
 * `declarations` — `track(id)` every declaration a test creates; they are deleted after
 *               the test even when it fails.
 */
type Declarations = { track: (id: string) => void; ids: string[] }

export const test = base.extend<{
  mailbox: EmailChannel
  actAs: ActAs
  spn: SpnSession
  dialogs: DialogLog
  declarations: Declarations
  homePage: HomePage
  listPage: ImportListPage
  workspacePage: WorkspacePage
  invoicePage: InvoicePage
  itemPage: ItemPage
  viewPage: DeclarationViewPage
}>({
  mailbox: async ({}, use, testInfo) => {
    const channel = await EmailChannel.open(testInfo)
    await use(channel)
    await channel.dispose()
  },
  actAs: async ({ browser }, use) => {
    const contexts: import('@playwright/test').BrowserContext[] = []
    await use(async (role, opts = {}) => {
      const context = await browser.newContext({ storageState: users[role].statePath })
      contexts.push(context)
      // Manual contexts don't inherit the project's `use` bounds — apply them here.
      context.setDefaultTimeout(15_000)
      context.setDefaultNavigationTimeout(30_000)
      if (opts.initScript) await context.addInitScript(opts.initScript)
      return context.newPage()
    })
    for (const c of contexts) await c.close()
  },

  spn: async ({}, use) => {
    await use(spnSession('user1'))
  },
  // auto: every test gets the dialog recorder, the lookup counter and no print dialog —
  // also tests that never ask for `dialogs` (an unanswered print() blocks a headed run)
  dialogs: [
    async ({ page }, use, testInfo) => {
      testInfo.setTimeout(testInfo.timeout * SLOW_FACTOR) // a SLOW_MO run needs more time
      ajax(page) // start counting lookups before the first navigation
      await disablePrintDialog(page.context())
      const log = new DialogLog(page)
      await use(log)
      if (testInfo.status !== testInfo.expectedStatus && log.records.length) {
        await testInfo.attach('browser-dialogs.json', {
          body: JSON.stringify(log.records, null, 2), contentType: 'application/json',
        })
      }
    },
    { auto: true },
  ],
  declarations: async ({ page, spn }, use) => {
    const ids: string[] = []
    await use({ ids, track: (id) => void (ids.includes(id) || ids.push(id)) })
    for (const id of ids) {
      try {
        await deleteDeclaration(page, spn, id)
      } catch {
        // one failed cleanup must not fail the test — the record carries a PW job no.
      }
    }
  },
  homePage: async ({ page, dialogs: _ }, use) => {
    await use(new HomePage(page))
  },
  listPage: async ({ page, dialogs: _ }, use) => {
    await use(new ImportListPage(page))
  },
  workspacePage: async ({ page, dialogs: _ }, use) => {
    await use(new WorkspacePage(page))
  },
  invoicePage: async ({ page, dialogs: _ }, use) => {
    await use(new InvoicePage(page))
  },
  itemPage: async ({ page, dialogs: _ }, use) => {
    await use(new ItemPage(page))
  },
  viewPage: async ({ page, dialogs: _ }, use) => {
    await use(new DeclarationViewPage(page))
  },
})
export { expect } from '@playwright/test'
