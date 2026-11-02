/**
 * กฎตรวจผลกระทบของการ ALTER TABLE ให้คอลัมน์ตัวเลข DEFAULT 0 (MSSQL).
 * ก่อน ALTER ช่องที่ไม่ได้กรอกเป็น NULL/'' → หลัง ALTER กลายเป็น 0 — โค้ดที่เช็ค `!= ''`
 * จะเห็นค่าเป็น "มีค่า" แล้วพิมพ์ label / ส่ง tag 0 ไปกรม / หารด้วย 0.
 *
 * แยกเป็นข้อมูลไว้ที่นี่ให้ QA ปรับได้โดยไม่ต้องแก้ spec — ทุกกฎมีเหตุผลกำกับ (why)
 * และอ้างจุดในโค้ด (branch main) ที่ทำให้ต้องมีกฎนั้น
 */

export type Rule = { re: RegExp; why: string }

/** Values that are never a valid number — anywhere (UI field, XML leaf, preview text). */
export const NOT_A_NUMBER: Rule[] = [
  { re: /\bNaN\b/, why: 'NaN — ผลหาร 0/0' },
  { re: /\bINF\b|\bInfinity\b/i, why: 'INF — หารด้วย 0' },
  { re: /^-0(\.0+)?$/, why: 'ศูนย์ติดลบ (-0) — ปัดเศษจากค่าติดลบเล็กๆ' },
  { re: /\d[eE][+-]?\d/, why: 'scientific notation (เช่น 1.0E-5) — float ไม่ได้ format' },
  { re: /\.\d{9,}$/, why: 'ทศนิยมยาวผิดปกติ (float garbage เช่น 0.30000000000000004)' },
]

/** PHP error text leaking into a response, a file or a page. */
export const PHP_ERROR: Rule = {
  re: /PDOException|SQLSTATE|Fatal error|Uncaught|DivisionByZeroError|Division by zero|Modulo by zero|ParseError|TypeError|ArgumentCountError|Warning:|Notice:|Deprecated:|Undefined (index|offset|array key|variable)/i,
  why: 'PHP/SQL error ปนออกมา (เช่น SQLSTATE 42000 แปลง varchar เป็น numeric ไม่ได้)',
}

// ─── UI (หน้าจอ) ──────────────────────────────────────────────────────
/**
 * Max decimals each numeric field may show (the stored precision). A field showing more
 * decimals than this shows float garbage; fewer is fine ("1000" for 1000.00).
 * Values = what the app rounds to before saving (declaration_function.inc updateBaht /
 * reCalcFOB, genDeclImp_New round(...,5)) — ปรับตาม spec ถ้าทีมกำหนดต่างจากนี้.
 */
export const UI_MAX_DECIMALS: Record<string, number> = {
  netWeight: 3,
  itemGrossWeight: 3,
  quantity: 3,
  quantity2: 3,
  invoiceQuantity: 3,
  packageAmount: 0,
  unitPriceForeign: 5,
  unitPriceBaht: 2,
  invoiceAmountForeign: 2,
  invoiceAmountBaht: 2,
  increasedPriceForeign: 2,
  increasedPriceBaht: 2,
  cifValueForeign: 2,
  cifValueBaht: 2,
  cifValueAssess: 2,
  fobValueForeign: 2,
  fobValueBaht: 2,
  fobValueAssess: 2,
  deductedAmount: 2,
  exchangeRate: 8,
}

/** A numeric field must look like a plain number (or stay empty). */
export const UI_NUMBER = /^-?\d+(\.\d+)?$/

// ─── XML ส่งกรม ───────────────────────────────────────────────────────
/**
 * Optional tags that must be LEFT OUT when the value is 0 — the generator only checks
 * `!= ''`, so a DB default 0 now writes them (digitalsign/func_genimpxml.php
 * genDeclImp_New, func_genexpxml.php genDeclExp_New).
 * Matched against the end of the leaf path.
 */
