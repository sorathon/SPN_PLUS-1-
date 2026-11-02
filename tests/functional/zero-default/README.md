# DB Default 0 — แผนทดสอบ ขาเข้า / ขาออก

ทีมจะ `ALTER TABLE` (MSSQL) ให้คอลัมน์ตัวเลข `DEFAULT 0` — ช่องที่ผู้ใช้ไม่ได้กรอก (เดิม `NULL`/`''`)
จะกลายเป็น `0` ในฐานข้อมูล ชุดนี้ทดสอบผลกระทบ 4 เรื่องที่ทีมยกมา ทั้ง **ขาเข้า (Import)** และ **ขาออก (Export)**
จากแหล่งข้อมูล **Key in** และ **Import CSV**

| ไฟล์ | รันแยก |
|---|---|
| `import.spec.ts` — ขาเข้า (8 เคส `ZD-xx-IM`) | `npm run test:zero:import` |
| `export.spec.ts` — ขาออก (8 เคส `ZD-xx-EX`) | `npm run test:zero:export` |
| `_shared.ts` — ขั้นตอนสร้างใบขน + 4 การตรวจ (ใช้ร่วมกัน) | |
| `../../data/zero-default/scenarios.ts` — **ชุดข้อมูลทดสอบ** | |
| `../../data/zero-default/rules.ts` — **กฎตัดสิน** (ปรับได้โดยไม่ต้องแก้ spec) | |
| `../../data/zero-default/csv.ts` — สร้างไฟล์ CSV ตาม Mapping ของ site | |

แยกจากชุดเดิม `functional/import-declaration/` — ไม่แก้ไฟล์ของชุดนั้น

---

## 1. ผลกระทบ → การตรวจ

ทุกเคสตรวจครบ 4 ด้าน (soft assertion — เคสเดียวรายงานทุกจุดที่ผิด ไม่หยุดที่จุดแรก)

| # | ผลกระทบ | ตรวจอะไร | ผ่านเมื่อ |
|---|---|---|---|
| 1 | Preview มี label แปลกโผล่ (ช่องที่ไม่ต้องการกลับแสดง 0) | พิมพ์ใบขน (ปุ่ม Print) → อ่านข้อความใน PDF | ไม่พบ `(0.000 หน่วย)` · `ver:0` · `THB 0.00` · `( )` · `0 0` · NaN/INF · PHP error และพบมูลค่าของทุกรายการ |
| 2 | XML ไม่ควร gen ค่า 0 ส่งกรม | Export to → XML format | ไม่มี tag ในรายการ `XML_NO_ZERO` ที่ค่า = 0 · ไม่มี tag รหัส/ข้อความที่ค่า = `"0"` · ตัวเลขไม่มี NaN/INF/ทศนิยมขยะ · ค่าในแต่ละ `<Detail>` = ค่าบนหน้าจอ |
| 3 | UI จุดทศนิยมในช่องตัวเลข | เปิดแต่ละรายการอ่านทุกช่องตัวเลข | ค่าที่กรอก/นำเข้ากลับมา**เท่าเดิม** · ทุกช่องเป็นตัวเลขรูปแบบปกติ (ไม่มี `-0`, `1E-5`, `.5`, `0.30000000000000004`) · ทศนิยมไม่เกิน `UI_MAX_DECIMALS` · label ใน tree ไม่มีหน่วยว่าง `(0.000 )` |
| 4 | **Re-Avg and Calc Tax** (บวก ลบ คูณ หาร — 0 หาร 0) | กด Re-Avg and Calc Tax → Calculate Tax → Sum Item to Inv. → Re-Avg รอบ 2 | ทุก process ตอบ HTTP 200 ไม่มี PHP error (Division by zero ฯลฯ) และจบด้วย Completed · ค่าเป็นตัวเลขจำกัด · Baht = Foreign × rate · Σ มูลค่ารายการ = Σ มูลค่า invoice + charge · charge ไม่เกิน/ไม่ซ้ำ · VAT 7% (ขาเข้า) · รอบ 2 ค่าไม่ drift |

---

## 2. ชุดข้อมูล (scenarios.ts)

`''` = ไม่กรอก (ให้ DB ใส่ default เอง) · charge ใส่ที่ invoice สกุล USD เครื่องหมาย **+**

