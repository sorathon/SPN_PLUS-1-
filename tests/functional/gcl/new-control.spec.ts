import { test, expect } from './_shared'

test.describe('GCL · New upper form',()=>{
 test.describe.configure({timeout:120_000})
 test('TC-GCL-NEW-001: F7 → New GCL opens the unsaved upper form @smoke',async({gcl,spn})=>{
  await gcl.creation.open(spn)
  await expect(gcl.page.locator('#withoutDeclaRadio')).toBeChecked()
  await expect(gcl.page.getByText('New Goods Control List',{exact:true})).toBeVisible()
  expect(new URL(gcl.page.url()).searchParams.get('ACTION')).toBe('INSERT')
  expect(new URL(gcl.page.url()).searchParams.has('SELITEM')).toBe(false)
 })
})
