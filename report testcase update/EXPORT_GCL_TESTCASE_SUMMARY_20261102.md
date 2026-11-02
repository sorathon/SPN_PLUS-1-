# ตารางสรุป testcase — Export และ GCL

วันที่ 2 พฤศจิกายน 2026 อิงโค้ดและผลที่บันทึกไว้ ไม่มีการรันทดสอบใหม่ในการจัดทำเอกสารนี้

## Export — Control และ Job No. give me decl no

Control เปล่าหมายถึงไม่กรอก Header เพิ่มหลัง F7 New แต่ระบบอาจมีค่าเริ่มต้นอยู่ ส่วน give me decl no คือข้อความในช่อง Job No. แล้วกด Re-Avg and Calc Tax

| Testcase ID | ข้อมูล Control | Invoice / Item ที่เพิ่ม | ใส่ give me decl no | สรุปขั้นตอนและสิ่งที่ตรวจ |
|---|---|---|---|---|
| TC-EXP-010 | เปล่า | 0 / 0 | ไม่ใส่ | F7 New → ตรวจ Ref ใหม่, Document Type = 1, Job No. ว่าง, 0 Invoice/Item และยังเป็น Draft |
| TC-EXP-030 | เปล่า | 0 / 0 | ไม่ใส่ | สร้าง Draft → กลับ List → ค้น Ref → ต้องพบเอกสารตรง Ref เพียง 1 แถว |
| TC-EXP-015 | เปล่า ยกเว้น Job No. | 0 / 0 | ใส่ | กรอก Job No. → Re-Avg → กลับ List → ตรวจเลขใบขน 14 ตัวและ ACCEPT |
| TC-EXP-016 | เปล่า ยกเว้น Job No. | 0 / 0 | ใส่ | ขอเลข/ACCEPT → เปิด Ref ซ้ำ → เลขใบขนและ Job No. คงเดิม; ไม่แสดง Re-Avg และ Add Invoice |
| TC-EXP-034 | เปล่า ยกเว้น Job No. | 0 / 0 | ใส่ | Re-Avg → กลับ List → เลือกตัวกรอง ACCEPT → ค้น Ref และตรวจสถานะ |
| TC-EXP-039 | กรอกและ Save | 0 / 0 | ใส่ | กรอก Control → ขอเลข/ACCEPT → ค้นด้วย Declaration No. → พบ 1 แถวและเลขตรงกัน |
| TC-EXP-043 | กรอกและ Save | 1 / 1 | ใส่ | เตรียมข้อมูลสามส่วน → ขอเลข/ACCEPT → Save XML with Decl No. → XML ต้องมี Ref และเลขใบขน |
| TC-EXP-071 | กรอกและ Save | 1 / 1 พร้อม cargo | ใส่ | เตรียมข้อมูล → ขอเลข/ACCEPT → เปิด Cancel → ใส่เหตุผลและ Send Cancel → สถานะ SEND_CANCEL และเลขใบขนเดิม |
| TC-EXP-080 | กรอกและ Save | 1 / 1 พร้อม cargo | ใส่ | เตรียมข้อมูล → ขอเลข/ACCEPT → Create GCL จำนวน 1 → ตรวจ Control/Detail ที่คัดลอกและข้อมูลหลัง reload |
| TC-EXP-081 | กรอกและ Save; Mode = 4 | 1 / 1 | ใส่ | ขอเลข/ACCEPT → ตรวจปุ่ม Create Short, Print Air GCL, Print Change Flight มองเห็น/กดได้และคงเดิมหลัง reload; ไม่กดปุ่มทั้งสาม |
| TC-EXP-082 | กรอกและ Save; Mode = 4 | 1 / 1 พร้อม cargo | ใส่ | ขอเลข/ACCEPT → Create Short → ยืนยัน popup → ตรวจ Ref/เลขใบขนและข้อมูล Control ที่คัดลอกหลัง reload |

