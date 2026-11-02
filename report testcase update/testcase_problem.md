# รายละเอียด testcase — Export Control / Job No. และ GCL หลาย Detail

จัดทำวันที่ 2 พฤศจิกายน 2026 เวลาไทย จากการอ่านโค้ดชุดปัจจุบันและไฟล์ SPN_PLUS.rar ที่ผู้ใช้ส่งมา ไม่มีการรันทดสอบบนเซิร์ฟเวอร์ในรอบจัดทำเอกสาร

เอกสารนี้อธิบาย Export ทั้ง 11 เคสในตารางที่ผู้ใช้ระบุ และ GCL ที่ใช้หลาย Detail รวมกรณีใน RAR ที่ต่างจากชุดปัจจุบัน ไม่ใช่รายการข้อผิดพลาดทั้งหมด ดูประเด็น FAIL/ข้าม/รอรันเพิ่มเติมใน [รายงานปัญหา Export/GCL](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/EXPORT_GCL_ISSUES_20261102.md)

## 1. คำที่ใช้และข้อมูลตั้งต้น

- **Control เปล่า** หมายถึงสร้าง Export ด้วย F7 New แล้วไม่เรียกฟังก์ชันกรอก Header/Invoice/Item เพิ่ม หน้าจอยังมีค่าเริ่มต้นจากระบบ เช่น Document Type ไม่ได้หมายความว่าทุกช่องในฐานข้อมูลว่าง
- **กรอก Control** หมายถึงกรอกข้อมูลส่วนหัว เช่น ผู้ส่งออก เรือ/เที่ยวเรือ ท่าปล่อย ท่าบรรทุก วันที่ หีบห่อ น้ำหนัก และเลขอ้างอิงขนส่ง แล้ว Save แต่ยังไม่เพิ่ม Invoice/Item
- **ข้อมูลครบสามส่วน** ในเอกสารนี้หมายถึง helper สร้าง Control + Invoice 1 ใบ + Item 1 รายการ ไม่ได้ยืนยันว่าข้อมูลผ่านทุกกฎธุรกิจของศุลกากร
- **give me decl no** คือข้อความที่กรอกลงช่อง **Job No.** จากนั้นกด **Re-Avg and Calc Tax** ตาม helper ของไซต์ทดสอบ สคริปต์คาดหวังเลขใบขนและสถานะ ACCEPT ไม่ใช่ชื่อปุ่ม Give Me และการใช้ helper นี้ไม่ได้ทดสอบการส่ง Send to ThaiCustoms
- **GCL Detail** ในบริบทนี้คือรายการใบขนต้นทางที่ผูกกับ GCL ต้องแยกจากจำนวน GCL, จำนวนหีบห่อ และ Item ภายใน Export
- ค่าตั้งต้นอย่าง **Package = 10**, **Invoice Quantity = 10** หรือ **Quantity = 10** เป็นจำนวนสินค้า/หีบห่อ ไม่ใช่การสร้าง Detail 10 แถว

helper Export ที่ใช้ร่วมกันมีดังนี้:

| Helper | ทำอะไร |
|---|---|
| createDraft / withDraft | เข้า Export List → F7 New → อ่าน Ref/ID ใหม่ ยังไม่กรอก Header/Invoice/Item |
| filled | สร้าง Draft → กรอก Control → Save |
| completeData | ทำ filled → เพิ่ม Invoice 1 ใบ → กรอกและ Save Item 1 รายการ |
| requestDeclarationNumber | กรอก Job No. เป็น give me decl no → กด Re-Avg and Calc Tax → รอข้อความคำนวณเสร็จ สูงสุด 120 วินาที |
| accept | เปิด Control ของ Ref → เรียก requestDeclarationNumber → กลับ List → ตรวจ Job No., เลขใบขนรูปแบบตัวอักษร/ตัวเลข 14 ตัว และสถานะ ACCEPT |

ค่าตั้งต้นของ Control ที่ใช้ filled/completeData: Transport Mode = 1, Voyage = EX001, Purchase/Destination Country = CN, Load/Release Port = 2801, Package = 10 PK, Net = 100, Gross = 120 และวันที่จาก SPN_RATE_DATE หรือวันนี้ ผู้ส่งออก/เรือเลือกจากข้อมูล master ตามการตั้งค่า จึงไม่ตายตัวทุกเครื่อง

อิง [Export _shared.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/_shared.ts) และ [CreationPage.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/pages/export/CreationPage.ts)

## 2. ตาราง Export ทั้ง 11 เคส

