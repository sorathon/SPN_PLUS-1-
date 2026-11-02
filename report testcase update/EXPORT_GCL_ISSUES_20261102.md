# รวมเคสที่มีปัญหาและประเด็นต้องตรวจ — Export / GCL

จัดทำวันที่ 2 พฤศจิกายน 2026 ตามเวลาไทย

รายละเอียดขั้นตอน Export ทั้ง 11 เคสในกลุ่ม Control/Job No. และ GCL ที่ใช้หลาย Detail อยู่ใน [เอกสารรายละเอียดรายเคส](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/EXPORT_CONTROL_GCL_MULTI_DETAIL_DETAILS_20261102.md)

เอกสารนี้รวบรวมผลที่บันทึกไว้ โค้ดชุดปัจจุบัน และโค้ดที่ตรวจจาก `C:/Users/iTservice/Downloads/SPN_PLUS.rar` ไม่ใช่ผลการรันทดสอบรอบใหม่ และไม่ได้ยืนยันว่าข้อผิดพลาดฝั่งเซิร์ฟเวอร์ยังเกิดอยู่ในวันที่จัดทำ

## 1. ขอบเขตและสถานะล่าสุด

อิง [short-results.json](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/data/short-results.json) ซึ่งบันทึกเวลาอัปเดต 2 พฤศจิกายน 2026 เวลา 10:43:49 น.

| ชุด | เคสที่ใช้งาน | ผ่าน | ไม่ผ่าน | ข้าม/ปิดใช้งาน | รอรัน |
|---|---:|---:|---:|---:|---:|
| Export | 68 | 66 | 2 | 0 | 0 |
| GCL | 105 | 94 | 1 | 6 | 4 |
| รวม | 173 | 160 | 3 | 6 | 4 |

มี 13 เคสที่สถานะล่าสุดยังไม่ใช่ผ่าน แยกเป็นข้อผิดพลาด 3 เคส, ข้าม/ปิดใช้งาน 6 เคส และรอรันทวนข้อมูลชุดใหม่ 4 เคส การข้ามหรือรอรันไม่ได้หมายความว่าพบข้อผิดพลาดของระบบแล้ว

ผลบางรายการกู้มาจาก HTML เดิม หลังโฟลเดอร์ ai-support ถูกลบ จึงมีรายละเอียดข้อผิดพลาดแต่ไม่มี trace เก่าครบทุกเคส สถานะ PASS ของเคสอื่นเป็นผลสะสม ไม่ใช่การรับรองว่าผ่านด้วยโค้ดและข้อมูลชุดล่าสุดทั้งหมด

## 2. Export — เคสที่ยังไม่ผ่าน

### TC-EXP-050 — ดาวน์โหลดโดยไม่เลือกแถว

- ขั้นตอน: ไม่เลือก checkbox ใน Export List แล้วกดปุ่ม Save/Download แต่ละชนิด
- คาดหวัง: มีข้อความให้เลือกรายการ และไม่เริ่มการส่งออกไฟล์
- ผลที่บันทึก: ปุ่ม Save XLS New ไม่มี selection alert; บันทึก debug ระบุว่า handler เริ่ม AJAX โดยไม่มี countSel guard
- ผลล่าสุด: **ไม่ผ่าน**; บันทึกรันทวน 30 ตุลาคม 2026 เวลา 10:30:03 น.
- ผลกระทบ: พฤติกรรมป้องกันการกดโดยไม่มีรายการไม่สอดคล้องกับปุ่มอื่น
- จุดที่ควรตรวจ: เงื่อนไขตรวจรายการที่เลือกใน handler ของ Save XLS New ก่อนเริ่ม AJAX
- โค้ดทดสอบ: [files.spec.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/files.spec.ts)
- หลักฐาน: รายละเอียดใน short-results.json ที่กู้จาก HTML; ไม่มี trace เดิมที่ยืนยันในข้อมูลผลรายการนี้

