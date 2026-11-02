# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional\gcl\detail.spec.ts >> GCL · Detail/source/totals >> TC-GCL-082: adding two sources keeps each Detail linked correctly @regression
- Location: functional\gcl\detail.spec.ts:22:6

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#detailfrm').contentFrame().locator('#createBTN')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#detailfrm').contentFrame().locator('#createBTN')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - table [ref=e3]:
      - rowgroup [ref=e4]:
        - 'row "F7 [ New ] Copy Filter Name : ไม่ใช้ Filter ค้นหา จาก เลขที่ใบกำกับ Status Please Select Search Goods Transition Control" [ref=e5]':
          - 'cell "F7 [ New ] Copy Filter Name : ไม่ใช้ Filter ค้นหา จาก เลขที่ใบกำกับ Status Please Select Search" [ref=e6]':
            - generic [ref=e7]:
              - button "F7 [ New ]" [ref=e8]
              - button "Copy" [ref=e9]
              - text: "Filter Name :"
              - combobox [ref=e10]:
                - option "ไม่ใช้ Filter" [selected]
                - option "ใบกำกับการขนที่เป็นเจ้าของ"
                - option "ใบกำกับการขนที่ทำในวันนี้"
              - text: ค้นหา
              - textbox [ref=e11]
              - text: จาก
              - combobox [ref=e12]:
                - option "เลขที่ใบกำกับ" [selected]
                - option "Tax ID"
                - option "บริษัท"
                - option "เลขที่รับงาน"
                - option "ชื่อยานพาหนะ"
                - option "หมายเลขตู้"
                - option "Ref ใบขนขาออก"
                - option "เลขที่ส่งยกเลิก"
            - generic [ref=e13]:
              - text: Status
              - combobox [ref=e14]:
                - option "Please Select" [selected]
                - option "Customs Accept"
                - option "Declaration Canceled"
                - option "GOODS CHECKED"
                - option "Error Schema"
                - option "Draft Document"
                - option "Customs Reject"
                - option "Waiting Response"
                - option "เอกสารพร้อมส่ง"
                - option "Cancel Draft"
            - button "Search" [active] [ref=e16]
          - cell "Goods Transition Control" [ref=e17]:
            - table [ref=e19]:
              - rowgroup [ref=e20]:
                - row "Goods Transition Control" [ref=e21]:
                  - cell [ref=e22]:
                    - img [ref=e23]
                  - cell "Goods Transition Control" [ref=e24]:
                    - generic [ref=e26]: Goods Transition Control
        - 'row "Reference No: Departure Date: F2 To F2 แสดง 15 รายการ Import Data.dat Choose File Import" [ref=e27]':
          - 'cell "Reference No: Departure Date: F2 To F2 แสดง 15 รายการ Import Data.dat Choose File Import" [ref=e28]':
            - table [ref=e29]:
              - rowgroup [ref=e30]:
                - 'row "Reference No: Departure Date: F2 To F2 แสดง 15 รายการ Import Data.dat Choose File Import" [ref=e31]':
                  - 'cell "Reference No: Departure Date: F2 To F2 แสดง 15 รายการ Import Data.dat Choose File Import" [ref=e32]':
                    - table [ref=e33]:
                      - rowgroup [ref=e34]:
                        - 'row "Reference No: Departure Date: F2 To F2 แสดง 15 รายการ Import Data.dat Choose File Import" [ref=e35]':
                          - cell "Reference No:" [ref=e36]
                          - cell [ref=e37]:
                            - textbox [ref=e39]
                          - 'cell "Departure Date: F2 To F2" [ref=e40]':
                            - generic [ref=e41]:
                              - combobox [ref=e42]:
                                - option "Departure Date:" [selected]
                                - option "Cancel Date:"
                              - textbox [ref=e43]
                              - button "F2" [ref=e44]
                              - text: To
                              - textbox [ref=e45]
                              - button "F2" [ref=e46]
                          - cell "แสดง 15 รายการ" [ref=e47]:
                            - text: แสดง
                            - combobox [ref=e48]:
                              - option "15" [selected]
                              - option "30"
                              - option "50"
                              - option "100"
                              - option "200"
                            - text: รายการ
                          - cell "Import Data.dat Choose File Import" [ref=e49]:
                            - generic [ref=e50]: Import Data.dat
                            - button "Choose File" [ref=e51]
                            - button "Import" [ref=e52]
                - row [ref=e53]:
                  - cell [ref=e54]
                - row [ref=e55]:
                  - cell [ref=e56]
    - table [ref=e57]:
      - rowgroup [ref=e58]:
        - row "ACTION STATUS REFERENCE NO GCL NO JOB NO COMPANY NAME VESSEL NAME CONTAINER NO DEPARTURE DATE RELEASE PORT" [ref=e59]:
          - cell "ACTION" [ref=e60]:
            - generic [ref=e62]:
              - checkbox [ref=e63]
              - text: ACTION
          - cell "STATUS" [ref=e64]:
            - generic [ref=e65]: STATUS
          - cell "REFERENCE NO" [ref=e66]:
            - generic [ref=e67]: REFERENCE NO
          - cell "GCL NO" [ref=e68]:
            - generic [ref=e69]: GCL NO
          - cell "JOB NO" [ref=e70]:
            - generic [ref=e71]: JOB NO
          - cell "COMPANY NAME" [ref=e72]:
            - generic [ref=e73]: COMPANY NAME
          - cell "VESSEL NAME" [ref=e74]:
            - generic [ref=e75]: VESSEL NAME
          - cell "CONTAINER NO" [ref=e76]:
            - generic [ref=e77]: CONTAINER NO
          - cell "DEPARTURE DATE" [ref=e78]:
            - generic [ref=e79]: DEPARTURE DATE
          - cell "RELEASE PORT" [ref=e80]:
            - generic [ref=e81]: RELEASE PORT
      - rowgroup [ref=e82]:
        - row "Print Event Delete HQVM400001893 test TEST 0001 2026-10-30 0002" [ref=e83]:
          - cell "Print Event Delete" [ref=e84]:
            - checkbox [ref=e85]
            - img "Print" [ref=e86] [cursor=pointer]
            - img "Event" [ref=e87] [cursor=pointer]
            - img "Delete" [ref=e88] [cursor=pointer]
          - cell [ref=e89]:
            - img [ref=e91] [cursor=pointer]
          - cell "HQVM400001893" [ref=e92]:
            - generic [ref=e93] [cursor=pointer]: HQVM400001893
          - cell [ref=e94]
          - cell [ref=e95]
          - cell "test" [ref=e96]
          - cell "TEST 0001" [ref=e97]
          - cell [ref=e98]
          - cell "2026-10-30" [ref=e99]
          - cell "0002" [ref=e100]
        - row "Print Event Delete HQVM400001853 test TEST 0001 TH12032023002 2023-08-15 0002" [ref=e101]:
          - cell "Print Event Delete" [ref=e102]:
            - checkbox [ref=e103]
            - img "Print" [ref=e104] [cursor=pointer]
            - img "Event" [ref=e105] [cursor=pointer]
            - img "Delete" [ref=e106] [cursor=pointer]
          - cell [ref=e107]:
            - img [ref=e109] [cursor=pointer]
          - cell "HQVM400001853" [ref=e110]:
            - generic [ref=e111] [cursor=pointer]: HQVM400001853
          - cell [ref=e112]
          - cell [ref=e113]
          - cell "test" [ref=e114]
          - cell "TEST 0001" [ref=e115]
          - cell "TH12032023002" [ref=e116]
          - cell "2023-08-15" [ref=e117]
          - cell "0002" [ref=e118]
        - row "Print Event Delete HQVM400001869 TH12032023002 2023-08-15" [ref=e119]:
          - cell "Print Event Delete" [ref=e120]:
            - checkbox [ref=e121]
            - img "Print" [ref=e122] [cursor=pointer]
            - img "Event" [ref=e123] [cursor=pointer]
            - img "Delete" [ref=e124] [cursor=pointer]
          - cell [ref=e125]:
            - img [ref=e127] [cursor=pointer]
          - cell "HQVM400001869" [ref=e128]:
            - generic [ref=e129] [cursor=pointer]: HQVM400001869
          - cell [ref=e130]
          - cell [ref=e131]
          - cell [ref=e132]
          - cell [ref=e133]
          - cell "TH12032023002" [ref=e134]
          - cell "2023-08-15" [ref=e135]
          - cell [ref=e136]
        - row "Print Event Delete HQVM400001813 PW-GCL-COPYKRBDRL test TEST 0001 2026-10-30 2801" [ref=e137]:
          - cell "Print Event Delete" [ref=e138]:
            - checkbox [ref=e139]
            - img "Print" [ref=e140] [cursor=pointer]
            - img "Event" [ref=e141] [cursor=pointer]
            - img "Delete" [ref=e142] [cursor=pointer]
          - cell [ref=e143]:
            - img [ref=e145] [cursor=pointer]
          - cell "HQVM400001813" [ref=e146]:
            - generic [ref=e147] [cursor=pointer]: HQVM400001813
          - cell [ref=e148]
          - cell "PW-GCL-COPYKRBDRL" [ref=e149]
          - cell "test" [ref=e150]
          - cell "TEST 0001" [ref=e151]
          - cell [ref=e152]
          - cell "2026-10-30" [ref=e153]
          - cell "2801" [ref=e154]
        - row "Print Event Delete HQVM400001805 test TEST 0001 2801" [ref=e155]:
          - cell "Print Event Delete" [ref=e156]:
            - checkbox [ref=e157]
            - img "Print" [ref=e158] [cursor=pointer]
            - img "Event" [ref=e159] [cursor=pointer]
            - img "Delete" [ref=e160] [cursor=pointer]
          - cell [ref=e161]:
            - img [ref=e163] [cursor=pointer]
          - cell "HQVM400001805" [ref=e164]:
            - generic [ref=e165] [cursor=pointer]: HQVM400001805
          - cell [ref=e166]
          - cell [ref=e167]
          - cell "test" [ref=e168]
          - cell "TEST 0001" [ref=e169]
          - cell [ref=e170]
          - cell [ref=e171]
          - cell "2801" [ref=e172]
        - row "Print Event Delete HQVM400001804" [ref=e173]:
          - cell "Print Event Delete" [ref=e174]:
            - checkbox [ref=e175]
            - img "Print" [ref=e176] [cursor=pointer]
            - img "Event" [ref=e177] [cursor=pointer]
            - img "Delete" [ref=e178] [cursor=pointer]
          - cell [ref=e179]:
            - img [ref=e181] [cursor=pointer]
          - cell "HQVM400001804" [ref=e182]:
            - generic [ref=e183] [cursor=pointer]: HQVM400001804
          - cell [ref=e184]
          - cell [ref=e185]
          - cell [ref=e186]
          - cell [ref=e187]
          - cell [ref=e188]
          - cell [ref=e189]
          - cell [ref=e190]
        - row "Print Event Delete HQVM400001803 test TEST 0001 2801" [ref=e191]:
          - cell "Print Event Delete" [ref=e192]:
            - checkbox [ref=e193]
            - img "Print" [ref=e194] [cursor=pointer]
            - img "Event" [ref=e195] [cursor=pointer]
            - img "Delete" [ref=e196] [cursor=pointer]
          - cell [ref=e197]:
            - img [ref=e199] [cursor=pointer]
          - cell "HQVM400001803" [ref=e200]:
            - generic [ref=e201] [cursor=pointer]: HQVM400001803
          - cell [ref=e202]
          - cell [ref=e203]
          - cell "test" [ref=e204]
          - cell "TEST 0001" [ref=e205]
          - cell [ref=e206]
          - cell [ref=e207]
          - cell "2801" [ref=e208]
        - row "Print Event Delete HQVM400001788 test TEST 0001 2801" [ref=e209]:
          - cell "Print Event Delete" [ref=e210]:
            - checkbox [ref=e211]
            - img "Print" [ref=e212] [cursor=pointer]
            - img "Event" [ref=e213] [cursor=pointer]
            - img "Delete" [ref=e214] [cursor=pointer]
          - cell [ref=e215]:
            - img [ref=e217] [cursor=pointer]
          - cell "HQVM400001788" [ref=e218]:
            - generic [ref=e219] [cursor=pointer]: HQVM400001788
          - cell [ref=e220]
          - cell [ref=e221]
          - cell "test" [ref=e222]
          - cell "TEST 0001" [ref=e223]
          - cell [ref=e224]
          - cell [ref=e225]
          - cell "2801" [ref=e226]
        - row "Print Event Delete HQVM400001787 jobno Netbay RTCFLIGHT SITU2886175 19/10/2026 1193" [ref=e227]:
          - cell "Print Event Delete" [ref=e228]:
            - checkbox [ref=e229]
            - img "Print" [ref=e230] [cursor=pointer]
            - img "Event" [ref=e231] [cursor=pointer]
            - img "Delete" [ref=e232] [cursor=pointer]
          - cell [ref=e233]:
            - img [ref=e235] [cursor=pointer]
          - cell "HQVM400001787" [ref=e236]:
            - generic [ref=e237] [cursor=pointer]: HQVM400001787
          - cell [ref=e238]
          - cell "jobno" [ref=e239]
          - cell "Netbay" [ref=e240]
          - cell "RTCFLIGHT" [ref=e241]
          - cell "SITU2886175" [ref=e242]
          - cell "19/10/2026" [ref=e243]
          - cell "1193" [ref=e244]
        - row "Print Event Delete HQVM400001786 jobno Netbay RTCFLIGHT SITU2886175 19/10/2026 1193" [ref=e245]:
          - cell "Print Event Delete" [ref=e246]:
            - checkbox [ref=e247]
            - img "Print" [ref=e248] [cursor=pointer]
            - img "Event" [ref=e249] [cursor=pointer]
            - img "Delete" [ref=e250] [cursor=pointer]
          - cell [ref=e251]:
            - img [ref=e253] [cursor=pointer]
          - cell "HQVM400001786" [ref=e254]:
            - generic [ref=e255] [cursor=pointer]: HQVM400001786
          - cell [ref=e256]
          - cell "jobno" [ref=e257]
          - cell "Netbay" [ref=e258]
          - cell "RTCFLIGHT" [ref=e259]
          - cell "SITU2886175" [ref=e260]
          - cell "19/10/2026" [ref=e261]
          - cell "1193" [ref=e262]
        - row "Print Event Delete HQVM400001752 PW-GCLSUA7NIJ8S test TEST 0001 2026-10-29 2801" [ref=e263]:
          - cell "Print Event Delete" [ref=e264]:
            - checkbox [ref=e265]
            - img "Print" [ref=e266] [cursor=pointer]
            - img "Event" [ref=e267] [cursor=pointer]
            - img "Delete" [ref=e268] [cursor=pointer]
          - cell [ref=e269]:
            - img [ref=e271] [cursor=pointer]
          - cell "HQVM400001752" [ref=e272]:
            - generic [ref=e273] [cursor=pointer]: HQVM400001752
          - cell [ref=e274]
          - cell "PW-GCLSUA7NIJ8S" [ref=e275]
          - cell "test" [ref=e276]
          - cell "TEST 0001" [ref=e277]
          - cell [ref=e278]
          - cell "2026-10-29" [ref=e279]
          - cell "2801" [ref=e280]
        - row "Print Event Delete HQVM400001725 test TEST 0001 2801" [ref=e281]:
          - cell "Print Event Delete" [ref=e282]:
            - checkbox [ref=e283]
            - img "Print" [ref=e284] [cursor=pointer]
            - img "Event" [ref=e285] [cursor=pointer]
            - img "Delete" [ref=e286] [cursor=pointer]
          - cell [ref=e287]:
            - img [ref=e289] [cursor=pointer]
          - cell "HQVM400001725" [ref=e290]:
            - generic [ref=e291] [cursor=pointer]: HQVM400001725
          - cell [ref=e292]
          - cell [ref=e293]
          - cell "test" [ref=e294]
          - cell "TEST 0001" [ref=e295]
          - cell [ref=e296]
          - cell [ref=e297]
          - cell "2801" [ref=e298]
        - row "Print Event Delete HQVM400001679 test TEST 0001 2801" [ref=e299]:
          - cell "Print Event Delete" [ref=e300]:
            - checkbox [ref=e301]
            - img "Print" [ref=e302] [cursor=pointer]
            - img "Event" [ref=e303] [cursor=pointer]
            - img "Delete" [ref=e304] [cursor=pointer]
          - cell [ref=e305]:
            - img [ref=e307] [cursor=pointer]
          - cell "HQVM400001679" [ref=e308]:
            - generic [ref=e309] [cursor=pointer]: HQVM400001679
          - cell [ref=e310]
          - cell [ref=e311]
          - cell "test" [ref=e312]
          - cell "TEST 0001" [ref=e313]
          - cell [ref=e314]
          - cell [ref=e315]
          - cell "2801" [ref=e316]
        - row "Print Event Delete HQVM400001678 test TEST 0001 2801" [ref=e317]:
          - cell "Print Event Delete" [ref=e318]:
            - checkbox [ref=e319]
            - img "Print" [ref=e320] [cursor=pointer]
            - img "Event" [ref=e321] [cursor=pointer]
            - img "Delete" [ref=e322] [cursor=pointer]
          - cell [ref=e323]:
            - img [ref=e325] [cursor=pointer]
          - cell "HQVM400001678" [ref=e326]:
            - generic [ref=e327] [cursor=pointer]: HQVM400001678
          - cell [ref=e328]
          - cell [ref=e329]
          - cell "test" [ref=e330]
          - cell "TEST 0001" [ref=e331]
          - cell [ref=e332]
          - cell [ref=e333]
          - cell "2801" [ref=e334]
        - row "Print Event Delete HQVM400001677 test TEST 0001 2801" [ref=e335]:
          - cell "Print Event Delete" [ref=e336]:
            - checkbox [ref=e337]
            - img "Print" [ref=e338] [cursor=pointer]
            - img "Event" [ref=e339] [cursor=pointer]
            - img "Delete" [ref=e340] [cursor=pointer]
          - cell [ref=e341]:
            - img [ref=e343] [cursor=pointer]
          - cell "HQVM400001677" [ref=e344]:
            - generic [ref=e345] [cursor=pointer]: HQVM400001677
          - cell [ref=e346]
          - cell [ref=e347]
          - cell "test" [ref=e348]
          - cell "TEST 0001" [ref=e349]
          - cell [ref=e350]
          - cell [ref=e351]
          - cell "2801" [ref=e352]
      - rowgroup [ref=e353]:
        - row "Save XML Save PDF Next" [ref=e354]:
          - cell "Save XML Save PDF Next" [ref=e355]:
            - table [ref=e356]:
              - rowgroup [ref=e357]:
                - row "Save XML Save PDF Next" [ref=e358]:
                  - cell "Save XML Save PDF" [ref=e359]:
                    - button "Save XML" [ref=e360]
                    - button "Save PDF" [ref=e361]
                  - cell "Next" [ref=e362]:
                    - link "Next" [ref=e364] [cursor=pointer]:
                      - /url: /support/IE5DEV.shippingnet/data_defaulttemplate.php?UID=730&UCODE=R1Hhkv24jE0NKHC1h3v3W9qHY9K0F7gJ2l5wwVHopRkC50bxKKwEkDX&SERVICENAME=goodstransitioncontrol&ACTION=MAIN&sREF=&BY=&sFROM=&sTO=&FILTER=&KEYWORD=&sStatus=&slimit=15&page=1
                      - img "Next" [ref=e365]
  - generic [ref=e366]: Version 0.0 (2010-12-15 15:41:47)