| ID | กรอก Control เพิ่ม | Invoice / Item | ใช้ give me decl no | เป้าหมายหลัก |
|---|---|---|---|---|
| TC-EXP-010 | ไม่กรอก | 0 / 0 | ไม่ใช้ | ตรวจ Draft ใหม่และค่าเริ่มต้น |
| TC-EXP-030 | ไม่กรอก | ไม่เพิ่มทั้งสองส่วน | ไม่ใช้ | ค้นหา Draft ด้วย Ref |
| TC-EXP-015 | ไม่กรอก Header เพิ่ม ยกเว้น Job No. | ไม่เพิ่มทั้งสองส่วน | ใช้ | ขอเลขใบขนและตรวจ ACCEPT |
| TC-EXP-016 | ไม่กรอก Header เพิ่ม ยกเว้น Job No. | ไม่เพิ่มทั้งสองส่วน | ใช้ | เปิดซ้ำแล้วเลข/สถานะ/ปุ่มถูกต้อง |
| TC-EXP-034 | ไม่กรอก Header เพิ่ม ยกเว้น Job No. | ไม่เพิ่มทั้งสองส่วน | ใช้ | ค้นหาผ่านตัวกรอง ACCEPT |
| TC-EXP-039 | กรอกและ Save | ไม่เพิ่มทั้งสองส่วน | ใช้ | ค้นหาด้วยเลขใบขน |
| TC-EXP-043 | กรอกและ Save | 1 / 1 | ใช้ | XML มี Ref และเลขใบขน |
| TC-EXP-071 | กรอกและ Save | 1 / 1 พร้อมข้อมูล cargo | ใช้ | ส่ง Cancel และตรวจ SEND_CANCEL |
| TC-EXP-080 | กรอกและ Save | 1 / 1 พร้อมข้อมูล cargo | ใช้ | Create GCL แล้วตรวจข้อมูลที่คัดลอก |
| TC-EXP-081 | กรอกและ Save; Mode = 4 | 1 / 1 | ใช้ | ตรวจปุ่มของ Export ทางอากาศหลัง ACCEPT |
| TC-EXP-082 | กรอกและ Save; Mode = 4 | 1 / 1 พร้อมข้อมูล cargo | ใช้ | Create Short และตรวจข้อมูลที่คัดลอก |

ทั้ง 11 เคสมีผลสะสมในรายงานปัจจุบันเป็นผ่าน แต่ไม่ได้รันใหม่ในรอบจัดทำเอกสาร TC-EXP-071 มีเงื่อนไขอนุญาต Cancel; ผล PASS เดิมไม่ได้ทำให้เคสนี้เปิดรันโดยอัตโนมัติ

## 3. Export — ขั้นตอนและสิ่งที่ตรวจรายเคส

### TC-EXP-010 — สร้าง Draft เปล่าและตรวจค่าเริ่มต้น

**วัตถุประสงค์:** ตรวจว่ากด F7 New แล้วได้ Export Draft ของตัวเอง โดยยังไม่มี Invoice/Item

ขั้นตอน:

1. เปิด Export List แล้วกด F7 New
2. รอ workspace และอ่าน Ref/ID ที่สร้างใหม่
3. ตรวจ Ref ตรงรูปแบบตัวอักษรใหญ่ 4 ตัวตามด้วยตัวเลข 9 ตัว
4. ตรวจหน้าจอแสดง 0 Invoice(s), 0 Item(s), Document Type = 1 และ Job No. ว่าง
5. กลับ List แล้วค้น Ref เดิม

**เกณฑ์ผ่าน:** พบ Ref เดียว เลขใบขนและสถานะยังว่าง มีไอคอน Delete ของ Draft ไม่กรอก give me decl no ไม่กด Re-Avg และไม่เพิ่มรายการสินค้า

**ข้อมูลที่เกิดขึ้น:** Draft เปล่า 1 ใบ; finally พยายามลบ Draft ถ้ายังไม่มีสถานะและมีปุ่ม Delete

### TC-EXP-030 — ค้นหา Draft เปล่าด้วย Reference No.

**วัตถุประสงค์:** ตรวจว่าการค้น Ref เจาะจงได้เอกสารที่เพิ่งสร้าง

ขั้นตอน:

1. สร้าง Draft ใหม่ด้วย F7 New ไม่กรอก Header/Invoice/Item เพิ่ม
2. กลับ Export List
3. กรอก Reference No. ของ Draft แล้วค้นหา

**เกณฑ์ผ่าน:** ตารางเหลือ 1 แถว และคอลัมน์ Reference เป็น Ref ที่สร้างไว้ ต่างจาก 010 ที่เน้นค่าเริ่มต้นของหน้าสร้าง ส่วน 030 เน้นผลค้นหา

**ข้อมูลที่เกิดขึ้น:** Draft เปล่า 1 ใบ; พยายาม cleanup เมื่อจบเคส

### TC-EXP-015 — ขอเลขใบขนจาก Control ที่ยังไม่มี Invoice/Item

**วัตถุประสงค์:** ตรวจ flow ขอเลขใบขน/ACCEPT ผ่าน Job No. ของไซต์ทดสอบ

ขั้นตอน:

1. สร้าง Draft ใหม่ ไม่เรียก filled หรือ completeData
2. กรอก Job No. = give me decl no แล้วกด Re-Avg and Calc Tax โดยไม่กด Save แยกก่อน
3. รอหน้าใหม่และข้อความว่าการเฉลี่ย charge/คำนวณภาษีเสร็จ
4. กลับ List และค้น Ref เดิม

**เกณฑ์ผ่าน:** Job No. เป็นข้อความที่กรอก เลขใบขนเป็นตัวอักษร/ตัวเลข 14 ตัว และสถานะเป็น ACCEPT พร้อมบันทึก Ref/เลขใบขนใน annotation

**ขอบเขต:** ไม่ได้กรอก Invoice/Item และไม่ได้พิสูจน์ความครบถ้วนของสินค้า helper cleanup ลบเฉพาะ Draft ที่ยังไม่มีสถานะ จึงไม่ลบ Export ที่เป็น ACCEPT

### TC-EXP-016 — เลขใบขนและสถานะคงอยู่เมื่อเปิดซ้ำ

**วัตถุประสงค์:** ตรวจความคงอยู่ของข้อมูลและปุ่มหลังเปลี่ยนเป็น ACCEPT

ขั้นตอน:

1. สร้าง Draft ใหม่โดยไม่เพิ่ม Invoice/Item
2. กรอก Job No. = give me decl no แล้วกด Re-Avg
3. กลับ List และตรวจ ACCEPT พร้อมเก็บเลขใบขน
4. เปิด Ref เดิมจาก List อีกครั้ง

**เกณฑ์ผ่าน:** หน้ารายละเอียดแสดงเลขใบขนเดิม, Status Customs Accept และ Job No. เดิม ปุ่ม Re-Avg and Calc Tax และ Add Invoice ต้องไม่แสดง

**ความต่างจาก 015:** 015 ตรวจผลหลังขอเลขที่ List; 016 ตรวจต่อหลังเปิด workspace ซ้ำ เอกสาร ACCEPT จะไม่ถูก helper cleanup ลบทิ้ง

### TC-EXP-034 — ตัวกรอง Customs Accept พบ Ref ที่สร้างไว้

**วัตถุประสงค์:** ตรวจตัวกรองสถานะ ไม่ได้ทดสอบข้อมูลสินค้า

ขั้นตอน:

1. สร้าง Draft เปล่า ไม่เพิ่ม Invoice/Item
2. กรอก give me decl no และกด Re-Avg
3. กลับ List แล้วเลือกตัวกรองสถานะ ACCEPT
4. ค้นหา Ref ของเอกสารนั้น

**เกณฑ์ผ่าน:** พบ Ref ตรงกัน 1 แถว และสถานะแถวเป็น ACCEPT โค้ดเคสนี้ไม่ได้เรียก expectAccepted เพื่อตรวจรูปแบบเลขใบขนซ้ำทุกเงื่อนไขเหมือน 015

**ข้อมูลที่เกิดขึ้น:** Export ที่คาดว่าจะเป็น ACCEPT 1 ใบ; ไม่มีขั้นตอนเพิ่ม Invoice/Item

### TC-EXP-039 — ค้นหาใบขนด้วยเลขที่ได้รับ

**วัตถุประสงค์:** ตรวจการค้นหาด้วย Declaration No.

ขั้นตอน:

1. เรียก filled เพื่อสร้าง Export กรอก Control และ Save
2. ไม่เรียก addInvoice/addItem จึงไม่มีขั้นตอนเพิ่ม Invoice/Item
3. เรียก accept เพื่อกรอก give me decl no กด Re-Avg และตรวจเลขใบขน/ACCEPT
4. เปิด List เลือกค้นหาด้วย declarationNo แล้วใช้เลขที่เพิ่งได้รับ

**เกณฑ์ผ่าน:** ตารางมี 1 แถว และคอลัมน์เลขใบขนตรงกับเลขที่ขอมา

**ความต่างจาก 030:** 030 ค้นด้วย Ref ของ Draft เปล่า; 039 ค้นด้วยเลขใบขนหลังกรอก Control และเปลี่ยนเป็น ACCEPT

### TC-EXP-043 — Save XML with Decl No.

**วัตถุประสงค์:** ตรวจไฟล์ XML แบบมีเลขใบขน

ขั้นตอน:

1. เรียก completeData สร้าง Control + Invoice 1 ใบ + Item 1 รายการ
2. เรียก accept เพื่อกรอก give me decl no และยืนยันเลขใบขน/ACCEPT
3. เลือกเอกสารนั้นแล้วกด Save XML with Decl No.
4. อ่านข้อมูล XML ที่ดาวน์โหลด

**เกณฑ์ผ่าน:** เนื้อหา XML มี Ref ของเอกสารและเลขใบขนที่เพิ่งได้รับ เคสนี้ไม่ได้ตรวจ XML schema ทั้งหมด การตรวจหลักคือค่าทั้งสองปรากฏใน XML

**เหตุผลที่ต้องใช้ give me decl no:** ต้องมีเลขใบขนจริงในเอกสารทดสอบก่อนตรวจไฟล์ที่มีเลขใบขน ไม่เหมือนการ Save XML แบบ Draft

### TC-EXP-071 — ส่ง Cancel ของ Export ทดสอบ

**วัตถุประสงค์:** ตรวจ popup ยกเลิกและการเปลี่ยนสถานะหลัง Send Cancel

**เงื่อนไข:** รันต่อเมื่อ SPN_EXPORT_ALLOW_CANCEL = 1; local runner ปัจจุบันตั้งค่าอนุญาตนี้เป็น 0 จึงข้ามใน flow ปกติ เป็นเคสที่ทำรายการ Cancel จริงของเอกสารทดสอบใหม่

ขั้นตอน:

1. สร้าง Control + Invoice 1 ใบ + Item 1 รายการ แล้วเติม cargo ของ Item เช่น Package, Unit, Gross, Shipping Mark และ Purchase Country
2. กรอก give me decl no ผ่าน accept เพื่อให้เป็น ACCEPT ซึ่งเป็นเงื่อนไขก่อนยกเลิก
3. อ่านสถานะก่อนทำงานจากไอคอนและคอลัมน์ ตรวจว่า ACCEPT และเลขใบขนตรงกัน
4. เปิด Cancel popup แล้วกรอกเหตุผล QA CANCEL EXPORT พร้อมรหัสไม่ซ้ำ
5. ส่ง Cancel และค้นสถานะเดิมซ้ำ สูงสุด 60 วินาที

**เกณฑ์ผ่าน:** สถานะเปลี่ยนเป็น SEND_CANCEL และเลขใบขนยังเป็นเลขเดิม บันทึกภาพ popup และข้อมูล before/after