### TC-EXP-064 — Import XML กลับแล้วได้ Item เกิน

- ขั้นตอน: สร้าง Export ที่มี Control + Invoice + Item 1 รายการ → Save XML → Import XML กลับจาก Export List
- คาดหวัง: ได้ Export ใหม่ที่มี Invoice/Item ตรงต้นทาง และมี Item 1 รายการ
- ผลที่บันทึก: XML มี Detail 1 รายการและ child fields 19 ช่อง แต่หลัง Import ได้ Item 19 รายการ คือรายการจริง 1 และแถว `0000-0000` อีก 18
- ผลล่าสุด: **ไม่ผ่าน**; บันทึกรันทวน 30 ตุลาคม 2026 เวลา 10:26:25 น.
- ผลกระทบ: เพิ่ม Item ที่ไม่ควรมีระหว่างนำเข้า XML เป็นประเด็นการเพิ่มข้อมูลผิดจำนวนใน Export แยกจากปัญหา Detail ของ GCL
- จุดที่ควรตรวจ: การวนอ่าน Detail และ child fields ของ XML ในตัวนำเข้า โดยยังต้องตรวจโค้ดฝั่งเซิร์ฟเวอร์เพื่อยืนยันสาเหตุ
- โค้ดทดสอบ: [copy-import-delete.spec.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/copy-import-delete.spec.ts)
- หลักฐาน: รายละเอียดใน short-results.json ที่กู้จาก HTML; ไม่มี trace เดิมที่ยืนยันในข้อมูลผลรายการนี้

## 3. GCL — ปัญหาที่พบและเคสที่ปิดเพื่อป้องกันข้อมูลเพิ่มผิดปกติ

### TC-GCL-086 — New Row รับค่าผิดรูปแบบแล้วเพิ่มแถว

- ขั้นตอนเดิม: กรอก New Row เป็นค่าว่าง, `0`, `-1`, `abc` แล้วเพิ่มแถว/เปิด Ref ซ้ำ
- คาดหวัง: ค่าที่ไม่ถูกต้องต้องไม่เพิ่ม Detail
- ผลที่บันทึก: ค่าว่างทำให้จำนวนแถวจาก 1 เป็น 2; ค่า `abc` ทำให้พบแถวจาก 1 เป็น 75 ก่อนรอหน้า Detail ไม่สำเร็จ
- Ref ทดสอบ: **HQVM400001917**, GCL parent **gtcid:1101**; Export ต้นทาง **HQVM200002190**, **ExDclCtrl:1958**
- เวลาคำขอ `rowDetail=abc`: **30 ตุลาคม 2026 เวลา 20:29:29.249 น.** มีคำขอลบ Detail ใน flow คืนข้อมูลเวลา **20:30:00.492 น.** และจบเคสเวลา **20:32:36.528 น.** พร้อมคำเตือนว่า cleanup ไม่สำเร็จ
- ผลล่าสุดในชุดปัจจุบัน: **ข้าม/ปิดใช้งาน ไม่ใช่ PASS**; นำ body ที่ส่งค่าผิดรูปแบบออกแล้ว และ helper New Row รับเฉพาะจำนวนเต็ม 1–3
- ใน RAR: **ยังมี body เดิมและยังเปิดรัน** รวมการกรอก `-1` และ `abc`; helper New Row ใน RAR ยังไม่มีข้อจำกัด 1–3
- ข้อจำกัดการสรุป: หลักฐาน UI ยืนยันการเพิ่มถึง 75 แถว ยังไม่ยืนยันจำนวนล้านหรือว่าเป็นต้นเหตุของ Detail ลอยทั้งหมดที่ Dev พบ ต้องเทียบ DB และ server log
- ตรวจต่อกับ Dev: เวลา 20:29–20:33 น. ของวันที่ 30 ตุลาคม 2026, gtcid 1101, เวลา creation ของแถวผิดปกติ และแถวที่ parent ว่าง/0/ไม่พบ parent
- โค้ดปัจจุบัน: [detail.spec.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/gcl/detail.spec.ts)
- หลักฐานเพิ่มเติม: [GCL_ORPHAN_DETAIL_DEV_HANDOFF.md](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/GCL_ORPHAN_DETAIL_DEV_HANDOFF.md)
- การปิดเคสป้องกันการรันซ้ำ ไม่ได้แก้ validation หรือข้อมูลค้างฝั่งเซิร์ฟเวอร์

