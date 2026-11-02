import { expect, Page } from '@playwright/test'
import { ajax, serviceUrl, SpnSession, waitForFrameReady, waitForReload } from '../spn/SpnApp'
import { GclLookup, selectGclToday, enterGclDeparture } from './GclLookup'
import { GclRecord } from './GclListPage'

export class GclWorkspacePage {
  readonly control
  readonly detail
  readonly lookup
  constructor(readonly page: Page) {
    this.control=page.frameLocator('#detailfrm')
    this.detail=this.control.frameLocator('#goodstransitiondetail')
    this.lookup=new GclLookup(page,this.control)
  }
  field(name:string) { return this.lookup.field(name) }
  async today() {return selectGclToday(this.control)}
  async ready() {
    await waitForFrameReady(this.page,'detailfrm')
    await waitForFrameReady(this.page,'goodstransitiondetail')
    await ajax(this.page).idle()
    await expect(this.field('vesselName')).toBeVisible()
  }
  async open(session:SpnSession, record:GclRecord) {
    await this.page.goto(serviceUrl(session,{SERVICENAME:'GOODSTRANSITIONCONTROL',ACTION:'WORKSPACE',SELITEM:`gtcid:${record.id}`}))
    await this.ready()
  }
  async record():Promise<GclRecord> {
    await this.ready()
    const id=decodeURIComponent(this.page.url()).match(/gtcid:(\d+)/i)?.[1]
    const reference=(await this.page.locator('body').innerText()).match(/\b[A-Z]{4}4\d{8}\b/)?.[0]
    if(!id || !reference) throw new Error('GCL workspace did not expose its id/reference')
    return {id,reference}
  }
  async save() {
    // GCL's legacy dirty tracking needs real key events before activating Save.
    const job=this.field('jobNo'),value=await job.inputValue()
    const date=await this.field('departureDate').inputValue()
    if(value){await job.fill('');await job.pressSequentially(value)}
    await job.press('Tab')
    if(date)await enterGclDeparture(this.control,date)
    // Wait for the EDIT response, then wait for both workspace frames to settle.
    // Callers reopen the reference to assert persistence after the actual form post.
    await waitForReload(this.page,()=>this.control.locator('#saveBTN').click(),'detailfrm')
    await this.ready()
  }
  async calculateVgm(gross='120',tare='20',lashing='2') {
    await this.control.locator('input#CalVGM').click()
    for(const [id,value]of Object.entries({calvgm_grossweight:gross,calvgm_tareweight:tare,calvgm_lashing:lashing})) {
      await this.control.locator('#'+id).fill(value);await this.control.locator('#'+id).press('Tab')
    }
    const computed=await this.control.locator('#calvgm_VGM').inputValue()
    await this.control.locator('#sum_VGM').click()
    await expect(this.field('totalGrossWeight')).toHaveValue(computed)
    return computed
  }
  async prepareContainer() {
    await this.field('containerStatus').selectOption('8')
    await this.field('containerNo').fill('CSNU8975008');await this.field('containerNo').press('Tab')
    const type=await this.lookup.percent('containerTypeCode2')
    expect(type.outcome,'Container type master must contain a first row').toBe('selected')
    await this.field('containerIndicator').selectOption('1')
    const operator=await this.lookup.percent('containerOperatorCode')
    expect(operator.outcome,'Container operator master must contain a first row').toBe('selected')
    await this.field('bookingNumber').fill('PW-BOOKING')
    await this.field('reeferAsDry').selectOption('Y')
    await this.calculateVgm()
  }
  rows() { return this.detail.locator('tr:not(:has(tr))').filter({has:this.detail.locator('input[name="SYS_DEL[]"]')}) }
  rowField(name:string,index=0) { return this.rows().nth(index).locator(`[name="ins_${name}[]"]`) }
  async data() {
    const rows=[]
    for(const row of await this.rows().all()) {
      const cells=row.locator(':scope > td')
      const values:Record<string,string>={}
      for(const name of ['orderbyItemNo','description','realPackage','realGrossWeight','itemMasterBillOfLading','itemHouseBillOfLading','invoiceNo','notation'])
        values[name]=await row.locator(`[name="ins_${name}[]"]`).inputValue()
      for(const [name,i] of Object.entries({source:2,declaration:3,packageUnit:6,weightUnit:8,tax:9,branch:10}))
        {const cell=cells.nth(i),input=cell.locator('input:not([type=hidden]),textarea,select').first();values[name]=await input.count()?await input.inputValue():(await cell.innerText()).replace(/\s+/g,' ').trim()}
      rows.push(values)
    }
    return rows
  }
  /** Compatibility for Export → Create GCL checks; the workspace belongs to GCL. */
  async read() {
    const record=await this.record(),rows=await this.data()
    expect(rows,'Export integration fixture has exactly one GCL Detail').toHaveLength(1)
    const d=rows[0]
    const control=await this.lookup.snapshot(['INcompanyCode','transportMode','departureDate','vesselName','voyage','releasePort','loadPort'])
    return {id:`gtcid:${record.id}`,control,row:{exportReference:d.source,declaration:d.declaration,
      description:d.description,packages:d.realPackage,packageUnit:d.packageUnit,grossWeight:d.realGrossWeight,
      weightUnit:d.weightUnit,exporterTax:d.tax,exporterBranch:d.branch,mawb:d.itemMasterBillOfLading,
      hawb:d.itemHouseBillOfLading,invoice:d.invoiceNo}}
  }
  async addPage() {
    await this.control.locator('#addDetail').click()
    await expect(this.control.locator('#createBTN'), 'Add Detail response is rendered before choosing sources').toBeVisible({timeout:45_000})
  }
  sourceRows() { return this.control.locator('tr:not(:has(tr))').filter({has:this.control.locator('input[name="Ex[]"]')}) }
  async addSelected() {
    await this.control.locator('#createBTN').click()
    await expect(this.control.locator('#createBTN')).not.toBeVisible({timeout:60_000})
    await this.ready()
  }
  async newRows(count:string) {
    // Current positive cases need only 1 or 2 rows. Reject malformed/large
    // counts before they can reach the server's unbounded New Row handler.
    if(!/^[1-3]$/.test(count))throw new Error('Automation New Row limit: an integer from 1 to 3 only')
    const before=await this.rows().count()
    await this.detail.locator('[name="rowDetail"]').fill(count)
    await this.detail.locator('[name="newRowDetail"]').click()
    await expect.poll(()=>this.rows().count(),{timeout:60_000,message:'Requested GCL Detail rows are loaded'}).toBe(before+Number(count))
  }
  async deleteSelectedDetails() {
    const response=this.page.waitForResponse(r=>{
      if(r.request().method()!=='POST')return false
      const request=r.request(),text=request.url()+' '+(request.postData() || '')
      return /goodstransitiondetail/i.test(text) && /(?:ACTION=|name="ACTION"\r\n\r\n)delete/i.test(text)
    },{timeout:15000})
    await this.detail.locator('[name="deleteDetail"]').click()
    const result=await response;await result.finished()
    expect(result.ok(),'Detail Delete completed before deleting its GCL Header').toBe(true)
    // Legacy Delete can return an empty child frame. Reopen the workspace
    // before checking persisted rows instead of waiting for controls in that response.
    await this.page.reload({waitUntil:'domcontentloaded'})
    await this.ready()
  }
  async note() { await this.control.locator('#extranoteBTN').click(); await expect(this.control.locator('#ins_note')).toBeVisible() }
  async idle() { await ajax(this.page).idle() }
}
