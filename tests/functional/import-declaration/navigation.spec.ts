import { test, expect } from '../../fixtures'
import { EXPORT_BUTTONS } from '../../pages/spn/ImportListPage'

/**
 * Import Declaration · [Navigation] — Home "บริการหลัก" → IMPORT card → declaration list.
 * Read-only: creates no data.
 */
test.describe('[Navigation]', () => {
  test('TC-FUNC-001: IMPORT card VIEW IMPORT opens the Import Declaration list @smoke', async ({ page, spn, homePage, listPage }) => {
    await test.step('Open Home with the saved session', async () => {
      await homePage.open(spn)
    })

    await test.step('Verify the IMPORT service card is shown', async () => {
      await expect(homePage.importCardTitle, 'Home · IMPORT card title').toBeVisible()
      await expect(homePage.viewImport, 'Home · VIEW IMPORT button').toBeVisible()
    })

    await test.step('Click VIEW IMPORT', async () => {
      await homePage.viewImport.click()
      await expect(page, 'URL · Import Declaration Control service').toHaveURL(/SERVICENAME=IMPORTDECLARATIONCONTROL/i)
    })

    await test.step('Verify the list page with its toolbar, search and export controls', async () => {
      await expect(listPage.heading, 'List · "Import Declaration" title').toBeVisible()
      await expect(listPage.newButton, 'List · F7 [ New ]').toBeVisible()
      await expect(listPage.copyButton, 'List · Copy').toBeVisible()
      await expect(listPage.searchButton, 'List · Search').toBeVisible()
      await expect(listPage.importButton, 'List · Import (data file)').toBeVisible()
      for (const name of [...Object.keys(EXPORT_BUTTONS), 'Save XLS New'] as const) {
        await expect(listPage.exportButton(name as keyof typeof EXPORT_BUTTONS), `List · ${name} button`).toBeVisible()
      }
    })
  })
})
