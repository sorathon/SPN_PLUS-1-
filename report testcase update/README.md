# Local testcase report

เปิด `TESTCASES_ALL_SHORT_20261030.html` เพื่อดูรายงาน รีเฟรชอัตโนมัติทุก 15 วินาที

รันจาก Terminal ในโฟลเดอร์ SPN_PLUS:

```powershell
.\RUN_TESTCASES_LOCAL.cmd
.\RUN_TESTCASES_LOCAL.cmd TC-FUNC-001 TC-FUNC-126
.\RUN_TESTCASES_LOCAL.cmd TC-FUNC-123 TC-FUNC-124 -CheckOnly
```

เมนู 1 รันต่อ, 2 GCL ทั้งหมด, 3 GCL ที่ไม่ผ่าน, 4 ดูรายงาน, 5 Import/Export/GCL ทั้งหมด, 6 Import Mapping, 7 GCL DAT, 8 GCL CSV ใน Ref, 9 เลือกช่วง ID ต้น/ปลาย

หลังโฟลเดอร์ ai-support ถูกลบ ได้สร้างระบบรันใหม่ไว้ใน `scripts/testcases-runtime/` และกู้ผลเดิม 263 เคสจาก HTML ที่เหลืออยู่ใน `data/baseline.json` โดยเก็บ HTML ก่อนกู้แบบไบต์เดิมไว้ใน `data/recovered-original.html`

ผลใหม่และ trace อยู่ใน `runs/` ข้อมูลที่ใช้สร้างรายงานอยู่ใน `data/` ต้องเก็บทั้งสองโฟลเดอร์กับ `scripts/` และ `tests/` ไว้ หลักฐานเก่าที่ถูกลบไม่ได้กู้คืน; ผลเก่าจาก HTML ไม่ถือเป็นผลรันใหม่ จึงแสดงรอรันเฉพาะเคสที่เลือกเริ่มรอบใหม่

ตัวรันยังใช้ flow ของสคริปต์ทดสอบเดิม แบบ headed หนึ่ง worker ไม่เปิด Send/Cancel จริงโดยอัตโนมัติ สคริปต์ GCL บางส่วนยังสร้าง ledger ของตัวเองใน ai-support/evidence (ตัวรันสร้างโฟลเดอร์เปล่าให้อัตโนมัติ) แต่ runtime และรายงานใหม่ไม่ได้อยู่ใน ai-support

แผนรันต่อเก่าที่ถูกลบไม่สามารถกู้จาก HTML ได้ เมนู Continue เริ่มต้นไม่มีเคสค้าง ให้เลือกช่วงหรือเมนูชุดใหม่ครั้งแรก จากนั้นหยุดด้วย Ctrl+C และใช้ Continue ได้ตามปกติ

## เคสที่นำออกตามคำสั่งผู้ใช้

ลบ TC-EXP-070, TC-GCL-171 และ TC-GCL-172 ซึ่งเป็นเคส Send to ThaiCustoms/Send preflight ออกจากสคริปต์และรายงาน รวมปัจจุบัน260เคส (Import84/Export68/GCL108) ไม่พบเคส Import ที่กดส่งจริงด้วยปุ่มนี้ เคสดาวน์โหลด/Print Form บนหน้า Send และ Send Cancel ใช้คนละปุ่มจึงยังอยู่

รายการที่ลบอยู่ใน scripts/testcases-runtime/excluded-cases.json ตัวสร้างรายงานไม่นำแถวเหล่านี้กลับมาจาก snapshot กู้คืน และตัวรันกรอง ID เหล่านี้ออกแม้ได้รับแผนเก่า ผลต้นฉบับก่อนลบยังเก็บเป็นหลักฐานประวัติ

ลบ TC-GCL-183 ตามคำสั่งผู้ใช้เพิ่มเติม รวมปัจจุบัน259เคส (Import84/Export68/GCL107) เมนู8เลือกเฉพาะ180–182

ล่าสุดลบ TC-GCL-154 และ156เพิ่มตามคำสั่งผู้ใช้ รวม257เคส (Import84/Export68/GCL105) ผลdebugล่าสุด: 081/082/083/101ผ่าน เหลือ086/104ไม่ผ่าน; ดู report testcase update/GCL_DEBUG_RESULTS_20261030.md

2พฤศจิกายน2026: ปิดTC-GCL-086หลังพบmalformed NewRowเพิ่มแถวผิดปกติ ตัวช่วยNewRowจำกัด1–3แถว กรณีRef1853ตรวจจริงมี10Detail เลขหลักล้านเป็นgtcdidและTreeมีรายการจากGCLอื่น ดู GCL_REF_HQVM400001853_INSPECTION_20261102.md

ชุดข้อมูลทดสอบครั้งต่อไปลดเหลือ1Detailต่อGCL ดู [ไฟล์ตัวอย่างและขอบเขต](GCL_MINIMAL_FIXTURES.md) ไม่เปลี่ยนRefเดิม เคสหลายHeader/sourceคงเฉพาะจำนวนขั้นต่ำที่จำเป็น
