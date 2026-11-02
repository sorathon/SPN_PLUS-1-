const {chromium}=require('../../tests/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'report testcase update');
(async()=>{
 const data=JSON.parse(fs.readFileSync(path.join(folder,'data/short-results.json'),'utf8'));
 const browser=await chromium.launch({headless:true,executablePath:path.join(process.env.USERPROFILE,'AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.goto(pathToFileURL(path.join(folder,'TESTCASES_ALL_SHORT_20261030.html')).href);
  if(await page.locator('tbody tr').count()!==data.scope)throw Error('Report row count mismatch');
  await page.locator('#module').selectOption('GCL');await page.locator('#search').fill('TC-GCL-182');
  if(await page.locator('tbody tr:visible').count()!==1)throw Error('Filter failed');
  const loaded=page.waitForEvent('load');await page.clock.runFor(15001);await loaded;
  if(await page.locator('#search').inputValue()!=='TC-GCL-182'||await page.locator('tbody tr:visible').count()!==1)throw Error('Refresh lost filters');
  await page.locator('#autoRefresh').uncheck();let reloads=0;page.on('load',()=>reloads++);await page.clock.runFor(16000);
  if(reloads||errors.length)throw Error('Unexpected reload or page error');
  console.log(`PASS: ${data.scope} report rows, filters, 15-second refresh and disabling refresh.`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
