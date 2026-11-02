import { MASTER, today } from '../factories'

/**
 * ชุดข้อมูลทดสอบ "DB DEFAULT 0" — ใช้ร่วมกันทั้งขาเข้า (Import) และขาออก (Export).
 * แต่ละ scenario สร้างใบขนใหม่ 1 ใบ (header + 1 invoice + items) จากแหล่งข้อมูล
 * Key in (หน้าจอ) หรือ Import CSV แล้วตรวจ 4 ด้าน: หน้าจอ · Re-Avg/Calc Tax · XML · Preview.
 *
 * ค่าในชุดข้อมูลเป็น string ตามที่ผู้ใช้พิมพ์ — '' = ไม่กรอก (ปล่อยว่าง ให้ DB ใส่ default เอง).
 */

export type Leg = 'import' | 'export'
export type Source = 'keyin' | 'csv'
export type ChargeKind = 'forwarding' | 'freight' | 'insurance'
/** วิธีเฉลี่ย charge ลงรายการ (select ins_INavgMethodC<n>) */
export type AvgMethod = 'invoiceAmount' | 'quantity' | 'netWeight'

export type ItemInput = {
  quantity: string
  invoiceQuantity: string
  netWeight: string
  /** invoice amount (foreign) */
  amount: string
  /** unit price (foreign) — only the CSV source sets it */
  unitPrice?: string
}

export type Scenario = {
  id: string
  title: string
  source: Source
  /** header date with no exchange rate in conf_exchangerate → every rate reads 0 */
  noRate?: boolean
  /** invoice-level charges (invoice currency), each averaged to the items by `avg` */
  charges: Partial<Record<ChargeKind, { amount: string; avg: AvgMethod }>>
  items: ItemInput[]
  checks: {
    /** Σ item CIF/FOB (Baht) = Σ invoice amount (Baht) + Σ ±charges (Baht), split by invoice amount */
    allocate: 'exact' | 'proportional' | 'noOverAllocation'
    /** import: VAT 7 % of (CIF + duty) — laptop tariff has duty 0 % */
    vat?: boolean
    /** after Re-Avg, a blank invoice qty is derived as amount ÷ unit price */
    deriveInvoiceQty?: boolean
  }
  tags: string
}

/** Header date that has no exchange rate (override per site in .env). */
export const NO_RATE_DATE = process.env.SPN_NO_RATE_DATE || '01-01-2099'

