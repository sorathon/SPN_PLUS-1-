import zlib from 'zlib'

/**
 * Minimal PDF text reader for the app's print output (TCPDF). Enough to search the
 * printed text for values and stray labels — not a layout engine:
 * - FlateDecode streams are inflated;
 * - fonts with a /ToUnicode CMap are decoded through it (TCPDF's Thai/Unicode fonts
 *   write 2-byte codes); other fonts are read as Latin-1;
 * - each BT…ET text object becomes one line, TJ kerning gaps wider than a space become " ";
 *   positioning inside a text object is not a gap (runs are split mid-word).
 */
type CMap = { bytes: number; map: Map<number, string> }

function inflate(raw: Buffer): Buffer | null {
  for (const fn of [zlib.inflateSync, zlib.inflateRawSync]) {
    try {
      return fn(raw)
    } catch {
      // try the next decoder
    }
  }
  return null
}

function hexToString(hex: string): string {
  let out = ''
  for (let i = 0; i + 3 < hex.length + 1; i += 4) out += String.fromCharCode(parseInt(hex.slice(i, i + 4).padEnd(4, '0'), 16))
  return out
}

function parseCMap(text: string): CMap {
  const map = new Map<number, string>()
  let bytes = 1
  const code = (h: string) => {
    if (h.length > 2) bytes = 2
    return parseInt(h, 16)
  }
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map.set(code(m[1]), hexToString(m[2]))
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]+>|\[[^\]]*\])/g)) {
      const lo = code(m[1])
      const hi = code(m[2])
      if (m[3].startsWith('[')) {
        const list = [...m[3].matchAll(/<([0-9a-fA-F]+)>/g)].map((x) => hexToString(x[1]))
        for (let c = lo; c <= hi && c - lo < list.length; c++) map.set(c, list[c - lo])
      } else {
        const start = parseInt(m[3].slice(1, -1), 16)
        for (let c = lo; c <= hi; c++) map.set(c, String.fromCharCode(start + (c - lo)))
      }
    }
  }
  return { bytes, map }
}

function unescapeLiteral(s: string): string {
  return s.replace(/\\([nrtbf()\\]|[0-7]{1,3}|\r?\n)/g, (_, e: string) => {
    if (/^[0-7]/.test(e)) return String.fromCharCode(parseInt(e, 8))
    return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' } as Record<string, string>)[e] ?? ''
  })
}

function decode(bytes: string, cmap: CMap | undefined, twoByte: boolean): string {
  if (cmap) {
    let out = ''
    for (let i = 0; i < bytes.length; i += cmap.bytes) {
      const c = cmap.bytes === 2 ? (bytes.charCodeAt(i) << 8) | bytes.charCodeAt(i + 1) : bytes.charCodeAt(i)
      out += cmap.map.get(c) ?? ''
    }
    return out
  }
  if (twoByte) {
    let out = ''
    for (let i = 0; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes.charCodeAt(i) << 8) | bytes.charCodeAt(i + 1))
    return out
  }
  return bytes
}

export function readPdfText(data: Buffer): string {
  const src = data.toString('latin1')
  const objects = new Map<string, { dict: string; stream: string | null }>()
  for (const m of src.matchAll(/(\d+)\s+\d+\s+obj\b([\s\S]*?)\bendobj/g)) {
    const body = m[2]
    const s = body.search(/\bstream\r?\n/)
    let stream: string | null = null
    let dict = body
    if (s >= 0) {
      dict = body.slice(0, s)
      const start = s + body.slice(s).indexOf('\n') + 1
      const end = body.lastIndexOf('endstream')
      const raw = Buffer.from(body.slice(start, end).replace(/\r?\n$/, ''), 'latin1')
      const decoded = /\/FlateDecode/.test(dict) ? inflate(raw) : raw
      stream = decoded ? decoded.toString('latin1') : null
    }
    objects.set(m[1], { dict, stream })
  }

  // font object → its ToUnicode CMap; resource name (/F1) → font object
  const cmapOf = new Map<string, CMap>()
  const type0 = new Set<string>()
  for (const [id, o] of objects) {
    if (!/\/Type\s*\/Font\b/.test(o.dict)) continue
    if (/\/Subtype\s*\/Type0\b/.test(o.dict)) type0.add(id)
    const tu = o.dict.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/)
    const cm = tu && objects.get(tu[1])?.stream
    if (cm) cmapOf.set(id, parseCMap(cm))
  }
  const fontByName = new Map<string, string>()
  for (const o of objects.values()) {
    for (const block of o.dict.matchAll(/\/Font\s*<<([\s\S]*?)>>/g)) {
      for (const f of block[1].matchAll(/\/([\w.+-]+)\s+(\d+)\s+\d+\s+R/g)) fontByName.set(f[1], f[2])
    }
  }

  const lines: string[] = []
  for (const o of objects.values()) {
    const s = o.stream
    if (!s || !/\b(Tj|TJ)\b/.test(s) || /begincmap/.test(s)) continue
    let font: string | undefined
    let line = ''
    const tokens = s.matchAll(/\/([\w.+-]+)\s+[-\d.]+\s+Tf|<([0-9a-fA-F\s]*)>|\((?:\\[\s\S]|[^\\)])*\)|\[|\]|(-?\d*\.?\d+)|\b(Tj|TJ|'|"|ET|Td|TD|T\*|Tm)\b/g)
    let inArray = false
    let pending = ''
    for (const t of tokens) {
      const tok = t[0]
      if (t[1]) {
        font = fontByName.get(t[1])
      } else if (t[2] !== undefined || tok.startsWith('(')) {
        const bytes =
          t[2] !== undefined
            ? Buffer.from(t[2].replace(/\s/g, ''), 'hex').toString('latin1')
            : unescapeLiteral(tok.slice(1, -1))
        pending += decode(bytes, font ? cmapOf.get(font) : undefined, !!font && type0.has(font))
      } else if (tok === '[') {
        inArray = true
      } else if (tok === ']') {
        inArray = false
      } else if (t[3] !== undefined) {
        // a TJ kerning gap wider than ~a space separates words
        if (inArray && Number(t[3]) < -200) pending += ' '
      } else if (['Tj', 'TJ', "'", '"'].includes(tok)) {
        line += pending
        pending = ''
      } else if (tok === 'ET') {
        if (line.trim()) lines.push(line.trim())
        line = ''
      }
      // positioning operators (Td/TD/T*/Tm) are not word gaps: runs are split mid-word
      // (Thai combining marks, kerning), and TCPDF writes each cell as its own BT…ET
    }
    if (line.trim()) lines.push(line.trim())
  }
  return lines.join('\n')
}
