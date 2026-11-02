# SPN_PLUS Automation

> ระบบ local runner สร้างคืนหลัง ai-support ถูกลบ: ใช้ `.cmd` เดิมได้ ส่วนรันอยู่ใน `scripts/testcases-runtime/` ผลและหลักฐานใหม่อยู่ใน `report testcase update/` ดู [วิธีใช้และขอบเขตการกู้](<report testcase update/README.md>) เอกสาร/trace เก่าที่ถูกลบยังไม่ได้กู้คืน


รายงานรวมปัจจุบัน: [HTML ค้นหา/กรองได้](<report testcase update/TESTCASES_ALL_SHORT_20261030.html>) · [Markdown](ai-support/docs/TESTCASES_ALL_SHORT_20261030.md). รวม Import/Export/GCL 257 เคส หลังตัด New GCL 17 เคสตามคำสั่งผู้ใช้ ดูสถานะ/เวลาอัปเดตและขอบเขตแต่ละรอบในรายงาน

**รันเองโดยไม่ใช้ AI:** ดับเบิลคลิก [RUN_TESTCASES_LOCAL.cmd](RUN_TESTCASES_LOCAL.cmd) เลือก **5** เพื่อรันใหม่ตั้งแต่ Import → Export → GCL รวม 257 เคส (Import Mapping ใหม่ 7 เคสเลือกเมนู 6 ได้) หรือเลือกเมนูรันต่อ/รัน GCL ใหม่/รัน GCL ที่ไม่ผ่าน/เปิดรายงาน หน้า HTML รีเฟรชทุก 15 วินาที และตัวเปิดจะไม่เริ่มรอบซ้อน ดู [วิธีใช้](ai-support/docs/LOCAL_TESTCASES_RUN.md)

รอบรวม Import / Export / GCL วันที่ 30 ตุลาคม 2026: [ผลรอบล่าสุด](ai-support/docs/REGRESSION_RESULTS_20261030.md) และ testcase แบบละเอียด [Import 77 เคส](ai-support/docs/TESTCASES_IMPORT_DETAILED.md), [Export 69 เคส](ai-support/docs/TESTCASES_EXPORT_DETAILED.md), [GCL 106 เคส](ai-support/docs/TESTCASES_GCL_DETAILED.md). เอกสารแยกค่าที่กรอก ขั้นตอน เกณฑ์ตรวจ และผลจริง โดยมี [ข้อมูลตั้งต้นร่วม](ai-support/docs/TEST_DATA_REFERENCE.md).

โปรเจกต์ทดสอบ ShippingNet Pluz+ ที่สร้างแยกจาก `SPNAutomate/kiro-qaprocess-template/tests` เมื่อ 28 ตุลาคม 2026 รักษา ID และพฤติกรรมตรวจสอบต้นฉบับ ใช้ Page Objects, fixtures และข้อมูลทดสอบร่วมกัน ไม่ต้องอ้างอิงโฟลเดอร์ต้นทางขณะรัน

ดูคำอธิบายรายเคสใน [TESTCASES.md](ai-support/docs/TESTCASES.md), [ผลชุดเดิมก่อนเปลี่ยนไซต์](ai-support/docs/RUN_RESULTS.md), [ผล Other Report เดิมทั้ง 65 รายการ](ai-support/docs/REPORT_RESULTS.md) และผลตรวจ/รายการแก้ไขใน [DEBUG_REPORT.md](ai-support/docs/DEBUG_REPORT.md)

ชุด **VIEW GCL** แยก Page Objects ใน `tests/pages/gcl/` และ specs ใน `tests/functional/gcl/` พร้อม project `gcl`: **106 สคริปต์** (105 ID จากแผนหลัก รวม CSV 7 เคส + New GCL-001 อีก 1 เคส) ดู [วิธีรัน/fixture/ข้อจำกัด](ai-support/docs/GCL_AUTOMATION.md), [ผล GCL ล่าสุด](ai-support/docs/GCL_RUN_RESULTS.md), [แผนหลัก](ai-support/docs/TESTCASES_GCL.md) และ [New GCL ส่วนบน](ai-support/docs/TESTCASES_GCL_NEW_CONTROL.md) การมีสคริปต์ไม่เท่ากับผลผ่าน โดยเฉพาะเคสที่ต้องมีสูตร/fixture หรืออนุญาตส่ง/ยกเลิกจริง

