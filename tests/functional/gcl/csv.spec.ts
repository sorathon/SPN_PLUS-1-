import fs from 'node:fs'
import {test,expect,GclUI,GclTrack} from './_shared'
import type {SpnSession} from '../../pages/spn/SpnApp'
import {GclFilesPage} from '../../pages/gcl/GclFilesPage'
import {GclCsvPage} from '../../pages/gcl/GclCsvPage'
import {CSV_SOURCE,sourceGroups,sourceRows,fields,encodeCsv,parseCsv,groupRows,CsvGroup} from '../../data/gcl/csv'
import type {TestInfo} from '@playwright/test'
import type {GclRecord} from '../../pages/gcl/GclListPage'

function file(info:TestInfo,name:string,groups:CsvGroup[]){const p=info.outputPath(name);fs.writeFileSync(p,encodeCsv(groupRows(groups)));return p}
const clone=()=>structuredClone(sourceGroups()[0])
function change(row:string[],kind:'H'|'D',name:string,value:string){const i=sourceRows()[kind==='H'?1:2].indexOf(name);if(i<0)throw Error('Unknown CSV field '+name);row[i]=value}
async function upload(gcl:GclUI,spn:SpnSession,track:GclTrack,info:TestInfo,input:string){
 const csv=new GclCsvPage(gcl.page),before=await csv.inventory(spn);await csv.open(spn)
 const result=await csv.submit(input);await info.attach('upload-response.html',{body:result.html.replace(/UCODE=[^&\s"<>]+/g,'UCODE=[redacted]'),contentType:'text/html'})
 const records=await csv.created(spn,before,result.html,track)
 await info.attach('csv-created.json',{body:JSON.stringify(records),contentType:'application/json'});return records
}
async function checkGroup(gcl:GclUI,spn:SpnSession,r:GclRecord,group:CsvGroup,info:TestInfo){
 await gcl.workspace.open(spn,r);const h=fields(group.header,'H'),actual=await gcl.workspace.data()
 const aliases:Record<string,string>={carType:'carType2',carLicense:'carLicense_2',carProvince:'carProvince_2',containerTypeCode:'containerTypeCode2'}
 const measurements=['totalGrossWeight','reeferTemperature','ventilation','overheight','overlengthFore','overlengthAfter','overwidthRight','overwidthLeft']
 const checked:string[]=[],missing:string[]=[]
 for(const [name,value]of Object.entries(h)) {
  const input=gcl.workspace.control.locator(`[name="ins_${aliases[name]||name}" i]`).first()
  if(!await input.count()){if(value)missing.push(name);continue}
  const got=await input.inputValue();checked.push(name)
  if(name==='departureDate')expect.soft(got.replace(/[^0-9]/g,''),name).toBe(value.replace(/[^0-9]/g,''))
  else if(measurements.includes(name)&&value)expect.soft(Number(got),name).toBe(Number(value))
  else expect.soft(got.replace(/\r\n/g,'\n'),name).toBe(value.replace(/\r\n/g,'\n'))
 }
 expect(missing,'All nonempty CSV header fields must have a Control mapping').toHaveLength(0)
 await info.attach(r.reference+'-header-coverage.json',{body:JSON.stringify({checked,unavailableInControl:missing}),contentType:'application/json'})
 expect(actual).toHaveLength(group.details.length)
 const detailMap:Record<string,string>={referenceNo:'source',exportDeclarationNo:'declaration',description:'description',realPackage:'realPackage',packageUnit:'packageUnit',realGrossWeight:'realGrossWeight',grossWeightUnit:'weightUnit',companyTaxNo:'tax',companyBranch:'branch',masterBillOfLading:'itemMasterBillOfLading',houseBillOfLading:'itemHouseBillOfLading',invoiceNo:'invoiceNo',notation:'notation'}
 for(const [i,row]of group.details.entries())for(const [name,value]of Object.entries(fields(row,'D'))) {
  const key=detailMap[name];if(!key)continue
  if(['realPackage','realGrossWeight'].includes(name))expect.soft(Number(actual[i][key]),name).toBe(Number(value))
  else expect.soft(actual[i][key].replace(/\r\n/g,'\n'),name).toBe(value.replace(/\r\n/g,'\n'))
 }
 const saved=await gcl.workspace.data();await gcl.workspace.open(spn,r);expect(await gcl.workspace.data()).toEqual(saved)
 const xmlFiles=await new GclFilesPage(gcl.page).download(spn,[r],'XML',info.outputPath('xml-'+r.reference))
 const xml=xmlFiles.find(f=>f.name===r.reference+'.xml');expect(xml).toBeDefined()
 const last=await gcl.page.evaluate(text=>{const d=new DOMParser().parseFromString(text,'application/xml');return {errors:d.querySelectorAll('parsererror').length,values:[...d.getElementsByTagNameNS('*','LastEntry')].map(e=>e.textContent)}},xml!.data.toString('utf8'))
 expect(last.errors).toBe(0)
 const mode=process.env.SPN_GCL_CSV_LAST_ENTRY_MODE || 'observe'
 const fromCsv=group.details.map(d=>fields(d,'D').lastEntry)
 await info.attach(r.reference+'-last-entry.json',{body:JSON.stringify({mode,fromCsv,fromXml:last.values}),contentType:'application/json'})
 if(mode==='csv')expect.soft(last.values,'LastEntry must match each CSV Detail').toEqual(fromCsv)
 else if(mode==='last-row')expect.soft(last.values,'Only the final Detail is LastEntry').toEqual(group.details.map((_,i)=>i===group.details.length-1?'Y':'N'))
 else test.info().annotations.push({type:'warning',description:'LastEntry XML observed but not judged: awaiting business rule (CSV '+fromCsv.join(',')+'; XML '+last.values.join(',')+')'})
 await info.attach(r.reference+'.xml',{body:xml!.data,contentType:'application/xml'})
}

test.describe('GCL · Upload CSV',()=>{
 test.describe.configure({timeout:300000})
 test('TC-GCL-027: New Upload CSV exposes its upload form @regression',async({gcl,spn})=>{
  const csv=new GclCsvPage(gcl.page);await csv.open(spn)
  await expect(csv.scope.getByText('GCL - Upload CSV File',{exact:false})).toBeVisible()
  await expect(csv.scope.getByRole('button',{name:'Upload',exact:true})).toBeVisible();await expect(csv.scope.locator('#example-template')).toBeVisible()
  await expect(csv.scope.locator('select[name*="mapping" i]')).toHaveCount(0)
 })
 test('TC-GCL-150: Example File downloads the GCL H/D CSV template @regression',async({gcl,spn},info)=>{
  const csv=new GclCsvPage(gcl.page);await csv.open(spn)
  const pending=gcl.page.waitForEvent('download');await csv.scope.locator('#example-template').click();const d=await pending,p=info.outputPath('example.csv');await d.saveAs(p)
  const b=fs.readFileSync(p),rows=parseCsv(b.toString('utf8'));expect(b.subarray(0,3).equals(Buffer.from([239,187,191]))).toBe(true)
  expect(rows.filter(r=>r[0].startsWith('//'))).toHaveLength(3)
  for(const row of rows)expect(row).toHaveLength(59)
  expect(rows.filter(r=>r[0]==='H')).toHaveLength(2);expect(rows.filter(r=>r[0]==='D')).toHaveLength(5);expect(rows.filter(r=>!r[0].startsWith('//')).map(r=>r[0])).toEqual(['H','D','D','H','D','D','D'])
  expect(rows[1].slice(1)).toEqual(sourceRows()[1].slice(1));expect(rows[2].slice(1,15)).toEqual(sourceRows()[2].slice(1,15))
  await info.attach('example.csv',{body:b,contentType:'text/csv'})
 })
 test('TC-GCL-151: one minimal CSV header creates one GCL with one Detail @regression',async({gcl,spn,owned},info)=>{
  const group=clone(),records=await upload(gcl,spn,owned.track,info,file(info,'one-header.csv',[group]));expect(records).toHaveLength(1);await checkGroup(gcl,spn,records[0],group,info)
 })
 test('TC-GCL-152: minimal two-header CSV creates two GCLs with one Detail each @regression',async({gcl,spn,owned},info)=>{
  const records=await upload(gcl,spn,owned.track,info,CSV_SOURCE);expect(records).toHaveLength(2);const groups=sourceGroups()
  for(const r of records){await gcl.workspace.open(spn,r);const company=await gcl.workspace.field('INcompanyCode').inputValue(),group=groups.find(g=>fields(g.header,'H').INcompanyCode===company);expect(group).toBeDefined();await checkGroup(gcl,spn,r,group!,info)}
 })
 test('TC-GCL-153: zero, optional blanks, Thai, quoted fields and decimal weight survive CSV upload @regression',async({gcl,spn,owned},info)=>{
  for(const variant of ['zero','quoted','decimal'])await test.step(variant,async()=>{
   const group=clone();change(group.header,'H','jobNo','PWCSV-'+variant+'-'+Date.now())
   if(variant==='zero'){change(group.header,'H','containerIndicator','0');change(group.details[0],'D','realPackage','0');change(group.details[0],'D','realGrossWeight','0')}
   if(variant==='quoted'){change(group.header,'H','remarkGCL','ทดสอบ, "GCL"\nบรรทัดสอง');change(group.details[0],'D','description','สินค้าไทย, "CSV"\nอีกบรรทัด');change(group.details[0],'D','invoiceNo','INV,"001"')}
   if(variant==='decimal'){change(group.details[0],'D','realGrossWeight','500.125')}
   const records=await upload(gcl,spn,owned.track,info,file(info,variant+'.csv',[group]));expect(records).toHaveLength(1);await checkGroup(gcl,spn,records[0],group,info)
  })
 })
})
