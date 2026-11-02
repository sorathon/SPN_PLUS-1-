# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional\gcl\detail.spec.ts >> GCL · Detail/source/totals >> TC-GCL-104: Package/Gross limits reject nonnumeric and negative saved values @regression
- Location: functional\gcl\detail.spec.ts:141:6

# Error details

```
Error: realPackage rejects -1

expect(received).not.toBe(expected) // Object.is equality

Expected: not "-1"
```

```
Error: realPackage cannot persist a negative or nonnumeric quantity

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 0
Received:    -1
```

```
Error: realGrossWeight cannot persist a negative or nonnumeric quantity

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 0
Received:    -1
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
        - row "Print Event Delete HQVM400001917 PW-GCL0JEWSGSC7 test TEST 0001 2026-10-30 2801" [ref=e83]:
          - cell "Print Event Delete" [ref=e84]:
            - checkbox [ref=e85]
            - img "Print" [ref=e86] [cursor=pointer]
            - img "Event" [ref=e87] [cursor=pointer]
            - img "Delete" [ref=e88] [cursor=pointer]
          - cell [ref=e89]:
            - img [ref=e91] [cursor=pointer]
          - cell "HQVM400001917" [ref=e92]:
            - generic [ref=e93] [cursor=pointer]: HQVM400001917
          - cell [ref=e94]
          - cell "PW-GCL0JEWSGSC7" [ref=e95]
          - cell "test" [ref=e96]
          - cell "TEST 0001" [ref=e97]
          - cell [ref=e98]
          - cell "2026-10-30" [ref=e99]
          - cell "2801" [ref=e100]
        - row "Print Event Delete HQVM400001893 test TEST 0001 2026-10-30 0002" [ref=e101]:
          - cell "Print Event Delete" [ref=e102]:
            - checkbox [ref=e103]
            - img "Print" [ref=e104] [cursor=pointer]
            - img "Event" [ref=e105] [cursor=pointer]
            - img "Delete" [ref=e106] [cursor=pointer]
          - cell [ref=e107]:
            - img [ref=e109] [cursor=pointer]
          - cell "HQVM400001893" [ref=e110]:
            - generic [ref=e111] [cursor=pointer]: HQVM400001893
          - cell [ref=e112]
          - cell [ref=e113]
          - cell "test" [ref=e114]
          - cell "TEST 0001" [ref=e115]
          - cell [ref=e116]
          - cell "2026-10-30" [ref=e117]
          - cell "0002" [ref=e118]
        - row "Print Event Delete HQVM400001853 test TEST 0001 TH12032023002 2023-08-15 0002" [ref=e119]:
          - cell "Print Event Delete" [ref=e120]:
            - checkbox [ref=e121]
            - img "Print" [ref=e122] [cursor=pointer]
            - img "Event" [ref=e123] [cursor=pointer]
            - img "Delete" [ref=e124] [cursor=pointer]
          - cell [ref=e125]:
            - img [ref=e127] [cursor=pointer]
          - cell "HQVM400001853" [ref=e128]:
            - generic [ref=e129] [cursor=pointer]: HQVM400001853
          - cell [ref=e130]
          - cell [ref=e131]
          - cell "test" [ref=e132]
          - cell "TEST 0001" [ref=e133]
          - cell "TH12032023002" [ref=e134]
          - cell "2023-08-15" [ref=e135]
          - cell "0002" [ref=e136]
        - row "Print Event Delete HQVM400001869 TH12032023002 2023-08-15" [ref=e137]:
          - cell "Print Event Delete" [ref=e138]:
            - checkbox [ref=e139]
            - img "Print" [ref=e140] [cursor=pointer]
            - img "Event" [ref=e141] [cursor=pointer]
            - img "Delete" [ref=e142] [cursor=pointer]
          - cell [ref=e143]:
            - img [ref=e145] [cursor=pointer]
          - cell "HQVM400001869" [ref=e146]:
            - generic [ref=e147] [cursor=pointer]: HQVM400001869
          - cell [ref=e148]
          - cell [ref=e149]
          - cell [ref=e150]
          - cell [ref=e151]
          - cell "TH12032023002" [ref=e152]
          - cell "2023-08-15" [ref=e153]
          - cell [ref=e154]
        - row "Print Event Delete HQVM400001813 PW-GCL-COPYKRBDRL test TEST 0001 2026-10-30 2801" [ref=e155]:
          - cell "Print Event Delete" [ref=e156]:
            - checkbox [ref=e157]
            - img "Print" [ref=e158] [cursor=pointer]
            - img "Event" [ref=e159] [cursor=pointer]
            - img "Delete" [ref=e160] [cursor=pointer]
          - cell [ref=e161]:
            - img [ref=e163] [cursor=pointer]
          - cell "HQVM400001813" [ref=e164]:
            - generic [ref=e165] [cursor=pointer]: HQVM400001813
          - cell [ref=e166]
          - cell "PW-GCL-COPYKRBDRL" [ref=e167]
          - cell "test" [ref=e168]
          - cell "TEST 0001" [ref=e169]
          - cell [ref=e170]
          - cell "2026-10-30" [ref=e171]
          - cell "2801" [ref=e172]
        - row "Print Event Delete HQVM400001805 test TEST 0001 2801" [ref=e173]:
          - cell "Print Event Delete" [ref=e174]:
            - checkbox [ref=e175]
            - img "Print" [ref=e176] [cursor=pointer]
            - img "Event" [ref=e177] [cursor=pointer]
            - img "Delete" [ref=e178] [cursor=pointer]
          - cell [ref=e179]:
            - img [ref=e181] [cursor=pointer]
          - cell "HQVM400001805" [ref=e182]:
            - generic [ref=e183] [cursor=pointer]: HQVM400001805
          - cell [ref=e184]
          - cell [ref=e185]
          - cell "test" [ref=e186]
          - cell "TEST 0001" [ref=e187]
          - cell [ref=e188]
          - cell [ref=e189]
          - cell "2801" [ref=e190]
        - row "Print Event Delete HQVM400001804" [ref=e191]:
          - cell "Print Event Delete" [ref=e192]:
            - checkbox [ref=e193]
            - img "Print" [ref=e194] [cursor=pointer]
            - img "Event" [ref=e195] [cursor=pointer]
            - img "Delete" [ref=e196] [cursor=pointer]
          - cell [ref=e197]:
            - img [ref=e199] [cursor=pointer]
          - cell "HQVM400001804" [ref=e200]:
            - generic [ref=e201] [cursor=pointer]: HQVM400001804
          - cell [ref=e202]
          - cell [ref=e203]
          - cell [ref=e204]
          - cell [ref=e205]
          - cell [ref=e206]
          - cell [ref=e207]
          - cell [ref=e208]
        - row "Print Event Delete HQVM400001803 test TEST 0001 2801" [ref=e209]:
          - cell "Print Event Delete" [ref=e210]:
            - checkbox [ref=e211]
            - img "Print" [ref=e212] [cursor=pointer]
            - img "Event" [ref=e213] [cursor=pointer]
            - img "Delete" [ref=e214] [cursor=pointer]
          - cell [ref=e215]:
            - img [ref=e217] [cursor=pointer]
          - cell "HQVM400001803" [ref=e218]:
            - generic [ref=e219] [cursor=pointer]: HQVM400001803
          - cell [ref=e220]
          - cell [ref=e221]
          - cell "test" [ref=e222]
          - cell "TEST 0001" [ref=e223]
          - cell [ref=e224]
          - cell [ref=e225]
          - cell "2801" [ref=e226]
        - row "Print Event Delete HQVM400001788 test TEST 0001 2801" [ref=e227]:
          - cell "Print Event Delete" [ref=e228]:
            - checkbox [ref=e229]
            - img "Print" [ref=e230] [cursor=pointer]
            - img "Event" [ref=e231] [cursor=pointer]
            - img "Delete" [ref=e232] [cursor=pointer]
          - cell [ref=e233]:
            - img [ref=e235] [cursor=pointer]
          - cell "HQVM400001788" [ref=e236]:
            - generic [ref=e237] [cursor=pointer]: HQVM400001788
          - cell [ref=e238]
          - cell [ref=e239]
          - cell "test" [ref=e240]
          - cell "TEST 0001" [ref=e241]
          - cell [ref=e242]
          - cell [ref=e243]
          - cell "2801" [ref=e244]
        - row "Print Event Delete HQVM400001787 jobno Netbay RTCFLIGHT SITU2886175 19/10/2026 1193" [ref=e245]:
          - cell "Print Event Delete" [ref=e246]:
            - checkbox [ref=e247]
            - img "Print" [ref=e248] [cursor=pointer]
            - img "Event" [ref=e249] [cursor=pointer]
            - img "Delete" [ref=e250] [cursor=pointer]
          - cell [ref=e251]:
            - img [ref=e253] [cursor=pointer]
          - cell "HQVM400001787" [ref=e254]:
            - generic [ref=e255] [cursor=pointer]: HQVM400001787
          - cell [ref=e256]
          - cell "jobno" [ref=e257]
          - cell "Netbay" [ref=e258]
          - cell "RTCFLIGHT" [ref=e259]
          - cell "SITU2886175" [ref=e260]
          - cell "19/10/2026" [ref=e261]
          - cell "1193" [ref=e262]
        - row "Print Event Delete HQVM400001786 jobno Netbay RTCFLIGHT SITU2886175 19/10/2026 1193" [ref=e263]:
          - cell "Print Event Delete" [ref=e264]:
            - checkbox [ref=e265]
            - img "Print" [ref=e266] [cursor=pointer]
            - img "Event" [ref=e267] [cursor=pointer]
            - img "Delete" [ref=e268] [cursor=pointer]
          - cell [ref=e269]:
            - img [ref=e271] [cursor=pointer]
          - cell "HQVM400001786" [ref=e272]:
            - generic [ref=e273] [cursor=pointer]: HQVM400001786
          - cell [ref=e274]
          - cell "jobno" [ref=e275]
          - cell "Netbay" [ref=e276]
          - cell "RTCFLIGHT" [ref=e277]
          - cell "SITU2886175" [ref=e278]
          - cell "19/10/2026" [ref=e279]
          - cell "1193" [ref=e280]
        - row "Print Event Delete HQVM400001752 PW-GCLSUA7NIJ8S test TEST 0001 2026-10-29 2801" [ref=e281]:
          - cell "Print Event Delete" [ref=e282]:
            - checkbox [ref=e283]
            - img "Print" [ref=e284] [cursor=pointer]
            - img "Event" [ref=e285] [cursor=pointer]
            - img "Delete" [ref=e286] [cursor=pointer]
          - cell [ref=e287]:
            - img [ref=e289] [cursor=pointer]
          - cell "HQVM400001752" [ref=e290]:
            - generic [ref=e291] [cursor=pointer]: HQVM400001752
          - cell [ref=e292]
          - cell "PW-GCLSUA7NIJ8S" [ref=e293]
          - cell "test" [ref=e294]
          - cell "TEST 0001" [ref=e295]
          - cell [ref=e296]
          - cell "2026-10-29" [ref=e297]
          - cell "2801" [ref=e298]
        - row "Print Event Delete HQVM400001725 test TEST 0001 2801" [ref=e299]:
          - cell "Print Event Delete" [ref=e300]:
            - checkbox [ref=e301]
            - img "Print" [ref=e302] [cursor=pointer]
            - img "Event" [ref=e303] [cursor=pointer]
            - img "Delete" [ref=e304] [cursor=pointer]
          - cell [ref=e305]:
            - img [ref=e307] [cursor=pointer]
          - cell "HQVM400001725" [ref=e308]:
            - generic [ref=e309] [cursor=pointer]: HQVM400001725
          - cell [ref=e310]
          - cell [ref=e311]
          - cell "test" [ref=e312]
          - cell "TEST 0001" [ref=e313]
          - cell [ref=e314]
          - cell [ref=e315]
          - cell "2801" [ref=e316]
        - row "Print Event Delete HQVM400001679 test TEST 0001 2801" [ref=e317]:
          - cell "Print Event Delete" [ref=e318]:
            - checkbox [ref=e319]
            - img "Print" [ref=e320] [cursor=pointer]
            - img "Event" [ref=e321] [cursor=pointer]
            - img "Delete" [ref=e322] [cursor=pointer]
          - cell [ref=e323]:
            - img [ref=e325] [cursor=pointer]
          - cell "HQVM400001679" [ref=e326]:
            - generic [ref=e327] [cursor=pointer]: HQVM400001679
          - cell [ref=e328]
          - cell [ref=e329]
          - cell "test" [ref=e330]
          - cell "TEST 0001" [ref=e331]
          - cell [ref=e332]
          - cell [ref=e333]
          - cell "2801" [ref=e334]
        - row "Print Event Delete HQVM400001678 test TEST 0001 2801" [ref=e335]:
          - cell "Print Event Delete" [ref=e336]:
            - checkbox [ref=e337]
            - img "Print" [ref=e338] [cursor=pointer]
            - img "Event" [ref=e339] [cursor=pointer]
            - img "Delete" [ref=e340] [cursor=pointer]
          - cell [ref=e341]:
            - img [ref=e343] [cursor=pointer]
          - cell "HQVM400001678" [ref=e344]:
            - generic [ref=e345] [cursor=pointer]: HQVM400001678
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
  49  |   await gcl.workspace.newRows('2');await expect(gcl.workspace.rows()).toHaveCount(before+3)
  50  |   await gcl.workspace.open(spn,r);await expect(gcl.workspace.rows()).toHaveCount(before+3)
  51  |  })
  52  |  test('TC-GCL-086: invalid New Row counts do not create rows @regression',async({gcl,spn,owned})=>{
  53  |   const r=await editableDraft(gcl,spn,owned.track)
  54  |   const before=await gcl.workspace.rows().count()
  55  |   await expect(gcl.workspace.detail.locator('[name="rowDetail"]')).toHaveAttribute('maxlength','4')
  56  |   for(const value of ['','0','-1','abc']) {
  57  |    await gcl.workspace.detail.locator('[name="rowDetail"]').fill(value);await gcl.workspace.detail.locator('[name="newRowDetail"]').click()
  58  |    await gcl.workspace.open(spn,r)
  59  |    await expect.soft(gcl.workspace.rows(),`New Row value ${JSON.stringify(value)} must not add rows`).toHaveCount(before)
  60  |    const extra=await gcl.workspace.rows().count()-before
  61  |    if(extra>0){for(let i=before;i<before+extra;i++)await gcl.workspace.rows().nth(i).locator('input[type=checkbox]').check();await gcl.workspace.deleteSelectedDetails()}
  62  |   }
  63  |  })
  64  |  test('TC-GCL-087: Description/BL/Invoice/note edits persist without changing source identity @regression',async({gcl,spn,owned})=>{
  65  |   const r=await editableDraft(gcl,spn,owned.track);const before=(await gcl.workspace.data())[0]
  66  |   const values={description:'GCL ทดสอบรายการ',itemMasterBillOfLading:'PW-MASTER',itemHouseBillOfLading:'PW-HOUSE',invoiceNo:'PW-INVOICE',notation:'PW-NOTE'}
  67  |   for(const [n,v]of Object.entries(values))await gcl.workspace.rowField(n).fill(v)
  68  |   await gcl.workspace.save();await gcl.workspace.open(spn,r);const after=(await gcl.workspace.data())[0]
  69  |   for(const[n,v]of Object.entries(values))expect(after[n]).toBe(v)
  70  |   for(const n of ['source','declaration','tax','branch'])expect(after[n]).toBe(before[n])
  71  |  })
  72  |  test('TC-GCL-088: changing Item No keeps row-to-source mapping @regression',async({gcl,spn,owned})=>{
  73  |   const r=await editableDraft(gcl,spn,owned.track,2);const before=await gcl.workspace.data()
  74  |   await expect(gcl.workspace.rowField('orderbyItemNo')).toHaveAttribute('maxlength','4')
  75  |   await gcl.workspace.rowField('orderbyItemNo',0).fill('0002');await gcl.workspace.rowField('orderbyItemNo',1).fill('0001')
  76  |   await gcl.workspace.save();await gcl.workspace.open(spn,r);const after=await gcl.workspace.data()
  77  |   for(const old of before)expect(after.some(n=>n.source===old.source && n.declaration===old.declaration && n.description===old.description)).toBe(true)
  78  |  })
  79  |  test('TC-GCL-089: Delete Detail with no selection preserves the row @regression',async({gcl,spn,owned,dialogs})=>{
  80  |   const r=await sourceDraft(gcl,spn,owned.track);const before=await gcl.workspace.data(),requests:string[]=[]
  81  |   const watch=(request:import('@playwright/test').Request)=>{if(request.method()==='POST' && /goodstransitiondetail/i.test(request.url()) && /ACTION=delete/i.test(request.url()+' '+(request.postData()||'')))requests.push('Delete POST')}
  82  |   gcl.page.on('request',watch)
  83  |   await gcl.workspace.detail.locator('[name="deleteDetail"]').click();await gcl.workspace.idle()
  84  |   await gcl.workspace.open(spn,r);expect(await gcl.workspace.data()).toEqual(before)
  85  |   gcl.page.off('request',watch);test.info().annotations.push({type:'warning',description:`No-selection Delete submitted ${requests.length} request(s); persisted rows unchanged`})
  86  |   if(!dialogs.records.length)test.info().annotations.push({type:'warning',description:'No-selection guard leaves data intact without a native alert'})
  87  |  })
  88  |  test('TC-GCL-090: cancel/confirm Delete Detail affects only the selected row @regression',async({gcl,spn,owned,dialogs})=>{
  89  |   const r=await sourceDraft(gcl,spn,owned.track,2);const before=await gcl.workspace.data()
  90  |   const n=dialogs.records.length
  91  |   await gcl.workspace.rows().first().locator('input[type=checkbox]').check();dialogs.answerNext({accept:false})
  92  |   await gcl.workspace.detail.locator('[name="deleteDetail"]').click();await gcl.workspace.idle()
  93  |   const confirmed=dialogs.records.slice(n).some(d=>d.type==='confirm')
  94  |   dialogs.clearPendingAnswers()
  95  |   await gcl.workspace.open(spn,r)
  96  |   if(confirmed) {
  97  |    expect(await gcl.workspace.data()).toEqual(before)
  98  |    await gcl.workspace.rows().first().locator('input[type=checkbox]').check();await gcl.workspace.deleteSelectedDetails()
  99  |   } else test.info().annotations.push({type:'warning',description:'Detail Delete has no confirmation dialog; Cancel branch does not apply'})
  100 |   await gcl.workspace.open(spn,r);const after=await gcl.workspace.data()
  101 |   expect(after).toHaveLength(before.length-1);expect(after.some(d=>d.source===before[1].source)).toBe(true)
  102 | 
  103 |  })
  104 |  test('TC-GCL-091: leaving Add Detail without adding preserves Header and Detail @regression',async({gcl,spn,owned})=>{
  105 |   const r=await sourceDraft(gcl,spn,owned.track);const before=await gcl.workspace.data(),header=await gcl.workspace.lookup.snapshot(['INcompanyCode','vesselName','voyage'])
  106 |   await gcl.workspace.addPage();await gcl.workspace.control.locator('[name="exRef"]').fill('NO-ADD');await gcl.workspace.control.locator('[name="back"]').click();await gcl.workspace.ready()
  107 |   expect(await gcl.workspace.data()).toEqual(before);expect(await gcl.workspace.lookup.snapshot(Object.keys(header))).toEqual(header)
  108 |  })
  109 |  test('TC-GCL-100: same-unit footer totals equal actual Package/Gross sum @regression',async({gcl,spn,owned})=>{
  110 |   const r=await editableDraft(gcl,spn,owned.track,2)
  111 |   for(const [i,pkg,gross]of [[0,'10','120'],[1,'5','80']] as const){await gcl.workspace.rowField('realPackage',i).fill(pkg);await gcl.workspace.rowField('realGrossWeight',i).fill(gross)}
  112 |   await gcl.workspace.save();await gcl.workspace.open(spn,r)
  113 |   const footer=gcl.workspace.detail.locator('tr:not(:has(tr))').filter({has:gcl.workspace.detail.locator('td:nth-child(6) > a.classcolumntitle').filter({hasText:/^\s*[\d,.]+\s*$/})})
  114 |   await expect(footer).toHaveCount(1)
  115 |   expect(Number((await footer.locator(':scope > td').nth(5).innerText()).replace(/,/g,''))).toBe(15)
  116 |   expect(Number((await footer.locator(':scope > td').nth(7).innerText()).replace(/,/g,''))).toBe(200)
  117 |  })
  118 |  test('TC-GCL-101: source tree identities and quantities match Detail @regression',async({gcl,spn,owned})=>{
  119 |   await sourceDraft(gcl,spn,owned.track,2)
  120 |   const rows=await gcl.workspace.data(),tree=await gcl.page.locator('body').innerText()
  121 |   for(const row of rows){expect(tree).toContain(row.source);expect(tree).toContain(row.declaration);expect(tree).toContain(row.realPackage);expect(tree).toContain(row.realGrossWeight)}
  122 |  })
  123 |  test('TC-GCL-102: package proportion follows the supplied expected gross weight @regression',async({gcl,spn,owned})=>{
  124 |   test.skip(!process.env.SPN_GCL_PROPORTION_GROSS,'Proportion/rounding oracle not confirmed; set SPN_GCL_PROPORTION_GROSS for package=5')
  125 |   const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.detail.locator('[name="proportion"]').check();await gcl.workspace.rowField('realPackage').fill('5');await gcl.workspace.save();await gcl.workspace.open(spn,r)
  126 |   expect(Number((await gcl.workspace.data())[0].realGrossWeight)).toBe(Number(process.env.SPN_GCL_PROPORTION_GROSS))
  127 |  })
  128 |  test('TC-GCL-103: a zero planned-package source cannot produce NaN/Infinity @regression',async({gcl,spn,owned})=>{
  129 |   test.skip(!process.env.SPN_GCL_ZERO_PACKAGE_REF,'Need an explicitly supplied owned zero-package Export fixture; existing user sources are not allocated')
  130 |   await gcl.creation.wizard(spn)
  131 |   await gcl.creation.sourceSearch(process.env.SPN_GCL_ZERO_PACKAGE_REF!,'1')
  132 |   const row=gcl.creation.sourceRows().filter({hasText:process.env.SPN_GCL_ZERO_PACKAGE_REF!})
  133 |   await expect(row).toHaveCount(1)
  134 |   expect(Number((await row.locator(':scope > td').allTextContents()).at(-2))).toBe(0)
  135 |   await row.locator('input[type=checkbox]').check()
  136 |   await gcl.creation.createSelected();const r=await gcl.workspace.record();owned.track(r)
  137 |   test.skip(await gcl.workspace.rows().count()===0,'Zero-package Export has no Item/Detail for proportion')
  138 |   await gcl.workspace.detail.locator('[name="proportion"]').check();await gcl.workspace.rowField('realPackage').fill('0');await gcl.workspace.save();await gcl.workspace.open(spn,r)
  139 |   await expect(gcl.workspace.detail.locator('body')).not.toContainText(/NaN|Infinity|Division by zero/i)
  140 |  })
  141 |  test('TC-GCL-104: Package/Gross limits reject nonnumeric and negative saved values @regression',async({gcl,spn,owned})=>{
  142 |   const r=await editableDraft(gcl,spn,owned.track)
  143 |   await expect(gcl.workspace.rowField('realPackage')).toHaveAttribute('maxlength','8');await expect(gcl.workspace.rowField('realGrossWeight')).toHaveAttribute('maxlength','15')
  144 |   const original=(await gcl.workspace.data())[0]
  145 |   for(const name of ['realPackage','realGrossWeight'])for(const value of ['-1','abc']) {
  146 |    await gcl.workspace.rowField(name).fill(value);await gcl.workspace.save();await gcl.workspace.open(spn,r)
  147 |    const saved=(await gcl.workspace.data())[0][name]
  148 |    test.info().annotations.push({type:'warning',description:`${name}: submitted ${value}; persisted ${saved}`})
> 149 |    expect.soft(saved,`${name} rejects ${value}`).not.toBe(value);expect.soft(Number(saved),`${name} cannot persist a negative or nonnumeric quantity`).toBeGreaterThanOrEqual(0)
      |                                                                                                                                                        ^ Error: realGrossWeight cannot persist a negative or nonnumeric quantity
  150 |    await gcl.workspace.rowField(name).fill(original[name]);await gcl.workspace.save();await gcl.workspace.open(spn,r)
  151 |   }
  152 |  })
  153 |  test('TC-GCL-105: Thai/comma/newline text and 35-character BL survive saving @regression',async({gcl,spn,owned})=>{
  154 |   const r=await editableDraft(gcl,spn,owned.track);const text='สินค้าไทย, "GCL"\nบรรทัดใหม่'
  155 |   await gcl.workspace.rowField('description').fill(text);await gcl.workspace.rowField('invoiceNo').fill(text)
  156 |   for(const name of ['itemMasterBillOfLading','itemHouseBillOfLading']) {await expect(gcl.workspace.rowField(name)).toHaveAttribute('maxlength','35');await gcl.workspace.rowField(name).fill('A'.repeat(35))}
  157 |   await gcl.workspace.save();await gcl.workspace.open(spn,r);const row=(await gcl.workspace.data())[0]
  158 |   expect(row.description).toBe(text);expect(row.invoiceNo).toBe(text);expect(row.itemMasterBillOfLading).toBe('A'.repeat(35))
  159 |  })
  160 |  test('TC-GCL-106: mixed-unit aggregation matches a supplied footer oracle @regression',async({gcl,spn,owned})=>{
  161 |   test.skip(!process.env.SPN_GCL_MIXED_REFS || !process.env.SPN_GCL_MIXED_FOOTER,'Need mixed-unit source references and confirmed aggregation oracle')
  162 |   await gcl.creation.wizard(spn)
  163 |   for(const ref of process.env.SPN_GCL_MIXED_REFS!.split(','))await gcl.creation.sourceRows().filter({hasText:ref.trim()}).locator('input[type=checkbox]').check()
  164 |   await gcl.creation.createSelected();owned.track(await gcl.workspace.record());const rows=await gcl.workspace.data()
  165 |   expect(new Set(rows.map(r=>r.packageUnit+'|'+r.weightUnit)).size).toBeGreaterThan(1)
  166 |   await expect(gcl.workspace.detail.locator('body')).toContainText(process.env.SPN_GCL_MIXED_FOOTER!)
  167 |  })
  168 |  test('TC-GCL-107: GCL actual-weight edits do not change source Export header @regression',async({gcl,spn,owned})=>{
  169 |   const r=await editableDraft(gcl,spn,owned.track)
  170 |   const source=r.sources[0][1]
  171 |   const {ExportUI}=await import('../export/_shared');const ui=new ExportUI(gcl.page)
  172 |   await ui.creation.openList(spn);await ui.creation.searchReference(source);await ui.creation.reopen(source)
  173 |   const before=await ui.workspace.field('grossWeight').inputValue()
  174 |   await gcl.workspace.open(spn,r);await gcl.workspace.rowField('realGrossWeight').fill('99');await gcl.workspace.save()
  175 |   await ui.creation.openList(spn);await ui.creation.searchReference(source);await ui.creation.reopen(source);await expect(ui.workspace.field('grossWeight')).toHaveValue(before)
  176 |  })
  177 | })
  178 | 
```