ชุด Export ใน [TESTCASES_EXPORT.md](ai-support/docs/TESTCASES_EXPORT.md) มี Playwright **69 เคส** แล้ว แยก `tests/pages/export/` และ `tests/functional/export/` ใน project `export` ผลล่าสุดสะสม: **ผ่าน 67 / ไม่ผ่าน 2 / ข้าม 0** รอบล่าสุดรัน Export to/Print Form หน้า Send 13 เคสผ่าน ดู [ผล Export to/Print Form](ai-support/docs/EXPORT_SEND_FILES_RESULTS.md) ดู [ผล Export](ai-support/docs/EXPORT_RUN_RESULTS.md), [รายละเอียดปัญหาเดิม](ai-support/docs/EXPORT_DEBUG_REPORT.md), [ผล Create GCL รอบแรก](ai-support/docs/EXPORT_GCL_RESULTS.md), [ผลหลังเพิ่ม Seq](ai-support/docs/EXPORT_SEQ_RESULTS.md), [ผลปุ่มทางเครื่องบิน](ai-support/docs/EXPORT_AIR_RESULTS.md), [ผลตาราง Duty](ai-support/docs/ITEM_DUTY_RESULTS.md), [ผล popup Item](ai-support/docs/ITEM_PREPARATION_RESULTS.md), [ผล Create Short](ai-support/docs/EXPORT_SHORT_RESULTS.md) และ `tests/export-qa-report/index.html`

ผล Import ล่าสุดสะสมบนไซต์ support แยกไว้ใน [IMPORT_RUN_RESULTS.md](ai-support/docs/IMPORT_RUN_RESULTS.md) และ `tests/import-qa-report/index.html`: **77 เคส ผ่าน 68 / ไม่ผ่าน 5 / ข้าม 4** รอบล่าสุดเติม Tariff `000084713020` และ Stat/Privilege/Seq จาก `%` ตัวเลือกบนสุด รันทวนเฉพาะ TC-FUNC-021/022/029 ผ่านทั้งสาม รวม popup หลังปรับสถานะที่เคยไม่ผ่าน ดู [ผลกรอก Import Item](ai-support/docs/IMPORT_ITEM_MASTER_RESULTS.md)

ผลชุดเดิมก่อนเปลี่ยนไซต์ เมื่อ 28 ตุลาคม 2026: **84 functional cases — ผ่าน 63 / ไม่ผ่าน 20 / ข้าม 1** และ authentication setup ผ่าน 3 เคส ใช้ผล Import-only ด้านบนสำหรับไซต์ support ปัจจุบัน

## เริ่มต้นบน PowerShell

```powershell
cd 'C:\Users\iTservice\OneDrive\เอกสาร\SPN_PLUS\tests'
npm ci
npx playwright install chromium
# เครื่องนี้มี .env ที่ย้ายค่าจากต้นฉบับแล้ว
# เครื่องใหม่: Copy-Item .env.example .env แล้วตั้งค่าบัญชี/CSV mapping
npm test -- --project=functional
```

หาก sandbox บล็อก DNS ต้องใช้ terminal ที่เข้าถึง UAT ได้ การเพิ่ม timeout ไม่แก้ปัญหาเครือข่ายนี้

```powershell
npm run test:import
npm run test:import:headed
npm run test:import:all:headed
npm run test:zero:import
npm run test:zero:export
npm run test:report
node node_modules/typescript/bin/tsc --noEmit
npx playwright test --list --project=functional
npm run test:export:list
npm run test:export:gcl:headed
npm run test:export:air:headed
npm run test:export:short:headed
npm run test:item-duty:headed
npm run test:item-preparation:headed
npm run qa-report
npm run report
```

`test:import:all:headed` เลือกเฉพาะ Import Declaration, DB Default 0 ขาเข้า และ Other Report ขาเข้า ส่วน `test:export:list` ตรวจรายชื่อสคริปต์ Export เท่านั้น ไม่เปิดเว็บหรือรันทดสอบ

รันทีละ worker เพราะบัญชี SPN มี session เดียว การล็อกอินซ้อนกันทำให้ session เก่าหลุด เทสต์สร้างใบขน Job No ขึ้นต้น PW และพยายามลบข้อมูลที่สร้างหลังจบเคส ส่วนชุด zero-default เก็บใบขนไว้ให้ Dev ตรวจตามพฤติกรรมเดิม (ตั้ง `SPN_CLEANUP=1` เพื่อลบหลังรัน) ส่วน Print Form/Export File อ่านใบขนสถานะเอกสารพร้อมส่งที่มีอยู่ จึงข้ามเคสหากไม่มีข้อมูลสถานะนั้น

