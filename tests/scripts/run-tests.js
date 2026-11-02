'use strict';
// Runs `npx playwright test`, then always generates the HTML report regardless
// of pass/fail, then exits with Playwright's original exit code.
const { spawnSync } = require('child_process');
const path = require('path');

// --slow-mo=<ms> is ours, not Playwright's: it becomes SLOW_MO for playwright.config.ts
// (an npm script can't set an env var the same way on Windows and Linux).
const args = process.argv.slice(2).filter((a) => {
  const m = a.match(/^--slow-mo=(\d+)$/);
  if (m) process.env.SLOW_MO = m[1];
  return !m;
});

const pw = spawnSync(
  process.execPath, [require.resolve('@playwright/test/cli'), 'test', ...args],
  { stdio: 'inherit', cwd: path.resolve(__dirname, '..') }
);
if (pw.error) console.error(pw.error.message);

try {
  const report = spawnSync(process.execPath, [path.join(__dirname, 'generate-report.js')], {
    stdio: 'inherit', cwd: path.resolve(__dirname, '..')
  });
  if (report.error || report.status !== 0) console.error('QA report generation failed');
} catch (_) {}

process.exit(pw.status ?? 1);
