import { test,expect,filled,addItem,itemData,invoiceData } from './_shared'
import { DetailForm } from '../../pages/spn/DetailForm'
import { exported } from './_downloads'

test('TC-EXP-091: Thai Header, Invoice and Item text persists unchanged @regression',async({ui,spn,tracked})=>{
  test.setTimeout(240_000)
  const d=await filled(ui,spn,tracked.track),mark='เครื่องหมายสินค้าขาออก ทดสอบภาษาไทย',invoiceText='หมายเหตุรับรองถิ่นกำเนิด ทดสอบภาษาไทย'
  const form=new DetailForm(ui.page)
  await ui.workspace.field('shippingMark').fill(mark);await ui.workspace.save()
  const invoice=invoiceData()
  await ui.workspace.openAddInvoice();await ui.invoice.startNewInvoice();await ui.invoice.fill(invoice)
  await expect(form.field('certificationRemark'),'Invoice free-text certification remark exists').toBeVisible()
  await form.fill('certificationRemark',invoiceText);await ui.invoice.save()
  const item={...itemData(),englishDescription:'EXPORT สินค้าทดสอบ ภาษาไทย',thaiDescription:'รายละเอียดสินค้าขาออก ภาษาไทยครบถ้วน'}
  await addItem(ui,item)
  await ui.workspace.open(spn,d.id);await expect(ui.workspace.field('shippingMark')).toHaveValue(mark)
  await ui.workspace.openTreeInvoice(invoice.invoiceNo);await expect(form.field('certificationRemark')).toHaveValue(invoiceText)
  await ui.workspace.openTreeItem('0001')
  await expect(ui.item.field('englishDescriptionOfGoods')).toHaveValue(item.englishDescription)
  await expect(ui.item.field('thaiDescriptionOfGoods')).toHaveValue(item.thaiDescription)
  const entries=await exported(ui,spn,d,'Save XML',test.info().outputPath())
  const xml=entries[0].data.toString('utf8')
  for(const text of [mark,invoiceText,item.englishDescription,item.thaiDescription])expect(xml,'Export XML preserves Thai text').toContain(text)
  await test.info().attach(d.referenceNo+'.xml',{body:entries[0].data,contentType:'application/xml'})
})
