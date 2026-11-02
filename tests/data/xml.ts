/**
 * Minimal XML leaf reader for the declaration XML the app sends to Customs. Lists every
 * element that holds text (no child elements) with its path, e.g.
 * "DocumentControl/…/Detail/ProductInfo/NetWeight/Weight". CDATA is unwrapped.
 * `detail` is the 0-based index of the enclosing <Detail> (one per declaration item),
 * or -1 for header/invoice values — enough to compare item values and scan for zeros.
 */
export type XmlLeaf = { path: string; name: string; value: string; detail: number }

export function xmlLeaves(xml: string): XmlLeaf[] {
  const leaves: XmlLeaf[] = []
  const stack: { name: string; hasChild: boolean; text: string }[] = []
  let detail = -1
  let details = 0
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([A-Za-z_][\w.:-]*)([^>]*?)(\/?)>|([^<]+)/g
  for (const m of xml.matchAll(re)) {
    const top = stack[stack.length - 1]
    if (m[1] !== undefined) {
      if (top) top.text += m[1]
    } else if (m[6] !== undefined) {
      if (top) top.text += m[6]
    } else if (m[3]) {
      const [closing, name, , selfClosing] = [m[2] === '/', m[3], m[4], m[5] === '/']
      if (closing) {
        const el = stack.pop()
        if (!el) continue
        if (!el.hasChild) leaves.push({ path: [...stack.map((s) => s.name), el.name].join('/'), name: el.name, value: el.text.trim(), detail })
        if (el.name === 'Detail') detail = -1
      } else {
        if (top) top.hasChild = true
        if (selfClosing) {
          leaves.push({ path: [...stack.map((s) => s.name), name].join('/'), name, value: '', detail })
        } else {
          if (name === 'Detail') detail = details++
          stack.push({ name, hasChild: false, text: '' })
        }
      }
    }
  }
  return leaves
}

/** Leaves of each <Detail> (declaration item), in document order. */
export function xmlDetails(xml: string): XmlLeaf[][] {
  const out: XmlLeaf[][] = []
  for (const l of xmlLeaves(xml)) if (l.detail >= 0) (out[l.detail] ??= []).push(l)
  return out
}

/** Value of the first leaf whose path ends with `suffix` ("NetWeight/Weight"). */
export function leafValue(leaves: XmlLeaf[], suffix: string): string | undefined {
  return leaves.find((l) => l.path === suffix || l.path.endsWith('/' + suffix))?.value
}