### TC-GCL-104 — บันทึก Package/Gross ติดลบได้

- ขั้นตอน: กรอก Package และ Gross Weight เป็น `-1` และ `abc` → Save → เปิด Ref ซ้ำ
- คาดหวัง: ไม่เก็บค่าติดลบ/ตัวอักษร และค่าตัวเลขต้องไม่น้อยกว่า 0
- ผลที่บันทึก: Package เก็บ `-1`; Gross Weight เก็บ `-1.000`; `abc` ถูกแปลงเป็น `0`/`0.000`
- Ref: **HQVM400001919**; รายงานระบุว่าตรวจครบและคืนค่าเดิมแล้ว
- ผลล่าสุด: **ไม่ผ่าน**; บันทึก 30 ตุลาคม 2026 เวลา 20:38:41 น.
- จุดที่ควรตรวจ: validation ฝั่งบันทึก Detail และการแปลงค่าตัวเลข ไม่ควรเปลี่ยน expected ให้ยอมรับค่าลบเพื่อทำให้เคสผ่าน
- โค้ดทดสอบ: [detail.spec.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/gcl/detail.spec.ts)
- หลักฐาน: [incremental.jsonl รอบรันทวน](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/runs/valid-local-20261030-131927655-01/incremental.jsonl)

## 4. GCL — เคสที่ข้ามเพราะยังขาดข้อมูลหรือเกณฑ์ตรวจ

ทั้งห้าเคสด้านล่างยังไม่ใช่ข้อผิดพลาดที่ยืนยันแล้ว และต้องไม่ตีความเป็น PASS

| ID | ฟังก์ชัน | เหตุผลที่ข้าม / สิ่งที่ต้องเตรียม |
|---|---|---|
| TC-GCL-084 | เพิ่มใบขนต้นทางเดิมซ้ำ | ยังไม่ยืนยันกติกา duplicate/partial shipment และจำนวนแถวที่ถูกต้อง ต้องกำหนด `SPN_GCL_DUPLICATE_ROWS` |
| TC-GCL-102 | ปรับสัดส่วนตาม Package | ยังไม่ยืนยันผลคำนวณ/การปัดเศษ ต้องกำหนด `SPN_GCL_PROPORTION_GROSS` สำหรับ Package = 5 |
| TC-GCL-103 | สัดส่วนเมื่อ Planned Package = 0 | ขาด Export ทดสอบที่เป็นเจ้าของและมี Package ต้นทาง 0 ต้องกำหนด `SPN_GCL_ZERO_PACKAGE_REF` |
| TC-GCL-106 | รวมยอดต่างหน่วย | ขาด source ต่างหน่วยและผลรวมที่ยืนยัน ต้องกำหนด `SPN_GCL_MIXED_REFS` และ `SPN_GCL_MIXED_FOOTER` |
| TC-GCL-170 | Check Status | ขาด Ref ทดสอบสำหรับสถานะภายนอก ต้องกำหนด `SPN_GCL_STATUS_REF` |

TC-GCL-086 เป็นเคสข้ามลำดับที่หก แต่แยกไว้ในหัวข้อ 3 เพราะมีข้อผิดพลาดเดิมและถูกปิดเพื่อป้องกันการรันซ้ำ

## 5. GCL — ปรับ fixture แล้ว แต่ยังรอรันทวนบนเว็บ

