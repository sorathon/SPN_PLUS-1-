/**
 * CSV for "Add Invoice → นำเข้าข้อมูล Invoice จากไฟล์". The column layout is not fixed:
 * each site defines Mapping profiles (conf_mapping), so the file is built from the
 * mapping the suite is told to use (.env SPN_CSV_MAPPING_IMPORT / _EXPORT).
 *
 * The mapping is read from its edit form (SERVICENAME=CONFMAPPING&ACTION=EDIT&ADVMODE=Y —
 * a GET, never submitted): rows `column<n>` = field key ("detail_quantity",
 * "header_invoiceNo"…) and `val<n>` = 1-based column ("12"), several columns ("12,13")
 * or a constant ("#1").
 *
 * The parser (doMapTypeTo) skips every line whose first cell contains "//", so the
 * first line carries the field names behind "//" — a reader can see which column is which.
 */
export type CsvMapping = { id: string; name: string; fields: Record<string, string> }

export function parseMappingForm(html: string): Record<string, string> {
  const keys = new Map<string, string>()
  const vals = new Map<string, string>()
  for (const m of html.matchAll(/name='(H?)column(\d+)' value='([^']*)'/g)) keys.set(m[1] + m[2], m[3])
  for (const m of html.matchAll(/name='(H?)val(\d+)' value='([^']*)'/g)) vals.set(m[1] + m[2], m[3])
  for (const m of html.matchAll(/name='(H?)val(\d+)'\s*>([^<]*)<\/textarea>/g)) vals.set(m[1] + m[2], m[3])
  const fields: Record<string, string> = {}
  for (const [n, key] of keys) if (vals.has(n) && vals.get(n) !== '') fields[key] = vals.get(n)!.trim()
  return fields
}

/** Logical field of a mapping key: "detail_quantity" → "quantity", "header_D_INcompanyCode" → "INcompanyCode". */
export function fieldOf(key: string): string {
  return key.replace(/^(header_D_|header_|detail_|FX_|EX_)/, '')
}

/** 0-based column of a mapping value, or null for a constant ("#…"). */
function columnOf(val: string): number | null {
  if (val.startsWith('#')) return null
  const first = Number(val.split(',')[0])
  return Number.isFinite(first) && first > 0 ? first - 1 : null
}

/** Which logical fields this mapping reads from a column. */
export function mappedFields(mapping: CsvMapping): Set<string> {
  const out = new Set<string>()
  for (const [key, val] of Object.entries(mapping.fields)) if (columnOf(val) !== null) out.add(fieldOf(key).toLowerCase())
  return out
}

function quote(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/**
 * Lay `rows` (logical field → value) out in the mapping's columns. Fields the mapping
 * doesn't read are dropped (listed in `dropped`); columns no row fills stay empty —
 * which is what this suite wants: unmapped/blank numeric columns.
 * Two fields mapped to the same column with different values is an error (the mapping
 * can't carry the data the scenario needs).
 */
export function buildCsv(mapping: CsvMapping, rows: Record<string, string>[]): { text: string; dropped: string[] } {
  const colOfField = new Map<string, number>()
  let width = 0
  for (const [key, val] of Object.entries(mapping.fields)) {
    const col = columnOf(val)
    if (col === null) continue
    const f = fieldOf(key).toLowerCase()
    if (!colOfField.has(f)) colOfField.set(f, col)
    width = Math.max(width, col + 1)
  }
  const head = Array<string>(width).fill('')
  for (const [key, val] of Object.entries(mapping.fields)) {
    const col = columnOf(val)
    if (col !== null) head[col] = head[col] ? `${head[col]}|${fieldOf(key)}` : fieldOf(key)
  }
  head[0] = `//${head[0]}`
  const dropped = new Set<string>()
  const lines = [head.map(quote).join(',')]
  for (const row of rows) {
    const cells = Array<string>(width).fill('')
    for (const [field, value] of Object.entries(row)) {
      const col = colOfField.get(field.toLowerCase())
      if (col === undefined) {
        if (value !== '') dropped.add(field)
        continue
      }
      if (cells[col] !== '' && value !== '' && cells[col] !== value) {
        throw new Error(`mapping "${mapping.name}" reads "${field}" from column ${col + 1}, which already holds another field's value "${cells[col]}"`)
      }
      if (value !== '') cells[col] = value
    }
    lines.push(cells.map(quote).join(','))
  }
  return { text: lines.join('\r\n') + '\r\n', dropped: [...dropped] }
}
