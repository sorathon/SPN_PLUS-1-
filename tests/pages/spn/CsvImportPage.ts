import { Page, Locator, FrameLocator, expect } from '@playwright/test'
import { SpnSession, serviceUrl, ajax } from './SpnApp'
import { CsvMapping, parseMappingForm } from '../../data/zero-default/csv'

/**
 * "นำเข้าข้อมูล Invoice จากไฟล์" block of the Add Invoice page (form3 in the detail
 * frame; Import and Export have the same block). The Mapping select decides the CSV
 * layout; choosing one loads its file input(s) into #maptypeDiv2 with a $.get.
 * Import sends the form to IMCORESERVICE/import_file, which answers
 * "Import file :: <name> :: success please check your invoice."
 */
export class CsvImportPage {
  readonly page: Page
  readonly detail: FrameLocator
  readonly form: Locator
  readonly mapping: Locator
  readonly fileInput: Locator
  readonly importButton: Locator

  constructor(page: Page) {
    this.page = page
    this.detail = page.frameLocator('#detailfrm')
    this.form = this.detail.locator('#form3')
    this.mapping = this.form.locator('select[name="mapName"]')
    this.fileInput = this.form.locator('input[name="fileDetail[]"]')
    this.importButton = this.form.locator('input[name="ImportFile"]')
  }

  /** Id (option value) of the mapping called `name` — null when the site has none. */
  async mappingId(name: string): Promise<string | null> {
    const values = await this.mapping.locator('option').evaluateAll(
      (opts, n) => opts.filter((o) => (o as HTMLOptionElement).text.trim() === n).map((o) => (o as HTMLOptionElement).value),
      name,
    )
    return values[0] ?? null
  }

  /** Read a mapping's columns from its edit form (GET only — the form is never submitted). */
  async readMapping(session: SpnSession, id: string, name: string): Promise<CsvMapping> {
    const res = await this.page.request.get(serviceUrl(session, { SERVICENAME: 'CONFMAPPING', ACTION: 'EDIT', SELITEM: `mapId:${id}`, ADVMODE: 'Y' }))
    if (!res.ok()) throw new Error(`mapping ${id} → HTTP ${res.status()}`)
    // TIS-620 page; keys and column numbers are ASCII
    return { id, name, fields: parseMappingForm((await res.body()).toString('latin1')) }
  }

  /**
   * Pick the mapping, attach the file, Import; returns the server's answer.
   * Import does not post the form: validateBeforeImport() sends it with an XHR (after a
   * 1 s delay) and writes the answer into the page body — so the answer is awaited, not
   * a reload. An import that takes long (master-file matching) gets 3 minutes.
   */
  async importFile(mappingId: string, file: string): Promise<string> {
    await this.mapping.selectOption(mappingId)
    await ajax(this.page).idle()
    await expect(this.fileInput.first(), 'CSV import · file input of the mapping is shown').toBeAttached()
    await this.fileInput.first().setInputFiles(file)
    const answer = this.page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.request().resourceType() === 'xhr' && r.url().includes('data_defaulttemplate.php'),
      { timeout: 180_000 },
    )
    await this.importButton.click()
    const text = await (await answer).text()
    await ajax(this.page).idle()
    return text
  }
}
