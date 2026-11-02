require('./prepare-gcl-local.cjs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const cwd=path.resolve(__dirname,'..');
const started=Date.now();
const env={...process.env,SPN_GCL_RUN_ID:crypto.randomUUID(),PW_OUTPUT_DIR:'test-results/gcl-artifacts',
 PW_RESULTS_FILE:'test-results/gcl-results.json',PW_HTML_DIR:'gcl-playwright-report',QA_REPORT_DIR:'gcl-qa-report'};
const args=process.argv.slice(2).filter(a=>{const m=a.match(/^--slow-mo=(\d+)$/);if(m)env.SLOW_MO=m[1];return !m});
// Do not overwrite execution evidence with a run against an unavailable server.
if(!args.includes('--list')) {
 const health=spawnSync(process.execPath,[path.join(__dirname,'check-gcl-availability.cjs')],{cwd,stdio:'inherit',env,timeout:20000});
 if(health.status!==0){console.error('GCL run not started: server unavailable. Existing test results are preserved.');process.exit(2)}
}
// Let Playwright handle Ctrl+C and finish cleanup/reporting before archiving.
process.on('SIGINT',()=>{});
const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'),'test','--project=gcl',...args],{cwd,stdio:'inherit',env});
if(result.error) console.error(result.error.message);
spawnSync(process.execPath,[path.join(__dirname,'generate-report.js')],{cwd,stdio:'inherit',env});
const source=path.join(cwd,'test-results/gcl-results.json');
if(fs.existsSync(source) && fs.statSync(source).mtimeMs>=started) {
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const out=path.join(cwd,'../ai-support/evidence/gcl-runs',stamp);fs.mkdirSync(out,{recursive:true});
 const data=JSON.parse(fs.readFileSync(source,'utf8'));
 const visit=suite=>{
  for(const spec of suite.specs || [])for(const test of spec.tests || [])for(const run of test.results || [])for(const a of run.attachments || []) {
   if(!a.path || !fs.existsSync(a.path))continue;
   const name=crypto.createHash('sha256').update(a.path).digest('hex').slice(0,10)+'-'+path.basename(a.path);
   const saved=path.join(out,name);fs.copyFileSync(a.path,saved);a.path=saved;
  }
  for(const child of suite.suites || [])visit(child);
 };
 for(const suite of data.suites || [])visit(suite);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(data,null,2));
 console.log('GCL archived run:',path.relative(cwd,out));
 spawnSync(process.execPath,[path.join(__dirname,'summarize-gcl.cjs'),'--manifest'],{cwd,stdio:'inherit'});
 spawnSync(process.execPath,[path.join(__dirname,'summarize-gcl.cjs')],{cwd,stdio:'inherit'});
}
process.exit(result.status ?? 1);