export const XML_NO_ZERO: Rule[] = [
  { re: /(^|\/)GrossWeight$/, why: 'itemGrossWeight: `trim(x)!=\'\'` → 0 ถูกส่งเป็น <GrossWeight>0</GrossWeight>' },
  { re: /(^|\/)IncreasedPrice\/(Foreign|Baht)$/, why: 'increasedPrice: `!= \'\'` → ส่ง 0' },
  { re: /(^|\/)TotalPaymentAmount$/, why: 'totalPaymentAmount: import เช็ค `!= \'\'` → ส่ง 0' },
  { re: /(^|\/)Invoice\/TotalAmount$/, why: 'ยอดรวม invoice = 0 (totalInvoice — หลัง Sum Item to Inv. / ไม่มีอัตราแลกเปลี่ยน)' },
  { re: /(^|\/)(?!Invoice\/)[A-Za-z]+\/TotalAmount$/, why: 'totalDepositAmount (หลักประกัน) / taxCard: `trim(x)!=\'\'` → ส่ง 0' },
  { re: /(^|\/)ExchangeRate$/, why: 'ExchangeRate 0 — ไม่มีอัตราแลกเปลี่ยน ห้ามส่ง' },
  { re: /(^|\/)BahtValue$/, why: 'charge Baht 0 ไม่ควรส่ง' },
  { re: /(^|\/)(ExemptCIF|ExemptFOB|AssessQuantity|AssessQty)$/, why: 'optional quantity/value ไม่ควรส่ง 0' },
  { re: /(^|\/)(Exemption|Deposit|DepositAmount)$/, why: 'ส่วนลด/เงินประกัน 0 ไม่ควรส่ง (โค้ดเช็ค != 0)' },
  { re: /(^|\/)DeferredDutyTaxFee$/, why: 'deferredPayment 0 ไม่ควรส่ง' },
]

/**
 * Tags the generator writes as 0 even BEFORE the ALTER (not caused by it): reported as a
 * warning annotation, not a failure — a known rule wins over XML_NO_ZERO. `DeductedAmount` is `round((float)x,2)` first, so
 * `trim(0)!=''` is always true. Move a rule to XML_NO_ZERO to make it fail the test.
 */
export const XML_ZERO_KNOWN: Rule[] = [
  { re: /(^|\/)DeductedAmount$/, why: 'round((float)deductedAmount,2) ก่อนเช็ค → ส่ง 0 เสมอ (มีมาก่อน ALTER)' },
  { re: /(^|\/)CIFValue\/Assess$|(^|\/)FOBValue\/Assess$/, why: 'template เขียน <Assess> เสมอ (มีมาก่อน ALTER)' },
  { re: /(^|\/)Duty\/Amount\/Deposit$/, why: 'อากรขาเข้า: guard `!= 0` ถูก comment ออก → เขียน <Deposit> เสมอ (มีมาก่อน ALTER)' },
]

/**
 * Code / text tags — "0" is never a valid value. A code column swept into the ALTER
 * (unit, currency, country, royalty flag…) would send "0" (e.g. <UnitCode>0</UnitCode>,
 * <Royalty>0</Royalty> — royalty is a varchar(1) flag, not a number).
 */
export const XML_CODE_TAG = /(Code|Number|Status)$|^(Statistical|Year|BrandName|Remark|Thai|English|Royalty|RoyaltyDetail|ShippingMarks|Name|TaxReference|Sequence|Method|Type|Agent)$/

/** Numeric leaves: max decimals (more = float garbage). Rate tags may carry up to 8. */
export const XML_MAX_DECIMALS = { rate: 8, other: 6 }

// ─── Preview (PDF ใบขน) ──────────────────────────────────────────────
/**
 * Text that must not be printed. Patterns come from print_function.inc (import) and
 * master_print.inc (export): secondary qty/package lines and model version are printed
 * when their unit/flag is not '' — a 0 there prints "(0.000 …)" / "ver:0".
 */
// readPdfText puts each printed cell on its own line, so these use [ \t] (same cell) —
// never \s, which would join two neighbouring cells ("0.00⏎0.00" of duty rate/amount).
export const PREVIEW_FORBIDDEN: Rule[] = [
  { re: /\([ \t]*0(\.0+)?[ \t]+[A-Z0-9]{0,3}[ \t]*\)/, why: 'จำนวน/หีบห่อหน่วยที่ 2 = 0 ถูกพิมพ์ เช่น "(0.000 C62)"' },
  { re: /\bver:[ \t]*0\b/i, why: 'Model version 0 ถูกพิมพ์ (ver:0)' },
  { re: /\bTHB[ \t]+0\.00\b/, why: 'charge 0 บาท ถูกพิมพ์' },
  { re: /\([ \t]*\)/, why: 'วงเล็บว่าง — label ที่ค่าเป็นว่าง/0' },
  { re: /\b\d+(\.\d+)?[ \t]+0[ \t]*\)?$/m, why: 'ตัวเลขตามด้วยหน่วย "0" — คอลัมน์รหัสหน่วยโดน default 0 (เช่น "10.000 0")' },
]
