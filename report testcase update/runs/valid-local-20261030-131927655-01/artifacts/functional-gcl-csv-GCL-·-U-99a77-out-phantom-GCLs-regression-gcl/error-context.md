# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional\gcl\csv.spec.ts >> GCL · Upload CSV >> TC-GCL-154: missing, empty, wrong extension and malformed CSV are rejected without phantom GCLs @regression
- Location: functional\gcl\csv.spec.ts:89:6

# Error details

```
Error: orphan invalid upload feedback

expect(received).toMatch(expected)

Expected pattern: /error|invalid|ไม่ถูก|ผิด|กรุณา|ไม่พบ|ไม่สามารถ|fail|incorrect|not found/i
Received string:  "·······
 Goods Transition List·····························································································
        Filter Name :························
        ค้นหา···········
        จาก·······························································································································
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Status·····································································································································································································································································
                   Goods Transition Control············································································································································································
                    Reference No:··························································································································································································
                      F2·········
                    To·
                      F2·························································································
                    แสดง··························
                      รายการ···································
                    Import Data.dat····································································································································································································································
           ACTION···
         STATUS···
         REFERENCE NO···
         GCL NO···
         JOB NO···
         COMPANY NAME···
         VESSEL NAME···
         CONTAINER NO···
         DEPARTURE DATE···
         RELEASE PORT·······················································
    HQVM400001893···············
   test··
   TEST 0001········
   2026-10-30··
   0002··············································
    HQVM400001853···············
   test··
   TEST 0001··
   TH12032023002··
   2023-08-15··
   0002··············································
    HQVM400001869···························
   TH12032023002··
   2023-08-15····················································
    HQVM400001813·········
   PW-GCL-COPYKRBDRL··
   test··
   TEST 0001········
   2026-10-30··
   2801··············································
    HQVM400001805···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001804·························································································
    HQVM400001803···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001788···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001787·········
   jobno··
   Netbay··
   RTCFLIGHT··
   SITU2886175··
   19/10/2026··
   1193··············································
    HQVM400001786·········
   jobno··
   Netbay··
   RTCFLIGHT··
   SITU2886175··
   19/10/2026··
   1193··············································
    HQVM400001752·········
   PW-GCLSUA7NIJ8S··
   test··
   TEST 0001········
   2026-10-29··
   2801··············································
    HQVM400001725···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001679···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001678···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001677···············
   test··
   TEST 0001··············
   2801································································································································································································································································
  Version 0.0 (2010-12-15 15:41:47)      "
```

```
Error: columns invalid upload feedback

expect(received).toMatch(expected)

Expected pattern: /error|invalid|ไม่ถูก|ผิด|กรุณา|ไม่พบ|ไม่สามารถ|fail|incorrect|not found/i
Received string:  "·······
 Goods Transition List·····························································································
        Filter Name :························
        ค้นหา···········
        จาก·······························································································································
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Status·····································································································································································································································································
                   Goods Transition Control············································································································································································
                    Reference No:··························································································································································································
                      F2·········
                    To·
                      F2·························································································
                    แสดง··························
                      รายการ···································
                    Import Data.dat····································································································································································································································
           ACTION···
         STATUS···
         REFERENCE NO···
         GCL NO···
         JOB NO···
         COMPANY NAME···
         VESSEL NAME···
         CONTAINER NO···
         DEPARTURE DATE···
         RELEASE PORT·······················································
    HQVM400001893···············
   test··
   TEST 0001········
   2026-10-30··
   0002··············································
    HQVM400001853···············
   test··
   TEST 0001··
   TH12032023002··
   2023-08-15··
   0002··············································
    HQVM400001869···························
   TH12032023002··
   2023-08-15····················································
    HQVM400001813·········
   PW-GCL-COPYKRBDRL··
   test··
   TEST 0001········
   2026-10-30··
   2801··············································
    HQVM400001805···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001804·························································································
    HQVM400001803···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001788···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001787·········
   jobno··
   Netbay··
   RTCFLIGHT··
   SITU2886175··
   19/10/2026··
   1193··············································
    HQVM400001786·········
   jobno··
   Netbay··
   RTCFLIGHT··
   SITU2886175··
   19/10/2026··
   1193··············································
    HQVM400001752·········
   PW-GCLSUA7NIJ8S··
   test··
   TEST 0001········
   2026-10-29··
   2801··············································
    HQVM400001725···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001679···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001678···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001677···············
   test··
   TEST 0001··············
   2801································································································································································································································································
  Version 0.0 (2010-12-15 15:41:47)      "
```

