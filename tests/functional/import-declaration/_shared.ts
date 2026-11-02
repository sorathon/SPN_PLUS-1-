import { test as base } from '../../fixtures'
import { declarationHeader, invoiceData, itemData, deleteDeclaration } from '../../data/factories'
import { users } from '../../data/users'
import { spnSession } from '../../data/session'
import { SpnSession, DialogLog, ajax, SLOW_FACTOR } from '../../pages/spn/SpnApp'
import { ImportListPage } from '../../pages/spn/ImportListPage'
import { WorkspacePage, DeclarationHeader, PickedHeader, ImporterInfo } from '../../pages/spn/WorkspacePage'
import { InvoicePage, InvoiceData, ConsignorInfo } from '../../pages/spn/InvoicePage'
import { ItemPage, ItemData } from '../../pages/spn/ItemPage'

/**
 * UI set-up shared by the Import Declaration specs. The app has no API, so a
 * declaration is created the way a user does it: F7 [New] on the list, then the
 * header form; every created id is handed to `track` for teardown.
 */
export type Created = { id: string; referenceNo: string }

export async function createDraft(
  listPage: ImportListPage,
  workspacePage: WorkspacePage,
  spn: SpnSession,
  track: (id: string) => void,
): Promise<Created> {
  await listPage.open(spn)
  await listPage.createNew()
  const id = workspacePage.idFromUrl()
  track(id)
  await workspacePage.waitForDetail()
  const referenceNo = (await workspacePage.referenceNo.innerText()).trim()
  return { id, referenceNo }
}

export async function createDeclaration(
  listPage: ImportListPage,
  workspacePage: WorkspacePage,
  spn: SpnSession,
  track: (id: string) => void,
  header: DeclarationHeader = declarationHeader(),
): Promise<Created & { header: DeclarationHeader; picked: PickedHeader }> {
  const created = await createDraft(listPage, workspacePage, spn, track)
  const picked = await workspacePage.fillHeader(header)
  await workspacePage.save()
  return { ...created, header, picked }
}

/** Add Invoice → new invoice → save → fill item 0001 → save. */
export async function addInvoiceWithItem(
  workspacePage: WorkspacePage,
  invoicePage: InvoicePage,
  itemPage: ItemPage,
  invoice: InvoiceData = invoiceData(),
  item: ItemData = itemData(),
): Promise<{ invoice: InvoiceData; consignor: ConsignorInfo; item: ItemData }> {
  await workspacePage.openAddInvoice()
  await invoicePage.startNewInvoice()
  const consignor = await invoicePage.fill(invoice)
  await invoicePage.save()
  await itemPage.fill(item)
  await itemPage.save()
  return { invoice, consignor, item }
}

export type SharedDeclaration = Created & {
  header: DeclarationHeader
  picked: PickedHeader
  invoice: InvoiceData
  consignor: ConsignorInfo
  item: ItemData
}

/**
 * `sharedDeclaration` — ONE complete declaration (header + invoice + item) for the
 * read-only groups (list search/filter, print & export) — they only read it, so it is
 * built once per worker instead of per test, and deleted when the worker ends.
 * Built in its own browser context (worker fixtures can't use the test's page); it
 * reuses user1's saved session, so the test pages see the same data.
 */
/** An existing declaration with status "เอกสารพร้อมส่ง" (VALIDATED) — null when the site has none. */
export type ValidatedDeclaration = { id: string; referenceNo: string; importer: ImporterInfo } | null

export const test = base.extend<object, { sharedDeclaration: SharedDeclaration; validatedDeclaration: ValidatedDeclaration }>({
  /**
   * `validatedDeclaration` — the first declaration the list shows for Status "เอกสารพร้อมส่ง".
   * Some print forms (ใบนำคีย์ …) only work once a declaration has passed validation, and
   * a self-made draft can't be brought there without sending anything — so an existing
   * one is used, READ-ONLY: it is opened, never saved, copied or deleted.
   */
  validatedDeclaration: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ storageState: users.user1.statePath })
      context.setDefaultTimeout(15_000)
      context.setDefaultNavigationTimeout(30_000)
      const page = await context.newPage()
      new DialogLog(page)
      ajax(page)
      const spn = spnSession('user1')
      const listPage = new ImportListPage(page)
      await listPage.open(spn)
      await listPage.search({ status: 'VALIDATED' })
      const refs = await listPage.referenceNumbers()
      let found: ValidatedDeclaration = null
      if (refs.length > 0) {
        const id = await listPage.idOf(refs[0])
        const workspacePage = new WorkspacePage(page)
        await workspacePage.open(spn, id) // read only — no save
        found = { id, referenceNo: refs[0], importer: await workspacePage.readImporter() }
      }
      await context.close()
      await use(found)
    },
    { scope: 'worker', timeout: 120_000 * SLOW_FACTOR },
  ],
  sharedDeclaration: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ storageState: users.user1.statePath })
      // manual contexts don't inherit the project's `use` bounds — apply them here
      context.setDefaultTimeout(15_000)
      context.setDefaultNavigationTimeout(30_000)
      const page = await context.newPage()
      new DialogLog(page)
      ajax(page)
      const spn = spnSession('user1')
      const ids: string[] = []
      const workspacePage = new WorkspacePage(page)
      const created = await createDeclaration(new ImportListPage(page), workspacePage, spn, (id) => ids.push(id))
      const lines = await addInvoiceWithItem(workspacePage, new InvoicePage(page), new ItemPage(page))
      await use({ ...created, ...lines })
      for (const id of ids) {
        try {
          await deleteDeclaration(page, spn, id)
        } catch {
          // cleanup miss must not fail the run — the record carries a PW job no.
        }
      }
      await context.close()
    },
    { scope: 'worker', timeout: 240_000 * SLOW_FACTOR },
  ],
})
export { expect } from '../../fixtures'
