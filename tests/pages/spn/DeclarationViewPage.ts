import { Page, Locator } from '@playwright/test'

/**
 * Read-only "Import Declaration Control" view opened by a list row's Event icon
 * (ACTION=VIEW): a header table (column titles + one value row), then the invoices
 * and their items as further title/value tables.
 */
export class DeclarationViewPage {
  readonly page: Page
  readonly heading: Locator
  readonly detailsHeading: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByText('Import Declaration Control', { exact: true })
    this.detailsHeading = page.getByText('Details', { exact: true })
  }

  /**
   * Values of the table whose title row contains `firstColumn`, keyed by column title
   * (arrows/whitespace stripped). One record per value row.
   */
  async table(firstColumn: string): Promise<Record<string, string>[]> {
    return this.page.evaluate((first) => {
      const clean = (s: string) => s.replace(/[↑↓]/g, '').replace(/\s+/g, ' ').trim()
      const rows = [...document.querySelectorAll('tr')]
      const titleIndex = rows.findIndex((tr) => clean((tr.children[0] as HTMLElement | undefined)?.innerText ?? '') === first)
      if (titleIndex < 0) return []
      const titles = [...rows[titleIndex].children].map((c) => clean((c as HTMLElement).innerText))
      const out: Record<string, string>[] = []
      for (const tr of rows.slice(titleIndex + 1)) {
        if (tr.children.length !== titles.length) break
        const first = clean((tr.children[0] as HTMLElement).innerText)
        if (titles.includes(first)) break
        out.push(Object.fromEntries(titles.map((t, i) => [t, clean((tr.children[i] as HTMLElement).innerText)])))
      }
      return out
    }, firstColumn)
  }
}
