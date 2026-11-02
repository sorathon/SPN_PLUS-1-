import { expect, Page } from '@playwright/test'
import { ajax, SpnSession, waitForReload } from '../spn/SpnApp'
import { GclListPage } from './GclListPage'
import { GclLookup, UPPER_LOOKUPS, selectGclToday } from './GclLookup'

export class GclNewPage {
  readonly list: GclListPage
  readonly lookup: GclLookup
  constructor(readonly page: Page) { this.list=new GclListPage(page); this.lookup=new GclLookup(page,page) }
  field(name: string) { return this.lookup.field(name) }
  async today() {return selectGclToday(this.page)}
  async wizard(session: SpnSession) {
    await this.list.open(session)
    await waitForReload(this.page,()=>this.page.locator('#newBTN').click())
    await expect(this.page.locator('#withDeclaRadio')).toBeChecked()
  }
  async open(session: SpnSession) {
    await this.wizard(session)
    await this.page.locator('#withoutDeclaRadio').check()
    await expect(this.field('INcompanyCode')).toBeVisible()
  }
  async fillUpper() {
    const selections=[]
    for (const name of UPPER_LOOKUPS) selections.push(await this.lookup.percent(name))
    return selections
  }
  async sourceSearch(ref: string, mode?: string) {
    if (mode) await this.page.locator('[name="transMode"]').selectOption(mode)
    await this.page.locator('[name="exRef"]').fill(ref)
    await this.page.locator('#searchBTN').click()
    await ajax(this.page).idle()
  }
  sourceRows() { return this.page.locator('tr:not(:has(tr))').filter({has:this.page.locator('input[name="Ex[]"]')}) }
  async createSelected() {
    await this.page.locator('#createBTN').click()
    await this.page.locator('#detailfrm').waitFor({timeout:45000})
  }
  async save() {
    await this.page.locator('#saveBTN').click()
    await this.page.locator('#detailfrm').waitFor({timeout:45000})
    await ajax(this.page).idle()
  }
}
