const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');require('dotenv').config({quiet:true});
const root=path.resolve(__dirname,'../..'),evidence=path.join(root,'ai-support/evidence/debug-20261030/import-mapping-81-currency');
const state=JSON.parse(fs.readFileSync('playwright/.auth/user.json','utf8'));
const token=state.origins.flatMap(o=>o.localStorage).find(e=>/^.+-\d+-UCODE$/.test(e.name));
assert(token,'Authenticated session required');
const endpoint=process.env.IE5_BASE_URL||new URL('../IE5DEV.shippingnet/data_defaulttemplate.php',process.env.APP_BASE_URL).href;
const url=new URL(endpoint);for(const [k,v]of Object.entries({UID:token.name.match(/-(\d+)-UCODE$/)[1],UCODE:token.value,SERVICENAME:'CONFMAPPING',ACTION:'EDIT',SELITEM:'mapId:81',ADVMODE:'Y'}))url.searchParams.set(k,v);
const redact=s=>s.replaceAll(token.value,'[redacted]').replaceAll(encodeURIComponent(token.value),'[redacted]');
async function read(page){return page.locator('body').evaluate(body=>{
 const all=[...body.querySelectorAll('input,textarea,select')];
 return all.filter(e=>/^(H?)column\d+$/.test(e.name)).map(e=>{const m=e.name.match(/^(H?)column(\d+)$/),key=m[1]+'val'+m[2];return {field:e.value,key,value:all.find(c=>c.name===key)?.value};});
});}
(async()=>{
 fs.mkdirSync(evidence,{recursive:true});
 const browser=await chromium.launch({headless:false,executablePath:path.join(process.env.USERPROFILE,'AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
 try{
  const context=await browser.newContext({storageState:'playwright/.auth/user.json'}),page=await context.newPage();page.on('dialog',d=>d.accept());
  await page.goto(url.href);
  assert.equal(await page.locator('[name="ins_mapName"]').inputValue(),'TestMapping_CSVImport');
  const before=await read(page),origin=process.argv.includes('--origin'),field=origin?'detail_originCountry':'header_invoiceCurrency',prefix=origin?'origin':'currency';
  fs.writeFileSync(path.join(evidence,prefix+'-before-'+Date.now()+'.json'),JSON.stringify(before,null,2));
  // The normal-mode catalogue was captured before entering Advanced Mode.
  // Reuse that inspected catalogue to validate the supported field name.
  const catalogueHtml=fs.readFileSync(path.join(evidence,'inspect.html'),'utf8');
  assert(new RegExp('id\\s*=\\s*["\x27]'+field+'["\x27]').test(catalogueHtml),'Field must be in the previously inspected site catalogue');
  const csv=new TextDecoder('windows-874').decode(fs.readFileSync(path.join(root,'tests/data/import/Import_01_Integer_All.csv')));
  const csvColumn=origin?'COUNTRY_OF_ORIGIN':'TRANSACTION_CURRENCY';
  const column=csv.split(/\r?\n/)[0].split(',').map(s=>s.trim()).indexOf(csvColumn)+1;assert.equal(column,origin?18:23);
  const existing=before.find(row=>row.field===field);
  if(!existing || existing.value!==String(column)){
   if(existing)await page.locator(`[name="${existing.key}"]`).fill(String(column));
   else{
    // Use the advanced form's observed Add Column controls, not a new flow.
    await page.locator('[name="newColumn"]').fill(field);
    await page.locator('[name="newColumnVal"]').fill(String(column));
   }
   const pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.request().isNavigationRequest());
   await page.locator('input[name="Submit"][value="Save"]').click();const response=await pending;
   assert(response.status()<400,'Mapping Save must succeed');await page.waitForLoadState('load');
  }
  await page.goto(url.href);const after=await read(page);
  const result=after.find(row=>row.field===field);assert.equal(result?.value,String(column));
  for(const row of before)if(row.field!==field)assert.deepEqual(after.find(a=>a.field===row.field),row,'Unrelated mapping changed: '+row.field);
  assert.equal(after.length,before.length+(existing?0:1));
  fs.writeFileSync(path.join(evidence,prefix+'-after.json'),JSON.stringify(after,null,2));
  const summary={mapId:81,profile:'TestMapping_CSVImport',field,column,csvColumn,from:existing?.value??null,allOtherMappingRowsUnchanged:true,savedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(evidence,prefix+'-change.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
 }finally{await browser.close()}
})().catch(e=>{console.error(redact(e.stack||String(e)));process.exitCode=1});
