# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional\gcl\workspace-csv.spec.ts >> GCL · Upload CSV after opening Ref >> TC-GCL-183: upload supplied 36-column CSV inside Ref and persist matching Control and eight appended Details @regression
- Location: functional\gcl\workspace-csv.spec.ts:61:7

# Error details

```
Error: containerNo

expect(received).toBe(expected) // Object.is equality

Expected: "TH12032023002"
Received: ""
```

```
Error: containerTypeCode2

expect(received).toBe(expected) // Object.is equality

Expected: "20G0"
Received: ""
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
                      - /url: /support/IE5DEV.shippingnet/data_defaulttemplate.php?UID=730&UCODE=f7ubNVePCo8GPGzfvf4EtgPwH762QWJYjb1qpMNRPvgr5qvLJ7DKAiF&SERVICENAME=goodstransitioncontrol&ACTION=MAIN&sREF=&BY=&sFROM=&sTO=&FILTER=&KEYWORD=&sStatus=&slimit=15&page=1
                      - img "Next" [ref=e365]
  - generic [ref=e366]: Version 0.0 (2010-12-15 15:41:47)
```

# Test source

```ts
  1  | import { test, expect, manualDraft, GclUI, GclTrack } from './_shared'
  2  | import { GclCsvPage } from '../../pages/gcl/GclCsvPage'
  3  | import type { SpnSession } from '../../pages/spn/SpnApp'
  4  | import { CONTROL_COLUMNS, WORKSPACE_CSV, workspaceCsv } from '../../data/gcl/workspace-csv'
  5  | 
  6  | async function start(gcl:GclUI,spn:SpnSession,track:GclTrack) {
  7  |   const draft=await manualDraft(gcl,spn,track)
  8  |   const record={id:draft.id,reference:draft.reference}
  9  |   // Exercise the requested path: go back to the list, then click this Ref.
  10 |   await gcl.list.open(spn);await gcl.list.reference(record.reference);await gcl.list.openRecord(record.reference);await gcl.workspace.ready()
  11 |   await expect(gcl.workspace.control.locator('#uploadCSV')).toBeVisible()
  12 |   const header=await control(gcl),details=await gcl.workspace.data()
  13 |   const csv=new GclCsvPage(gcl.page);await csv.existing()
  14 |   return {record,csv,header,details}
  15 | }
  16 | async function control(gcl:GclUI) {
  17 |   const values:Record<string,string>={}
  18 |   for(const name of CONTROL_COLUMNS){
  19 |     const input=gcl.workspace.control.locator(`[name="ins_${name}" i]`).first()
  20 |     if(await input.count())values[name]=await input.inputValue()
  21 |   }
  22 |   return values
  23 | }
  24 | const normalize=(value:string)=>value.replace(/\r\n/g,'\n')
  25 | function isoDate(value:string) {
  26 |   if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value
  27 |   const parts=value.split(/[-/]/);return parts.length===3?[parts[2],parts[1],parts[0]].join('-'):value
  28 | }
  29 | 
  30 | test.describe('GCL · Upload CSV after opening Ref',()=>{
  31 |   test.describe.configure({timeout:300_000})
  32 |   test('TC-GCL-180: open Ref then CSV toolbar icon exposes the workspace upload form @regression',async({gcl,spn,owned})=>{
  33 |     const {record,csv}=await start(gcl,spn,owned.track)
  34 |     await expect(csv.scope.locator('#uploadFile')).toBeVisible()
  35 |     await expect(csv.scope.getByRole('button',{name:/Upload/})).toBeVisible()
  36 |     expect(decodeURIComponent(gcl.page.url())).toContain('gtcid:'+record.id)
  37 |   })
  38 |   test('TC-GCL-181: workspace Upload without a file warns and preserves this GCL @regression',async({gcl,spn,owned,dialogs})=>{
  39 |     const {record,csv,header:before,details}=await start(gcl,spn,owned.track)
  40 |     const n=dialogs.records.length
  41 |     await csv.scope.getByRole('button',{name:/Upload/}).click()
  42 |     await expect.poll(()=>dialogs.records.slice(n).map(row=>row.message).join(' ')).toMatch(/(?:select|upload).*file|เลือก.*ไฟล์/i)
  43 |     await gcl.workspace.open(spn,record)
  44 |     expect(await control(gcl)).toEqual(before);expect(await gcl.workspace.data()).toEqual(details)
  45 |   })
  46 |   test('TC-GCL-182: workspace Upload rejects empty CSV and wrong extension without changing this GCL @regression',async({gcl,spn,owned,dialogs})=>{
  47 |     const {record,csv,header:before,details}=await start(gcl,spn,owned.track)
  48 |     for(const kind of ['empty','extension'] as const)await test.step(kind,async()=>{
  49 |       await csv.existing()
  50 |       await csv.scope.locator('#uploadFile').setInputFiles({name:kind==='empty'?'empty.csv':'wrong.txt',mimeType:'text/plain',buffer:kind==='empty'?Buffer.alloc(0):Buffer.from('not a CSV')})
  51 |       const n=dialogs.records.length
  52 |       await csv.scope.getByRole('button',{name:/Upload/}).click()
  53 |       await expect.poll(()=>dialogs.records.slice(n).map(row=>row.message).join(' '),{timeout:45_000,message:kind+' CSV validation completes'}).toMatch(kind==='empty'?/empty|not found data|ว่าง|ไม่พบ.*ข้อมูล/i:/only.*csv|\.csv|นามสกุล/i)
  54 |       // Empty CSV is rejected by the server, then its alert redirects the top
  55 |       // window to this workspace. Let that navigation finish before reopening.
  56 |       if(kind==='empty')await gcl.workspace.ready()
  57 |       await gcl.workspace.open(spn,record)
  58 |       expect(await control(gcl)).toEqual(before);expect(await gcl.workspace.data()).toEqual(details)
  59 |     })
  60 |   })
  61 |   test('TC-GCL-183: upload supplied 36-column CSV inside Ref and persist matching Control and eight appended Details @regression',async({gcl,spn,owned},info)=>{
  62 |     const expected=workspaceCsv()
  63 |     expect(expected.details).toHaveLength(8)
  64 |     const {record,csv,details:baseline}=await start(gcl,spn,owned.track)
  65 |     const before=await csv.inventory(spn)
  66 |     await gcl.workspace.open(spn,record);await csv.existing()
  67 |     await info.attach('workspace-input.csv',{body:expected.bytes,contentType:'text/csv'})
  68 |     const result=await csv.submit(WORKSPACE_CSV)
  69 |     const redact=(value:string)=>value.replace(/(UCODE|PHPSESSID)=([^&\s"<>]+)/gi,'$1=[redacted]')
  70 |     await info.attach('workspace-upload-response.html',{body:redact(result.html),contentType:'text/html'})
  71 |     // Discover and track only response-proven new records if the server creates any.
  72 |     const created=await csv.created(spn,before,result.html,owned.track)
  73 |     expect.soft(created,'Workspace upload must update this Ref, without creating another GCL').toHaveLength(0)
  74 |     expect(result.status,'Workspace upload HTTP status').toBeLessThan(400)
  75 |     expect(result.html).not.toMatch(/Fatal error|Internal Server Error|PDOException|SQLSTATE/i)
  76 |     await gcl.workspace.open(spn,record)
  77 |     expect(await gcl.workspace.record()).toEqual(record)
  78 |     const header=await control(gcl),actual=await gcl.workspace.data()
  79 |     await info.attach('workspace-imported.json',{body:JSON.stringify({record,expected,header,baseline,actual,created},null,2),contentType:'application/json'})
  80 |     for(const [name,value] of Object.entries(expected.control)) {
  81 |       expect.soft(header,name+' exists in Control').toHaveProperty(name)
  82 |       const got=header[name] || ''
  83 |       if(name==='departureDate')expect.soft(isoDate(got),name).toBe(isoDate(value))
> 84 |       else expect.soft(normalize(got),name).toBe(normalize(value))
     |                                             ^ Error: containerTypeCode2
  85 |     }
  86 |     expect(actual,'Append exactly the CSV details without adding a heading row').toHaveLength(baseline.length+expected.details.length)
  87 |     expect(actual.slice(0,baseline.length),'Existing Detail rows are preserved').toEqual(baseline)
  88 |     const imported=actual.slice(baseline.length)
  89 |     for(const [i,row] of expected.details.entries())for(const [name,value] of Object.entries(row)) {
  90 |       if(['orderbyItemNo','realPackage','realGrossWeight'].includes(name))expect.soft(Number(imported[i][name]),`row ${i+1} ${name}`).toBe(Number(value))
  91 |       else expect.soft(normalize(imported[i][name]),`row ${i+1} ${name}`).toBe(normalize(value))
  92 |     }
  93 |     await gcl.workspace.open(spn,record)
  94 |     expect(await control(gcl),'Control persists after reopening').toEqual(header)
  95 |     expect(await gcl.workspace.data(),'Details persist after reopening').toEqual(actual)
  96 |   })
  97 | })
  98 | 
```