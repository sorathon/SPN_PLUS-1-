const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');require('dotenv').config({quiet:true});
const username=process.env.TEST_VIEWER_USERNAME,password=process.env.TEST_VIEWER_PASSWORD;
if(username!=='qaauto003'||!password)throw Error('qaauto003 credentials are not configured');
const reference='HQVM400001853',root=path.resolve(__dirname,'../..');
const output=path.join(root,'report testcase update/runs/inspect-qaauto003-20261102');fs.mkdirSync(output,{recursive:true});
let token='';const redact=s=>token?String(s).replaceAll(token,'[redacted]'):String(s);
(async()=>{
 const browser=await chromium.launch({headless:false,executablePath:path.join(process.env.USERPROFILE,'AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe')});
 const saved='playwright/.auth/qaauto003-inspection.json';const reuse=process.argv.includes('--reuse');const context=await browser.newContext(reuse?{storageState:saved}:{}),page=await context.newPage();page.setDefaultTimeout(30_000);page.setDefaultNavigationTimeout(45_000);
 page.on('dialog',d=>d.dismiss());
 try{
  if(!reuse){await page.goto('https://spnr.devnetbay.com/support/SPN/login.php');
  await page.locator('#user').fill(username);await page.locator('#passwd').fill(password);await page.getByRole('button',{name:'Login',exact:true}).click();
  await page.locator('iframe[name="infrm"]').waitFor();
  var session;
  for(let i=0;i<30;i++){
   const src=await page.locator('iframe[name="infrm"]').getAttribute('src');
   if(src&&src.includes('UCODE=')){const u=new URL(src,page.url());session={uid:u.searchParams.get('UID'),ucode:u.searchParams.get('UCODE')};break}
   await page.waitForTimeout(200);
  }
  }else{const state=JSON.parse(fs.readFileSync(saved,'utf8'));const entry=state.origins.flatMap(o=>o.localStorage).find(e=>/^.+-\d+-UCODE$/.test(e.name));session={uid:entry.name.match(/-(\d+)-UCODE$/)[1],ucode:entry.value};}if(!session?.ucode)throw Error('Authenticated session missing');token=session.ucode;
  const url=new URL('https://spnr.devnetbay.com/support/IE5DEV.shippingnet/data_defaulttemplate.php');
  for(const [k,v]of Object.entries({UID:session.uid,UCODE:token,SERVICENAME:'GOODSTRANSITIONCONTROL'}))url.searchParams.set(k,v);
  await page.goto(url.href);await page.locator('#newBTN').waitFor();
  await page.locator('[name="sREF"]').fill(reference);
  const nav=page.waitForEvent('framenavigated',{predicate:f=>f===page.mainFrame()});await page.locator('#refreshBTN').click();await nav;await page.waitForLoadState('load');
  const rows=page.locator('tr:not(:has(tr))').filter({has:page.locator('input[name="SELITEM[]"]')});
  const records=await rows.evaluateAll(es=>es.map(e=>({id:e.querySelector('input[name="SELITEM[]"]').value,cells:[...e.querySelectorAll(':scope > td')].map(c=>c.innerText.trim())})));
  const result={username,reference,records,readOnly:true,checkedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(output,'list.json'),JSON.stringify(result,null,2));await page.screenshot({path:path.join(output,'list.png'),fullPage:true});console.log(JSON.stringify(result));
  if(records.length===1){
   // Open only the requested Ref; no form submission or row-creation actions.
   await rows.getByText(reference,{exact:true}).click({noWaitAfter:true});
   await page.locator('#detailfrm').waitFor({timeout:30_000});
   await page.waitForTimeout(1500);
   const summary=await page.locator('body').innerText({timeout:10000});
   fs.writeFileSync(path.join(output,'workspace-summary.txt'),redact(summary));
   await page.screenshot({path:path.join(output,'workspace.png'),timeout:15000});
   console.log('Workspace opened; summary: '+redact(summary.slice(0,2000)));
   const detail=page.frameLocator('#detailfrm').frameLocator('#goodstransitiondetail');
   await detail.locator('input[name="SYS_DEL[]"]').first().waitFor({timeout:30000});
   const counts=await detail.locator('tr:not(:has(tr))').filter({has:detail.locator('input[name="SYS_DEL[]"]')}).evaluateAll(rows=>{
    const ids=[],sources={},samples=[];let blank=0;
    for(const row of rows){
     const checkbox=row.querySelector('input[name="SYS_DEL[]"]');const id=checkbox.value;ids.push(id);
     const item=row.querySelector('[name="ins_orderbyItemNo[]"]')?.value||'';
     const invoice=row.querySelector('[name="ins_invoiceNo[]"]')?.value||'';
     const description=row.querySelector('[name="ins_description[]"]')?.value||'';
     const source=row.querySelectorAll(':scope > td')[2]?.innerText.trim()||'';sources[source]=(sources[source]||0)+1;
     if(!item&&!invoice&&!description)blank++;
     if(samples.length<15)samples.push({detailId:id,itemNo:item,source,invoice,description:description.slice(0,100)});
    }
    const numeric=ids.map(id=>Number(id.match(/\d+$/)?.[0])).filter(Number.isFinite);
    return {detailRows:rows.length,blankRows:blank,sourceGroups:sources,minDatabaseId:Math.min(...numeric),maxDatabaseId:Math.max(...numeric),samples};
   });
   fs.writeFileSync(path.join(output,'detail-counts.json'),JSON.stringify(counts,null,2));
   console.log(JSON.stringify(counts));
   const tree=await page.evaluate(()=>{
    const regions=[...document.querySelectorAll('[id]')].filter(e=>/tree|outline/i.test(e.id));
    const root=document.querySelector('#outLineTree')||regions.find(e=>e.querySelectorAll('a').length>5);
    if(!root)return {found:false,candidates:regions.map(e=>e.id).slice(0,20)};
    const links=[...root.querySelectorAll('[onclick]')],byRef={};
    for(const a of links){const src=(a.getAttribute('href')||'')+' '+(a.getAttribute('onclick')||'');for(const ref of src.match(/HQVM4\d{8}/g)||[])byRef[ref]=(byRef[ref]||0)+1;}
    return {found:true,id:root.id,linkCount:links.length,byGclReference:byRef,samples:links.slice(0,15).map(a=>({text:a.innerText.trim(),gtcid:((a.getAttribute('href')||'')+' '+(a.getAttribute('onclick')||'')).match(/gtcid(?:[:=]|%3a)(\d+)/i)?.[1]}))};
   });
   fs.writeFileSync(path.join(output,'tree-summary.json'),JSON.stringify(tree,null,2));console.log('TREE '+JSON.stringify(tree));
  }
 }catch(e){console.error(redact(e.message));process.exitCode=1}
 finally{await context.storageState({path:'playwright/.auth/qaauto003-inspection.json'});await browser.close()}
})().catch(e=>{console.error(redact(e.message));process.exitCode=1});