**ขอบเขต:** ไม่ใช่เคส Send to ThaiCustoms ที่ถูกลบหมายเลข 070 และไม่ใช่เพียงตรวจว่าปุ่ม Cancel แสดง

### TC-EXP-080 — Create GCL จาก Export ที่มีข้อมูลครบ

**วัตถุประสงค์:** ตรวจว่าการสร้าง GCL คัดลอก Control และข้อมูลใบขนต้นทางได้ถูกต้อง

ขั้นตอน:

1. สร้าง Control + Invoice 1 ใบ + Item 1 รายการ และเติม cargo ใน Item
2. เปิดตรวจซ้ำทั้งสามส่วน โดยตรวจจำนวน Invoice/Item = 1/1 และค่าที่กรอก
3. กรอก give me decl no ผ่าน accept เพื่อขอเลขใบขนและสถานะ ACCEPT
4. กด Create GCL จำนวน 1 แล้วเก็บ Ref GCL ที่สร้าง
5. เปิด Export ซ้ำ ตรวจว่ามีลิงก์ GCL ตรง Ref 1 รายการ
6. เปิด GCL ผ่านลิงก์ อ่านข้อมูล แล้ว reload และอ่านซ้ำ

**เกณฑ์ผ่าน:** Ref GCL ต่างจาก Export; ข้อมูลไม่เปลี่ยนหลัง reload; Export Ref, เลขใบขน, Description, หน่วย, เลขภาษี/สาขา, MAWB/HAWB, Invoice, Package/Gross และข้อมูล Control ตรงกับต้นทาง ไม่มี JavaScript/PHP/DB error ตามที่ตรวจ

**จำนวน:** ใช้ Export ต้นทาง 1 ใบ และ GCL ที่คาดหวัง Detail 1 รายการ ไม่ใช่เคสหลาย Detail เอกสาร ACCEPT และ GCL ใน flow นี้เก็บไว้เป็นหลักฐาน ไม่ได้เข้า owned-GCL cleanup ของชุด GCL

### TC-EXP-081 — ปุ่มของ Export ทางอากาศหลัง ACCEPT

**วัตถุประสงค์:** ตรวจการแสดงและความพร้อมใช้งานของปุ่มตามรูปแบบขนส่ง

ขั้นตอน:

1. สร้าง Control + Invoice 1 ใบ + Item 1 รายการ โดยตั้ง Transport Mode = 4 ทางเครื่องบิน
2. ตรวจ Seq ของ Item, Mode ที่ Save แล้ว และจำนวน Invoice/Item = 1/1
3. กรอก give me decl no ผ่าน accept แล้วเปิด workspace
4. ตรวจปุ่ม Create Short, Print Air GCL และ Print Change Flight
5. reload แล้วตรวจปุ่มเดิมอีกครั้ง

**เกณฑ์ผ่าน:** ปุ่มแต่ละชนิดมี 1 ปุ่ม มองเห็น กดได้ และสภาพหลัง reload เท่าเดิม Mode ยังคง 4 พร้อมตรวจข้อผิดพลาดหน้าเว็บ

**ขอบเขต:** ไม่กดปุ่มทั้งสาม จึงไม่ได้สร้าง GCL/Short และไม่ได้พิมพ์เอกสารในเคสนี้

### TC-EXP-082 — Create Short จาก Export ทางอากาศ

**วัตถุประสงค์:** ตรวจการสร้างใบแจ้งของส่งออกไม่ครบจำนวนและข้อมูล Control ที่คัดลอกจาก Export

ขั้นตอน:

1. สร้าง Export Mode = 4 พร้อม Control + Invoice 1 ใบ + Item 1 รายการ และ cargo
2. กรอก give me decl no ผ่าน accept แล้วตรวจ Control/จำนวน Invoice/Item ที่บันทึกไว้
3. อ่านข้อมูล Broker ที่มีในต้นทางเพื่อใช้เทียบ
4. กด Create Short ยืนยัน confirmation และตรวจข้อความสำเร็จ
5. เปิด Short ใหม่ผ่านลิงก์ อ่านข้อมูล แล้ว reload และอ่านซ้ำ

**เกณฑ์ผ่าน:** Ref Short ต่างจาก Export, Short เชื่อม Export Ref และเลขใบขนเดิม, ข้อมูลหลัง reload ตรงก่อน reload; Job No., ผู้ส่งออก, สาขา, หน่วยหีบห่อ, Package/Gross/Net, หน่วยน้ำหนัก KGM และ Broker ที่มีข้อมูลตรงกับค่าต้นทาง/ค่าคาดหวัง

**ขอบเขต:** ไม่ Add Item ลง Short ไม่แก้จำนวน Short และไม่ Send Customs จำนวน Short Detail ที่หน้าจอแสดงถูกบันทึกเป็น observation ไม่ได้กำหนดให้ต้องเป็น 10 รายการ

แหล่งโค้ด Export:

- [create-complete.spec.ts — 010/015/016/030/034](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/create-complete.spec.ts)
- [list-search.spec.ts — 039](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/list-search.spec.ts)
- [files.spec.ts — 043](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/files.spec.ts)
- [cancel.spec.ts — 071](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/cancel.spec.ts)
- [gcl.spec.ts — 080](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/gcl.spec.ts)
- [air-transport.spec.ts — 081](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/air-transport.spec.ts)
- [create-short.spec.ts — 082](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/export/create-short.spec.ts)