รายงานหลัก: `tests/qa-report/index.html` และ `tests/playwright-report/index.html` หลักฐาน: `tests/test-results/` มี screenshot และ trace ของเคสที่ล้มเหลว ผล Other Report: `tests/reports/other-report/`

## ส่วนที่ยังเป็น template

ไม่มี API spec หรือ E2E spec จริงในต้นฉบับ คำสั่ง `test:api`/`test:e2e` จึงไม่มีเคส ส่วน k6 มีเพียง Scenario_1 เรียก `/your-endpoint` เป็น placeholder ยังใช้ยืนยัน performance ของ SPN ไม่ได้ ต้องกำหนด endpoint และ workload จริงก่อนรัน load test

`gen:types` ต้องมี OpenAPI spec จริงก่อน เพราะต้นฉบับอ้าง `../openapi/core.openapi.json` ซึ่งไม่ได้อยู่ในโฟลเดอร์ tests ที่ย้ายมา

ไฟล์ `.env` และ state การล็อกอินเป็นข้อมูลส่วนตัว ถูกตั้งให้ Git เพิกเฉย อย่านำไปแนบรายงาน


เอกสารสำรวจและไฟล์ประกอบของ AI รวมไว้ที่ [ai-support](ai-support/README.md) ดูรายการย้ายใน [move manifest](ai-support/move-manifest.json)

Upload CSV ของ GCL: `cd tests` แล้วรัน `npm run test:gcl:csv:headed` ดู [ผล CSV](ai-support/docs/GCL_CSV_RESULTS.md)

ปุ่ม Export to / Print Form ในหน้า Send ของ GCL: `cd tests` แล้วรัน `npm run test:gcl:send-files:headed` (ตรวจไฟล์ดาวน์โหลดและ popup ตามลำดับ)

ผลปุ่มในหน้า Send: [GCL_SEND_FILES_RESULTS.md](ai-support/docs/GCL_SEND_FILES_RESULTS.md) — ผ่าน 8/8; Online ตรวจไฟล์ดาวน์โหลดตามคำสั่งผู้ใช้.

Export Send จาก Draft: `npm run test:export:send:headed` โดยเปิด `SPN_EXPORT_ALLOW_TRANSMIT=1` เฉพาะรอบที่อนุญาต ดู [เงื่อนไขและหลักฐาน](ai-support/docs/EXPORT_SEND_RESULTS.md).

Export to/Print Form หน้า Send ของ Export: `npm run test:export:send-files:headed` ดู [ผล 13 เคสและข้อสังเกต Tiff](ai-support/docs/EXPORT_SEND_FILES_RESULTS.md).

Cancel Export: [ผลและหลักฐาน](ai-support/docs/EXPORT_CANCEL_RESULTS.md); เปิด `SPN_EXPORT_ALLOW_CANCEL=1` แล้วรัน `npm run test:export:cancel:headed` เฉพาะรอบที่อนุญาต.

จัดระเบียบ ai-support: [บันทึก cleanup](ai-support/docs/AI_SUPPORT_CLEANUP.md) เก็บเฉพาะเอกสารและหลักฐานที่ยังอ้างอิงอยู่.


Upload CSV หลังเปิด GCL Ref: [TC-GCL-180–183](ai-support/docs/GCL_WORKSPACE_CSV_TESTCASES.md) รันเมนู 8 ด้วยไฟล์ Test_ใบกำกับ.csv; รวม GCL ปัจจุบัน 110 เคส

ลบเคสใช้ปุ่ม Send to ThaiCustoms ตามคำสั่งผู้ใช้: TC-EXP-070, TC-GCL-171, TC-GCL-172 รวมปัจจุบัน Import84 / Export68 / GCL108 = 260 เคส เคส Print/Export File และ Send Cancel ใช้ปุ่มอื่นจึงคงอยู่

ลบ TC-GCL-183 เพิ่มตามคำสั่งผู้ใช้ รวมปัจจุบัน259เคส (Import84/Export68/GCL107) เมนู8เหลือ180–182

ล่าสุดลบ TC-GCL-154 และ156เพิ่มตามคำสั่งผู้ใช้ รวม257เคส (Import84/Export68/GCL105) ผลdebugล่าสุด: 081/082/083/101ผ่าน เหลือ086/104ไม่ผ่าน; ดู report testcase update/GCL_DEBUG_RESULTS_20261030.md
