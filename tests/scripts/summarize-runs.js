'use strict';
// Merge a baseline run with later focused rechecks. Last result wins by case ID.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const summaryName = process.env.PW_SUMMARY_NAME || 'RUN_RESULTS';
const selectedProject = process.env.PW_SUMMARY_PROJECT || 'functional';
const files = process.argv.slice(2);
if (!files.length) throw new Error('Usage: node scripts/summarize-runs.js <full.json> [recheck.json]');
const rows = new Map();
const rawRows = new Map();
const runs = [];
let baseline;
const clean = value => String(value || '').replace(/\x1b\[[0-9;]*m/g, '')
  .replace(/((?:UCODE|PHPSESSID)=)[^&\s"']+/gi, '$1<redacted>')
  .replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  baseline ||= data;
  runs.push({ file, stats: data.stats });
  function visit(suite) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = test.results?.at(-1);
        const id = spec.title.match(/TC-(?:FUNC|EXP)-\d+|ZD-\d+-(?:IM|EX)/)?.[0] || spec.title.split(' — ')[0];
        const key = test.projectName + ':' + id;
        rawRows.set(key, { ...spec, tests: [test] });
        const rawError = result?.errors?.map(e => e.message || '').join('\n') || '';
        const serverError = rawError.match(/PDOException:[^<\r\n]+|Error: Call to undefined function[^<\r\n]+/);
        const refs = [...new Set(rawError.match(/FAT-\d{8}-\d{6}-[a-f0-9]+/gi) || [])];
        const error = serverError ? clean(serverError[0]).slice(0, 700) + (refs.length ? ' · ' + refs.join(', ') : '') : clean(rawError);
        rows.set(key, {
          id, title: clean(spec.title), project: test.projectName,
          file: spec.file.replace(/\\/g, '/'), line: spec.line,
          status: test.status === 'skipped' ? 'SKIP' : test.status === 'expected' ? 'PASS' : 'FAIL',
          duration: result?.duration || 0, error: error.slice(0, 900), run: path.basename(file),
          annotations: (test.annotations || []).map(a => ({ type: a.type, description: clean(a.description) })),
        });
      }
    }
    for (const child of suite.suites || []) visit(child);
  }
  for (const suite of data.suites || []) visit(suite);
}
const cases = [...rows.values()].sort((a, b) => a.project.localeCompare(b.project) || a.id.localeCompare(b.id));
const functional = cases.filter(r => r.project === selectedProject);
const count = status => functional.filter(r => r.status === status).length;
const lines = [
  `# ${process.env.PW_SUMMARY_TITLE || 'ผลการรัน SPN_PLUS'}`, '',
  ...(process.env.PW_SUMMARY_CONTEXT ? [process.env.PW_SUMMARY_CONTEXT, ''] : []),
  `สรุปผลล่าสุดรายเคส: ${selectedProject} ${functional.length} เคส — PASS ${count('PASS')} / FAIL ${count('FAIL')} / SKIP ${count('SKIP')}`,
  '', 'การรันทวนแทนผลเดิมเฉพาะ ID ที่รันทวน รายละเอียดและหลักฐานรอบแรกยังอยู่ในรายงาน Playwright ของชุดเต็ม', '',
  '| ID / เคส | ผลล่าสุด | รายละเอียด | ไฟล์ | รอบ |', '|---|---|---|---|---|',
  ...cases.map(r => `| ${r.id} | ${r.status} | ${r.title} | [source](tests/${r.file}) | ${r.run} |`),
  '', '## เคสที่ยังไม่ผ่าน', '',
  ...functional.filter(r => r.status === 'FAIL').flatMap(r => [`### ${r.id}`, '', r.error || 'No error details recorded', '']),
  '## เคสที่ข้าม', '',
  ...functional.filter(r => r.status === 'SKIP').flatMap(r => [
    `- ${r.id}: ${r.annotations.filter(a => a.type === 'skip').map(a => a.description).join('; ') || 'See raw run annotations'}`, '',
  ]),
];
fs.writeFileSync(path.join(root, 'ai-support', 'docs', summaryName + '.md'), lines.join('\n') + '\n');
fs.writeFileSync(path.join(root, 'ai-support', 'docs', summaryName + '.json'), JSON.stringify({ runs, cases }, null, 2));
// Feed the complete latest case set to the existing HTML report generator.
const grouped = new Map();
for (const spec of rawRows.values()) {
  if (!grouped.has(spec.file)) grouped.set(spec.file, { title: spec.file, file: spec.file, suites: [], specs: [] });
  grouped.get(spec.file).specs.push(spec);
}
const mergedDir = process.env.PW_MERGED_DIR ? path.resolve(process.env.PW_MERGED_DIR) : path.join(root, 'ai-support', 'evidence', 'validation');
fs.mkdirSync(mergedDir, { recursive: true });
fs.writeFileSync(path.join(mergedDir, 'latest-results.json'), JSON.stringify({
  ...baseline, suites: [...grouped.values()],
  stats: {
    startTime: baseline.stats.startTime,
    duration: runs.reduce((n, r) => n + (r.stats.duration || 0), 0),
    expected: cases.filter(r => r.status === 'PASS').length,
    unexpected: cases.filter(r => r.status === 'FAIL').length,
    skipped: cases.filter(r => r.status === 'SKIP').length, flaky: 0,
  },
}, null, 2));
console.log(`${selectedProject}: ${functional.length}; PASS ${count('PASS')}; FAIL ${count('FAIL')}; SKIP ${count('SKIP')}`);