| ID | แหล่ง | ข้อมูล | ความเสี่ยงที่ยิง | ผลคำนวณที่คาด |
|---|---|---|---|---|
| ZD-01 | Key in | 2 รายการ ค่าปกติ (10/100/1000, 5/50/500) — **ช่องตัวเลขไม่บังคับเว้นว่างทั้งหมด** (น้ำหนักรวม, ปริมาณที่ 2, ราคาเพิ่ม, deducted…) | label/tag 0 โผล่ใน Preview/XML | Σ CIF/FOB = Σ มูลค่า (ไม่มี charge) · VAT 7% |
| ZD-02 | Key in | 3 รายการ **ทศนิยม** 12.345 kg / 0.001 kg / 3.5, 0.125 / 1234.56, 0.99, 99.99 · freight 100.25 + insurance 10.1 เฉลี่ยตามมูลค่า | ทศนิยมหาย/เพี้ยน, เศษสตางค์ไม่ลงตัว | เฉลี่ยตามสัดส่วนมูลค่า (±0.02) และรวมลงตัว |
| ZD-03 | Key in | 2 รายการ **มูลค่า/ปริมาณ/น้ำหนัก = 0** · forwarding 10 (มูลค่า), freight 50 (**ปริมาณ**), insurance 20 (**น้ำหนัก**) | **0 ÷ 0** ใน AverageCharge | ไม่ error · charge ลงรายการรวมไม่เกินของ invoice · ไม่ติดลบ |
| ZD-04 | Key in | วันที่ header = `SPN_NO_RATE_DATE` (ไม่มีอัตราแลกเปลี่ยน → rate 0) · freight 10 | **หารด้วย exchange rate 0** | ไม่ error · ไม่ NaN/INF |
| ZD-05 | CSV | เหมือน ZD-01 แต่คอลัมน์ตัวเลขไม่บังคับเป็นค่าว่าง | เหมือน ZD-01 ผ่านทาง import | เหมือน ZD-01 |
| ZD-06 | CSV | เหมือน ZD-02 (ทศนิยม) | ทศนิยมจาก CSV | เหมือน ZD-02 |
| ZD-07 | CSV | ใส่ **"0"** ทุกคอลัมน์ตัวเลข · freight (ปริมาณ) + insurance (น้ำหนัก) | 0 ÷ 0 จากข้อมูล import | เหมือน ZD-03 |
| ZD-08 | CSV | invoiceQuantity **ว่าง**, unitPrice 25, มูลค่า 1000 | Re-Avg เติมปริมาณผิด | invoiceQuantity = 1000 ÷ 25 = **40** |

ค่ารหัส master (พิกัด, หน่วย, ประเทศ, ท่า) อยู่ที่ `LEG_MASTER` · ข้อมูลลูกค้า (ผู้นำเข้า/ผู้ส่งออก, เรือ, ผู้ขาย/ผู้ซื้อ)
ใช้รายการแรกของ autocomplete (`%`) เหมือนชุดเดิม

---

## 3. จุดเสี่ยงที่พบจากการอ่านโค้ด (branch main ใน CodePHP8)

> server ทดสอบรัน branch `php8-after-redesign-all-db` — โค้ดอาจไม่ตรงทุกบรรทัด ใช้เป็นแนวทางให้ Dev ตรวจซ้ำ

| จุด | โค้ด | ผลเมื่อค่า = 0 |
|---|---|---|
| Re-Avg ขาเข้า (ทางหลายสกุลเงิน) | `js/declaration_function.inc` `averageCifControlDetailImport` ~บรรทัด 7169: เช็คแค่ `$exchangeRateDetail != ''` ก่อนหาร | `max(exchangeRate)=0` → **DivisionByZeroError** (ฟังก์ชันคู่กัน `checkDiff1CurImp` ~7291 เช็ค `!= 0` แล้ว) |
| Re-Avg ทาง v2 | `js/imcore_function.inc` `reCalcItemCIF_v2` ~714–722: `/ (float) $ITEM['exchangeRate']` ไม่มี guard | rate 0 → **DivisionByZeroError** |
| เติม invoiceQuantity | `js/imcore_function.inc` ~1145: `a / b == 0 ? '1' : b` (ลำดับ operator) | ได้ **ราคาต่อหน่วย** แทนปริมาณ (เคส ZD-08) |
| เฉลี่ย charge ตามน้ำหนัก/ปริมาณ | `AverageCharge_other` (`declaration_function.inc` ~2406) และ `imcore_function.inc` ~342–348: ถ้า `SUM_WEIGHT`/`SUM_QUANTITY` = 0 ไม่ reset `$avgRate` | ใช้อัตราค้างจากรายการ/charge ก่อนหน้า → **charge ลงเกิน/ซ้ำ** (ZD-03, ZD-07) |
| Preview ≤ 4 รายการ | `getPageData` (`declaration_function.inc` ~3873, ~4268): `/ $MAX_EXCHANGERATE` | rate 0 → error ตอนพิมพ์ |
| Re-Avg ขาเข้า | `CallAverageInvoice`: `if ($INVOICE['netWeight']=='0')` คำนวณน้ำหนัก invoice ใหม่ | เดิมช่องว่างไม่เข้าเงื่อนไข → หลัง ALTER เข้าเงื่อนไข (พฤติกรรมเปลี่ยน) |
| XML ขาเข้า | `digitalsign/func_genimpxml.php` `genDeclImp_New`: GrossWeight ~3594, Royalty ~3610, TotalPaymentAmount ~2034, หลักประกัน TotalAmount ~2075 เช็คแค่ `!= ''` | ส่ง `<…>0</…>` ไปกรม · `royalty` เป็น **varchar(1) flag** ถ้าโดน ALTER จะส่ง `<Royalty>0</Royalty>` |
| XML ขาออก | `digitalsign/func_genexpxml.php`: GrossWeight ~1968, หลักประกัน TotalAmount ~1350 | เหมือนขาเข้า |
| XML (มีมาก่อน ALTER) | `DeductedAmount` ถูก `round((float)…,2)` ก่อนเช็ค → ส่ง 0 เสมอ | รายงานเป็น **warning** ไม่ fail (ย้ายไป `XML_NO_ZERO` ถ้าต้องการให้ fail) |
| Preview ปริมาณที่ 2 | `service/importdeclarationcontrol/method/print_function.inc` ~3982: พิมพ์เมื่อ `quantityUnit2 != ''` | ถ้าคอลัมน์หน่วยโดน default `0` → พิมพ์ `(0.000 0)` |