## 4. GCL — ข้อมูลต้นทางและการนับ Detail

sourceDraft(count) เลือก Export ต้นทางตามจำนวนที่กำหนดแล้วสร้าง GCL ส่วน editableDraft(count) ทำขั้นตอนเดียวกันและเติม Control ที่จำเป็นสำหรับการแก้/Save ค่าเริ่มต้น count = 1; เคสหลายรายการส่ง count = 2

ตัวเตรียมข้อมูลใช้ Export ของชุดทดสอบที่ตรวจสถานะ ACCEPT/เลขใบขนและไม่มี GCL allocation ที่ใช้งานอยู่ ถ้าข้อมูลต้นทางที่บันทึกไว้ใช้ไม่ได้จะสร้าง Export ทดสอบใหม่ผ่าน completeData และ accept จึงมีการใช้ give me decl no ในการเตรียม source ของ GCL ด้วย แม้ตัว testcase จะไม่กรอกข้อความนี้ในหน้า GCL

ตารางด้านล่างอธิบายจำนวนตามชุดต้นทางปกติ ไม่ใช่การนับ GCL ที่มีอยู่ทั้งหมดบนเซิร์ฟเวอร์

| ID | จำนวนต่อ GCL ตาม fixture | สถานะสะสมปัจจุบัน | เหตุผลที่ใช้หลายรายการ |
|---|---:|---|---|
| TC-GCL-022 | 2 | ผ่าน | สร้างจาก 2 ใบขนและตรวจความสัมพันธ์ |
| TC-GCL-082 | 2 | ผ่าน | Add Detail จาก 2 ใบขน |
| TC-GCL-085 | ปกติ 4 แถวเมื่อจบ | ผ่าน | ตรวจ New Row เพิ่ม 1 แล้วเพิ่ม 2 |
| TC-GCL-088 | 2 | ผ่าน | สลับ Item No. และตรวจตัวตนต้นทาง |
| TC-GCL-090 | เริ่ม 2 เหลือ 1 | ผ่าน | ลบเฉพาะแถวที่เลือก |
| TC-GCL-100 | 2 | ผ่าน | คำนวณยอดรวมมากกว่าหนึ่งแถว |
| TC-GCL-101 | 2 | ผ่าน | ตรวจการแสดง source และจำนวนจากหลายแถว |
| TC-GCL-084 | ตามกติกาเพิ่ม source ซ้ำ | ข้าม | ยังต้องกำหนด expected row count |
| TC-GCL-106 | หลายรายการต่างหน่วย | ข้าม | ยังขาดข้อมูลและผลรวมที่ยืนยัน |

อิง [GCL _shared.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/gcl/_shared.ts)

## 5. GCL — ขั้นตอนรายเคสที่ใช้หลาย Detail

### TC-GCL-022 — สร้าง GCL จาก Export 2 ใบ

**ข้อมูลตั้งต้น:** Export ทดสอบ 2 ใบที่พร้อมให้เลือกเป็นต้นทาง

1. เรียก sourceDraft(..., 2) เปิด wizard และเลือก Export ทั้งสอง
2. สร้าง GCL แล้วอ่าน Detail
3. เทียบแต่ละ source ว่ามีแถวที่ Ref และเลขใบขนตรงกัน
4. เปิด GCL ซ้ำและเทียบข้อมูล Detail ทั้งชุดกับก่อนเปิดซ้ำ

**เกณฑ์ผ่าน:** source ทั้งสองอยู่ใน Detail และข้อมูลคงอยู่ ใช้สองรายการเพื่อจับการผูก Ref/เลขใบขนผิดใบ โค้ดเน้นการมีคู่ source/เลขใบขนและการคงข้อมูล ไม่ได้ assert จำนวนแถวต้องเท่ากับ 2 โดยตรง

### TC-GCL-082 — Add Detail ครั้งเดียวจาก 2 ใบขน

**ข้อมูลตั้งต้น:** GCL จากการกรอก Control แบบ manual และ Export ต้นทาง 2 ใบ

1. เปิด Add Detail เลือกรูปแบบขนส่งและค้นด้วย prefix ที่ครอบคลุม Ref ทั้งสอง
2. เลือก checkbox เฉพาะ Export สองใบที่เตรียมไว้ พร้อมจำค่าจากแถวต้นทาง
3. กดเพิ่มรายการ
4. ตรวจแต่ละ source มี Ref/เลขใบขนตรงกันใน Detail
5. เปิด GCL เดิมซ้ำและเทียบข้อมูลทั้งหมด

**เกณฑ์ผ่าน:** ทั้งสองใบถูกเชื่อมถูกต้องและข้อมูลคงอยู่ แตกต่างจาก 022 ที่สร้าง GCL โดยเลือกใบขนตั้งแต่ wizard เคสนี้ทดสอบ Add Detail หลังมี Control แล้ว โค้ดตรวจการมี source ทั้งสอง ไม่ได้ assert จำนวนแถวเท่ากับ 2 โดยตรง

**ประวัติ:** เคยรอ createBTN 5 วินาทีไม่พอ แก้รอเป็น 45 วินาทีแล้วรันทวนผ่านตามผลเดิม ไม่ได้เปลี่ยน flow การเลือก/เพิ่ม source

### TC-GCL-085 — New Row เพิ่ม 1 แถว แล้วเพิ่มอีก 2 แถว

**ข้อมูลตั้งต้น:** editableDraft ที่ใช้ source 1 ใบ ปกติมี Detail เริ่มต้น 1 แถว