| ID | ชุดใน RAR | ชุดปัจจุบัน | สถานะล่าสุด |
|---|---|---|---|
| TC-GCL-151 | CSV กลุ่มแรก: 1 GCL / 2 Detail | 1 GCL / 1 Detail | รอรัน |
| TC-GCL-152 | CSV 2 Header: 2 GCL / ใบละ 2 Detail | 2 GCL / ใบละ 1 Detail | รอรัน |
| TC-GCL-153 | แต่ละ variant ใช้ 2 Detail; variant decimal แก้แถวที่สองด้วย | แต่ละ variant ใช้ 1 Detail | รอรัน |
| TC-GCL-157 | DAT เดิม 2 Detail และใช้ Ref ในไฟล์เดิม | DAT 1 Detail พร้อม Ref ทดสอบใหม่ที่ตรวจไม่ซ้ำ | รอรัน |

ผล PASS ใน RAR เป็นผลของชุดเดิม ไม่ใช่หลักฐานว่าชุด 1 Detail ผ่านแล้ว การตรวจโครงสร้างไฟล์และ TypeScript ที่ผ่านไม่เท่ากับการรันทดสอบบนเว็บ

ดู [GCL_MINIMAL_FIXTURES.md](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/GCL_MINIMAL_FIXTURES.md) และ [fixture-updates.json](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/data/fixture-updates.json)

## 6. เคสที่ลบจากชุดรันแล้ว แต่มีประเด็นที่ต้องเก็บประวัติ

| ID | ประเด็น / เหตุผลที่ลบ | สถานะ |
|---|---|---|
| TC-GCL-154 | CSV ผิดรูปแบบไม่แสดงการปฏิเสธตามคาด; รหัสบริษัทที่ไม่มีใน master ยังสร้าง GCL HQVM400001912 (gtcid1096) ได้ ผลยังเกิดหลังแก้จังหวะรอหน้าโหลด | ผู้ใช้สั่งลบเคส; ไม่ได้หมายความว่าแก้บั๊กฝั่งเซิร์ฟเวอร์แล้ว |
| TC-GCL-156 | Upload ไฟล์ H/D ของ New Upload เข้า workspace ทำให้ข้อความหัวตารางถูกเขียนลง Control เช่น `containerLoader=//Row header (=H)` และวันที่ว่าง | ผู้ใช้สั่งลบเคส; ไม่ได้หมายความว่าแก้บั๊กฝั่งเซิร์ฟเวอร์แล้ว |
| TC-GCL-183 | เคส Upload CSV แบบข้อมูลจริงจาก workspace; ไฟล์เดิมมี 8 Detail แต่ไม่พบ body ของเคสนี้ใน RAR ที่ส่งมาแล้ว | ลบจากสคริปต์; ยังมี ID ใน exclusions เพื่อป้องกันนำกลับ |
| TC-EXP-070 | ส่งข้อมูลจริงด้วย Send to ThaiCustoms | ลบตามคำสั่งผู้ใช้ |
| TC-GCL-171 | ทดสอบก่อนส่งด้วย flow Send to ThaiCustoms | ลบตามคำสั่งผู้ใช้ |
| TC-GCL-172 | ส่งข้อมูล GCL จริงด้วย Send to ThaiCustoms | ลบตามคำสั่งผู้ใช้ |

TC-GCL-NEW-002 ถึง TC-GCL-NEW-018 ถูกลบตามคำสั่งก่อนหน้านี้ด้วย ไม่รวมในจำนวนเคสใช้งาน 173 เคส และไม่มีผลใหม่ให้ใช้สรุปเป็นข้อผิดพลาดในเอกสารนี้

อิง [excluded-cases.json](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/scripts/testcases-runtime/excluded-cases.json) และ [debug-notes.json](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/data/debug-notes.json)

## 7. เคสที่เคยมีปัญหาและรันทวนผ่านแล้ว

