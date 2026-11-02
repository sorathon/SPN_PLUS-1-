import { test, expect, editableDraft } from './_shared'

test.describe('GCL · container/cargo',()=>{
 test.describe.configure({timeout:300_000})
 test('TC-GCL-060: indicator 1 reveals container ownership, booking and VGM @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.prepareContainer()
  for(const name of ['containerOperatorCode','containerOperatorTaxNo','containerOperatorBranch','bookingNumber','totalGrossWeight'])await expect(gcl.workspace.field(name)).toBeVisible()
  await gcl.workspace.prepareContainer();await gcl.workspace.save();await gcl.workspace.open(spn,r)
  await expect(gcl.workspace.field('containerIndicator')).toHaveValue('1');await expect(gcl.workspace.field('bookingNumber')).toHaveValue('PW-BOOKING')
 })
 test('TC-GCL-061: indicator 0 is a valid saved no-container code @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.prepareContainer();await gcl.workspace.field('containerIndicator').selectOption('0')
  await expect(gcl.workspace.field('containerOperatorCode')).not.toBeVisible()
  await gcl.workspace.save();await gcl.workspace.open(spn,r);await expect(gcl.workspace.field('containerIndicator')).toHaveValue('0')
 })
 test('TC-GCL-062: No Container, Full, FCL, LCL and MTY save their own code @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track)
  for(const value of ['0','5','8','7','4']) {
   if(value==='0') {await gcl.workspace.field('containerIndicator').selectOption('0');await gcl.workspace.field('containerStatus').selectOption('0')}
   else {await gcl.workspace.prepareContainer();await gcl.workspace.field('containerStatus').selectOption(value);await gcl.workspace.calculateVgm()}
   await gcl.workspace.save();await gcl.workspace.open(spn,r);await expect(gcl.workspace.field('containerStatus')).toHaveValue(value)
  }
 })
 test('TC-GCL-063: first container type and valid container number persist @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.field('containerStatus').selectOption('8')
  await gcl.workspace.field('containerNo').fill('CSNU8975008');await gcl.workspace.field('containerNo').press('Tab')
  const type=await gcl.workspace.lookup.percent('containerTypeCode2')
  await gcl.workspace.save();await gcl.workspace.open(spn,r)
  await expect(gcl.workspace.field('containerNo')).toHaveValue('CSNU8975008');await expect(gcl.workspace.field('containerTypeCode2')).toHaveValue(type.value)
 })
 test('TC-GCL-064: Reefer N and Y retain their codes and temperature controls @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.prepareContainer()
  for(const value of ['N','Y']) {await gcl.workspace.field('reeferAsDry').selectOption(value);await gcl.workspace.calculateVgm();await gcl.workspace.save();await gcl.workspace.open(spn,r);await expect(gcl.workspace.field('reeferAsDry')).toHaveValue(value)}
 })
 test('TC-GCL-065: reefer temperature, ventilation and over-dimensions roundtrip @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.prepareContainer();await gcl.workspace.field('reeferAsDry').selectOption('N')
  await gcl.workspace.control.locator('input#sizeOfContainerInfo').click()
  const fields={reeferTemperature:'-5',ventilation:'10',overheight:'1',overlengthFore:'2',overlengthAfter:'3',overwidthRight:'4',overwidthLeft:'5'}
  for(const [name,value]of Object.entries(fields))await gcl.workspace.field(name).fill(value)
  await gcl.workspace.calculateVgm()
  await gcl.workspace.save();await gcl.workspace.open(spn,r);await gcl.workspace.control.locator('input#sizeOfContainerInfo').click()
  expect(await gcl.workspace.lookup.snapshot(Object.keys(fields))).toEqual(fields)
 })
 test('TC-GCL-066: Size Info opens readable dimensions without changing Control @regression',async({gcl,spn})=>{
  await gcl.creation.open(spn);await gcl.creation.field('containerIndicator').selectOption('1')
  const before=await gcl.creation.lookup.snapshot(['INcompanyCode','vesselName','containerIndicator'])
  await gcl.page.locator('input#sizeOfContainerInfo').click();await expect(gcl.creation.field('overheight')).toBeVisible()
  expect(await gcl.creation.lookup.snapshot(Object.keys(before))).toEqual(before)
 })
 test('TC-GCL-067: Cal VGM matches the supplied business oracle and is idempotent @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.prepareContainer()
  const first=await gcl.workspace.calculateVgm('120','20','2')
  // The UI explicitly shows GROSS + TARE + LASHING = VGM.
  expect(Number(first)).toBe(142)
  expect(await gcl.workspace.calculateVgm('120','20','2')).toBe(first)
  await gcl.workspace.save();await gcl.workspace.open(spn,r);await expect(gcl.workspace.field('totalGrossWeight')).toHaveValue(first)
 })
 test('TC-GCL-068: Dangerous cargo shows UNDG/IMO and persists their values @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.field('goodsCargoType').selectOption('2')
  await gcl.workspace.field('UNDGNumber').fill('1203');await gcl.workspace.field('IMOClass').fill('3')
  await gcl.workspace.save();await gcl.workspace.open(spn,r)
  await expect(gcl.workspace.field('goodsCargoType')).toHaveValue('2');await expect(gcl.workspace.field('UNDGNumber')).toHaveValue('1203');await expect(gcl.workspace.field('IMOClass')).toHaveValue('3')
 })
 test('TC-GCL-069: General hides Dangerous-only inputs and retains cargo code @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.field('goodsCargoType').selectOption('2');await expect(gcl.workspace.field('UNDGNumber')).toBeVisible()
  await gcl.workspace.field('goodsCargoType').selectOption('1');await expect(gcl.workspace.field('UNDGNumber')).not.toBeVisible();await expect(gcl.workspace.field('IMOClass')).not.toBeVisible()
  await gcl.workspace.save();await gcl.workspace.open(spn,r);await expect(gcl.workspace.field('goodsCargoType')).toHaveValue('1')
 })
 test('TC-GCL-070: fresh/perishable cargo code 7 persists @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.field('goodsCargoType').selectOption('7');await gcl.workspace.save();await gcl.workspace.open(spn,r)
  await expect(gcl.workspace.field('goodsCargoType')).toHaveValue('7')
 })
 test('TC-GCL-071: seals, booking and container operator are stored in distinct fields @regression',async({gcl,spn,owned})=>{
  const r=await editableDraft(gcl,spn,owned.track);await gcl.workspace.prepareContainer()
  const selected=await gcl.workspace.lookup.percent('containerOperatorCode')
  const data={sealNumber1:'PW-SEAL-1',sealNumber2:'PW-SEAL-2',bookingNumber:'PW-BOOK-1'}
  for(const [name,value] of Object.entries(data))await gcl.workspace.field(name).fill(value)
  await gcl.workspace.calculateVgm()
  await gcl.workspace.save();await gcl.workspace.open(spn,r);expect(await gcl.workspace.lookup.snapshot(Object.keys(data))).toEqual(data)
  await expect(gcl.workspace.field('containerOperatorCode')).toHaveValue(selected.value)
 })
})