1. นับจำนวนแถวก่อนทำงาน เก็บเป็น before
2. กรอก New Row = 1 แล้วกดเพิ่ม ตรวจจำนวนเป็น before + 1
3. กรอก New Row = 2 แล้วกดเพิ่ม ตรวจจำนวนเป็น before + 3
4. เปิด GCL ซ้ำและตรวจจำนวนยังเป็น before + 3

**เกณฑ์ผ่าน:** จำนวนแถวเพิ่มตามที่ขอและคงอยู่เมื่อเปิดซ้ำ ปกติรวม 4 แถว ไม่ใช่การกรอกใบขนสมบูรณ์ 4 ใบ เพราะแถว New Row ที่เพิ่มยังไม่ได้กรอก source และรายละเอียดครบในเคสนี้

**ข้อจำกัด:** helper ปัจจุบันรับจำนวนเต็ม 1–3 ต่อคำสั่ง ไม่ได้หมายความว่าจะจำกัดจำนวนรวมของ GCL ไว้ที่ 3 แถว เคสนี้ส่ง 1 และ 2 รวมเพิ่ม 3 แถวตามเดิม

### TC-GCL-088 — แก้ Item No. โดยไม่ให้ข้อมูลข้ามใบขน

**ข้อมูลตั้งต้น:** editableDraft จาก source 2 ใบ

1. อ่านข้อมูลสองแถวก่อนแก้
2. ตรวจช่อง Item No. มี maxlength = 4
3. กรอกแถวแรกเป็น 0002 และแถวที่สองเป็น 0001
4. Save แล้วเปิด Ref ซ้ำ
5. ตรวจ source, declaration และ description ของแต่ละแถวเดิมยังพบในข้อมูลหลังแก้

**เกณฑ์ผ่านตามโค้ด:** ตัวตนต้นทางไม่สูญหายหรือจับคู่ผิดหลังแก้เลขลำดับ

**ขอบเขตที่ยังไม่ได้ตรวจโดยตรง:** แม้กรอกเลข 0002/0001 แต่ assertion ปัจจุบันไม่ได้ยืนยันค่าลำดับที่บันทึกเป็นสองเลขนี้โดยเฉพาะ และไม่ได้ตรวจลำดับการแสดงผลทุกแถว

### TC-GCL-090 — Cancel/Confirm Delete เฉพาะ Detail ที่เลือก

**ข้อมูลตั้งต้น:** sourceDraft จาก source 2 ใบ

1. จำข้อมูลก่อนลบ แล้วเลือก checkbox ของแถวแรก
2. เตรียมตอบ Cancel และกด Delete Detail
3. ตรวจว่าระบบมี confirmation dialog จริงหรือไม่ แล้วเปิด Ref ซ้ำ
4. ถ้ามี confirmation ต้องตรวจว่าการ Cancel ทำให้ข้อมูลเท่าเดิม จากนั้นเลือกแถวแรกแล้วสั่งลบยืนยัน
5. ถ้าไม่มี confirmation บันทึกว่า Cancel branch ไม่รองรับ แล้วตรวจผลลบที่เกิดจากคำสั่งแรก

**เกณฑ์ผ่าน:** จำนวนลดลง 1 และ source ของแถวที่สองยังอยู่ ปกติจาก 2 เหลือ 1 ต้องมีสองรายการเพื่อพิสูจน์ว่าการลบไม่กระทบรายการที่ไม่ได้เลือก

### TC-GCL-100 — ตรวจยอดรวม Package/Gross จาก 2 แถว

**ข้อมูลตั้งต้น:** editableDraft จาก source 2 ใบ ใช้หน่วยเดียวกัน

1. กรอกแถวแรก Package = 10, Gross = 120
2. กรอกแถวที่สอง Package = 5, Gross = 80
3. Save แล้วเปิด Ref ซ้ำ
4. หาแถว footer และอ่านยอดรวม

**เกณฑ์ผ่าน:** พบ footer ตาม locator หนึ่งแถว Package รวม 15 และ Gross รวม 200 ต้องมีสองแถวเพื่อทดสอบการรวมยอดจริง ไม่ใช่การแสดงค่าจากแถวเดียว

### TC-GCL-101 — ตรวจข้อมูล source/จำนวนในหน้าจอกับ Detail

**ข้อมูลตั้งต้น:** sourceDraft จาก source 2 ใบ

1. สร้าง GCL แล้วอ่าน Detail ทั้งชุด
2. อ่านข้อความ body ของหน้า
3. วนทุก Detail แล้วตรวจว่าข้อความ Ref ต้นทาง, เลขใบขน, Package และ Gross ปรากฏในหน้า

**เกณฑ์ผ่านตามโค้ด:** ค่าที่อ่านจาก Detail ปรากฏในข้อความหน้าจอ

**ขอบเขตการตรวจ:** ชื่อเคสระบุ Tree แต่ locator ปัจจุบันอ่าน body รวมทั้งหน้า ไม่ได้ชี้แต่ละ Tree node เพื่อจับคู่ทีละใบโดยตรง จึงยังไม่ใช่การพิสูจน์ว่าทุกค่าอยู่ใน Tree node ที่ถูกต้อง

### TC-GCL-084 — เพิ่มใบขนต้นทางเดิมซ้ำ

**เงื่อนไข:** ต้องกำหนด SPN_GCL_DUPLICATE_ROWS ตามกติกาที่ตกลงก่อน ไม่เช่นนั้นข้าม

