import fs from 'fs'
import path from 'path'
import { test, expect } from '../../fixtures'
import { ReportGeneratorPage, ReportLink, ReportList, REPORT_BUTTONS, DateRange } from '../../pages/spn/ReportGeneratorPage'
import { checkReportOutput, DataCheck } from '../../data/reportOutput'

/**
 * Configuration → Other Report — every report of the Import list (report_generator.php) and the
 * Export list (report_generator_export.php):
 *   1. report names are unique (one name per link);
 *   2. search by Arrival Date (else the form's other date) over REPORT_DATE_FROM–TO (default
 *      2026-09-01 – 2026-09-05); a form without a date field is searched by a Ref No taken from
 *      the declaration list of the same leg (in that window, else the newest one);
 *   3. data found → pass;
 *   4. no data → fail, and the report name is logged;
 *   5. every output button is run (View Report, Export to Excel, Export to CSV, Export to newExcel,
 *      Export to XLSX on the standard form) — each must give data (a page / a file with rows).
 * Report forms are configured per customer: a custom form may name its dates differently
 * (arrivalDateFrom, startSenddate …) and have only its own buttons — those buttons are tested;
 * a form with neither a date nor a Ref No field is logged N/A, not failed.
 * Read-only: reports only query. One test per list; one step per report (soft checks, so one
 * report's failure doesn't stop the others). Log: reports/other-report/<yyyy-mm-dd>-<list>.csv
 * Run: npm run test:report  (headed: npm run test:report:headed)
 */

/** Date field searched, in order of preference (Export reports may have no arrival date). */
const DATE_PREFERENCE = [/^arrival/i, /^departure/i, /^send/i, /^submit/i, /^reference/i]
/** Search window (yyyy-mm-dd) — .env REPORT_DATE_FROM / REPORT_DATE_TO, default 01–05/09/2026. */
const WINDOW = { from: process.env.REPORT_DATE_FROM || '2026-09-01', to: process.env.REPORT_DATE_TO || '2026-09-05' }

/** Today in Thailand. */
function today(): Date {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()).split('-').map(Number)
  return new Date(y, m - 1, d)
}
/** yyyy-MM-dd — the format the form's date picker writes (dd-mm-yyyy is rejected by the server). */
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const LOG_DIR = path.resolve(process.env.REPORT_LOG_DIR || '../ai-support/evidence/other-report')
const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
const LOG_HEAD = ['เวลา', 'รายการ', 'ลำดับ', 'ชื่อ Report', 'ช่องวันที่', 'ช่วงวันที่', 'ปุ่ม', 'ผล', 'จำนวนแถว', 'หมายเหตุ']

function logRow(list: ReportList, row: (string | number)[]) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  const file = path.join(LOG_DIR, `${ymd(today())}-${list}.csv`)
  if (!fs.existsSync(file)) fs.writeFileSync(file, '﻿' + LOG_HEAD.map(cell).join(',') + '\r\n')
  const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok' })
  fs.appendFileSync(file, [time, list, ...row].map(cell).join(',') + '\r\n')
}

type ButtonResult = { button: string; check: DataCheck }

