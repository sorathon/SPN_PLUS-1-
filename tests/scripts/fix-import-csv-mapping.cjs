const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
require('dotenv').config({quiet:true});
const root=path.resolve(__dirname,'../..');
const evidence=path.join(root,'ai-support/evidence/debug-20261030/import-mapping-81-fix');
const state=JSON.parse(fs.readFileSync('playwright/.auth/user.json','utf8'));
const entries=state.origins.flatMap(o=>o.localStorage);
const token=entries.find(e=>/^.+-\d+-UCODE$/.test(e.name));
if(!token)throw Error('Saved authenticated session not found');
const uid=token.name.match(/-(\d+)-UCODE$/)[1];
const endpoint=process.env.IE5_BASE_URL || new URL('../IE5DEV.shippingnet/data_defaulttemplate.php',process.env.APP_BASE_URL).href;
const url=new URL(endpoint);for(const [k,v]of Object.entries({UID:uid,UCODE:token.value,SERVICENAME:'CONFMAPPING',ACTION:'EDIT',SELITEM:'mapId:81',ADVMODE:'Y'}))url.searchParams.set(k,v);
const redact=s=>s.replaceAll(token.value,'[redacted]').replaceAll(encodeURIComponent(token.value),'[redacted]');
(async()=>{
 fs.mkdirSync(evidence,{recursive:true});
 const browser=await chromium.launch({headless:false,executablePath:path.join(process.env.USERPROFILE,'AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
 try{
  const context=await browser.newContext({storageState:'playwright/.auth/user.json'}),page=await context.newPage();
  page.on('dialog',d=>d.accept());
  await page.goto(url.href);await page.waitForLoadState('load');
  const snapshot=await page.locator('body').evaluate(body=>{
   const controls=[...body.querySelectorAll('input,textarea,select')].map(e=>({name:e.name,type:e.type,value:e.value,tag:e.tagName}));
   const mapping=[];
   for(const e of controls){const m=e.name.match(/^(H?)column(\d+)$/);if(m){const key=m[1]+'val'+m[2];mapping.push({field:e.value,key,columnControl:e.name,value:controls.find(v=>v.name===key)?.value});}}
   return {title:document.title,forms:[...document.forms].map(f=>({name:f.name,id:f.id,method:f.method,action:f.action})),mapping,buttons:[...body.querySelectorAll('button,input[type=submit],input[type=button],img[onclick]')].map(e=>({id:e.id,name:e.name,text:e.value||e.innerText||e.title,onclick:e.getAttribute('onclick')})),controls:controls.filter(e=>!/(UCODE|PHPSESSID|password)/i.test(e.name))};
  });
  fs.writeFileSync(path.join(evidence,'inspect.json'),redact(JSON.stringify(snapshot,null,2)));
  fs.writeFileSync(path.join(evidence,'inspect.html'),redact(await page.content()));
  console.log(redact(JSON.stringify({title:snapshot.title,forms:snapshot.forms,mapping:snapshot.mapping.filter(v=>/invoiceNo|productCode|englishDescription/i.test(v.field)),buttons:snapshot.buttons},null,2)));
  if(process.argv.includes('--apply')){
   const assert=require('node:assert/strict');
   assert(snapshot.controls.some(c=>c.value==='TestMapping_CSVImport'),'Expected profile TestMapping_CSVImport');
   const backup=path.join(evidence,'before.json');
   if(!fs.existsSync(backup))fs.writeFileSync(backup,redact(JSON.stringify(snapshot,null,2)),{flag:'wx'});
   const csv=fs.readFileSync(path.join(root,'tests/data/import/Import_01_Integer_All.csv'));
   const names=new TextDecoder('windows-874').decode(csv).split(/\r?\n/)[0].split(',').map(s=>s.trim());
   const definitions={header_invoiceNo:'COMM_INV_NUMBER',detail_productCode:'ITEM_GID',detail_englishDescriptionOfGoods:'ITEM_DESCRIPTION'};
   const edits=[];
   for(const [field,column]of Object.entries(definitions)){
    const row=snapshot.mapping.find(m=>m.field===field),number=names.indexOf(column)+1;
    assert(row && number>0,'Missing mapping field or CSV column: '+field);
    edits.push({field,key:row.key,from:row.value,to:String(number),csvColumn:column});
    await page.locator(`[name="${row.key}"]`).fill(String(number));
   }
   const response=page.waitForResponse(r=>r.request().method()==='POST' && r.request().isNavigationRequest());
   await page.locator('input[name="Submit"][value="Save"]').click();
   const saved=await response;assert(saved.status()<400,'Mapping Save HTTP '+saved.status());
   await page.waitForLoadState('load');
   await page.goto(url.href);await page.waitForLoadState('load');
   const after=await page.locator('body').evaluate(body=>{
    const all=[...body.querySelectorAll('input,textarea,select')];
    return all.filter(e=>/^(H?)column\d+$/.test(e.name)).map(e=>{
     const match=e.name.match(/^(H?)column(\d+)$/),key=match[1]+'val'+match[2];
     return {field:e.value,key,columnControl:e.name,value:all.find(v=>v.name===key)?.value};
    });
   });
   const expected=snapshot.mapping.map(row=>({...row,value:edits.find(e=>e.key===row.key)?.to ?? row.value}));
   assert.deepEqual(after,expected,'Only the three approved column numbers may change');
   fs.writeFileSync(path.join(evidence,'change.json'),JSON.stringify({profile:'TestMapping_CSVImport',mapId:81,changedAt:new Date().toISOString(),edits,allOtherMappingRowsUnchanged:true},null,2));
   fs.writeFileSync(path.join(evidence,'after.json'),JSON.stringify(after,null,2));
   console.log(JSON.stringify({saved:true,edits,allOtherMappingRowsUnchanged:true},null,2));
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(redact(e.stack||String(e)));process.exitCode=1});