1. สร้าง GCL จาก source 1 ใบ
2. เปิด Add Detail และเลือก source เดิมซ้ำ
3. เพิ่มรายการ
4. ตรวจจำนวนแถวเท่ากับ SPN_GCL_DUPLICATE_ROWS

**สิ่งที่ต้องยืนยัน:** ระบบควรห้ามซ้ำ อนุญาตซ้ำ หรือรองรับ partial shipment แบบใด จำนวนที่ถูกต้องจึงไม่ใช่ 2 เสมอไป ปัจจุบันยังข้าม ไม่ใช่ PASS

### TC-GCL-106 — รวมยอดของหลายรายการที่ต่างหน่วย

**เงื่อนไข:** ต้องมี SPN_GCL_MIXED_REFS และ SPN_GCL_MIXED_FOOTER ที่ยืนยันแล้ว ไม่เช่นนั้นข้าม

1. เปิด wizard แล้วเลือก source ตามรายชื่อที่กำหนด
2. สร้าง GCL และอ่าน Detail
3. ตรวจว่ามีคู่ packageUnit/weightUnit มากกว่าหนึ่งชนิด
4. ตรวจข้อความ footer ตรงกับผลที่กำหนด

**เกณฑ์ผ่าน:** มีหน่วยต่างกันจริงและ footer ตรง oracle กรณีนี้ไม่ควรลดเหลือแถวเดียวหากยังต้องการทดสอบการรวมต่างหน่วย ปัจจุบันยังข้าม

แหล่งโค้ด: [create-control.spec.ts — 022](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/gcl/create-control.spec.ts) และ [detail.spec.ts — 082/084/085/088/090/100/101/106](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/gcl/detail.spec.ts)

## 6. GCL — เคส Upload ที่มีหลาย Detail ใน RAR แต่ลดแล้วในชุดปัจจุบัน

### TC-GCL-151 — CSV หนึ่ง Header

1. คัดลอกข้อมูล Header กลุ่มแรกและ Detail ของกลุ่มนั้น
2. สร้างไฟล์ one-header.csv แล้ว Upload ผ่าน New Upload CSV
3. ตรวจว่ามี GCL ใหม่ 1 ใบ
4. เทียบ Control และทุก Detail กับ CSV พร้อมตรวจการเปิดซ้ำตาม helper checkGroup

**ใน RAR:** ใช้ TestCSV.csv กลุ่มแรกมี 2 Detail จึงได้ 1 GCL / 2 Detail ตามข้อมูลตั้งต้น

**ปัจจุบัน:** ใช้ TestCSV_minimal.csv กลุ่มแรกมี 1 Detail ผลตั้งเป็นรอรัน ไม่ยืม PASS เก่ามาใช้กับข้อมูลใหม่

### TC-GCL-152 — CSV สอง Header

1. Upload CSV ทั้งไฟล์ที่มี Header 2 กลุ่ม
2. ตรวจว่ามี GCL ใหม่ 2 ใบ
3. เปิดแต่ละใบ อ่านรหัสบริษัทแล้วจับคู่กับ Header ที่ถูกต้อง
4. ตรวจ Control และ Detail ของแต่ละกลุ่ม

**ใน RAR:** TestCSV.csv มี Detail กลุ่มละ 2 รวม 4 รายการใน 2 GCL

**ปัจจุบัน:** TestCSV_minimal.csv มี Detail กลุ่มละ 1 รวม 2 รายการใน 2 GCL สถานะรอรัน คำว่า 2 GCL ไม่ได้หมายถึง 2 Detail ใน Ref เดียว

### TC-GCL-153 — CSV ค่า 0 / ข้อความพิเศษ / ทศนิยม

ทำ 3 รอบ โดยแต่ละรอบ Upload Header 1 กลุ่มและตรวจ GCL ใหม่ 1 ใบ:

1. **zero:** ตั้ง containerIndicator = 0, Package = 0 และ Gross = 0 ของ Detail แรก
2. **quoted:** ใส่ภาษาไทย comma เครื่องหมายคำพูดและขึ้นบรรทัดใหม่ใน Remark/Description และ comma/คำพูดใน Invoice No.
3. **decimal:** ตั้ง Gross ของ Detail แรก = 500.125

**ใน RAR:** แต่ละรอบมี Detail 2 แถว และรอบ decimal ตั้ง Gross ของแถวที่สอง = 0.375 ด้วย รวมตาม fixture 3 GCL / 6 Detail

**ปัจจุบัน:** แต่ละรอบใช้ Detail 1 แถว ตัดการอ้างแถวที่สองออก รวมตาม fixture 3 GCL / 3 Detail แต่ไม่ได้อยู่ใน GCL เดียวกัน สถานะรอรัน

### TC-GCL-157 — Upload DAT และตรวจข้อมูลหลังนำเข้า

1. อ่าน DAT เป็นข้อมูล scalar โดยไม่ execute/eval เนื้อหา
2. อ่านค่าที่คาดหวังของ Control และ Detail จากไฟล์
3. เก็บ inventory ก่อน Upload แล้ว Import DAT
4. ตรวจว่ามี GCL ใหม่ที่พิสูจน์ได้ 1 ใบ ไม่อ้าง ownership ของ Ref เดิมจากการเดา
5. เปิดตรวจจำนวนและข้อมูล Detail เช่น source, Invoice, Description, Package และ Gross
6. เปิดซ้ำแล้วตรวจข้อมูลยังเท่าเดิม