ทั้ง 11 เคสมีผลสะสมเดิมเป็นผ่าน แต่ไม่ได้รันใหม่ในรอบนี้ TC-EXP-071 ทำ Cancel จริงและต้องเปิด SPN_EXPORT_ALLOW_CANCEL = 1; local runner ปกติตั้งเป็น 0 จึงข้าม เคสที่เป็น ACCEPT ไม่ถูก helper cleanup ลบเหมือน Draft เปล่า

## GCL — เคสที่ใช้หลาย Detail

จำนวนในตารางนับต่อ GCL ตาม fixture ปกติ ไม่ใช่จำนวนหีบห่อหรือจำนวน GCL ทั้งระบบ

| Testcase ID | จำนวน Detail / GCL | สรุปขั้นตอนและสิ่งที่ตรวจ | สถานะสะสมปัจจุบัน |
|---|---|---|---|
| TC-GCL-022 | 2 ตาม source ที่เลือก | เลือก Export 2 ใบตอนสร้าง → ตรวจ Ref/เลขใบขนเชื่อมถูกใบและข้อมูลคงเดิมเมื่อเปิดซ้ำ | ผ่าน |
| TC-GCL-082 | 2 ตาม source ที่เลือก | สร้าง Control แบบ manual → Add Detail จาก Export 2 ใบ → ตรวจความสัมพันธ์และข้อมูลหลังเปิดซ้ำ | ผ่าน |
| TC-GCL-085 | ปกติ 1 → 2 → 4 | New Row เพิ่ม 1 แล้วเพิ่มอีก 2 → ตรวจจำนวน before + 3 หลังเปิดซ้ำ; แถวที่เพิ่มยังไม่ได้กรอกใบขนสมบูรณ์ | ผ่าน |
| TC-GCL-088 | 2 | กรอก Item No. เป็น 0002/0001 → Save/เปิดซ้ำ → ตรวจ source/เลขใบขน/Description ยังจับคู่เดิม | ผ่าน |
| TC-GCL-090 | เริ่ม 2 เหลือ 1 | เลือกลบแถวแรก → ตรวจ Cancel ถ้ามี confirmation → ยืนยันลบ → แถวที่สองต้องยังอยู่ | ผ่าน |
| TC-GCL-100 | 2 | กรอก Package 10 + 5 และ Gross 120 + 80 → Save/เปิดซ้ำ → footer ต้องรวม 15 และ 200 | ผ่าน |
| TC-GCL-101 | 2 | อ่าน Detail → ตรวจ Ref/เลขใบขน/Package/Gross ของทุกแถวปรากฏในข้อความหน้า | ผ่าน |
| TC-GCL-084 | ขึ้นกับกติกาเพิ่มซ้ำ | เพิ่ม source เดิมซ้ำ → เทียบจำนวนกับ SPN_GCL_DUPLICATE_ROWS | ข้าม: ยังไม่ยืนยันกติกา/จำนวนที่ถูกต้อง |
| TC-GCL-106 | หลายรายการต่างหน่วย | เลือก source ต่างหน่วย → ตรวจมีหน่วยต่างกันจริงและ footer ตรงผลที่กำหนด | ข้าม: ขาด source และผลรวมที่ยืนยัน |

ข้อจำกัดของ assertion: 022/082 ตรวจว่ามี source ทั้งสองแต่ไม่ได้ยืนยันจำนวนแถวเท่ากับ 2 โดยตรง; 088 ตรวจความสัมพันธ์หลังแก้แต่ไม่ได้ยืนยันเลขลำดับที่ Save แบบเจาะจง; 101 อ่าน body ทั้งหน้า ไม่ได้จับคู่ Tree node รายใบโดยตรง

## GCL — Upload ใน RAR เทียบกับชุดที่ปรับแล้ว