| ID | ประเด็น / ผลล่าสุด |
|---|---|
| TC-GCL-081 | เคยอยู่ในชุดที่ต้องรันทวน; เพิ่ม source 1 ใบและเปิดซ้ำค่าตรงแล้ว ผลล่าสุด PASS, Ref HQVM400001914 |
| TC-GCL-082 | รอ createBTN เดิม 5 วินาทีไม่พอ ทั้งที่หน้าโหลดได้; แก้รอเป็น 45 วินาทีตาม flow เดิม รันทวน PASS, Ref HQVM400001922 |
| TC-GCL-083 | รันทวนกรณี Add Detail โดยไม่เลือก source แล้วมี dialog ใหม่และข้อมูลเดิมไม่เปลี่ยน ผลล่าสุด PASS, Ref HQVM400001916 |
| TC-GCL-101 | รันทวนเทียบ Tree/source/จำนวนกับ Detail แล้วตรงกัน ผลล่าสุด PASS, Ref HQVM400001918 |

หลักฐาน: [GCL_DEBUG_RESULTS_20261030.md](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/GCL_DEBUG_RESULTS_20261030.md), รอบ `valid-local-20261030-131927655-01` และ `valid-local-20261030-133949621-01` เอกสาร debug เดิมยังแสดงยอดรวมก่อนปิด 086/เปลี่ยน fixture ให้ใช้ยอดล่าสุดในหัวข้อ 1 ของเอกสารนี้

## 8. Export — Control เปล่าและ Job No. give me decl no

หัวข้อนี้เป็นประเด็นการเตรียมข้อมูลทดสอบ ไม่ใช่ข้อสรุปว่าเคสต่อไปนี้ FAIL

| ลักษณะข้อมูล | ID |
|---|---|
| สร้าง Control เปล่า ไม่กรอก `give me decl no` | TC-EXP-010, TC-EXP-030 |
| เริ่มจาก Control เปล่า แล้วกรอก Job No. `give me decl no` โดยไม่มี Invoice/Item | TC-EXP-015, TC-EXP-016, TC-EXP-034 |
| กรอก Control แต่ไม่มี Invoice/Item แล้วกรอก Job No. `give me decl no` | TC-EXP-039 |
| มี Control + Invoice + Item แล้วกรอก Job No. `give me decl no` | TC-EXP-043, TC-EXP-071, TC-EXP-080, TC-EXP-081, TC-EXP-082 |

รวม 9 เคสที่ใช้ข้อความนี้ใน Job No. แล้วกด Re-Avg and Calc Tax เพื่อขอเลขใบขน/สถานะ ACCEPT ตาม helper ของไซต์ทดสอบ ไม่ใช่ชื่อปุ่ม Give Me และ TC-EXP-071 มีเงื่อนไขเปิดอนุญาตทดสอบ Cancel ก่อนทำงาน

TC-EXP-025 (Validate), TC-EXP-040/041 (Print) ไม่เรียก helper ขอเลขด้วยข้อความนี้; การ Print Form บนหน้า Send ใช้ Ref ที่มีอยู่แล้ว จึงต้องแยกการตรวจผลกับเคสที่สร้างข้อมูลใหม่

หากต้องการให้ทุกเคสที่ขอเลขใบขนมี Invoice/Item ครบ จะเป็นการเปลี่ยนเงื่อนไขของเคส 015/016/034/039; เอกสารนี้ยังไม่ได้เปลี่ยน flow ดังกล่าว

อิง [CreationPage.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/pages/export/CreationPage.ts), [create-complete.spec.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/create-complete.spec.ts) และ [list-search.spec.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/list-search.spec.ts)

## 9. GCL — เคสที่ใช้ Detail มากกว่า 1 รายการ

หลาย Detail ไม่ใช่ข้อผิดพลาดโดยตัวมันเอง เคสกลุ่มนี้มีวัตถุประสงค์ทดสอบความสัมพันธ์ การลบ ลำดับ และยอดรวม