```
Error: code must not create a phantom/invalid GCL

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 1
Received array:  [{"id": "1096", "reference": "HQVM400001912"}]
```

```
Error: code invalid upload feedback

expect(received).toMatch(expected)

Expected pattern: /error|invalid|ไม่ถูก|ผิด|กรุณา|ไม่พบ|ไม่สามารถ|fail|incorrect|not found/i
Received string:  "·······
 Goods Transition List·····························································································
        Filter Name :························
        ค้นหา···········
        จาก·······························································································································
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Status·····································································································································································································································································
                   Goods Transition Control············································································································································································
                    Reference No:··························································································································································································
                      F2·········
                    To·
                      F2·························································································
                    แสดง··························
                      รายการ···································
                    Import Data.dat····································································································································································································································
           ACTION···
         STATUS···
         REFERENCE NO···
         GCL NO···
         JOB NO···
         COMPANY NAME···
         VESSEL NAME···
         CONTAINER NO···
         DEPARTURE DATE···
         RELEASE PORT·······················································
    HQVM400001912·········
   PWCSV-BAD-code-1793366428402··
   Netbay··
   RTCFLIGHT··
   SITU2886175··
   19/10/2026··
   1193··············································
    HQVM400001893···············
   test··
   TEST 0001········
   2026-10-30··
   0002··············································
    HQVM400001853···············
   test··
   TEST 0001··
   TH12032023002··
   2023-08-15··
   0002··············································
    HQVM400001869···························
   TH12032023002··
   2023-08-15····················································
    HQVM400001813·········
   PW-GCL-COPYKRBDRL··
   test··
   TEST 0001········
   2026-10-30··
   2801··············································
    HQVM400001805···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001804·························································································
    HQVM400001803···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001788···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001787·········
   jobno··
   Netbay··
   RTCFLIGHT··
   SITU2886175··
   19/10/2026··
   1193··············································
    HQVM400001786·········
   jobno··
   Netbay··
   RTCFLIGHT··
   SITU2886175··
   19/10/2026··
   1193··············································
    HQVM400001752·········
   PW-GCLSUA7NIJ8S··
   test··
   TEST 0001········
   2026-10-29··
   2801··············································
    HQVM400001725···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001679···············
   test··
   TEST 0001··············
   2801··············································
    HQVM400001678···············
   test··
   TEST 0001··············
   2801································································································································································································································································
  Version 0.0 (2010-12-15 15:41:47)      "
```