```

# Test source

```ts
  1   | import { expect, Page } from '@playwright/test'
  2   | import { ajax, serviceUrl, SpnSession, waitForFrameReady, waitForReload } from '../spn/SpnApp'
  3   | import { GclLookup, selectGclToday, enterGclDeparture } from './GclLookup'
  4   | import { GclRecord } from './GclListPage'
  5   | 
  6   | export class GclWorkspacePage {
  7   |   readonly control
  8   |   readonly detail
  9   |   readonly lookup
  10  |   constructor(readonly page: Page) {
  11  |     this.control=page.frameLocator('#detailfrm')
  12  |     this.detail=this.control.frameLocator('#goodstransitiondetail')
  13  |     this.lookup=new GclLookup(page,this.control)
  14  |   }
  15  |   field(name:string) { return this.lookup.field(name) }
  16  |   async today() {return selectGclToday(this.control)}
  17  |   async ready() {
  18  |     await waitForFrameReady(this.page,'detailfrm')
  19  |     await waitForFrameReady(this.page,'goodstransitiondetail')
  20  |     await ajax(this.page).idle()
  21  |     await expect(this.field('vesselName')).toBeVisible()
  22  |   }
  23  |   async open(session:SpnSession, record:GclRecord) {
  24  |     await this.page.goto(serviceUrl(session,{SERVICENAME:'GOODSTRANSITIONCONTROL',ACTION:'WORKSPACE',SELITEM:`gtcid:${record.id}`}))
  25  |     await this.ready()
  26  |   }
  27  |   async record():Promise<GclRecord> {
  28  |     await this.ready()
  29  |     const id=decodeURIComponent(this.page.url()).match(/gtcid:(\d+)/i)?.[1]
  30  |     const reference=(await this.page.locator('body').innerText()).match(/\b[A-Z]{4}4\d{8}\b/)?.[0]
  31  |     if(!id || !reference) throw new Error('GCL workspace did not expose its id/reference')
  32  |     return {id,reference}
  33  |   }
  34  |   async save() {
  35  |     // GCL's legacy dirty tracking needs real key events before activating Save.
  36  |     const job=this.field('jobNo'),value=await job.inputValue()
  37  |     const date=await this.field('departureDate').inputValue()
  38  |     if(value){await job.fill('');await job.pressSequentially(value)}
  39  |     await job.press('Tab')
  40  |     if(date)await enterGclDeparture(this.control,date)
  41  |     // Wait for the EDIT response, then wait for both workspace frames to settle.
  42  |     // Callers reopen the reference to assert persistence after the actual form post.
  43  |     await waitForReload(this.page,()=>this.control.locator('#saveBTN').click(),'detailfrm')
  44  |     await this.ready()
  45  |   }
  46  |   async calculateVgm(gross='120',tare='20',lashing='2') {
  47  |     await this.control.locator('input#CalVGM').click()
  48  |     for(const [id,value]of Object.entries({calvgm_grossweight:gross,calvgm_tareweight:tare,calvgm_lashing:lashing})) {
  49  |       await this.control.locator('#'+id).fill(value);await this.control.locator('#'+id).press('Tab')
  50  |     }
  51  |     const computed=await this.control.locator('#calvgm_VGM').inputValue()
  52  |     await this.control.locator('#sum_VGM').click()
  53  |     await expect(this.field('totalGrossWeight')).toHaveValue(computed)
  54  |     return computed
  55  |   }
  56  |   async prepareContainer() {
  57  |     await this.field('containerStatus').selectOption('8')
  58  |     await this.field('containerNo').fill('CSNU8975008');await this.field('containerNo').press('Tab')
  59  |     const type=await this.lookup.percent('containerTypeCode2')
  60  |     expect(type.outcome,'Container type master must contain a first row').toBe('selected')
  61  |     await this.field('containerIndicator').selectOption('1')
  62  |     const operator=await this.lookup.percent('containerOperatorCode')
  63  |     expect(operator.outcome,'Container operator master must contain a first row').toBe('selected')
  64  |     await this.field('bookingNumber').fill('PW-BOOKING')
  65  |     await this.field('reeferAsDry').selectOption('Y')
  66  |     await this.calculateVgm()
  67  |   }
  68  |   rows() { return this.detail.locator('tr:not(:has(tr))').filter({has:this.detail.locator('input[name="SYS_DEL[]"]')}) }
  69  |   rowField(name:string,index=0) { return this.rows().nth(index).locator(`[name="ins_${name}[]"]`) }
  70  |   async data() {
  71  |     const rows=[]
  72  |     for(const row of await this.rows().all()) {
  73  |       const cells=row.locator(':scope > td')
  74  |       const values:Record<string,string>={}
  75  |       for(const name of ['orderbyItemNo','description','realPackage','realGrossWeight','itemMasterBillOfLading','itemHouseBillOfLading','invoiceNo','notation'])
  76  |         values[name]=await row.locator(`[name="ins_${name}[]"]`).inputValue()
  77  |       for(const [name,i] of Object.entries({source:2,declaration:3,packageUnit:6,weightUnit:8,tax:9,branch:10}))
  78  |         {const cell=cells.nth(i),input=cell.locator('input:not([type=hidden]),textarea,select').first();values[name]=await input.count()?await input.inputValue():(await cell.innerText()).replace(/\s+/g,' ').trim()}
  79  |       rows.push(values)
  80  |     }
  81  |     return rows
  82  |   }
  83  |   /** Compatibility for Export → Create GCL checks; the workspace belongs to GCL. */
  84  |   async read() {
  85  |     const record=await this.record(),rows=await this.data()
  86  |     expect(rows,'Export integration fixture has exactly one GCL Detail').toHaveLength(1)
  87  |     const d=rows[0]
  88  |     const control=await this.lookup.snapshot(['INcompanyCode','transportMode','departureDate','vesselName','voyage','releasePort','loadPort'])
  89  |     return {id:`gtcid:${record.id}`,control,row:{exportReference:d.source,declaration:d.declaration,
  90  |       description:d.description,packages:d.realPackage,packageUnit:d.packageUnit,grossWeight:d.realGrossWeight,
  91  |       weightUnit:d.weightUnit,exporterTax:d.tax,exporterBranch:d.branch,mawb:d.itemMasterBillOfLading,
  92  |       hawb:d.itemHouseBillOfLading,invoice:d.invoiceNo}}
  93  |   }
  94  |   async addPage() {
  95  |     await this.control.locator('#addDetail').click()
> 96  |     await expect(this.control.locator('#createBTN')).toBeVisible()
      |                                                      ^ Error: expect(locator).toBeVisible() failed
  97  |   }
  98  |   sourceRows() { return this.control.locator('tr:not(:has(tr))').filter({has:this.control.locator('input[name="Ex[]"]')}) }
  99  |   async addSelected() {
  100 |     await this.control.locator('#createBTN').click()
  101 |     await expect(this.control.locator('#createBTN')).not.toBeVisible({timeout:60_000})
  102 |     await this.ready()
  103 |   }
  104 |   async newRows(count:string) {
  105 |     const before=await this.rows().count()
  106 |     await this.detail.locator('[name="rowDetail"]').fill(count)
  107 |     await this.detail.locator('[name="newRowDetail"]').click()
  108 |     await expect.poll(()=>this.rows().count(),{timeout:60_000,message:'Requested GCL Detail rows are loaded'}).toBe(before+Number(count))
  109 |   }
  110 |   async deleteSelectedDetails() {
  111 |     const response=this.page.waitForResponse(r=>{
  112 |       if(r.request().method()!=='POST')return false
  113 |       const request=r.request(),text=request.url()+' '+(request.postData() || '')
  114 |       return /goodstransitiondetail/i.test(text) && /(?:ACTION=|name="ACTION"\r\n\r\n)delete/i.test(text)
  115 |     },{timeout:15000})
  116 |     await this.detail.locator('[name="deleteDetail"]').click()
  117 |     const result=await response;await result.finished()
  118 |     expect(result.ok(),'Detail Delete completed before deleting its GCL Header').toBe(true)
  119 |     // Legacy Delete can return an empty child frame. Reopen the workspace
  120 |     // before checking persisted rows instead of waiting for controls in that response.
  121 |     await this.page.reload({waitUntil:'domcontentloaded'})
  122 |     await this.ready()
  123 |   }
  124 |   async note() { await this.control.locator('#extranoteBTN').click(); await expect(this.control.locator('#ins_note')).toBeVisible() }
  125 |   async idle() { await ajax(this.page).idle() }
  126 | }
  127 | 
```