---

## 3.1 ผลรันจริงครั้งแรก (24-10-2026, `php8-ms-after-merge` บน spn-109)

| เรื่อง | ขา | ที่พบ | เคส |
|---|---|---|---|
| **คำนวณพัง** | Export | Calculate Tax → HTTP 500 `TypeError: Unsupported operand types: string * string` (`exportdeclarationcontrol/method/workspace.inc:629`) | ZD-05/08-EX (CSV) |
| **คำนวณพัง** | Export | Sum Item to Inv. → HTTP 500 `SQLSTATE[23000] Cannot insert the value NULL into column 'forwardingChargeForeign'` | ZD-04…08-EX |
| **คำนวณพัง** | Export | Re-Avg and Calc Tax → HTTP 500 | ZD-06/07-EX (CSV) |
| **เปิดใบขนไม่ได้** | Import | หลัง Import CSV เปิดใบขน → HTTP 500 `SQLSTATE[42000] Error converting data type varchar to numeric` (`importdeclarationcontrol/method/edit.inc:768`) — CSV เขียน `''` ลงคอลัมน์ varchar ที่ใช้เป็นตัวเลข; **DEFAULT ไม่ทำงานกับค่า `''` ที่ insert ตรงๆ** | ZD-05…08-IM |
| charge ไม่ถูกเฉลี่ย | Export | Σ FOB = Σ มูลค่า (charge 3,643.63 บาท หายไป) หลัง Re-Avg error | ZD-06-EX |
| ค่า drift | Export | Re-Avg รอบ 2 เปลี่ยนค่า FOB 3574.35 → 3574.34 | ZD-02-EX |
| ทศนิยม (UI) | Export | float ขยะบนหน้าจอ เช่น `33018.800000000003`, `12.345000000000001`, `1234.5599999999999` · ศูนย์ไม่มีเลขนำ `.00000`, `.00` | ZD-01…08-EX |
| ปริมาณ 0 → 1 | Import | กรอก invoiceQuantity = 0 → หลังคำนวณกลายเป็น 1 | ZD-03-IM |
| XML | ทั้งคู่ | `<GrossWeight>0` · `<Year>0` (EX) · `<RGSCode>0` / `<CustomsBankCode>0` (EX) · `<SpecificUnitCode>0` (IM) · `<TotalPaymentAmount>0` (IM) · `<Invoice><TotalAmount>0` · `<CargoTypeCode>0` (ค่า default ของ select — ให้ทีมยืนยันว่ารหัส 0 ใช้ได้หรือไม่) | ทุกเคส |
| Preview | Export | พิมพ์ `(0.000 EA)` และ `THB 0.00` | ZD-03/07-EX, ZD-04-EX |
| Preview | Import | ปุ่ม Print → HTTP 500 `ParseError` ใน `print_function.inc(5161)` (มีก่อน ALTER) | ทุกเคส IM |
| สภาพแวดล้อม | Import | ไม่มีอัตราแลกเปลี่ยนของวันที่ปัจจุบันสำหรับใบขนขาเข้า → Baht = 0 ทุกรายการ (ตั้ง `SPN_RATE_DATE`) | ZD-01…03-IM |

---

## 4. ตั้งค่า (.env)

ใช้ `APP_BASE_URL` / user เดิม เพิ่มได้ (ไม่ตั้ง = ใช้ค่า default):

