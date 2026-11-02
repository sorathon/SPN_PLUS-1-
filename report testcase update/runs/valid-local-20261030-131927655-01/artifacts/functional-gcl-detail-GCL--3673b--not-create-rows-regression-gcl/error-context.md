# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional\gcl\detail.spec.ts >> GCL · Detail/source/totals >> TC-GCL-086: invalid New Row counts do not create rows @regression
- Location: functional\gcl\detail.spec.ts:52:6

# Error details

```
Error: New Row value "" must not add rows

expect(locator).toHaveCount(expected) failed

Locator:  locator('#detailfrm').contentFrame().locator('#goodstransitiondetail').contentFrame().locator('tr:not(:has(tr))').filter({ has: locator('input[name="SYS_DEL[]"]') })
Expected: 1
Received: 2
Timeout:  5000ms

Call log:
  - New Row value "" must not add rows with timeout 5000ms
  - waiting for locator('#detailfrm').contentFrame().locator('#goodstransitiondetail').contentFrame().locator('tr:not(:has(tr))').filter({ has: locator('input[name="SYS_DEL[]"]') })
    13 × locator resolved to 2 elements
       - unexpected value "2"

```

```
Error: New Row value "abc" must not add rows

expect(locator).toHaveCount(expected) failed

Locator:  locator('#detailfrm').contentFrame().locator('#goodstransitiondetail').contentFrame().locator('tr:not(:has(tr))').filter({ has: locator('input[name="SYS_DEL[]"]') })
Expected: 1
Received: 75
Timeout:  5000ms

Call log:
  - New Row value "abc" must not add rows with timeout 5000ms
  - waiting for locator('#detailfrm').contentFrame().locator('#goodstransitiondetail').contentFrame().locator('tr:not(:has(tr))').filter({ has: locator('input[name="SYS_DEL[]"]') })
    13 × locator resolved to 75 elements
       - unexpected value "75"

```