export const SCENARIOS: Scenario[] = [
  // ── Key in ──────────────────────────────────────────────────────────
  {
    id: 'ZD-01',
    title: 'Key in · เว้นว่างช่องตัวเลขที่ไม่บังคับ (DB ต้องใส่ 0 เอง) — ไม่มี label/tag 0 โผล่',
    source: 'keyin',
    charges: {},
    items: [
      { quantity: '10', invoiceQuantity: '10', netWeight: '100', amount: '1000' },
      { quantity: '5', invoiceQuantity: '5', netWeight: '50', amount: '500' },
    ],
    checks: { allocate: 'exact', vat: true },
    tags: '@smoke',
  },
  {
    id: 'ZD-02',
    title: 'Key in · ทศนิยม (3 ตำแหน่ง น้ำหนัก/ปริมาณ, 2 ตำแหน่ง เงิน) + เฉลี่ย charge ตามมูลค่า',
    source: 'keyin',
    charges: { freight: { amount: '100.25', avg: 'invoiceAmount' }, insurance: { amount: '10.1', avg: 'invoiceAmount' } },
    items: [
      { quantity: '3.5', invoiceQuantity: '3.5', netWeight: '12.345', amount: '1234.56' },
      { quantity: '0.125', invoiceQuantity: '0.125', netWeight: '0.001', amount: '0.99' },
      { quantity: '7', invoiceQuantity: '7', netWeight: '7.5', amount: '99.99' },
    ],
    checks: { allocate: 'proportional', vat: true },
    tags: '@regression',
  },
  {
    id: 'ZD-03',
    title: 'Key in · ค่า 0 ทั้งชุด (มูลค่า/ปริมาณ/น้ำหนัก = 0) + เฉลี่ย charge → 0 หาร 0 ต้องไม่พัง',
    source: 'keyin',
    charges: {
      forwarding: { amount: '10', avg: 'invoiceAmount' },
      freight: { amount: '50', avg: 'quantity' },
      insurance: { amount: '20', avg: 'netWeight' },
    },
    items: [
      { quantity: '0', invoiceQuantity: '0', netWeight: '0', amount: '0' },
      { quantity: '0', invoiceQuantity: '0', netWeight: '0', amount: '0' },
    ],
    checks: { allocate: 'noOverAllocation' },
    tags: '@regression',
  },
  {
    id: 'ZD-04',
    title: 'Key in · ไม่มีอัตราแลกเปลี่ยน (exchange rate = 0) → Re-Avg/Calc Tax ต้องไม่หารด้วย 0',
    source: 'keyin',
    noRate: true,
    charges: { freight: { amount: '10', avg: 'invoiceAmount' } },
    items: [{ quantity: '1', invoiceQuantity: '1', netWeight: '1', amount: '100' }],
    checks: { allocate: 'noOverAllocation' },
    tags: '@regression',
  },
  // ── Import CSV ──────────────────────────────────────────────────────
  {
    id: 'ZD-05',
    title: 'Import CSV · คอลัมน์ตัวเลขที่ไม่บังคับเป็นค่าว่าง — ไม่มี label/tag 0 โผล่',
    source: 'csv',
    charges: {},
    items: [
      { quantity: '10', invoiceQuantity: '10', netWeight: '100', amount: '1000' },
      { quantity: '5', invoiceQuantity: '5', netWeight: '50', amount: '500' },
    ],
    checks: { allocate: 'exact', vat: true },
    tags: '@smoke',
  },
  {
    id: 'ZD-06',
    title: 'Import CSV · ทศนิยม + เฉลี่ย charge ตามมูลค่า',
    source: 'csv',
    charges: { freight: { amount: '100.25', avg: 'invoiceAmount' }, insurance: { amount: '10.1', avg: 'invoiceAmount' } },
    items: [
      { quantity: '3.5', invoiceQuantity: '3.5', netWeight: '12.345', amount: '1234.56' },
      { quantity: '0.125', invoiceQuantity: '0.125', netWeight: '0.001', amount: '0.99' },
      { quantity: '7', invoiceQuantity: '7', netWeight: '7.5', amount: '99.99' },
    ],
    checks: { allocate: 'proportional', vat: true },
    tags: '@regression',
  },
  {
    id: 'ZD-07',
    title: 'Import CSV · ใส่ "0" ทุกคอลัมน์ตัวเลข + เฉลี่ย charge ตามปริมาณ/น้ำหนัก → 0 หาร 0 ต้องไม่พัง',
    source: 'csv',
    charges: { freight: { amount: '50', avg: 'quantity' }, insurance: { amount: '20', avg: 'netWeight' } },
    items: [
      { quantity: '0', invoiceQuantity: '0', netWeight: '0', amount: '0' },
      { quantity: '0', invoiceQuantity: '0', netWeight: '0', amount: '0' },
    ],
    checks: { allocate: 'noOverAllocation' },
    tags: '@regression',
  },
  {
    id: 'ZD-08',
    title: 'Import CSV · ปริมาณตาม invoice ว่าง แต่มีราคาต่อหน่วย → Re-Avg ต้องได้ = มูลค่า ÷ ราคาต่อหน่วย',
    source: 'csv',
    charges: {},
    items: [{ quantity: '40', invoiceQuantity: '', netWeight: '10', amount: '1000', unitPrice: '25' }],
    checks: { allocate: 'exact', deriveInvoiceQty: true },
    tags: '@regression',
  },
]

/** Codes per leg — customs master data, the same on every site. */
export const LEG_MASTER = {
  import: {
    tariff: MASTER.tariff,
    unit: MASTER.quantityUnit,
    currency: MASTER.currency,
    country: MASTER.country,
    packageUnit: MASTER.packageUnit,
    port: MASTER.port,
  },
  export: {
    // copper fittings — an export item that exists on the dev site (exportTariff 9PART3)
    tariff: { type: process.env.SPN_EX_TARIFF_SEARCH || '74152900', value: process.env.SPN_EX_TARIFF || '000074152900' },
    statisticalCode: process.env.SPN_EX_STAT || '090',
    exportTariff: process.env.SPN_EX_EXPORT_TARIFF || '9PART3',
    privilegeCode: '000',
    unit: 'EA',
    currency: MASTER.currency,
    country: MASTER.country,
    packageUnit: MASTER.packageUnit,
    port: MASTER.port,
  },
} as const

/**
 * Header date of a scenario (dd-mm-yyyy). Exchange rates come from conf_exchangerate by
 * this date — a site without today's rates needs SPN_RATE_DATE (a date that has them),
 * otherwise every Baht value is 0 and the calculation checks prove little.
 */
export function headerDate(s: Scenario): string {
  return s.noRate ? NO_RATE_DATE : process.env.SPN_RATE_DATE || today().input
}
