import { test, expect } from './_shared'
import { today } from '../../data/factories'
import { expectFieldText, expectFieldCount, expectValue } from '../../pages/reportedExpect'

/**
 * Import Declaration · [List Search & Filter] — Reference No, keyword (Job No / MAWB /
 * HAWB), Status, date range, Filter Name, page size + paging, select all.
 * Data: read-only — all cases share one declaration (`sharedDeclaration`, unique
 * Job No / MAWB / HAWB) built once and deleted at the end of the worker.
 */
test.describe('[List Search & Filter]', () => {
  test.describe.configure({ timeout: 120_000 })

  test.beforeEach(async ({ spn, listPage }) => {
    await listPage.open(spn)
  })

  test('TC-FUNC-030: search by Reference No returns exactly that declaration @smoke', async ({ listPage, sharedDeclaration: d }) => {
    await test.step('Search by Reference No', async () => {
      await listPage.search({ referenceNo: d.referenceNo })
    })

    await test.step('Verify the only row is the declaration with its columns', async () => {
      await expectFieldCount(listPage.rows, 1, 'List · rows')
      const row = listPage.rowFor(d.referenceNo)
      await expectFieldText(listPage.cell(row, 'ref'), d.referenceNo, 'List · Reference No')
      await expectFieldText(listPage.cell(row, 'job'), d.header.jobNo, 'List · Job No')
      await expectFieldText(listPage.cell(row, 'mawb'), d.header.mawb, 'List · MAWB')
      await expectFieldText(listPage.cell(row, 'hawb'), d.header.hawb, 'List · HAWB')
    })
  })

  for (const [id, by, label, key, column] of [
    ['TC-FUNC-031', 'jobNo', 'เลขที่รับงาน (Job No)', 'jobNo', 'job'],
    ['TC-FUNC-032', 'masterBillOfLanding', 'MAWB', 'mawb', 'mawb'],
    ['TC-FUNC-033', 'houseBillOfLanding', 'HAWB', 'hawb', 'hawb'],
  ] as const) {
    test(`${id}: keyword search by ${label} @regression`, async ({ listPage, sharedDeclaration: d }) => {
      const value = d.header[key]

      await test.step(`Search keyword "${value}" from ${label}`, async () => {
        await listPage.search({ keyword: value, by })
      })

      await test.step('Verify every row matches the keyword and the declaration is found', async () => {
        await expectFieldCount(listPage.rows, 1, 'List · rows')
        await expectValue(await listPage.columnValues(column), [value], `List · ${label} of every row`)
        await expectValue(await listPage.referenceNumbers(), [d.referenceNo], 'List · reference no found')
      })
    })
  }

  test('TC-FUNC-034: Status filter shows only declarations of that status @regression', async ({ listPage, sharedDeclaration: d }) => {
    await test.step('Filter Status = Customs Accept', async () => {
      await listPage.search({ status: 'ACCEPT' })
    })

    await test.step('Verify every row is Customs Accept and the draft is not listed', async () => {
      const pictures = await listPage.statusPictures()
      expect(pictures.length, 'List · Customs Accept rows exist on the dev data').toBeGreaterThan(0)
      await expectValue([...new Set(pictures)], ['images/invStat_ACCEPT.gif'], 'List · status picture of every row')
      await expect(listPage.rowFor(d.referenceNo), 'List · the draft is filtered out').toHaveCount(0)
    })
  })

  test('TC-FUNC-035: Reference Date range finds the declarations created today @regression', async ({ listPage, sharedDeclaration: d }) => {
    const day = today().display

    await test.step(`Search Reference Date from ${day} to ${day}`, async () => {
      await listPage.search({ dateType: 'referenceDate', from: day, to: day, pageSize: '200' })
    })

    await test.step('Verify every row has today as reference date and includes the declaration', async () => {
      const dates = await listPage.columnValues('refDate')
      await expectValue([...new Set(dates)], [day], 'List · reference date of every row')
      await expect(listPage.rowFor(d.referenceNo), 'List · the declaration is listed').toHaveCount(1)
    })
  })

  test('TC-FUNC-036: page size and Next/Prev paging @regression', async ({ listPage, sharedDeclaration: d }) => {
    const page1 = await test.step('Show 15 per page', async () => {
      await listPage.search({ pageSize: '15' })
      return listPage.referenceNumbers()
    })

    await test.step('Verify page 1 has 15 rows, a Next link and the newest declaration', async () => {
      await expect(listPage.nextPage, 'Paging · Next link (more than 15 records)').toBeVisible()
      await expectValue(page1.length, 15, 'Paging · rows on page 1')
      expect(page1, 'Paging · newest declaration is on page 1').toContain(d.referenceNo)
    })

    const page2 = await test.step('Go to the next page', async () => {
      await listPage.goToNextPage()
      return listPage.referenceNumbers()
    })

    await test.step('Verify page 2 holds other declarations', async () => {
      expect(page2.length, 'Paging · rows on page 2').toBeGreaterThan(0)
      expect(page2.length, 'Paging · rows on page 2 ≤ page size').toBeLessThanOrEqual(15)
      await expectValue(page2.filter((ref) => page1.includes(ref)), [], 'Paging · no row repeated from page 1')
      await expect(listPage.prevPage, 'Paging · Prev link').toBeVisible()
    })

    await test.step('Go back with Prev and verify page 1 again', async () => {
      await listPage.goToPrevPage()
      await expectValue(await listPage.referenceNumbers(), page1, 'Paging · page 1 after Prev')
    })
  })

  test('TC-FUNC-037: select all ticks and unticks every row @regression', async ({ listPage, sharedDeclaration: d }) => {
    await test.step('Tick the ACTION header checkbox', async () => {
      await expect(listPage.rowFor(d.referenceNo), 'List · the declaration is on page 1').toHaveCount(1)
      await listPage.checkAll.check()
    })

    await test.step('Verify every row checkbox is ticked', async () => {
      const total = await listPage.rowCheckboxes.count()
      await expectFieldCount(listPage.checkedRows, total, 'List · ticked rows')
    })

    await test.step('Untick it and verify no row stays ticked', async () => {
      await listPage.checkAll.uncheck()
      await expectFieldCount(listPage.checkedRows, 0, 'List · ticked rows')
    })
  })

  test('TC-FUNC-038: Filter Name "ใบขนที่ทำในวันนี้" lists the declaration made today @regression', async ({ listPage, sharedDeclaration: d }) => {
    await test.step('Choose Filter Name ใบขนที่ทำในวันนี้', async () => {
      await listPage.applyFilterName('2')
    })

    await test.step('Verify the filter is applied and the declaration is listed', async () => {
      await expect(listPage.filterName, 'List · filter stays selected').toHaveValue('2')
      await expect(listPage.rowFor(d.referenceNo), 'List · the declaration made today').toHaveCount(1)
    })
  })
})