```
Error: detailfrm ready

detailfrm ready

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 45000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- table [ref=e3]:
  - rowgroup [ref=e4]:
    - row "HQVM400001917 1 Copy GCL Control No Container - TEST 0001 EX001 2026-10-30 Console 7651 Declaration(s) Go to GCL list Print Change Port Print Return Goods" [ref=e5]:
      - cell "HQVM400001917 1 Copy GCL Control No Container - TEST 0001 EX001 2026-10-30 Console 7651 Declaration(s) Go to GCL list Print Change Port Print Return Goods" [ref=e6]:
        - table [ref=e7]:
          - rowgroup [ref=e8]:
            - row "HQVM400001917 1 Copy GCL Control No Container - TEST 0001 EX001 2026-10-30 Console 7651 Declaration(s) Go to GCL list Print Change Port Print Return Goods" [ref=e9]:
              - cell "HQVM400001917 1 Copy GCL Control No Container - TEST 0001 EX001 2026-10-30 Console 7651 Declaration(s) Go to GCL list Print Change Port Print Return Goods" [ref=e10]:
                - table [ref=e13]:
                  - rowgroup [ref=e14]:
                    - row "HQVM400001917" [ref=e15]:
                      - cell "HQVM400001917" [ref=e16]:
                        - generic [ref=e19]: HQVM400001917
                    - row "1 Copy GCL Control No Container - TEST 0001 EX001 2026-10-30 Console 7651 Declaration(s) Go to GCL list" [ref=e20]:
                      - cell "1 Copy GCL Control No Container - TEST 0001 EX001 2026-10-30 Console 7651 Declaration(s) Go to GCL list" [ref=e21]:
                        - generic [ref=e22]:
                          - textbox [ref=e23]: "1"
                          - button "Copy GCL Control" [ref=e24]
                          - img [ref=e25]
                          - generic [ref=e26]: No Container -
                          - text: TEST 0001
                          - text: EX001
                          - text: 2026-10-30
                          - text: Console 7651 Declaration(s)
                          - generic "Go back to list page" [ref=e27] [cursor=pointer]: Go to GCL list
                    - row "Print Change Port" [ref=e28]:
                      - cell "Print Change Port" [ref=e29]:
                        - button "Print Change Port" [ref=e31]
                    - row "Print Return Goods" [ref=e32]:
                      - cell "Print Return Goods" [ref=e33]:
                        - button "Print Return Goods" [ref=e35]
                    - row [ref=e36]:
                      - cell [ref=e37]
      - cell [ref=e39]
      - cell [ref=e40]:
        - iframe [ref=e41]:
          - table [ref=f20e4]:
            - rowgroup [ref=f20e5]:
              - row "F12 [Save] Validate Print Copy Check Status Send to Customs Add Detail Extra note Upload CSV Goods Transition Control REF HQVM400001917 GCL No. Status Job No. PW-GCL0JEWSGSC7 ส่งใบกำกับสินค้ารูปแบบใหม่ 2016 Company Information (Alt + 1) ข้อมูลใบตราส่งสินค้า (Alt + 2) ข้อมูลใหม่" [ref=f20e6]:
                - cell "F12 [Save] Validate Print Copy Check Status Send to Customs Add Detail Extra note Upload CSV Goods Transition Control REF HQVM400001917 GCL No. Status Job No. PW-GCL0JEWSGSC7 ส่งใบกำกับสินค้ารูปแบบใหม่ 2016 Company Information (Alt + 1) ข้อมูลใบตราส่งสินค้า (Alt + 2) ข้อมูลใหม่" [ref=f20e7]:
                  - table [ref=f20e8]:
                    - rowgroup [ref=f20e9]:
                      - row "F12 [Save] Validate Print Copy Check Status Send to Customs Add Detail Extra note Upload CSV Goods Transition Control" [ref=f20e10]:
                        - cell "F12 [Save] Validate Print Copy Check Status Send to Customs Add Detail Extra note Upload CSV" [ref=f20e11]:
                          - button "F12 [Save]" [ref=f20e12] [cursor=pointer]
                          - button "Validate" [ref=f20e13] [cursor=pointer]
                          - button "Print" [ref=f20e14] [cursor=pointer]
                          - button "Copy" [ref=f20e15] [cursor=pointer]
                          - button "Check Status" [ref=f20e16] [cursor=pointer]
                          - button "Send to Customs" [ref=f20e17] [cursor=pointer]
                          - button "Add Detail" [ref=f20e18] [cursor=pointer]
                          - img "Extra note" [ref=f20e19] [cursor=pointer]
                          - button "Upload CSV" [ref=f20e20] [cursor=pointer]
                        - cell "Goods Transition Control" [ref=f20e21]:
                          - generic [ref=f20e23]: Goods Transition Control
                      - row "REF HQVM400001917 GCL No. Status Job No. PW-GCL0JEWSGSC7 ส่งใบกำกับสินค้ารูปแบบใหม่ 2016 Company Information (Alt + 1) ข้อมูลใบตราส่งสินค้า (Alt + 2) ข้อมูลใหม่" [ref=f20e24]:
                        - cell "REF HQVM400001917 GCL No. Status Job No. PW-GCL0JEWSGSC7 ส่งใบกำกับสินค้ารูปแบบใหม่ 2016 Company Information (Alt + 1) ข้อมูลใบตราส่งสินค้า (Alt + 2) ข้อมูลใหม่" [ref=f20e25]:
                          - table [ref=f20e26]:
                            - rowgroup [ref=f20e27]:
                              - row "REF HQVM400001917 GCL No. Status Job No. PW-GCL0JEWSGSC7 ส่งใบกำกับสินค้ารูปแบบใหม่ 2016" [ref=f20e28]:
                                - cell "REF" [ref=f20e29]:
                                  - generic [ref=f20e30]: REF
                                - cell "HQVM400001917" [ref=f20e31]:
                                  - generic [ref=f20e33]: HQVM400001917
                                - cell "GCL No." [ref=f20e34]
                                - cell [ref=f20e35]
                                - cell "Status" [ref=f20e37]:
                                  - generic [ref=f20e38]: Status
                                - cell "Job No." [ref=f20e39]
                                - cell "PW-GCL0JEWSGSC7 ส่งใบกำกับสินค้ารูปแบบใหม่ 2016" [ref=f20e40]:
                                  - generic [ref=f20e41]:
                                    - textbox [ref=f20e43]: PW-GCL0JEWSGSC7
                                    - checkbox [checked] [ref=f20e44]
                                    - text: ส่งใบกำกับสินค้ารูปแบบใหม่ 2016
                          - generic [ref=f20e45]:
                            - group "Company Information (Alt + 1)" [ref=f20e46]:
                              - generic [ref=f20e47]: Company Information (Alt + 1)
                              - generic [ref=f20e48]:
                                - table [ref=f20e49]:
                                  - rowgroup [ref=f20e50]:
                                    - row "บริษัทผู้รับผิดชอบการบรรจุ 0103515014500_0000 Info." [ref=f20e51]:
                                      - cell "บริษัทผู้รับผิดชอบการบรรจุ" [ref=f20e52]:
                                        - generic "Click เพื่อดูข้อมูล Master file" [ref=f20e54] [cursor=pointer]: บริษัทผู้รับผิดชอบการบรรจุ
                                      - cell "0103515014500_0000 Info." [ref=f20e55]:
                                        - textbox [ref=f20e56]: 0103515014500_0000
                                        - button "Info." [ref=f20e57]
                                - table [ref=f20e58]:
                                  - rowgroup [ref=f20e59]:
                                    - row "ผู้รับผิดชอบการบรรจุ 0103515014500_0000" [ref=f20e60]:
                                      - cell "ผู้รับผิดชอบการบรรจุ" [ref=f20e61]:
                                        - generic "Click เพื่อดูข้อมูล Master file" [ref=f20e63] [cursor=pointer]: ผู้รับผิดชอบการบรรจุ
                                      - cell "0103515014500_0000" [ref=f20e64]:
                                        - textbox [ref=f20e65]: 0103515014500_0000
                            - group "ข้อมูลใบตราส่งสินค้า (Alt + 2)" [ref=f20e67]:
                              - generic [ref=f20e68]: ข้อมูลใบตราส่งสินค้า (Alt + 2)
                              - table [ref=f20e70]:
                                - rowgroup [ref=f20e71]:
                                  - row "ส่งออกโดย 1 = ทางเรือ Departure Date 30-10-2026 F2" [ref=f20e72]:
                                    - cell "ส่งออกโดย" [ref=f20e73]
                                    - cell "1 = ทางเรือ" [ref=f20e74]:
                                      - combobox [ref=f20e75]:
                                        - option "1 = ทางเรือ" [selected]
                                        - option "2 = ทางรถไฟ"
                                        - option "3 = ทางรถยนต์,คนเดินทางบก"
                                        - option "4 = ทางเครื่องบิน"
                                        - option "5 = ทางไปรษณีย์"
                                        - option "7 = ทางท่อขนส่งทางบก,ทางสายส่งไฟฟ้า"
                                        - option "8 = ทางเรือที่เข้าออกด่านศุลกากรทางบก, เรือเล็กทางทะเล"
                                        - option "9 = ทางผู้โดยสารนำพาจากอากาศยาน"
                                    - cell "Departure Date" [ref=f20e76]
                                    - cell "30-10-2026 F2" [ref=f20e77]:
                                      - generic [ref=f20e78]:
                                        - textbox [ref=f20e79]: 30-10-2026
                                        - button "F2" [ref=f20e80]
                                  - row "ชื่อยานพาหนะ TEST 0001 เที่ยวเรือ/เที่ยวบิน EX001" [ref=f20e81]:
                                    - cell "ชื่อยานพาหนะ" [ref=f20e82]:
                                      - generic "Click เพื่อดูข้อมูล Master file" [ref=f20e84] [cursor=pointer]: ชื่อยานพาหนะ
                                    - cell "TEST 0001" [ref=f20e85]:
                                      - textbox [ref=f20e86]: TEST 0001
                                    - cell "เที่ยวเรือ/เที่ยวบิน" [ref=f20e87]
                                    - cell "EX001" [ref=f20e88]:
                                      - textbox [ref=f20e89]: EX001
                                  - row "ท่าที่ส่งออก 2801 สำนักงานศุลกากรท่าเรือแหลมฉบัง ท่าที่ขนถ่ายสินค้า 1111 Test ท่าที่ส่งออก GCL" [ref=f20e90]:
                                    - cell "ท่าที่ส่งออก" [ref=f20e91]:
                                      - generic "Click เพื่อดูข้อมูล Master file" [ref=f20e93] [cursor=pointer]: ท่าที่ส่งออก
                                    - cell "2801 สำนักงานศุลกากรท่าเรือแหลมฉบัง" [ref=f20e94]:
                                      - textbox [ref=f20e95]: "2801"
                                      - generic [ref=f20e97]: สำนักงานศุลกากรท่าเรือแหลมฉบัง
                                    - cell "ท่าที่ขนถ่ายสินค้า" [ref=f20e98]:
                                      - generic "Click เพื่อดูข้อมูล Master file" [ref=f20e100] [cursor=pointer]: ท่าที่ขนถ่ายสินค้า
                                    - cell "1111 Test ท่าที่ส่งออก GCL" [ref=f20e101]:
                                      - textbox [ref=f20e102]: "1111"
                                      - generic [ref=f20e104]: Test ท่าที่ส่งออก GCL
                                  - row "ท่าที่รับบรรทุก 0002 Test & ท่าที่รับบรรทุก GCL รหัสสถานที่บรรจุ 0002 Test & ท่าที่รับบรรทุก GCL" [ref=f20e105]:
                                    - cell "ท่าที่รับบรรทุก" [ref=f20e106]:
                                      - generic "Click เพื่อดูข้อมูล Master file" [ref=f20e108] [cursor=pointer]: ท่าที่รับบรรทุก
                                    - cell "0002 Test & ท่าที่รับบรรทุก GCL" [ref=f20e109]:
                                      - textbox [ref=f20e110]: "0002"
                                      - generic [ref=f20e112]: Test & ท่าที่รับบรรทุก GCL
                                    - cell "รหัสสถานที่บรรจุ" [ref=f20e113]:
                                      - generic "Click เพื่อดูข้อมูล Master file" [ref=f20e115] [cursor=pointer]: รหัสสถานที่บรรจุ
                                    - cell "0002 Test & ท่าที่รับบรรทุก GCL" [ref=f20e116]:
                                      - textbox [ref=f20e117]: "0002"
                                      - generic [ref=f20e119]: Test & ท่าที่รับบรรทุก GCL
                                  - row "ทะเบียนรถยนต์ ทะเบียนจังหวัด รหัสประเทศ" [ref=f20e120]:
                                    - cell "ทะเบียนรถยนต์" [ref=f20e121]
                                    - cell "ทะเบียนจังหวัด" [ref=f20e122]:
                                      - textbox [ref=f20e123]
                                      - text: ทะเบียนจังหวัด
                                      - textbox "รหัสจังหวัดของเลขทะเบียนรถยนต์" [ref=f20e124]
                                    - cell "รหัสประเทศ" [ref=f20e125]:
                                      - generic "Click เพื่อดูข้อมูล Master file" [ref=f20e127] [cursor=pointer]: รหัสประเทศ
                                    - cell [ref=f20e128]:
                                      - textbox "รหัสประเทศของเลขทะเบียนรถยนต์" [ref=f20e129]
                                  - row "ทะเบียนรถพ่วง/กึ่งพ่วง ทะเบียนจังหวัด รหัสประเทศ" [ref=f20e130]:
                                    - cell "ทะเบียนรถพ่วง/กึ่งพ่วง" [ref=f20e131]
                                    - cell "ทะเบียนจังหวัด" [ref=f20e132]:
                                      - textbox [ref=f20e133]
                                      - text: ทะเบียนจังหวัด
                                      - textbox "รหัสจังหวัดของเลขทะเบียนรถพ่วง/กึ่งพ่วง" [ref=f20e134]
                                    - cell "รหัสประเทศ" [ref=f20e135]:
                                      - generic "Click เพื่อดูข้อมูล Master file" [ref=f20e137] [cursor=pointer]: รหัสประเทศ
                                    - cell [ref=f20e138]:
                                      - textbox "รหัสประเทศของเลขทะเบียนรถพ่วง/กึ่งพ่วง" [ref=f20e139]
                                  - row "ชนิดตู้ No Container ประเภทรถ E-Seal No." [ref=f20e140]:
                                    - cell "ชนิดตู้" [ref=f20e141]
                                    - cell "No Container ประเภทรถ" [ref=f20e142]:
                                      - combobox [ref=f20e143]:
                                        - option "No Container" [selected]
                                        - option "1 = More than one quarter volume available"
                                        - option "2 = More than half volume available"
                                        - option "3 = More than three quarters volume available"
                                        - option "4 = MTY"
                                        - option "5 = Full"
                                        - option "6 = No volume available"
                                        - option "7 = LCL"
                                        - option "8 = FCL"
                                        - option "9 = LCL/ CFS"
                                      - generic [ref=f20e144]:
                                        - text: ประเภทรถ
                                        - textbox [ref=f20e145]
                                    - cell "E-Seal No." [ref=f20e146]:
                                      - generic [ref=f20e147]: E-Seal No.
                                    - cell [ref=f20e148]:
                                      - textbox [ref=f20e149]
                                  - row "หมายเลขตู้ Code เคลื่อนย้ายของโดยทาง ทางเรือ คลิ๊กดู Cont Code." [ref=f20e150]:
                                    - cell "หมายเลขตู้" [ref=f20e151]
                                    - cell "Code" [ref=f20e152]:
                                      - textbox [disabled] [ref=f20e153]
                                      - generic "Click เพื่อดูข้อมูล Master file" [ref=f20e154] [cursor=pointer]:
                                        - generic [ref=f20e155]: Code
                                      - textbox [disabled] [ref=f20e156]
                                    - cell "เคลื่อนย้ายของโดยทาง" [ref=f20e157]
                                    - cell "ทางเรือ คลิ๊กดู Cont Code." [ref=f20e158]:
                                      - combobox [ref=f20e159]:
                                        - option "-- กรุณาเลือก --"
                                        - option "ทางเรือ" [selected]
                                        - option "ทางรถไฟ"
                                        - option "ทางรถยนต์"
                                        - option "ทางเครื่องบิน"
                                      - link "คลิ๊กดู Cont Code." [ref=f20e161] [cursor=pointer]:
                                        - /url: ./runtime/template/containersizetype.pdf
                                  - row "GPS ID" [ref=f20e162]:
                                    - cell [ref=f20e163]
                                    - cell [ref=f20e164]
                                    - cell "GPS ID" [ref=f20e165]
                                    - cell [ref=f20e166]:
                                      - textbox [ref=f20e167]
                                  - row "Remark เพิ่มเติม (ไม่ส่งกรมฯ)" [ref=f20e168]:
                                    - cell [ref=f20e169]
                                    - cell [ref=f20e170]
                                    - cell "Remark เพิ่มเติม (ไม่ส่งกรมฯ)" [ref=f20e171]:
                                      - generic [ref=f20e172]:
                                        - text: Remark เพิ่มเติม
                                        - text: (ไม่ส่งกรมฯ)
                                    - cell [ref=f20e173]:
                                      - textbox [ref=f20e174]
                                  - row:
                                    - cell
                                  - row "Authorizer Name" [ref=f20e175]:
                                    - cell "Authorizer Name" [ref=f20e176]
                                    - cell [ref=f20e177]:
                                      - textbox [ref=f20e178]
                            - group "ข้อมูลใหม่" [ref=f20e179]:
                              - generic [ref=f20e180]: ข้อมูลใหม่
                              - table [ref=f20e182]:
                                - rowgroup [ref=f20e183]:
                                  - row "สินค้าบรรจุ 0 - ไม่อยู่ในตู้คอนเทนเนอร์" [ref=f20e184]:
                                    - cell "สินค้าบรรจุ" [ref=f20e185]
                                    - cell "0 - ไม่อยู่ในตู้คอนเทนเนอร์" [ref=f20e186]:
                                      - combobox [ref=f20e187]:
                                        - option "-- กรุณาเลือก --"
                                        - option "0 - ไม่อยู่ในตู้คอนเทนเนอร์" [selected]
                                        - option "1 - อยู่ในตู้คอนเทนเนอร์"
                                  - row "ท่า Transited ถ่ายของ (ก่อนท่าสุดท้าย) รหัสเมืองปลายทางขนถ่าย" [ref=f20e188]:
                                    - cell "ท่า Transited ถ่ายของ (ก่อนท่าสุดท้าย)" [ref=f20e189]:
                                      - text: ท่า Transited ถ่ายของ
                                      - text: (ก่อนท่าสุดท้าย)
                                    - cell [ref=f20e190]:
                                      - textbox [ref=f20e192]
                                    - cell "รหัสเมืองปลายทางขนถ่าย" [ref=f20e193]
                                    - cell [ref=f20e194]:
                                      - textbox [ref=f20e196]
                                  - row "Goods Cargo Type 1 - General" [ref=f20e197]:
                                    - cell "Goods Cargo Type" [ref=f20e198]
                                    - cell "1 - General" [ref=f20e199]:
                                      - combobox [ref=f20e200]:
                                        - option "1 - General" [selected]
                                        - option "2 - Dangerous"
                                        - option "7 - ของสดของเสียง่าย"
                                    - cell [ref=f20e201]
                                    - cell [ref=f20e202]
                                  - row "Remark (ส่งกรมฯ)" [ref=f20e203]:
                                    - cell "Remark (ส่งกรมฯ)" [ref=f20e204]
                                    - cell [ref=f20e205]:
                                      - textbox [ref=f20e206]
                            - iframe [ref=f20e207]:
                              
              - row:
                - cell
```

