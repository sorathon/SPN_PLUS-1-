import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from '../../fixtures'
import { ExportCreationPage, EXPORT_ACCEPT_STATUS, FORCE_EXPORT_DECLARATION_JOB } from '../../pages/export/CreationPage'
import { SpnSession } from '../../pages/spn/SpnApp'

/**
 * Creation/status cases based on the observed Export UI.
 * "Complete" in the requested workflow appears as Customs Accept / ACCEPT on this UI.
 * Keep editing/calculation scenarios in draft; force acceptance only at their end.
 */
async function withDraft(page: Page, session: SpnSession, info: TestInfo, use: (ui: ExportCreationPage, ref: string) => Promise<void>) {
  const ui = new ExportCreationPage(page)
  const draft = await test.step('Export list → F7 New → new draft workspace', () => ui.createDraft(session))
  info.annotations.push({ type: 'reference', description: `${draft.referenceNo} (ExDclCtrl:${draft.id})` })
  try {
    await use(ui, draft.referenceNo)
  } finally {
    try { await ui.cleanupDraft(session, draft.referenceNo) }
    catch { info.annotations.push({ type: 'warning', description: `Check draft cleanup manually: ${draft.referenceNo}` }) }
  }
}

test.describe('[Export · Creation and completion]', () => {
  test.describe.configure({ timeout: 180_000 })

  test('TC-EXP-001: Export list exposes New, Search and the observed export buttons @smoke', async ({ page, spn }) => {
    const ui = new ExportCreationPage(page)
    await ui.openList(spn)
    for (const id of ['newBTN', 'refreshBTN', 'CopyBTN', 'saveXmlBTN', 'saveXmlShortBTN', 'saveXmlDeclBTN', 'savePdfBTN', 'saveTiffBTN', 'saveXlsBTN', 'saveXlsBTNNEW', 'saveDat']) {
      await expect(page.locator(`#${id}`).filter({ visible: true }), `Export list · ${id}`).toBeVisible()
    }
  })

  test('TC-EXP-010: F7 New creates an empty draft with its own reference @smoke', async ({ page, spn }, info) => {
    await withDraft(page, spn, info, async (ui, ref) => {
      expect(ref).toMatch(/^[A-Z]{4}\d{9}$/)
      await expect(page.locator('body')).toContainText('0 Invoice(s)')
      await expect(page.locator('body')).toContainText('0 Item(s)')
      await expect(ui.workspace.detail.locator('select[name="ins_documentType"]')).toHaveValue('1')
      await expect(ui.workspace.detail.locator('input[name="ins_jobNo"]')).toHaveValue('')
      await ui.returnToList()
      await ui.searchReference(ref)
      await expect(ui.row(ref)).toHaveCount(1)
      await expect(ui.cell(ui.row(ref), 'declaration')).toHaveText('')
      await expect(ui.cell(ui.row(ref), 'declStatus')).toHaveText('')
      await expect(ui.row(ref).locator('img[title="Delete"]')).toBeVisible()
    })
  })

  test('TC-EXP-015: Job No give me decl no → Re-Avg → declaration number and ACCEPT @smoke', async ({ page, spn }, info) => {
    await withDraft(page, spn, info, async (ui, ref) => {
      await test.step(`Enter Job No "${FORCE_EXPORT_DECLARATION_JOB}" and click Re-Avg and Calc Tax`, () => ui.requestDeclarationNumber())
      await ui.returnToList()
      const declaration = await test.step('Verify this reference has its declaration number and ACCEPT status', () => ui.expectAccepted(ref))
      info.annotations.push({ type: 'declaration', description: `${ref}: ${declaration}, ${EXPORT_ACCEPT_STATUS}` })
    })
  })

  test('TC-EXP-016: accepted declaration number and status persist after reopening @regression', async ({ page, spn }, info) => {
    await withDraft(page, spn, info, async (ui, ref) => {
      await ui.requestDeclarationNumber()
      await ui.returnToList()
      const declaration = await ui.expectAccepted(ref)
      await ui.reopen(ref)
      await expect(ui.workspace.detail.locator('body')).toContainText(declaration)
      await expect(ui.workspace.detail.locator('body')).toContainText('Status Customs Accept')
      await expect(ui.workspace.detail.locator('input[name="ins_jobNo"]')).toHaveValue(FORCE_EXPORT_DECLARATION_JOB)
      await expect(ui.workspace.reAvgAndCalcTax).not.toBeVisible()
      await expect(page.locator('#AddInvBTNID')).not.toBeVisible()
    })
  })

  test('TC-EXP-030: search by Reference No isolates the new Export draft @regression', async ({ page, spn }, info) => {
    await withDraft(page, spn, info, async (ui, ref) => {
      await ui.returnToList()
      await ui.searchReference(ref)
      await expect(ui.rows).toHaveCount(1)
      await expect(ui.cell(ui.row(ref), 'reference')).toHaveText(ref)
    })
  })

  test('TC-EXP-034: Customs Accept filter finds the completed reference @regression', async ({ page, spn }, info) => {
    await withDraft(page, spn, info, async (ui, ref) => {
      await ui.requestDeclarationNumber()
      await ui.returnToList()
      await page.locator('select[name="sStatus"]').selectOption(EXPORT_ACCEPT_STATUS)
      await ui.searchReference(ref)
      await expect(ui.row(ref)).toHaveCount(1)
      await expect(ui.cell(ui.row(ref), 'declStatus')).toHaveText(EXPORT_ACCEPT_STATUS)
    })
  })
})
