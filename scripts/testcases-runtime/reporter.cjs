const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),runs=path.join(root,'report testcase update/runs');
const clean=s=>String(s).replace(/(UCODE|PHPSESSID)=([^&\s"<>]+)/gi,'$1=[redacted]');
const caseId=t=>t.title.match(/^(TC-[A-Z]+-(?:NEW-)?\d+|ZD-\d+-IM):/)?.[1] || (/other-report/.test(t.location.file)&&/Other Report.*Import Report/.test(t.title)?'OTHER-REPORT-IMPORT':null);
function atomic(file,data){const temp=file+'.tmp-'+process.pid;fs.writeFileSync(temp,JSON.stringify(data));fs.renameSync(temp,file);}
class Reporter{
 refresh(){const r=spawnSync(process.env.SPN_REPORT_PYTHON,[path.join(__dirname,'report.py')],{windowsHide:true,encoding:'utf8'});if(r.error||r.status)console.error(clean(r.error?.message||r.stderr||'Report update failed'));}
 onTestBegin(test){const id=caseId(test);if(!id)return;atomic(path.join(runs,'current-case.json'),{id,startedAt:new Date().toISOString()});this.refresh();}
 onTestEnd(test,result){const id=caseId(test);console.log(`${result.status.toUpperCase().padEnd(10)} ${id||test.title} (${(result.duration/1000).toFixed(1)}s)`);if(!id)return;
 const row={id,title:test.title,status:result.status,duration:result.duration,endedAt:new Date().toISOString(),errors:result.errors.map(e=>clean(e.message||'')),annotations:[...test.annotations],attachments:result.attachments.map(a=>({name:a.name,path:a.path,contentType:a.contentType}))};
 fs.appendFileSync(process.env.PW_INCREMENTAL_FILE,JSON.stringify(row)+'\n');this.refresh();}
}
module.exports=Reporter;