| ID | จำนวนตามการเตรียมข้อมูล / วัตถุประสงค์ |
|---|---|
| TC-GCL-022 | เลือก 2 ใบขนต้นทาง สร้าง Detail เชื่อมกับแต่ละใบ |
| TC-GCL-082 | Add Detail จาก 2 ใบขนต้นทาง |
| TC-GCL-085 | เริ่มจาก Detail ของ source 1 ใบ แล้วเพิ่มแถว 1 และ 2 ตามลำดับ ปกติรวม 4 แถว; แถวใหม่ไม่ใช่การเพิ่มใบขนต้นทางที่กรอกครบทั้งหมด |
| TC-GCL-088 | 2 รายการสำหรับสลับ Item No. และตรวจ mapping |
| TC-GCL-090 | เริ่ม 2 รายการ เพื่อลบ 1 แล้วตรวจรายการที่เหลือ |
| TC-GCL-100 | 2 รายการ เพื่อตรวจ Package รวม 15 และ Gross รวม 200 |
| TC-GCL-101 | 2 รายการ เพื่อตรวจ Tree เทียบกับตาราง |
| TC-GCL-084 | จำนวนหลังเพิ่ม source ซ้ำขึ้นกับกติกา/ค่าที่กำหนด; ยังข้าม |
| TC-GCL-106 | หลายหน่วย ต้องมีหลายรายการตาม fixture; ยังข้าม |

ใน RAR ยังมี 151/152/153/157 ที่ใช้หลาย Detail ตามหัวข้อ 5 ส่วนชุดปัจจุบันลดข้อมูลตั้งต้นของสี่เคสนั้นแล้ว แต่ไม่ได้ลดเคสทดสอบหลายรายการด้านบน

TC-GCL-123 สร้างสำเนา GCL 2 ใบ, TC-GCL-141/143 เลือกเอกสาร GCL 2 ใบ และ TC-GCL-152 สร้าง 2 ใบตาม Header ต้องแยกจำนวนเอกสารออกจากจำนวน Detail ต่อ Ref เคสที่เปิด Ref เดิม เช่น Validate/Send files อาจมี Detail ตามข้อมูลจริงของ Ref นั้น ไม่ได้กำหนดให้ทุก Ref มี 1 แถว

## 10. Ref HQVM400001853 และข้อสงสัย 10 Detail / Detail ลอยจำนวนมาก

- การตรวจอ่านอย่างเดียวด้วย qaauto003 พบ Ref **HQVM400001853**, **gtcid1075**, มี Detail จริง **10 แถว**
- ข้อมูลตรงกับ DAT เดิม 2 แถวและ CSV เดิม 8 แถว แต่การจับคู่ข้อมูลไม่ยืนยันว่าใครหรือ testcase ใดนำเข้าทั้งสองไฟล์ลง Ref เดียวกัน
- ไม่พบ testcase ที่ตั้งใจสร้าง 10 Detail โดยตรง และ **ใน RAR ไม่มี body TC-GCL-183 ที่รันได้แล้ว** จึงห้ามสรุปว่า RAR ชุดนี้รัน 183 จนเกิด 10 แถว
- เลข **3691042–3691051** เป็น ID ของ Detail ไม่ใช่จำนวนแถว
- Tree มีลิงก์ไป GCL อื่นด้วย จำนวนรายการใน Tree จึงไม่ใช่จำนวน Detail ของ Ref นี้โดยตรง
- การพบ 10 แถวใน Ref นี้ไม่ตัดความเป็นไปได้ว่ามี Detail ลอยที่ Ref อื่นหรือแถวที่ไม่มี parent ในฐานข้อมูล
- ยังไม่มี DB/server log ยืนยันว่า 10 แถวนี้ หรือ TC-GCL-086 เป็นต้นเหตุของข้อมูลล้านแถวที่ Dev รายงาน ต้องสอบสวนแยกด้วย parent และเวลาสร้าง
- การลด fixture ครั้งต่อไปเป็น 1 Detail ไม่ได้ลบ 10 แถวเดิมหรือแก้ข้อมูลลอยฝั่งเซิร์ฟเวอร์

