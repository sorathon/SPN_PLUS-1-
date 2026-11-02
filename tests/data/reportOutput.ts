import fs from 'fs'
import { readZip } from './zip'
import type { ReportOutput } from '../pages/spn/ReportGeneratorPage'

/**
 * Decide whether a report output holds data rows. Report layouts are not known up front
 * (each report is configured per customer), so data is counted generically:
 * - HTML page / HTML-as-Excel: rows of tables that hold no form inputs, minus one header row each;
 * - XLSX: <row> elements of every worksheet, minus one header row each;
 * - SpreadsheetML (<Row>) / CSV / text: rows / non-empty lines minus a header line;
 * - old binary .xls (BIFF): can't be counted — accepted when not empty (noted).
 */
export type DataCheck = { ok: boolean; rows: number; reason: string }

const ERROR_TEXT = /ERROR DETECTED|Internal Server Error|Fatal error|Uncaught|PDOException|SQLSTATE|Warning:|Notice:|Deprecated:/i
const NO_DATA_TEXT = /No data|No record|ไม่พบข้อมูล|ไม่มีข้อมูล|Data not found/i

function errorLine(text: string): string {
  const m = text.match(ERROR_TEXT)
  if (!m) return ''
  const ref = text.match(/REFERENCE ID\s*(\S+)/)
  return `${text.slice(m.index!, m.index! + 160).replace(/\s+/g, ' ').trim()}${ref ? ` [REFERENCE ID ${ref[1]}]` : ''}`
}

/** Data rows of the HTML tables that are not the query form. */
export function htmlDataRows(html: string): number {
  let rows = 0
  // innermost tables only — layouts nest tables
  for (const m of html.matchAll(/<table\b[^>]*>((?:(?!<table\b)[\s\S])*?)<\/table>/gi)) {
    const body = m[1]
    if (/<(input|select|textarea)\b/i.test(body)) continue
    const trs = (body.match(/<tr\b/gi) ?? []).length
    if (trs >= 2) rows += trs - 1
  }
  return rows
}

export function checkReportOutput(out: ReportOutput, file?: string): DataCheck {
  if (out.kind === 'none') return { ok: false, rows: 0, reason: 'กดแล้วไม่มีผลลัพธ์ (ไม่มีไฟล์/หน้าใหม่ภายในเวลาที่กำหนด)' }
  if (out.kind === 'dialog') return { ok: false, rows: 0, reason: `ระบบแจ้งเตือน: ${out.message}` }
  if (out.kind === 'page') {
    const err = out.status >= 400 ? `HTTP ${out.status} ${errorLine(out.text)}` : errorLine(out.text)
    if (err) return { ok: false, rows: 0, reason: err }
    const rows = htmlDataRows(out.html)
    if (rows === 0 || (rows <= 1 && NO_DATA_TEXT.test(out.text))) return { ok: false, rows: 0, reason: 'ไม่พบข้อมูล' }
    return { ok: true, rows, reason: '' }
  }
  const data = out.data
  if (data.length === 0) return { ok: false, rows: 0, reason: `ไฟล์ ${out.fileName} ว่าง (0 byte)` }
  if (data.subarray(0, 2).toString('latin1') === 'PK') {
    // xlsx — count rows of every sheet
    const path = file ?? ''
    if (path) fs.writeFileSync(path, data)
    const sheets = path ? readZip(path).filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name)) : []
    const rows = sheets.reduce((n, s) => n + Math.max(0, (s.data.toString('utf8').match(/<row\b/g) ?? []).length - 1), 0)
    return rows > 0 ? { ok: true, rows, reason: '' } : { ok: false, rows: 0, reason: `ไฟล์ ${out.fileName} ไม่มีแถวข้อมูล` }
  }
  if (data.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) {
    return { ok: true, rows: -1, reason: `ไฟล์ .xls แบบ binary (${data.length} bytes) — นับแถวไม่ได้ ตรวจแค่ว่าไม่ว่าง` }
  }
  const text = data.toString('utf8')
  const err = errorLine(text)
  if (err) return { ok: false, rows: 0, reason: `ไฟล์ ${out.fileName} มี error: ${err}` }
  let rows: number
  if (/<tr\b/i.test(text)) rows = htmlDataRows(text)
  else if (/<Row\b/.test(text)) rows = Math.max(0, (text.match(/<Row\b/g) ?? []).length - 1)
  else rows = Math.max(0, text.split(/\r?\n/).filter((l) => l.replace(/[",;\s]/g, '') !== '').length - 1)
  return rows > 0 ? { ok: true, rows, reason: '' } : { ok: false, rows: 0, reason: `ไฟล์ ${out.fileName} ไม่มีแถวข้อมูล` }
}