| Testcase ID | ใน RAR | ชุดปัจจุบัน | สิ่งที่ตรวจ | สถานะชุดใหม่ |
|---|---|---|---|---|
| TC-GCL-151 | 1 GCL / 2 Detail | 1 GCL / 1 Detail | Upload CSV หนึ่ง Header → ตรวจ Control/Detail ตรงไฟล์และเปิดซ้ำคงเดิม | รอรัน |
| TC-GCL-152 | 2 GCL / ใบละ 2 Detail | 2 GCL / ใบละ 1 Detail | Upload สอง Header → ตรวจจำนวน GCL และข้อมูลของแต่ละ Header | รอรัน |
| TC-GCL-153 | 3 รอบ รอบละ 1 GCL / 2 Detail | 3 รอบ รอบละ 1 GCL / 1 Detail | ตรวจค่า 0, ข้อความไทย/comma/คำพูด/ขึ้นบรรทัด และน้ำหนักทศนิยม | รอรัน |
| TC-GCL-157 | DAT เดิม 2 Detail ใช้ Ref ในไฟล์ | DAT 1 Detail พร้อม Ref ทดสอบใหม่ | Upload → ต้องพิสูจน์ว่าได้ GCL ใหม่ 1 ใบ → ตรวจ Control/Detail และเปิดซ้ำ | รอรัน |

151/152/153 ใช้ TestCSV_minimal.csv และ 157 ใช้ GCL_single_detail.dat เป็นค่าเริ่มต้นในชุดปัจจุบัน หาก override ไฟล์ DAT จำนวนขึ้นกับไฟล์ที่เลือก ผลผ่านใน RAR เป็นผลของข้อมูลเก่า ไม่ใช่ผลของชุด 1 Detail

## แยกกรณีหลายเอกสาร / แถวผิดปกติ

| ID / Ref | ความหมาย |
|---|---|
| TC-GCL-123 | คัดลอก GCL 2 ใบจากต้นทาง 1 ใบ ค่า 2 คือจำนวนสำเนา แต่ละสำเนาเทียบกับข้อมูลต้นทาง |
| TC-GCL-141 / TC-GCL-143 | เลือก GCL 2 ใบเพื่อดาวน์โหลด XML/PDF แต่ละใบเริ่มจาก source 1 ใบ |
| TC-GCL-150 | ดาวน์โหลด Example CSV และตรวจ 2 Header / 5 Detail ในไฟล์ ไม่ได้ Upload 5 Detail เข้าเซิร์ฟเวอร์ |
| TC-GCL-086 | เคสเดิมส่ง New Row ผิดรูปแบบ เคยพบ abc ทำให้ 1 → 75 แถว; ชุดปัจจุบันปิดและนำ body ออก แต่ใน RAR ยังเปิดรัน ไม่ใช่เคสที่ตั้งใจสร้างหลาย Detail ตามปกติ |
| TC-GCL-183 | ลบ body จากชุดปัจจุบันและ RAR แล้ว เหลือชื่อใน exclusions; การมี CSV เดิม 8 แถวไม่ได้แปลว่าชุดนี้ยังรัน 183 |
| HQVM400001853 | ตรวจเดิมพบ 10 Detail ตรงข้อมูล DAT 2 + CSV 8 แต่ยังยืนยันไม่ได้ว่า testcase ใดเพิ่มทั้งสองชุดลง Ref เดียวกัน ไม่พบเคสที่ตั้งใจสร้าง 10 แถวโดยตรง |

Package/Quantity = 10 ไม่ใช่ Detail 10 แถว และหลักฐาน 75 แถวของ 086 ยังไม่ยืนยันสาเหตุของข้อมูลล้านแถวที่ Dev รายงาน

## เอกสารอ้างอิง

- [รายละเอียดขั้นตอนรายเคส](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/EXPORT_CONTROL_GCL_MULTI_DETAIL_DETAILS_20261102.md)
- [รวมปัญหา Export/GCL และหลักฐาน](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/EXPORT_GCL_ISSUES_20261102.md)
- [ผลสะสมล่าสุดที่ใช้อ้างอิง](C:/Users/iTservice/OneDrive/เอกสาร/SPN_PLUS/report%20testcase%20update/data/short-results.json) อัปเดต 2 พฤศจิกายน 2026 เวลา 10:43:49 น.; ผลใน RAR อัปเดต 30 ตุลาคม 2026 เวลา 20:49:34 น.