หลักฐาน: [GCL_REF_HQVM400001853_INSPECTION_20261102.md](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/GCL_REF_HQVM400001853_INSPECTION_20261102.md)

## 11. ความแตกต่างของ RAR กับชุดปัจจุบัน

รายงานใน RAR บันทึกเวลาอัปเดต **30 ตุลาคม 2026 เวลา 20:49:34 น.** ส่วนรายงานปัจจุบันที่ใช้ในเอกสารนี้บันทึก **2 พฤศจิกายน 2026 เวลา 10:43:49 น.**

| ประเด็น | ใน RAR | ชุดปัจจุบัน |
|---|---|---|
| TC-GCL-086 | FAIL และ body ทดสอบยังเปิด | ข้าม/ปิดใช้งาน และนำ body อันตรายออก |
| Helper New Row | ยังไม่มีการจำกัด 1–3 | ยอมรับเฉพาะจำนวนเต็ม 1–3 |
| CSV ชุด New Upload | TestCSV.csv กลุ่มละ 2 Detail | TestCSV_minimal.csv กลุ่มละ 1 Detail |
| DAT ค่าเริ่มต้น | HQVM400001853.dat มี 2 Detail | GCL_single_detail.dat มี 1 Detail พร้อมสร้าง Ref ทดสอบใหม่ |
| CSV แบบ workspace | ไฟล์เดิม 8 Detail | เตรียมไฟล์ 1 Detail; positive case 183 ยังคงถูกลบ |
| TC-GCL-151/152/153/157 | PASS ของข้อมูลชุดเก่า | รอรันทวนข้อมูลชุดใหม่ |
| TC-GCL-183 | ไม่มี body; มีชื่อใน exclusions | ไม่มี body; มีชื่อใน exclusions |

ตรวจ RAR โดยแตกเฉพาะ source/data/report ที่ใช้ทบทวนไว้ใน `C:/Users/iTservice/Downloads/SPNAutomate/rar-review-20261102-150152/SPN_PLUS` ไม่ได้ทับชุดหลัก ไม่ได้แก้ตัว RAR และไม่ได้รันชุดใน RAR

## 12. งานที่ยังต้องทำ

1. Dev ตรวจปัญหา Export 050/064 และ GCL 104 ตาม expected/actual ที่บันทึกไว้ แล้วรันทวนหลังแก้ระบบ
2. เทียบ DB/server log สำหรับ Detail ลอยกับหลักฐาน 086; การเปิด 086 กลับต้องรอการยืนยัน validation ฝั่งระบบและแผนทดสอบที่ไม่ทำให้เกิดข้อมูลเพิ่มผิดปกติ
3. หากจะใช้ RAR เป็นชุดรัน ต้องนำการปิด 086 และการลด fixture ที่ต้องการจากชุดปัจจุบันเข้าไปก่อน ชุดใน RAR ยังไม่มีการแก้สองเรื่องนี้
4. รันทวน 151/152/153/157 ด้วย fixture ใหม่ แล้วบันทึกผลจริงแทนสถานะรอรัน
5. เตรียมข้อมูล/เกณฑ์ตรวจที่ยังขาดของ 084/102/103/106/170 ก่อนสรุปผล

เอกสารนี้เป็นการรวมปัญหาและข้อจำกัดจากหลักฐานเดิม ไม่มีการเปลี่ยน flow, แก้ expected เพื่อให้ผ่าน, รันทดสอบบนเว็บ หรือแก้/ลบข้อมูลบนเซิร์ฟเวอร์ในรอบจัดทำเอกสาร