# Test source

```ts
  1   | import fs from 'fs'
  2   | import { test, Page, Frame, Dialog, Request, Route, BrowserContext, expect } from '@playwright/test'
  3   | 
  4   | /**
  5   |  * Shared plumbing for the ShippingNet Pluz+ legacy pages (PHP, full-page form posts,
  6   |  * frames, native alert/confirm/prompt, jQuery $.get autocomplete).
  7   |  */
  8   | 
  9   | export type SpnSession = { uid: string; ucode: string }
  10  | 
  11  | /**
  12  |  * Time budgets grow with SLOW_MO (playwright.config.ts → launchOptions.slowMo): a flow of
  13  |  * ~150 actions slowed by 500 ms each needs minutes more than the normal budget.
  14  |  * 0 → ×1, 500 ms → ×6.
  15  |  */
  16  | export const SLOW_FACTOR = 1 + (Number(process.env.SLOW_MO) || 0) / 100
  17  | 
  18  | /** Service pages live next to the SPN shell: …/standard/IE5DEV.shippingnet/data_defaulttemplate.php */
  19  | export function serviceBaseUrl(): string {
  20  |   if (process.env.IE5_BASE_URL) return process.env.IE5_BASE_URL
  21  |   return new URL('../IE5DEV.shippingnet/data_defaulttemplate.php', process.env.APP_BASE_URL).toString()
  22  | }
  23  | 
  24  | export function serviceUrl(session: SpnSession, params: Record<string, string>): string {
  25  |   const url = new URL(serviceBaseUrl())
  26  |   url.searchParams.set('UID', session.uid)
  27  |   url.searchParams.set('UCODE', session.ucode)
  28  |   for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  29  |   return url.toString()
  30  | }
  31  | 
  32  | const STALE_FLAG = '__pwStaleDocument'
  33  | 
  34  | function frameOf(page: Page, frameName?: string): Frame {
  35  |   const frame = frameName ? page.frame({ name: frameName }) : page.mainFrame()
  36  |   if (!frame) throw new Error(`frame "${frameName}" not found`)
  37  |   return frame
  38  | }
  39  | 
  40  | /**
  41  |  * Run `action` and wait until the page (or the named frame) has loaded a NEW document.
  42  |  * The legacy forms post back to the same URL, so a URL wait can't tell old from new —
  43  |  * the current document is flagged first and we wait for a document without the flag.
  44  |  */
  45  | export async function waitForReload(page: Page, action: () => Promise<unknown>, frameName?: string, timeoutMs = 45_000) {
  46  |   await frameOf(page, frameName).evaluate((flag) => {
  47  |     ;(window as unknown as Record<string, boolean>)[flag] = true
  48  |   }, STALE_FLAG)
  49  |   await action()
  50  |   await expect
  51  |     .poll(
  52  |       async () => {
  53  |         const frame = frameName ? page.frame({ name: frameName }) : page.mainFrame()
  54  |         if (!frame) return false
  55  |         try {
  56  |           return await frame.evaluate(
  57  |             (flag) => !(window as unknown as Record<string, boolean>)[flag] && document.readyState === 'complete',
  58  |             STALE_FLAG,
  59  |           )
  60  |         } catch {
  61  |           return false // navigating — execution context replaced
  62  |         }
  63  |       },
  64  |       { message: `${frameName ?? 'page'} reloaded`, timeout: timeoutMs },
  65  |     )
  66  |     .toBe(true)
  67  | }
  68  | 
  69  | /**
  70  |  * Wait until the named frame holds a fully loaded document. Form fields get their
  71  |  * keyup/blur handlers (autocomplete, lookups) on document ready — typing before that
  72  |  * silently skips the lookup.
  73  |  */
  74  | export async function waitForFrameReady(page: Page, frameName: string) {
  75  |   await expect
  76  |     .poll(
  77  |       async () => {
  78  |         const frame = page.frame({ name: frameName })
  79  |         if (!frame) return false
  80  |         try {
  81  |           return await frame.evaluate(() => document.readyState === 'complete' && typeof (window as unknown as { jQuery?: unknown }).jQuery === 'function')
  82  |         } catch {
  83  |           return false
  84  |         }
  85  |       },
  86  |       { message: `${frameName} ready`, timeout: 45_000 },
  87  |     )
> 88  |     .toBe(true)
      |      ^ Error: detailfrm ready
  89  | }
  90  | 
  91  | /**
  92  |  * Counts in-flight XHR/fetch requests of a page (all frames). Autocomplete and
  93  |  * "load importer/consignor" lookups are jQuery $.get calls fired on keyup/Enter/blur;
  94  |  * waiting for zero in-flight requests is the only completion signal they give.
  95  |  */
  96  | class AjaxTracker {
  97  |   private inflight = new Map<Request, number>()
  98  |   constructor(page: Page) {
  99  |     const isAjax = (r: Request) => ['xhr', 'fetch'].includes(r.resourceType())
  100 |     page.on('request', (r) => {
  101 |       if (isAjax(r)) this.inflight.set(r, Date.now())
  102 |     })
  103 |     const done = (r: Request) => void this.inflight.delete(r)
  104 |     page.on('requestfinished', done)
  105 |     page.on('requestfailed', done)
  106 |   }
  107 |   /** Requests still running. One whose frame navigated away never reports back — after 15 s it is ignored. */
  108 |   private pending() {
  109 |     const now = Date.now()
  110 |     return [...this.inflight.values()].filter((t) => now - t < 15_000).length
  111 |   }
  112 |   async idle(timeout = 20_000) {
  113 |     await expect.poll(() => this.pending(), { message: 'pending lookups finished', timeout }).toBe(0)
  114 |   }
  115 | }
  116 | 
  117 | const trackers = new WeakMap<Page, AjaxTracker>()
  118 | export function ajax(page: Page): AjaxTracker {
  119 |   let t = trackers.get(page)
  120 |   if (!t) trackers.set(page, (t = new AjaxTracker(page)))
  121 |   return t
  122 | }
  123 | 
  124 | export type PdfFile = { fileName: string; data: Buffer }
  125 | 
  126 | /**
  127 |  * Run `action` and capture the PDF it produces. Headless Chromium turns the PDF
  128 |  * response into a download; headed Chromium (--headed / --ui) shows it in its PDF
  129 |  * viewer and no download happens — so whichever arrives first is taken.
  130 |  */
  131 | export async function capturePdf(page: Page, action: () => Promise<unknown>, timeout = 60_000): Promise<PdfFile> {
  132 |   const viaDownload = page.waitForEvent('download', { timeout }).then(async (d) => ({
  133 |     fileName: d.suggestedFilename(),
  134 |     data: fs.readFileSync(await d.path()),
  135 |   }))
  136 |   const viaViewer = page
  137 |     .waitForResponse((r) => /\.pdf(\?|$)/i.test(new URL(r.url()).pathname) && r.status() === 200, { timeout })
  138 |     // the body of a response shown in the PDF viewer isn't the file itself — fetch the same
  139 |     // (session-scoped) URL again with the page's cookies
  140 |     .then(async (r) => ({
  141 |       fileName: decodeURIComponent(new URL(r.url()).pathname.split('/').pop() ?? ''),
  142 |       data: await (await page.request.get(r.url())).body(),
  143 |     }))
  144 |   await action()
  145 |   return Promise.any([viaDownload, viaViewer])
  146 | }
  147 | 
  148 | /**
  149 |  * Run `action` and take the file it produces, from any page of the context (some print
  150 |  * forms open a blank window first and the file arrives there).
  151 |  *
  152 |  * Headless Chromium saves a PDF as a download; headed Chromium (--headed / --ui) shows it
  153 |  * in its PDF viewer instead — no download, and the viewer hides the bytes. So in a headed
  154 |  * run the app's page responses are also passed through a route that keeps a copy of any
  155 |  * PDF body. The response is handed to the browser unchanged (not mocked) — the route only
  156 |  * reads it. (Headless doesn't need it, and routing there would interrupt the download.)
  157 |  */
  158 | export async function captureDownload(page: Page, action: () => Promise<unknown>, timeout = 60_000): Promise<PdfFile> {
  159 |   const context = page.context()
  160 |   let done: (f: PdfFile) => void = () => {}
  161 |   const file = new Promise<PdfFile>((resolve, reject) => {
  162 |     const timer = setTimeout(() => reject(new Error(`no file within ${timeout} ms`)), timeout)
  163 |     done = (f) => {
  164 |       clearTimeout(timer)
  165 |       resolve(f)
  166 |     }
  167 |   })
  168 | 
  169 |   const watch = (p: Page) =>
  170 |     p.once('download', async (d) => {
  171 |       try {
  172 |         done({ fileName: d.suggestedFilename(), data: fs.readFileSync(await d.path()) })
  173 |       } catch {
  174 |         // headed run: the route below already took the file and the download was cancelled
  175 |       }
  176 |     })
  177 |   context.pages().forEach(watch)
  178 |   context.on('page', watch)
  179 | 
  180 |   const headed = test.info().project.use.headless === false
  181 |   const pattern = /data_defaulttemplate\.php/
  182 |   const keepPdf = async (route: Route) => {
  183 |     if (route.request().resourceType() !== 'document') return route.fallback()
  184 |     const response = await route.fetch()
  185 |     const type = response.headers()['content-type'] ?? ''
  186 |     if (/application\/pdf/i.test(type)) {
  187 |       const body = await response.body()
  188 |       if (body.subarray(0, 4).toString('latin1') === '%PDF') {
```