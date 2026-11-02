import { test, expect } from '../../fixtures'
import { declarationHeader, CUSTOMER_SEARCH, today } from '../../data/factories'
import { expectFieldText, expectFieldCount, expectValue } from '../../pages/reportedExpect'
import { IMPORTER_FIELDS, companyNameInList } from '../../pages/spn/WorkspacePage'
import { createDraft, createDeclaration } from './_shared'

/**
 * Import Declaration · [Create & Edit] — F7 [New], the header form ("Declaration Control")
 * with its autocomplete fields, Save and re-open.
 * Data: every test creates its own declaration (Job No "PW…") and deletes it afterwards.
 */
test.describe('[Create & Edit]', () => {
  // create + fill + save + re-open is several full-page form posts on the dev server
  test.describe.configure({ timeout: 120_000 })

  test('TC-FUNC-010: F7 [New] creates a draft declaration with a new reference no @smoke', async ({
    spn,
    listPage,
    workspacePage,
    declarations,
  }) => {
    const draft = await test.step('Click F7 [ New ] on the list', async () => {
      return createDraft(listPage, workspacePage, spn, declarations.track)
    })

    await test.step('Verify the workspace shows a new reference no and an empty declaration', async () => {
      expect(draft.referenceNo, 'Workspace · reference no format').toMatch(/^[A-Z]{4}\d{9}$/)
      await expectValue(await workspacePage.propertyCounts(), { invoices: 0, items: 0 }, 'Workspace · invoice/item counters')
      await expect(workspacePage.saveButton, 'Workspace · header form is open').toBeVisible()
    })

    await test.step('Verify the draft is listed with the draft status', async () => {
      await listPage.open(spn)
      await listPage.search({ referenceNo: draft.referenceNo })
      await expectFieldCount(listPage.rows, 1, 'List · rows for the new reference no')
      const row = listPage.rowFor(draft.referenceNo)
      await expectFieldText(listPage.cell(row, 'ref'), draft.referenceNo, 'List · Reference No')
      await expect(listPage.statusPicture(row), 'List · draft status picture (กำลังเตรียมเอกสาร)').toHaveAttribute('src', 'images/invStat_.gif')
      await expect(listPage.deleteIcon(draft.referenceNo), 'List · a draft can be deleted').toBeVisible()
    })
  })

  test('TC-FUNC-011: header entry with autocomplete is saved and shown in the list @smoke', async ({
    spn,
    listPage,
    workspacePage,
    declarations,
  }) => {
    const header = declarationHeader()
    const draft = await test.step('Create a draft', async () => createDraft(listPage, workspacePage, spn, declarations.track))

    const picked = await test.step('Fill the header — importer, vessel ("%"), countries, ports and package unit via autocomplete', async () =>
      workspacePage.fillHeader(header),
    )

    await test.step('Save (F12)', async () => {
      await workspacePage.save()
    })

    await test.step('Verify every header field after re-opening the workspace (Level 2)', async () => {
      await workspacePage.open(spn, draft.id)
      const expected: [Parameters<typeof workspacePage.field>[0], string][] = [
        ['jobNo', header.jobNo],
        ...IMPORTER_FIELDS.map((name) => [name, picked.importer[name]] as [typeof name, string]),
        ['transportMode', header.transportMode],
        ['vessel', picked.vessel],
        ['mawb', header.mawb],
        ['hawb', header.hawb],
        ['originCountry', header.originCountry],
        ['consignmentCountry', header.consignmentCountry],
        ['releasePort', header.releasePort],
        ['dischargePort', header.dischargePort],
        ['packageAmount', header.packageAmount],
        ['packageUnit', header.packageUnit],
        ['netWeight', header.netWeight],
        ['grossWeight', header.grossWeight],
        ['arrivalDate', header.arrivalDate],
        ['shippingMark', header.shippingMark],
      ]
      for (const [name, value] of expected) await expectFieldText(workspacePage.field(name), value, `Header · ${name}`)
      await expectFieldText(workspacePage.voyage, header.voyage, 'Header · voyage')
    })

    await test.step('Verify the list row columns (Level 1)', async () => {
      await listPage.open(spn)
      await listPage.search({ referenceNo: draft.referenceNo })
      const row = listPage.rowFor(draft.referenceNo)
      await expectFieldText(listPage.cell(row, 'job'), header.jobNo, 'List · Job No')
      await expectFieldText(listPage.cell(row, 'vessel'), picked.vessel, 'List · vessel')
      await expectFieldText(listPage.cell(row, 'refDate'), today().display, 'List · reference date')
      await expectFieldText(listPage.cell(row, 'mawb'), header.mawb, 'List · MAWB')
      await expectFieldText(listPage.cell(row, 'hawb'), header.hawb, 'List · HAWB')
      await expectFieldText(listPage.cell(row, 'pk'), `${header.packageAmount} ${header.packageUnit}`, 'List · PK')
      await expectFieldText(listPage.cell(row, 'company'), companyNameInList(picked.importer.companyName), 'List · company name (cut)')
    })
  })

  test('TC-FUNC-012: importer autocomplete fills the importer master data and clearing the code clears it @regression', async ({
    spn,
    listPage,
    workspacePage,
    declarations,
  }) => {
    await test.step('Create a draft', async () => createDraft(listPage, workspacePage, spn, declarations.track))

    const suggestion = await test.step(`Type "${CUSTOMER_SEARCH.importer}" — the importer suggestions are listed`, async () => {
      await workspacePage.autocomplete.type(workspacePage.field('importerCode'), CUSTOMER_SEARCH.importer)
      const values = (await workspacePage.autocomplete.optionValues()).filter((value) => value.trim() !== '')
      expect(values.length, 'Autocomplete · at least one importer with a nonblank code is listed').toBeGreaterThan(0)
      return { code: values[0], row: await workspacePage.autocomplete.rowOf(values[0]).innerText() }
    })

    const importer = await test.step('Pick the first importer with a nonblank code and press Enter', async () => workspacePage.pickImporter(CUSTOMER_SEARCH.importer))

    await test.step('Verify the importer fields are filled from that importer record', async () => {
      await expectValue(importer.importerCode, suggestion.code, 'Importer · code = the suggestion picked')
      expect(importer.companyName, 'Importer · Thai name is filled').not.toBe('')
      expect(importer.companyTaxNo, 'Importer · tax no is filled').not.toBe('')
      // substring: the suggestion row also lists name, branch and address columns
      expect(suggestion.row, 'Importer · tax no matches the suggestion row').toContain(importer.companyTaxNo)
    })

    await test.step('Delete the importer code with Backspace', async () => {
      await workspacePage.field('importerCode').click()
      await workspacePage.field('importerCode').press('End')
      for (let i = 0; i < importer.importerCode.length; i++) await workspacePage.field('importerCode').press('Backspace')
    })

    await test.step('Verify the dependent importer fields are cleared', async () => {
      for (const name of ['importerCode', 'companyName', 'companyTaxNo', 'companyBranch', 'companyEnglishName', 'customsClearanceCard'] as const) {
        await expectFieldText(workspacePage.field(name), '', `Importer · ${name} cleared`)
      }
    })
  })

  test('TC-FUNC-013: unknown origin country code is rejected with a warning @regression', async ({
    spn,
    listPage,
    workspacePage,
    declarations,
    dialogs,
  }) => {
    await test.step('Create a draft', async () => createDraft(listPage, workspacePage, spn, declarations.track))

    await test.step('Type an origin country code that does not exist and leave the field', async () => {
      await workspacePage.autocomplete.type(workspacePage.field('originCountry'), 'QQ')
      await workspacePage.field('originCountry').press('Tab')
    })

    await test.step('Verify the "country not found" warning', async () => {
      const dialog = await dialogs.waitFor(/ไม่พบข้อมูลประเทศ/)
      expect(dialog.type, 'Warning · shown as an alert').toBe('alert')
    })
  })

  test('TC-FUNC-014: editing a saved header keeps unchanged fields @regression', async ({ spn, listPage, workspacePage, declarations }) => {
    const created = await test.step('Create and save a declaration', async () => createDeclaration(listPage, workspacePage, spn, declarations.track))
    const changed = { mawb: `${created.header.mawb}E`, hawb: `${created.header.hawb}E`, grossWeight: '150', shippingMark: `${created.header.shippingMark} EDIT` }

    await test.step('Change MAWB, HAWB, gross weight and shipping mark, then save', async () => {
      await workspacePage.open(spn, created.id)
      await workspacePage.field('mawb').fill(changed.mawb)
      await workspacePage.field('hawb').fill(changed.hawb)
      await workspacePage.field('grossWeight').fill(changed.grossWeight)
      await workspacePage.field('shippingMark').fill(changed.shippingMark)
      await workspacePage.save()
    })

    await test.step('Verify the changed and the unchanged fields after re-opening', async () => {
      await workspacePage.open(spn, created.id)
      await expectFieldText(workspacePage.field('mawb'), changed.mawb, 'Header · MAWB (changed)')
      await expectFieldText(workspacePage.field('hawb'), changed.hawb, 'Header · HAWB (changed)')
      await expectFieldText(workspacePage.field('grossWeight'), changed.grossWeight, 'Header · gross weight (changed)')
      await expectFieldText(workspacePage.field('shippingMark'), changed.shippingMark, 'Header · shipping mark (changed)')
      await expectFieldText(workspacePage.field('jobNo'), created.header.jobNo, 'Header · Job No (unchanged)')
      await expectFieldText(workspacePage.field('importerCode'), created.picked.importer.importerCode, 'Header · importer (unchanged)')
      await expectFieldText(workspacePage.field('vessel'), created.picked.vessel, 'Header · vessel (unchanged)')
      await expectFieldText(workspacePage.field('netWeight'), created.header.netWeight, 'Header · net weight (unchanged)')
    })

    await test.step('Verify the list shows the new MAWB/HAWB', async () => {
      await listPage.open(spn)
      await listPage.search({ referenceNo: created.referenceNo })
      const row = listPage.rowFor(created.referenceNo)
      await expectFieldText(listPage.cell(row, 'mawb'), changed.mawb, 'List · MAWB')
      await expectFieldText(listPage.cell(row, 'hawb'), changed.hawb, 'List · HAWB')
    })
  })
})