**ใน RAR:** default เป็น HQVM400001853.dat มี 2 Detail และใช้ Ref ในไฟล์เดิม

**ปัจจุบัน:** default เป็น GCL_single_detail.dat มี 1 Detail; เลือก Ref ทดสอบใหม่ที่ไม่พบใน List แล้วเขียนเฉพาะ Header ของไฟล์สำเนาชั่วคราวก่อน Upload ไม่แก้ไฟล์ต้นฉบับ สถานะรอรัน

**ข้อจำกัด:** ถ้ากำหนด SPN_GCL_DAT เอง จำนวนขึ้นกับไฟล์ที่เลือก การรับรอง default 1 Detail ไม่ครอบคลุมไฟล์ override ทุกไฟล์ เคสนี้เก็บ Draft นำเข้าไว้ตรวจ ไม่อยู่ใน owned fixture cleanup ตามปกติ

อิง [csv.spec.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/gcl/csv.spec.ts), [files-print.spec.ts](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/tests/functional/gcl/files-print.spec.ts) และ [บันทึก minimal fixtures](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/GCL_MINIMAL_FIXTURES.md)

## 7. รายการที่ต้องแยกจากหลาย Detail ใน GCL เดียว

| ID / Ref | ความหมาย |
|---|---|
| TC-GCL-123 | สร้างสำเนา GCL 2 ใบจากต้นทาง 1 ใบ แล้วเทียบ Control/Detail ของแต่ละสำเนากับต้นทาง ค่า 2 คือจำนวนสำเนา |
| TC-GCL-141 | สร้างและเลือก GCL 2 ใบสำหรับดาวน์โหลด XML แต่ละใบเริ่มด้วย source 1 ใบ |
| TC-GCL-143 | สร้างและเลือก GCL 2 ใบสำหรับดาวน์โหลด PDF แต่ละใบเริ่มด้วย source 1 ใบ |
| TC-GCL-150 | ดาวน์โหลดและตรวจโครงสร้าง Example CSV มี 2 Header และ 5 Detail ในไฟล์ตัวอย่าง ไม่ได้ Upload เพื่อสร้าง 5 Detail บนเซิร์ฟเวอร์ |
| TC-GCL-183 | เคส positive Upload CSV จาก workspace ถูกลบแล้ว ใน RAR ไม่พบ body ที่รันได้ แม้ไฟล์ CSV เดิม 8 แถวยังอยู่ |
| HQVM400001853 | การตรวจเดิมพบ Detail 10 แถวตรงข้อมูล DAT 2 + CSV 8 แต่ยังไม่ยืนยันว่า testcase ใดเพิ่มทั้งสองชุดลง Ref เดียวกัน ไม่พบเคสที่ตั้งใจสร้าง 10 แถวโดยตรง |

## 8. TC-GCL-086 — การเพิ่มแถวผิดปกติ ไม่ใช่เคสหลายรายการตามปกติ

เคสเดิมทดสอบ New Row ด้วยค่าว่าง, 0, -1 และ abc โดยคาดว่าจะไม่เพิ่มแถว แต่หลักฐานเดิมพบค่าว่างเพิ่มจาก 1 เป็น 2 และ abc เพิ่มจาก 1 เป็น 75 ก่อนรอหน้าไม่สำเร็จ พร้อม cleanup warning ที่ Ref HQVM400001917

- **ใน RAR:** body เดิมยังเปิดรัน และยังไม่มีข้อจำกัด New Row 1–3 ใน helper
- **ปัจจุบัน:** test.skip และนำ body เดิมออก สถานะข้าม ไม่ใช่ PASS
- ไม่มีหลักฐานยืนยันจาก DB/server log ว่าเคสนี้สร้างล้านแถว หรือเป็นสาเหตุเดียวกับ Detail ลอยที่ Dev พบ

เคสนี้ไม่รวมใน 7 เคสที่ใช้หลาย Detail ตามปกติ และไม่ควรใช้ผลเพิ่มผิดปกติมาสรุปเป็นจำนวนที่ testcase ต้องการสร้าง ดู [หลักฐานสำหรับ Dev](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/GCL_ORPHAN_DETAIL_DEV_HANDOFF.md)

## 9. การคืนข้อมูลและขอบเขตผลในเอกสาร

Export cleanup ลบเฉพาะ Draft ที่ยังไม่มีสถานะและมีไอคอน Delete เอกสาร ACCEPT/SEND_CANCEL จึงอาจคงอยู่ ส่วน owned fixture ของ GCL จะพยายามลบ Detail ที่เลือกทั้งหมดก่อนลบ Draft ของตัวเอง หากทำไม่สำเร็จจะบันทึก cleanup-warning จึงไม่ควรตีความว่าจบ testcase แล้วข้อมูลทุกชนิดถูกลบแน่นอน

ผลผ่าน/ข้าม/รอรันที่กล่าวถึงอิง [short-results.json](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/data/short-results.json) เวลาอัปเดต 2 พฤศจิกายน 2026 เวลา 10:43:49 น. ผลใน RAR เป็น snapshot เวลา 30 ตุลาคม 2026 เวลา 20:49:34 น. การเปลี่ยน fixture หรือ helper ภายหลังต้องรันทวนก่อนยืนยันผลใหม่

เอกสารนี้ไม่ได้แก้ flow, ลดจำนวนแถวของเคสเพิ่มเติม, เปิดใช้เคสที่ปิดไว้ หรือสั่งรันกับเซิร์ฟเวอร์