for (const list of ['import', 'export'] as ReportList[]) {
  test(`Other Report · ${list === 'import' ? 'Import Report' : 'Export Report'} — ทุก Report ค้นหา Arrival Date แล้วต้องมีข้อมูลทุกปุ่ม @regression`, async ({ page, spn }, testInfo) => {
    const ui = new ReportGeneratorPage(page)

    const reports: ReportLink[] = await test.step('เปิดรายการ Report', async () => {
      await ui.openList(spn, list)
      return ui.reports()
    })
    // budget: every report runs up to 6 searches (2 ranges + 4 exports) of up to 2 min each
    testInfo.setTimeout(Math.max(120_000, reports.length * 6 * 120_000))
    test.skip(reports.length === 0, `ไม่มี Report ในรายการ ${list}`)

    await test.step(`1. ชื่อ Report ไม่ซ้ำ (${reports.length} รายการ)`, async () => {
      const seen = new Map<string, number>()
      for (const r of reports) seen.set(r.name, (seen.get(r.name) ?? 0) + 1)
      const dup = [...seen].filter(([, n]) => n > 1).map(([name, n]) => `${name} (×${n})`)
      for (const d of dup) logRow(list, ['-', d, '-', '-', '-', 'FAIL', 0, 'ชื่อ Report ซ้ำ'])
      expect.soft(dup, 'ชื่อ Report ซ้ำ').toEqual([])
    })

    const failed: string[] = []
    const notApplicable: string[] = []
    // Ref No for reports without a date field — found once per list, on first need
    let refNo: { ref: string; source: string } | null | undefined
    for (const [i, report] of reports.entries()) {
      const no = i + 1
      await test.step(`${no}). ${report.name}`, async () => {
        const results: ButtonResult[] = []
        let by = '-'
        let value = ''
        try {
          await page.goto(report.href)
          const ranges = await ui.dateRanges()
          const range = DATE_PREFERENCE.map((re) => ranges.find((r) => re.test(r.field))).find(Boolean) ?? ranges[0]
          const refFields = range ? [] : await ui.refFields()
          const buttons = await ui.buttonLabels()

          // 2. search criteria: the date window, or — no date field — a Ref No of this site
          let fill: () => Promise<void>
          if (range) {
            by = range.field
            value = `${WINDOW.from} ถึง ${WINDOW.to}`
            fill = () => ui.fillRange(range, WINDOW.from, WINDOW.to)
          } else if (refFields.length) {
            if (refNo === undefined) refNo = await ui.findReferenceNo(spn, list, WINDOW.from, WINDOW.to)
            if (!refNo) throw new Error('ไม่มีช่องวันที่ และหาเลข Ref ในรายการใบขนไม่ได้ (รายการว่าง)')
            const found = refNo
            by = refFields.join('/')
            value = `Ref ${found.ref} (${found.source})`
            fill = () => ui.fillRef(refFields, found.ref)
          } else {
            logRow(list, [no, report.name, '-', '-', buttons.join(', '), 'N/A', 0, 'ไม่มีช่องวันที่และช่อง Ref No — ค้นหาไม่ได้'])
            notApplicable.push(`${report.name} — ไม่มีช่องวันที่และช่อง Ref No`)
            return
          }
          for (const b of REPORT_BUTTONS) if (!buttons.includes(b)) logRow(list, [no, report.name, by, value, b, 'N/A', 0, 'ฟอร์มนี้ไม่มีปุ่มนี้'])
          if (buttons.length === 0) throw new Error('ฟอร์มไม่มีปุ่มค้นหา/Export')

          // 3/5. every button of the form with the same criteria
          for (const [j, button] of buttons.entries()) {
            const check = await search(ui, report, fill, button, testInfo.outputPath(`r${list}${no}-${j}.bin`))
            results.push({ button, check })
            logRow(list, [no, report.name, by, value, button, check.ok ? 'PASS' : 'FAIL', check.rows, check.reason])
          }
        } catch (e) {
          const msg = (e as Error).message.split('\n')[0]
          logRow(list, [no, report.name, by, value, '-', 'FAIL', 0, `script error: ${msg}`])
          failed.push(`${report.name} — ${msg}`)
          expect.soft(msg, `${report.name} · เปิด/ค้นหา Report ได้`).toBe('')
          return
        }

        // 4. no data → fail with the report name
        for (const r of results) {
          if (!r.check.ok) failed.push(`${report.name} · ${r.button} — ${r.check.reason}`)
          // A nonempty reason can be informational (e.g. a binary XLS whose rows
          // cannot be counted). Judge the explicit result, retaining the reason.
          expect.soft(r.check.ok, `${report.name} · ${r.button} · ${by} ${value} — rows ${r.check.rows} · ${r.check.reason}`).toBe(true)
        }
      })
    }

    await test.step(`สรุป · ไม่ผ่าน ${failed.length} · ค้นหาด้วยวันที่ไม่ได้ ${notApplicable.length}`, async () => {
      const text = [`ไม่ผ่าน (${failed.length})`, ...failed, '', `ค้นหาด้วยวันที่ไม่ได้ — N/A (${notApplicable.length})`, ...notApplicable].join('\n')
      await testInfo.attach(`other-report-${list}-summary.txt`, { body: text, contentType: 'text/plain' })
      // the report names that failed, in the run's console log too (scope 4)
      if (failed.length) console.log(`[Other Report · ${list}] ไม่ผ่าน:\n  - ${failed.join('\n  - ')}`)
    })
  })
}

/** Open the report form fresh, fill the criteria, press `button`, judge the output. */
async function search(ui: ReportGeneratorPage, report: ReportLink, fill: () => Promise<void>, button: string, file: string): Promise<DataCheck> {
  await ui.page.goto(report.href)
  await fill()
  const out = await ui.run(button)
  const check = checkReportOutput(out, file)
  // evidence for a failure only — attaching every export of every report bloats the report
  if (!check.ok && out.kind === 'file') await test.info().attach(`${report.name}-${button}-${out.fileName}`, { body: out.data })
  if (!check.ok && out.kind === 'page') await test.info().attach(`${report.name}-${button}.html`, { body: out.html, contentType: 'text/html' })
  return check
}
