import { test, DeclLeg, buildScenario, runCalculations, checkScreen, checkCalculation, checkXml, checkPreview } from './_shared'
import { SCENARIOS } from '../../data/zero-default/scenarios'

/**
 * DB DEFAULT 0 · ขาออก (Export Declaration).
 * ทีม ALTER TABLE MSSQL ให้คอลัมน์ตัวเลข DEFAULT 0 — ช่องที่เคยเป็น NULL/'' กลายเป็น 0.
 * แต่ละเคสสร้างใบขนขาออกจาก Key in / Import CSV แล้วตรวจ หน้าจอ · Re-Avg and Calc Tax ·
 * XML ส่งกรม · Preview (ดูชุดข้อมูลและเหตุผลของแต่ละเคสที่ data/zero-default/scenarios.ts,
 * กฎที่ใช้ตัดสินที่ data/zero-default/rules.ts, แผนทดสอบที่ README.md ในโฟลเดอร์นี้).
 * Run: npm run test:zero:export
 */
test.describe('[DB Default 0 · Export]', () => {
  // build (≈ 15–40 form posts) + 4 processes + reading every item twice + XML + PDF
  test.describe.configure({ timeout: 600_000 })

  for (const s of SCENARIOS) {
    test(`${s.id}-EX: ${s.title} ${s.tags}`, async ({ page, spn, created }) => {
      const d = new DeclLeg('export', page, spn)
      await buildScenario(d, s, (id, ref, job) => created.track('export', id, ref, job))
      const { second } = await runCalculations(d)
      await checkScreen(d, s, second)
      await checkCalculation(d, s, second)
      await checkXml(d, s, second)
      await checkPreview(d, s, second)
    })
  }
})