```
Error: code inventory unchanged

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 1
Received array:  [{"id": "1096", "reference": "HQVM400001912"}]
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
  7   | import type {TestInfo} from '@playwright/test'
  8   | import type {GclRecord} from '../../pages/gcl/GclListPage'
  9   | 
  10  | function file(info:TestInfo,name:string,groups:CsvGroup[]){const p=info.outputPath(name);fs.writeFileSync(p,encodeCsv(groupRows(groups)));return p}
  11  | const clone=()=>structuredClone(sourceGroups()[0])
  12  | function change(row:string[],kind:'H'|'D',name:string,value:string){const i=sourceRows()[kind==='H'?1:2].indexOf(name);if(i<0)throw Error('Unknown CSV field '+name);row[i]=value}
  13  | async function upload(gcl:GclUI,spn:SpnSession,track:GclTrack,info:TestInfo,input:string){
  14  |  const csv=new GclCsvPage(gcl.page),before=await csv.inventory(spn);await csv.open(spn)
  15  |  const result=await csv.submit(input);await info.attach('upload-response.html',{body:result.html.replace(/UCODE=[^&\s"<>]+/g,'UCODE=[redacted]'),contentType:'text/html'})
  16  |  const records=await csv.created(spn,before,result.html,track)
  17  |  await info.attach('csv-created.json',{body:JSON.stringify(records),contentType:'application/json'});return records
  18  | }
  19  | async function checkGroup(gcl:GclUI,spn:SpnSession,r:GclRecord,group:CsvGroup,info:TestInfo){
  20  |  await gcl.workspace.open(spn,r);const h=fields(group.header,'H'),actual=await gcl.workspace.data()
  21  |  const aliases:Record<string,string>={carType:'carType2',carLicense:'carLicense_2',carProvince:'carProvince_2',containerTypeCode:'containerTypeCode2'}
  22  |  const measurements=['totalGrossWeight','reeferTemperature','ventilation','overheight','overlengthFore','overlengthAfter','overwidthRight','overwidthLeft']
  23  |  const checked:string[]=[],missing:string[]=[]
  24  |  for(const [name,value]of Object.entries(h)) {
  25  |   const input=gcl.workspace.control.locator(`[name="ins_${aliases[name]||name}" i]`).first()
  26  |   if(!await input.count()){if(value)missing.push(name);continue}
  27  |   const got=await input.inputValue();checked.push(name)
  28  |   if(name==='departureDate')expect.soft(got.replace(/[^0-9]/g,''),name).toBe(value.replace(/[^0-9]/g,''))
  29  |   else if(measurements.includes(name)&&value)expect.soft(Number(got),name).toBe(Number(value))
  30  |   else expect.soft(got.replace(/\r\n/g,'\n'),name).toBe(value.replace(/\r\n/g,'\n'))
  31  |  }
  32  |  expect(missing,'All nonempty CSV header fields must have a Control mapping').toHaveLength(0)
  33  |  await info.attach(r.reference+'-header-coverage.json',{body:JSON.stringify({checked,unavailableInControl:missing}),contentType:'application/json'})
  34  |  expect(actual).toHaveLength(group.details.length)
  35  |  const detailMap:Record<string,string>={referenceNo:'source',exportDeclarationNo:'declaration',description:'description',realPackage:'realPackage',packageUnit:'packageUnit',realGrossWeight:'realGrossWeight',grossWeightUnit:'weightUnit',companyTaxNo:'tax',companyBranch:'branch',masterBillOfLading:'itemMasterBillOfLading',houseBillOfLading:'itemHouseBillOfLading',invoiceNo:'invoiceNo',notation:'notation'}
  36  |  for(const [i,row]of group.details.entries())for(const [name,value]of Object.entries(fields(row,'D'))) {
  37  |   const key=detailMap[name];if(!key)continue
  38  |   if(['realPackage','realGrossWeight'].includes(name))expect.soft(Number(actual[i][key]),name).toBe(Number(value))
  39  |   else expect.soft(actual[i][key].replace(/\r\n/g,'\n'),name).toBe(value.replace(/\r\n/g,'\n'))
  40  |  }
  41  |  const saved=await gcl.workspace.data();await gcl.workspace.open(spn,r);expect(await gcl.workspace.data()).toEqual(saved)
  42  |  const xmlFiles=await new GclFilesPage(gcl.page).download(spn,[r],'XML',info.outputPath('xml-'+r.reference))
  43  |  const xml=xmlFiles.find(f=>f.name===r.reference+'.xml');expect(xml).toBeDefined()
  44  |  const last=await gcl.page.evaluate(text=>{const d=new DOMParser().parseFromString(text,'application/xml');return {errors:d.querySelectorAll('parsererror').length,values:[...d.getElementsByTagNameNS('*','LastEntry')].map(e=>e.textContent)}},xml!.data.toString('utf8'))
  45  |  expect(last.errors).toBe(0)
  46  |  const mode=process.env.SPN_GCL_CSV_LAST_ENTRY_MODE || 'observe'
  47  |  const fromCsv=group.details.map(d=>fields(d,'D').lastEntry)
  48  |  await info.attach(r.reference+'-last-entry.json',{body:JSON.stringify({mode,fromCsv,fromXml:last.values}),contentType:'application/json'})
  49  |  if(mode==='csv')expect.soft(last.values,'LastEntry must match each CSV Detail').toEqual(fromCsv)
  50  |  else if(mode==='last-row')expect.soft(last.values,'Only the final Detail is LastEntry').toEqual(group.details.map((_,i)=>i===group.details.length-1?'Y':'N'))
  51  |  else test.info().annotations.push({type:'warning',description:'LastEntry XML observed but not judged: awaiting business rule (CSV '+fromCsv.join(',')+'; XML '+last.values.join(',')+')'})
  52  |  await info.attach(r.reference+'.xml',{body:xml!.data,contentType:'application/xml'})
  53  | }
  54  | 
  55  | test.describe('GCL · Upload CSV',()=>{
  56  |  test.describe.configure({timeout:300000})
  57  |  test('TC-GCL-027: New Upload CSV exposes its upload form @regression',async({gcl,spn})=>{
  58  |   const csv=new GclCsvPage(gcl.page);await csv.open(spn)
  59  |   await expect(csv.scope.getByText('GCL - Upload CSV File',{exact:false})).toBeVisible()
  60  |   await expect(csv.scope.getByRole('button',{name:'Upload',exact:true})).toBeVisible();await expect(csv.scope.locator('#example-template')).toBeVisible()
  61  |   await expect(csv.scope.locator('select[name*="mapping" i]')).toHaveCount(0)
  62  |  })
  63  |  test('TC-GCL-150: Example File downloads the GCL H/D CSV template @regression',async({gcl,spn},info)=>{
  64  |   const csv=new GclCsvPage(gcl.page);await csv.open(spn)
  65  |   const pending=gcl.page.waitForEvent('download');await csv.scope.locator('#example-template').click();const d=await pending,p=info.outputPath('example.csv');await d.saveAs(p)
  66  |   const b=fs.readFileSync(p),rows=parseCsv(b.toString('utf8'));expect(b.subarray(0,3).equals(Buffer.from([239,187,191]))).toBe(true)
  67  |   expect(rows.filter(r=>r[0].startsWith('//'))).toHaveLength(3)
  68  |   for(const row of rows)expect(row).toHaveLength(59)
  69  |   expect(rows.filter(r=>r[0]==='H')).toHaveLength(2);expect(rows.filter(r=>r[0]==='D')).toHaveLength(5);expect(rows.filter(r=>!r[0].startsWith('//')).map(r=>r[0])).toEqual(['H','D','D','H','D','D','D'])
  70  |   expect(rows[1].slice(1)).toEqual(sourceRows()[1].slice(1));expect(rows[2].slice(1,15)).toEqual(sourceRows()[2].slice(1,15))
  71  |   await info.attach('example.csv',{body:b,contentType:'text/csv'})
  72  |  })
  73  |  test('TC-GCL-151: one header from the supplied CSV creates one GCL with two Details @regression',async({gcl,spn,owned},info)=>{
  74  |   const group=clone(),records=await upload(gcl,spn,owned.track,info,file(info,'one-header.csv',[group]));expect(records).toHaveLength(1);await checkGroup(gcl,spn,records[0],group,info)
  75  |  })
  76  |  test('TC-GCL-152: supplied TestCSV.csv creates two GCLs with two Details per header @regression',async({gcl,spn,owned},info)=>{
  77  |   const records=await upload(gcl,spn,owned.track,info,CSV_SOURCE);expect(records).toHaveLength(2);const groups=sourceGroups()
  78  |   for(const r of records){await gcl.workspace.open(spn,r);const company=await gcl.workspace.field('INcompanyCode').inputValue(),group=groups.find(g=>fields(g.header,'H').INcompanyCode===company);expect(group).toBeDefined();await checkGroup(gcl,spn,r,group!,info)}
  79  |  })
  80  |  test('TC-GCL-153: zero, optional blanks, Thai, quoted fields and decimal weight survive CSV upload @regression',async({gcl,spn,owned},info)=>{
  81  |   for(const variant of ['zero','quoted','decimal'])await test.step(variant,async()=>{
  82  |    const group=clone();change(group.header,'H','jobNo','PWCSV-'+variant+'-'+Date.now())
  83  |    if(variant==='zero'){change(group.header,'H','containerIndicator','0');change(group.details[0],'D','realPackage','0');change(group.details[0],'D','realGrossWeight','0')}
  84  |    if(variant==='quoted'){change(group.header,'H','remarkGCL','ทดสอบ, "GCL"\nบรรทัดสอง');change(group.details[0],'D','description','สินค้าไทย, "CSV"\nอีกบรรทัด');change(group.details[0],'D','invoiceNo','INV,"001"')}
  85  |    if(variant==='decimal'){change(group.details[0],'D','realGrossWeight','500.125');change(group.details[1],'D','realGrossWeight','0.375')}
  86  |    const records=await upload(gcl,spn,owned.track,info,file(info,variant+'.csv',[group]));expect(records).toHaveLength(1);await checkGroup(gcl,spn,records[0],group,info)
  87  |   })
  88  |  })
  89  |  test('TC-GCL-154: missing, empty, wrong extension and malformed CSV are rejected without phantom GCLs @regression',async({gcl,spn,owned,dialogs},info)=>{
  90  |   const csv=new GclCsvPage(gcl.page)
  91  |   for(const kind of ['missing','empty','extension','marker','orphan','columns','code'])await test.step(kind,async()=>{
  92  |    const before=await csv.inventory(spn);await csv.open(spn);const n=dialogs.records.length
  93  |    if(['missing','empty','extension'].includes(kind)){
  94  |     if(kind!=='missing')await csv.scope.locator('#uploadFile').setInputFiles({name:kind==='empty'?'empty.csv':'wrong.txt',mimeType:'text/plain',buffer:kind==='empty'?Buffer.alloc(0):Buffer.from('not csv')})
  95  |     await csv.scope.getByRole('button',{name:'Upload',exact:true}).click();await expect.poll(()=>dialogs.records.length).toBeGreaterThan(n)
  96  |     expect(dialogs.records[n].message).toMatch(kind==='missing'?/select a file/i:kind==='empty'?/empty/i:/only CSV/i)
  97  |    }else{
  98  |     const group=clone();change(group.header,'H','jobNo','PWCSV-BAD-'+kind+'-'+Date.now())
  99  |     if(kind==='marker')group.header[0]='X';if(kind==='code')change(group.header,'H','INcompanyCode','PW_BAD_'+Date.now().toString(36))
  100 |     const rows=kind==='orphan'?[group.details[0]]:kind==='columns'?[['H','broken']]:groupRows([group])
  101 |     const p=info.outputPath('invalid-'+kind+'.csv');fs.writeFileSync(p,encodeCsv(rows));const result=await csv.submit(p)
  102 |     await info.attach('invalid-'+kind+'-response.html',{body:result.html.replace(/UCODE=[^&\s"<>]+/g,'UCODE=[redacted]'),contentType:'text/html'})
  103 |     const created=await csv.created(spn,before,result.html,owned.track);expect.soft(created,kind+' must not create a phantom/invalid GCL').toHaveLength(0)
  104 |     const feedback=dialogs.records.slice(n).map(d=>d.message).join(' ')+' '+result.html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<option\b[\s\S]*?<\/option>/gi,' ').replace(/<[^>]+>/g,' ')
  105 |     expect.soft(feedback,kind+' invalid upload feedback').toMatch(/error|invalid|ไม่ถูก|ผิด|กรุณา|ไม่พบ|ไม่สามารถ|fail|incorrect|not found/i)
  106 |    }
> 107 |    const after=await csv.inventory(spn);expect.soft(after.filter(r=>!before.some(b=>b.id===r.id)),kind+' inventory unchanged').toHaveLength(0)
      |                                                                                                                                ^ Error: code inventory unchanged
  108 |   })
  109 |  })
  110 |  test('TC-GCL-156: workspace Upload CSV must not corrupt Control with the supplied H/D file @regression',async({gcl,spn,owned,dialogs},info)=>{
  111 |   const group=clone(),created=await upload(gcl,spn,owned.track,info,file(info,'existing-base.csv',[group]));expect(created).toHaveLength(1)
  112 |   const snapshotHeader=()=>gcl.workspace.control.locator('input[name^="ins_"],select[name^="ins_"],textarea[name^="ins_"]').evaluateAll(elements=>Object.fromEntries(elements.map(e=>{const input=e as HTMLInputElement;return [input.name,input.type==='checkbox'?String(input.checked):input.value]})))
  113 |   const base=created[0];await gcl.workspace.open(spn,base);const old=await gcl.workspace.data(),header=await snapshotHeader()
  114 |   const csv=new GclCsvPage(gcl.page),before=await csv.inventory(spn);await gcl.workspace.open(spn,base);await csv.existing()
  115 |   await expect(csv.scope.getByRole('button',{name:/Upload/})).toBeVisible();const n=dialogs.records.length
  116 |   const result=await csv.submit(CSV_SOURCE),records=await csv.created(spn,before,result.html,owned.track)
  117 |   await gcl.workspace.open(spn,base);const after=await gcl.workspace.data(),afterHeader=await snapshotHeader()
  118 |   const groups=sourceGroups(),aliases:Record<string,string>={carType:'carType2',carLicense:'carLicense_2',carProvince:'carProvince_2',containerTypeCode:'containerTypeCode2'}
  119 |   const corruption=Object.entries(fields(group.header,'H')).flatMap(([name])=>{
  120 |    const key='ins_'+(aliases[name]||name),beforeValue=header[key],got=afterHeader[key]
  121 |    if(beforeValue===undefined || got===undefined || got===beforeValue)return []
  122 |    const normalize=(v:string)=>name==='departureDate'?v.replace(/[^0-9]/g,''):v
  123 |    const allowed=groups.map(g=>fields(g.header,'H')[name])
  124 |    return allowed.some(value=>normalize(got)===normalize(value))?[]:[{field:name,before:beforeValue,csvValues:allowed,after:got}]
  125 |   })
  126 |   await info.attach('existing-csv-semantics.json',{body:JSON.stringify({original:base,newRecords:records,before:old,after,header,afterHeader,valuesNotInUploadedData:corruption},null,2),contentType:'application/json'})
  127 |   expect(corruption,'CSV comment/index rows must not overwrite Control with unrelated values').toEqual([])
  128 |   if(records.length){expect(after).toEqual(old);expect(afterHeader).toEqual(header);expect(records).toHaveLength(groups.length);for(const r of records){await gcl.workspace.open(spn,r);const code=await gcl.workspace.field('INcompanyCode').inputValue(),g=groups.find(g=>fields(g.header,'H').INcompanyCode===code);expect(g).toBeDefined();await checkGroup(gcl,spn,r,g!,info)}}
  129 |   else {
  130 |    const changed=JSON.stringify(after)!==JSON.stringify(old)||JSON.stringify(afterHeader)!==JSON.stringify(header)
  131 |    if(!changed){expect(dialogs.records.slice(n).map(d=>d.message).join(' '),'Unsupported CSV must report rejection rather than silently discard the file').toMatch(/error|invalid|ไม่ถูก|ผิด|กรุณา|ไม่สามารถ|not supported/i)}
  132 |    else test.skip(true,'Data changed without creating a new GCL; append/replace semantics need confirmation before positive assertions')
  133 |   }
  134 |  })
  135 | })
  136 | 
```