| ตัวแปร | default | ใช้ทำอะไร |
|---|---|---|
| `SPN_CSV_MAPPING_IMPORT` | `Test_T1_IMP16` | ชื่อ Mapping (ใน select "Mapping" หน้า Add Invoice) ของขาเข้า |
| `SPN_CSV_MAPPING_EXPORT` | `CSVEXPORT_NEW` | ชื่อ Mapping ของขาออก |
| `SPN_NO_RATE_DATE` | `01-01-2099` | วันที่ที่ไม่มีอัตราแลกเปลี่ยน (ZD-04) |
| `SPN_RATE_DATE` | วันนี้ | วันที่ header ของเคสอื่น — ตั้งเป็นวันที่ที่**มี** rate ถ้า site ไม่มี rate ของวันนี้ (มี annotation `warning` เตือน) |
| `SPN_EXPORTER_SEARCH` / `SPN_CONSIGNEE_SEARCH` | `%` | จำกัดการเลือกผู้ส่งออก/ผู้ซื้อ |
| `SPN_EX_TARIFF`, `SPN_EX_TARIFF_SEARCH`, `SPN_EX_STAT`, `SPN_EX_EXPORT_TARIFF` | `000074152900`, `74152900`, `090`, `9PART3` | พิกัดสินค้าขาออก |
| `SPN_CLEANUP=1` | — | **ลบ** ใบขนที่สร้างหลังจบเคส (ค่าปกติ = เก็บไว้ให้ Dev เปิดดู) |

**CSV:** คอลัมน์ไม่ fix — script อ่าน Mapping จากหน้าแก้ไข Mapping (GET อย่างเดียว ไม่กดบันทึก)
แล้ววางค่าตามคอลัมน์ บรรทัดแรกเป็นชื่อฟิลด์นำหน้า `//` (parser ข้ามบรรทัดที่ขึ้นต้น `//`)
Mapping ต้องมีอย่างน้อย `invoiceNo, quantity, netWeight, invoiceAmountForeign` (ZD-08 ต้องมี `unitPriceForeign, invoiceQuantity`) ไม่ครบ → เคส CSV **skip** พร้อมเหตุผล

---

## 5. อ่านผล

**ใบขนที่สร้างจะไม่ถูกลบ** — ทุกเคสบันทึกเลข Ref ไว้ 3 ที่ ให้ Dev เปิดใบขนนั้นดูได้ว่าข้อมูลแบบไหนทำให้ error:

1. **Ref report** `tests/reports/zero-default/<yyyy-mm-dd>-<import|export>.csv` (เปิดด้วย Excel ได้)
   1 แถว/เคส: เวลา · เคส · ขา · **Ref No** · ID (`ImDclCtrl:`/`ExDclCtrl:`) · Job No · ผล (PASS/FAIL/SKIP) · ชื่อเคส · จุดที่ผิด/Error
   (รันซ้ำวันเดียวกันจะต่อท้ายไฟล์เดิม)
2. step `Ref No: HQVM… (ImDclCtrl:…)` ในรายงาน (`npm run qa-report` / `npm run report`)
3. annotation `reference` ใน Playwright report

แต่ละเคสยังแนบ:

- `ZD-xx-<leg>.csv` — ไฟล์ CSV ที่นำเข้าจริง
- `ZD-xx-items.json` — ค่าทุกช่องตัวเลขของทุกรายการหลังคำนวณ (ดูรูปแบบทศนิยม)
- `ZD-xx-charges.json` — charge (บาท, เครื่องหมาย) ของ invoice
- `ZD-xx-<ref>.xml` + `ZD-xx-xml-zero-leaves.json` — XML และทุก tag ที่ค่าเป็น 0 (ให้ QA ไล่ดูว่ามีตัวไหนไม่ควรส่งเพิ่ม)
- `ZD-xx-<ref>.pdf` + `ZD-xx-preview.txt` — ใบขนที่พิมพ์และข้อความที่อ่านได้
- annotation `reference` = เลขใบขน · `warning` = tag 0 ที่มีมาก่อน ALTER

---

## 6. ข้อจำกัด

- รันกับ server เดียวกับชุดเดิม (1 worker, user เดียว) ประมาณ 5–7 นาที/เคส
- ตอนเขียน (24-10-2026) ปุ่ม Print บน server ตอบ **ParseError ใน `print_function.inc(5161) eval()'d code`** ทั้งก่อนและหลัง ALTER → ด้าน Preview จะ fail ที่ "พิมพ์ใบขนได้" จนกว่าจะแก้
- อ่าน PDF ได้เฉพาะข้อความ (ไม่ตรวจตำแหน่ง) — ถ้าข้อความอ่านไม่ออกจะ fail ที่ "อ่านข้อความใน PDF ได้" แทนการผ่านเงียบๆ
- รูปแบบทศนิยมที่ "ถูก" ของแต่ละช่องยังไม่มี spec — ตอนนี้ตรวจ "ไม่เกิน" ตาม `UI_MAX_DECIMALS` และแนบค่าจริงไว้ให้ดู
