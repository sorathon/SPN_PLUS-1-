#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const http = require('http');
const { execSync, spawn } = require('child_process');

// ── Config ─────────────────────────────────────────────────────────────────
const CWD     = process.cwd();
const SRC     = path.resolve(CWD, process.env.PW_RESULTS_FILE || 'test-results/results.json');
const OUT_DIR = path.resolve(CWD, process.env.QA_REPORT_DIR || 'qa-report');
const OUT     = path.join(OUT_DIR, 'index.html');

let pkg = {};
try { pkg = JSON.parse(fs.readFileSync(path.join(CWD, 'package.json'), 'utf8')); } catch {}
const TITLE = pkg.reportTitle || pkg.name || 'QA Report';

if (!fs.existsSync(SRC)) {
  console.error('\n  ❌  test-results/results.json not found. Run "npm test" first.\n');
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function stripAnsi(s) { return String(s || '').replace(/\x1b\[[0-9;]*m/g, ''); }
function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmt(ms) {
  if (ms >= 60000) return Math.floor(ms/60000)+'m '+Math.round((ms%60000)/1000)+'s';
  if (ms >= 1000)  return (ms/1000).toFixed(1)+'s';
  return ms+'ms';
}
function absPath(p) { return path.isAbsolute(p) ? p : path.join(CWD, p); }
function getTestType(file) {
  const f = file.replace(/\\/g, '/');
  if (/(?:^|\/)e2e\//.test(f)) return 'e2e';
  if (/(?:^|\/)api\//.test(f)) return 'api';
  return 'functional';
}
function getModule(file) {
  const parts = file.replace(/\\/g, '/').split('/').filter(Boolean);
  // Nested in a subfolder (e.g. functional/document/create.spec.ts) -> 'document'
  if (parts.length >= 3) return parts[1];
  // Flat file (e.g. functional/auth.spec.ts) -> 'auth'
  const base = parts[parts.length - 1] || file;
  return base.replace(/\.spec\.ts$/, '');
}
function getTags(title) {
  return (title.match(/@[a-zA-Z0-9_-]+/g) || []).map(t => t.slice(1));
}
function toB64(p) {
  if (!p) return null;
  try {
    const a = absPath(p);
    if (!fs.existsSync(a)) return null;
    return 'data:image/png;base64,' + fs.readFileSync(a).toString('base64');
  } catch { return null; }
}
const _srcCache = {};
function findSpecFile(name) {
  if (!name) return null;
  const normName = name.replace(/\\/g, '/');
  const direct = absPath(normName);
  if (fs.existsSync(direct)) return direct;
  // Walk tests/ directory — normalize to forward slashes for cross-platform endsWith
  const searchDir = path.join(CWD, 'tests');
  if (!fs.existsSync(searchDir)) return null;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { const found = walk(full); if (found) return found; }
      else if (full.replace(/\\/g, '/').endsWith(normName)) return full;
    }
    return null;
  }
  return walk(searchDir);
}
function extractStepSource(specFile, stepTitle) {
  if (!specFile || !stepTitle) return null;
  const abs = findSpecFile(specFile);
  if (!abs) return null;
  if (!(abs in _srcCache)) {
    try { _srcCache[abs] = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8').split('\n') : null; }
    catch { _srcCache[abs] = null; }
  }
  const lines = _srcCache[abs];
  if (!lines) return null;
  let stepLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('test.step(') && lines[i].includes(stepTitle)) { stepLine = i; break; }
  }
  if (stepLine < 0) return null;
  let depth = 0, innerStart = -1;
  for (let i = stepLine; i < Math.min(stepLine + 30, lines.length); i++) {
    for (let c = 0; c < lines[i].length; c++) {
      if (lines[i][c] === '{') { depth++; if (depth === 1) innerStart = i; }
      else if (lines[i][c] === '}' && --depth === 0 && innerStart >= 0) {
        const inner = lines.slice(innerStart + 1, i);
        const nonEmpty = inner.filter(l => l.trim());
        if (!nonEmpty.length) return null;
        const minInd = Math.min(...nonEmpty.map(l => (l.match(/^( *)/) || ['',''])[1].length));
        return inner.map((l, idx) =>
          ' ' + String(innerStart + 2 + idx).padStart(2) + ' | ' + l.slice(minInd)
        ).join('\n');
      }
    }
  }
  return null;
}

// Recurses into nested test.step() calls (e.g. a field-by-field verifier's
// per-field steps nested under a parent "Verify ..." step) — the previous
// one-level-deep mapping silently dropped everything past the first level.
// Only leaf steps (no children) get sourceCode extraction; a wrapper step's
// "source" would just be the block of child test.step() calls, not useful.
function serializeSteps(steps, file) {
  return (steps || []).map(step => {
    const t        = step.title || step.name || '';
    const hasErr    = !!step.error;
    const children  = serializeSteps(step.steps, file);
    return {
      title:      stripAnsi(t),
      dur:        step.duration || 0,
      errMsg:     hasErr ? stripAnsi((step.error.message||step.error.value||'').split('\n')[0]) : null,
      snippet:    hasErr && step.error.snippet ? stripAnsi(step.error.snippet) : null,
      sourceCode: (!hasErr && !children.length) ? extractStepSource(file, t) : null,
      steps:      children,
    };
  });
}

// ── Expect-level detail (from scripts/qa-hooks-reporter.js → steps.json) ────
// The json reporter drops every `expect` step, so a "Verify …" step showed no
// hint of WHAT it verified. steps.json carries the test.step + expect tree;
// the helpers below turn each expect into one readable line under its step.
const STEPS_SRC = path.resolve(CWD, process.env.PW_STEPS_FILE || 'test-results/steps.json');
let stepsById = {};
try { stepsById = JSON.parse(fs.readFileSync(STEPS_SRC, 'utf8')); } catch {}

const _fileByBase = {};
function findByBasename(base) {
  if (!base) return null;
  if (base in _fileByBase) return _fileByBase[base];
  let hit = null;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (hit) return;
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === base) hit = full;
    }
  })(CWD);
  return (_fileByBase[base] = hit);
}
function sourceLine(base, line) {
  const abs = findByBasename(base);
  if (!abs || !line) return null;
  if (!(abs in _srcCache)) {
    try { _srcCache[abs] = fs.readFileSync(abs, 'utf8').split('\n'); } catch { _srcCache[abs] = null; }
  }
  const l = _srcCache[abs] && _srcCache[abs][line - 1];
  return l ? l.trim() : null;
}

// Playwright titles an expect step `Expect "<matcher>" <target>` by default, or
// `<custom message> <target>` when the test passed expect(x, 'message').
const DEFAULT_EXPECT_RE = /^Expect "([^"]+)"\s*(.*)$/;
const TARGET_SUFFIX_RE = /\s+(locator|getBy[A-Za-z]+|internal:[a-z-]+=)\(?.*$/;
function expectLabel(title) {
  const m = title.match(DEFAULT_EXPECT_RE);
  if (m) return { label: m[1] + (m[2] ? ' · ' + m[2] : ''), custom: false };
  return { label: title.replace(TARGET_SUFFIX_RE, '').trim(), custom: true };
}

function toExpectNode(e, retries) {
  const { label, custom } = expectLabel(stripAnsi(e.title || ''));
  const isSpec = /\.spec\.ts$/.test(e.file || '');
  return {
    kind:   'expect',
    title:  label + (retries > 1 ? ` (passed on attempt ${retries})` : ''),
    dur:    e.duration || 0,
    errMsg: e.error ? stripAnsi((e.error.message || '').split('\n')[0]) : null,
    // A default-titled expect does not say what it expected (e.g. toHaveCount
    // shows no count) — show its source line so the reader sees the argument.
    code:   custom ? null : sourceLine(e.file, e.line),
    where:  (e.file || '') + (e.line ? ':' + e.line : ''),
    aux:    !isSpec && !custom,   // page-object internal wait/check, no message
    steps:  [],
  };
}

// toPass / poll: children are one try per attempt. Collapse to the final try
// of each distinct check, tagged with how many tries it took.
function collapseRetries(e) {
  const kids = e.steps || [];
  if (!kids.length) return [toExpectNode(e, 1)];
  const order = [], last = {}, count = {};
  for (const k of kids) {
    if (k.category !== 'expect') continue;
    if (!(k.title in last)) order.push(k.title);
    last[k.title] = k; count[k.title] = (count[k.title] || 0) + 1;
  }
  const nodes = order.map(t => toExpectNode(last[t], count[t]));
  if (e.error && nodes.length) nodes[nodes.length - 1].errMsg = stripAnsi((e.error.message || '').split('\n')[0]);
  return nodes;
}

function serializeDetailed(steps, file, snippets) {
  const out = [];
  for (const s of steps || []) {
    if (s.category === 'expect') {
      out.push(...collapseRetries(s));
      continue;
    }
    const t = stripAnsi(s.title || '');
    // A value-comparison step already says "expected … — got …"; its inner
    // expect(actual).toBe(…) adds nothing.
    const valueStep = t.includes(' — got ');
    const kids = serializeDetailed(s.steps, file, snippets).filter(k => !(valueStep && k.kind === 'expect'));
    const onlyExpects = kids.every(k => k.kind === 'expect');
    out.push({
      title:      t,
      dur:        s.duration || 0,
      errMsg:     s.error ? stripAnsi((s.error.message || '').split('\n')[0]) : null,
      snippet:    s.error ? (snippets[t] || null) : null,
      sourceCode: (!s.error && onlyExpects) ? extractStepSource(file, t) : null,
      steps:      kids,
    });
  }
  return out;
}

function snippetIndex(steps, acc = {}) {
  for (const s of steps || []) {
    if (s.error && s.error.snippet) acc[stripAnsi(s.title || '')] = stripAnsi(s.error.snippet);
    snippetIndex(s.steps, acc);
  }
  return acc;
}

// ── Parse ───────────────────────────────────────────────────────────────────
const raw      = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const rawStats = raw.stats || {};
const tests    = [];
let   nextId   = 0;

// Before/After Hooks — written by scripts/qa-hooks-reporter.js (the built-in `json`
// reporter omits hook-category steps entirely), keyed by the stable test.id.
const HOOKS_SRC = path.resolve(CWD, process.env.PW_HOOKS_FILE || 'test-results/hooks.json');
let hooksById = {};
try { hooksById = JSON.parse(fs.readFileSync(HOOKS_SRC, 'utf8')); } catch {}

function extractSuite(suites, parentFile) {
  for (const s of (suites || [])) {
    const file = s.file || parentFile || '';
    for (const spec of (s.specs || [])) {
      const title    = spec.title || '';
      const tcMatch  = title.match(/^TC-(FUNC|E2E|API)-(\d+)/i);
      const tc       = tcMatch ? 'TC-' + tcMatch[1].toUpperCase() + '-' + String(parseInt(tcMatch[2])).padStart(3,'0') : null;
      const tags     = getTags(title);
      const label    = title.replace(/^TC-(FUNC|E2E|API)-\d+:\s*/i, '').replace(/\s*@[a-zA-Z0-9_-]+/g, '').trim();

      // All retry attempts
      const specHooks = hooksById[spec.id] || [];
      const attempts = [];
      const used = {};
      for (const t of (spec.tests || [])) {
        for (const r of (t.results || [])) {
          // Match by retry AND run order: with --repeat-each every run has
          // retry 0, so "first entry with this retry" handed run 1's data to
          // every run. Take the n-th entry for the n-th result of that retry.
          const nth = (used[r.retry] = (used[r.retry] || 0) + 1) - 1;
          const hooksForAttempt = specHooks.filter(h => h.retry === r.retry)[nth] || null;
          const detailed = (stepsById[spec.id] || []).filter(x => x.retry === r.retry)[nth] || null;
          const att   = r.attachments || [];
          const shot  = att.find(a => a.contentType && a.contentType.startsWith('image/'));
          const trace = att.find(a => a.name === 'trace');
          const video = att.find(a => a.name === 'video' || (a.contentType && a.contentType.startsWith('video/')));
          const rawOut = (r.stdout || []).map(e => e.text||String(e)).join('\n');
          const apiLogs = [];
          const dispOut = rawOut.split('\n').filter(ln => {
            if (ln.startsWith('§API§')) {
              try { apiLogs.push(JSON.parse(ln.slice(5))); } catch {}
              return false;
            }
            return true;
          }).join('\n');
          attempts.push({
            status:    r.status || 'unknown',
            duration:  r.duration || 0,
            beforeHooks: hooksForAttempt ? hooksForAttempt.before : [],
            afterHooks:  hooksForAttempt ? hooksForAttempt.after : [],
            // Runtime warnings, e.g. "email not received" from the soft mailbox —
            // the test still passes, but the reader must see what was skipped.
            warnings:  (r.annotations || []).filter(a => a.type === 'warning')
              .map(a => stripAnsi(a.description || '')),
            steps:     detailed
              ? serializeDetailed(detailed.steps, file, snippetIndex(r.steps))
              : serializeSteps(r.steps, file),
            errors:    (r.errors || []).map(e => stripAnsi(e.message||e.value||'')),
            stdout:    dispOut.slice(0, 2000),
            apiLogs,
            screenshot: toB64(shot && shot.path),
            traceRel:   trace && trace.path
              ? path.relative(OUT_DIR, absPath(trace.path)).replace(/\\/g,'/')
              : null,
            traceAbs:   trace && trace.path ? absPath(trace.path) : null,
            traceFilename: trace && trace.path
              ? path.basename(path.dirname(absPath(trace.path))) + '.zip'
              : null,
            videoRel:   video && video.path
              ? path.relative(OUT_DIR, absPath(video.path)).replace(/\\/g,'/')
              : null,
          });
        }
      }
      if (!attempts.length) continue;

      const statuses = attempts.map(a => a.status);
      const hasFail  = statuses.some(s => s === 'failed' || s === 'timedOut');
      const hasPass  = statuses.some(s => s === 'passed');
      let   status;
      if (attempts.length > 1 && hasFail && hasPass) status = 'flaky';
      else if (statuses.every(s => s === 'skipped'))  status = 'skipped';
      else if (hasFail)                               status = 'failed';
      else if (hasPass)                               status = 'passed';
      else                                            status = statuses[statuses.length-1];

      tests.push({
        id:       nextId++,
        title, tc, label, tags,
        file:     path.basename(file),
        module:   getModule(file),
        type:     getTestType(file),
        suite:    s.title || '',
        status,   retries: attempts.length - 1,
        duration: attempts[attempts.length-1].duration,
        attempts,
      });
    }
    extractSuite(s.suites, file);
  }
}
extractSuite(raw.suites || []);

// ── Summary stats ────────────────────────────────────────────────────────────
const total   = tests.length;
const passed  = tests.filter(t => t.status === 'passed').length;
const failed  = tests.filter(t => t.status === 'failed').length;
const flaky   = tests.filter(t => t.status === 'flaky').length;
const skipped = tests.filter(t => t.status === 'skipped').length;
const rate    = total ? Math.round(passed/total*100) : 0;
const totalMs = rawStats.duration || 0;
const startISO = rawStats.startTime || new Date().toISOString();

// ── Per-type stats ───────────────────────────────────────────────────────────
const typeStats = {
  functional: {total:0, passed:0, failed:0, flaky:0, skipped:0},
  e2e:        {total:0, passed:0, failed:0, flaky:0, skipped:0},
  api:        {total:0, passed:0, failed:0, flaky:0, skipped:0},
};
for (const t of tests) {
  const ts = typeStats[t.type] || typeStats.functional;
  ts.total++;
  if (t.status in ts) ts[t.status]++;
}

// ── Error groups ─────────────────────────────────────────────────────────────
const errMap = new Map();
for (const t of tests) {
  if (t.status !== 'failed' && t.status !== 'flaky') continue;
  const fail = t.attempts.find(a => a.status === 'failed' || a.status === 'timedOut');
  if (!fail || !fail.errors.length) continue;
  const key = fail.errors[0].split('\n')[0].trim().slice(0,120);
  if (!key) continue;
  if (!errMap.has(key)) errMap.set(key, []);
  errMap.get(key).push(t.id);
}
const errorGroups = [...errMap.entries()].map(([msg, ids]) => ({ msg, ids }));

// ── Serialize data for injection ─────────────────────────────────────────────
// Strip screenshots from JSON serialization to keep it smaller; they're in t.attempts
// (screenshots are already embedded as data URIs inside attempts)
// Escape </ so embedded </script> in source snippets doesn't terminate the <script> block
function safeJson(v) { return JSON.stringify(v).replace(/<\//g, '<\\/'); }
const INJECT      = safeJson({ total, passed, failed, flaky, skipped, rate, totalMs, startISO, title: TITLE, typeStats, featureNames: pkg.reportFeatureNames || {} });
const TESTS_JSON  = safeJson(tests);
const ERRORS_JSON = safeJson(errorGroups);

// ── Embedded font ────────────────────────────────────────────────────────────
// Inter (latin subset, variable 400–700, SIL OFL — see scripts/fonts/Inter-LICENSE.txt) is embedded as base64 so the report
// looks the same offline. If the file is missing the report falls back to the system font stack.
let FONT_CSS = '';
try {
  const fontB64 = fs.readFileSync(path.join(__dirname, 'fonts', 'Inter-latin-variable.woff2')).toString('base64');
  FONT_CSS = "@font-face{font-family:'Inter';font-style:normal;font-weight:400 700;font-display:swap;src:url(data:font/woff2;base64," + fontB64 + ") format('woff2')}";
} catch (e) { /* system fonts */ }

// ── HTML ─────────────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QA \xb7 ${esc(TITLE)}</title>
<style>
${FONT_CSS}
:root {
  --bg:#f5f6f8; --s1:#ffffff; --s2:#f9fafb; --s3:#f0f2f5;
  --b1:#e3e6eb; --b2:#cfd5dd;
  --tx:#1f2937; --tx2:#4b5563; --tx3:#8a93a3;
  --pass:#3d8b68; --fail:#c0544c; --flaky:#b0801f; --skip:#9aa3b2;
  --pass-soft:rgba(61,139,104,.10); --fail-soft:rgba(192,84,76,.09); --flaky-soft:rgba(176,128,31,.10);
  --pri:#3a6ea5; --pri2:#2f5d8d; --on-pri:#ffffff; --on-solid:#ffffff;
  --tc-bg:#e9f0f7; --tc-tx:#2f5d8d; --tc-bd:#c3d6ea;
  --hdr-a:#1f2937;
  --type-func-bg:#e8f2ec; --type-func-tx:#2f7a58; --type-func-bd:#c3dfd0;
  --type-e2e-bg:#efebf6;  --type-e2e-tx:#6b4fa0;  --type-e2e-bd:#d4c9e8;
  --type-api-bg:#f6eedc;  --type-api-tx:#8a5a14;   --type-api-bd:#ecd7ad;
  --sh0:0 1px 2px rgba(16,24,40,.04);
  --sh1:0 2px 4px rgba(16,24,40,.06);
  --sh2:0 4px 8px rgba(16,24,40,.07);
  --r:10px; --font:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
}
[data-theme="dark"] {
  --bg:#15181d; --s1:#1c2027; --s2:#21262e; --s3:#282e38;
  --b1:#2e3541; --b2:#3b4452;
  --tx:#dde2ea; --tx2:#a4aebc; --tx3:#7a8697;
  --pass:#6dbd96; --fail:#df8a83; --flaky:#d6a64f; --skip:#6f7b8c;
  --pass-soft:rgba(109,189,150,.12); --fail-soft:rgba(223,138,131,.12); --flaky-soft:rgba(214,166,79,.12);
  --pri:#86aedc; --pri2:#6e9bd0; --on-pri:#14181d; --on-solid:#14181d;
  --tc-bg:#223447; --tc-tx:#a8c6e6; --tc-bd:#36506b;
  --hdr-a:#dde2ea;
  --type-func-bg:rgba(109,189,150,.12); --type-func-tx:#6dbd96; --type-func-bd:#2f5a47;
  --type-e2e-bg:rgba(160,140,210,.12);  --type-e2e-tx:#b3a3dc;  --type-e2e-bd:#4a4068;
  --type-api-bg:rgba(214,166,79,.12);   --type-api-tx:#d6a64f;  --type-api-bd:#5f4a22;
  --sh0:0 1px 2px rgba(0,0,0,.25);
  --sh1:0 2px 4px rgba(0,0,0,.30);
  --sh2:0 4px 8px rgba(0,0,0,.35);
}
*{margin:0;padding:0;box-sizing:border-box}
button,input,select,textarea{font-family:inherit}
/* shown at 90% size at 100% browser zoom */
html{zoom:.9}
body{font-family:var(--font);background:var(--bg);color:var(--tx);min-height:100vh;transition:background .25s,color .25s}
/* Header — flat surface, no gradients; a status band on the left edge, status line, title, meta chips */
.hdr{--hs:var(--pass);background:var(--s1);border-bottom:1px solid var(--b1);color:var(--tx);padding:24px 32px 22px 38px;
  display:flex;justify-content:space-between;align-items:flex-start;gap:20px;position:relative}
/* the stat box stays at the top right; the title block shrinks and wraps instead of pushing the box below it */
.hdr-left{flex:1 1 0;min-width:0}
.hdr-left h1{overflow-wrap:anywhere}
.hdr::before{content:'';position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--hs)}
.hdr.bad{--hs:var(--fail)}.hdr.warnx{--hs:var(--flaky)}
.eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:.74rem;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--hs)}
.eyebrow .dot{width:9px;height:9px;border-radius:50%;background:var(--hs)}
.hdr-left h1{font-size:2.2rem;font-weight:700;letter-spacing:-.03em;line-height:1.1;color:var(--tx);margin:8px 0 14px}
.hdr-meta{display:flex;flex-wrap:wrap;gap:8px}
.mchip{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border:1px solid var(--b1);border-radius:999px;background:var(--s2);font-size:.78rem;color:var(--tx2)}
.mchip svg{color:var(--tx3);flex-shrink:0}
.mchip b{color:var(--tx);font-weight:600}
.mchip.muted{background:none;border-style:dashed;color:var(--tx3)}
.hdr-right{display:flex;gap:14px;align-items:flex-start;flex:0 0 auto}
.hdr-stats{display:flex;border:1px solid var(--b1);border-radius:12px;background:var(--s2);overflow:hidden}
.hdr-stat{text-align:center;padding:12px 20px;min-width:92px;border-left:1px solid var(--b1)}
.hdr-stat:first-child{border-left:none}
.hdr-stat-n{font-size:1.9rem;font-weight:700;line-height:1;letter-spacing:-.3px}
.hdr-stat.zero .hdr-stat-n{opacity:.4}
.hdr-stat-n.c-p{color:var(--pass)}.hdr-stat-n.c-f{color:var(--fail)}.hdr-stat-n.c-k{color:var(--flaky)}.hdr-stat-n.c-s{color:var(--skip)}
.hdr-stat-l{font-size:.68rem;font-weight:700;color:var(--tx2);text-transform:uppercase;letter-spacing:.7px;margin-top:6px}
.theme-btn{background:var(--s2);border:1px solid var(--b1);color:var(--tx2);
  width:38px;height:38px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;
  font-size:1rem;flex-shrink:0}
.theme-btn:hover{background:var(--s3)}
@media(max-width:700px){.hdr{flex-direction:column;align-items:flex-start;padding:16px 16px 16px 22px}.hdr-right{flex-wrap:wrap}.hdr-left h1{font-size:1.7rem}.hdr-stat{padding:8px 12px;min-width:64px}.tabs{padding:0 8px}.tab{padding:12px 12px}}
/* Tabs */
.tabs{display:flex;background:var(--s1);border-bottom:1px solid var(--b1);
  padding:0 20px;position:sticky;top:0;z-index:100;box-shadow:var(--sh0)}
.tab{padding:13px 20px;border:none;background:none;color:var(--tx2);font-size:.875rem;font-weight:600;
  cursor:pointer;position:relative;transition:color .2s;display:flex;align-items:center;gap:7px}
.tab:hover{color:var(--tx)}
.tab.active{color:var(--pri)}
.tab.active::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;
  background:var(--pri);border-radius:2px 2px 0 0}
@keyframes slidein{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.badge{padding:1px 7px;border-radius:9px;font-size:.68rem;font-weight:600;
  background:var(--b1);color:var(--tx3)}
.tab.active .badge{background:var(--pri);color:var(--on-pri)}
.panel{display:none}
.panel.active{display:block}
@keyframes fadein{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
/* Summary */
.sum-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;padding:24px 32px 6px;align-items:stretch}
@media(max-width:1000px){.sum-top{grid-template-columns:1fr;padding:16px}}
.card{background:var(--s1);border-radius:var(--r);border:1px solid var(--b1);box-shadow:var(--sh0);overflow:hidden;display:flex;flex-direction:column}
.card-ttl{padding:14px 20px 11px;font-size:.88rem;font-weight:600;border-bottom:1px solid var(--b1);color:var(--tx);
  display:flex;justify-content:space-between;align-items:center}
.card-ttl small{font-weight:500;color:var(--tx3);font-size:.74rem}
/* Result Distribution */
.donut-wrap{padding:20px 26px;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:44px;flex:1}
@media(max-width:1300px) and (min-width:1001px){.donut-wrap{gap:30px}}
@media(max-width:560px){.donut-wrap{flex-direction:column;gap:18px}.donut-pos{width:200px;height:200px}.donut-pct{font-size:2.4rem}}
.donut-pos{position:relative;width:250px;height:250px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.donut-pos svg{width:100%;height:100%}
@media(max-width:1300px) and (min-width:1001px){.donut-pos{width:185px;height:185px}}
.donut-lbl{position:absolute;text-align:center;pointer-events:none}
.donut-pct{font-size:2.9rem;font-weight:600;color:var(--tx);line-height:1;display:block}
.donut-sub{font-size:.7rem;color:var(--tx3);text-transform:uppercase;letter-spacing:.8px;margin-top:5px}
@media(max-width:1300px) and (min-width:1001px){.donut-pct{font-size:2.3rem}.donut-sub{font-size:.62rem}}
.legend{flex:0 1 270px;min-width:190px;display:flex;flex-direction:column}
.lg-row{display:grid;grid-template-columns:12px 1fr auto 42px;gap:8px;align-items:center;padding:7px 2px;
  border-top:1px solid var(--b1);font-size:.82rem;color:var(--tx2)}
.lg-row:first-child{border-top:none}
.lg-row.zero{color:var(--tx3)}
.lg-dot{width:9px;height:9px;border-radius:50%}
.lg-n{font-weight:600;color:var(--tx);font-variant-numeric:tabular-nums}
.lg-row.zero .lg-n{color:var(--tx3)}
.lg-p{text-align:right;font-size:.74rem;color:var(--tx3);font-variant-numeric:tabular-nums}
.leg-warn{margin-top:6px;padding:8px 10px;border-radius:8px;background:var(--flaky-soft);color:var(--flaky);font-size:.8rem;text-align:center}
/* This run */
.run-bar{display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--b1);margin:16px 20px 2px;flex-shrink:0}
.run-bar i{display:block;height:100%}
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px 20px 6px}
@media(max-width:560px){.stat-grid{grid-template-columns:repeat(2,1fr)}}
.sc{background:var(--s2);border:1px solid var(--b1);border-radius:10px;padding:12px 14px;cursor:default;border-top:3px solid var(--b2)}
.sc.clickable{cursor:pointer}
.sc.clickable:hover{background:var(--s3)}
.sc.ct{border-top-color:var(--tx3)}.sc.cp{border-top-color:var(--pass)}.sc.cf{border-top-color:var(--fail)}
.sc.cfk{border-top-color:var(--flaky)}.sc.csk{border-top-color:var(--skip)}.sc.cd{border-top-color:var(--pri)}
.sc-n{font-size:2.5rem;font-weight:700;line-height:1;margin-bottom:8px;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
.sc.cp .sc-n{color:var(--pass)}.sc.cf .sc-n{color:var(--fail)}.sc.cfk .sc-n{color:var(--flaky)}
.sc.csk .sc-n{color:var(--skip)}.sc.ct .sc-n{color:var(--tx)}.sc.cd .sc-n{color:var(--tx)}
.sc-l{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--tx)}
.sc-s{font-size:.72rem;color:var(--tx2);margin-top:3px}
.sc.cp:not(.zero){background:var(--pass-soft)}.sc.cf:not(.zero){background:var(--fail-soft)}.sc.cfk:not(.zero){background:var(--flaky-soft)}
.sc.zero .sc-n{opacity:.45}
.sc.cd .sc-n{font-size:2rem;padding-top:6px}
.run-info{display:grid;grid-template-columns:repeat(2,1fr);gap:0 44px;margin:10px 20px 12px;border-top:1px solid var(--b1)}
@media(max-width:560px){.run-info{grid-template-columns:1fr}}
.ri{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--b1);font-size:.8rem}
.ri:nth-last-child(-n+2){border-bottom:none}
.ri span{color:var(--tx3);text-transform:uppercase;letter-spacing:.4px;font-size:.68rem;font-weight:600}
.ri b{color:var(--tx);font-weight:600;text-align:right}
.info-card{display:none}
/* Results by feature — simple feature cards, closed unless something failed */
.sum-sec{padding:22px 32px 36px}
@media(max-width:860px){.sum-sec{padding:14px 16px 26px}}
.sec-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.sec-head h2{font-size:1.15rem;font-weight:700;letter-spacing:-.01em}
.sec-head .hint{font-size:.78rem;color:var(--tx3);margin-top:2px}
.sec-actions{display:flex;gap:8px}
.sec-btn{padding:5px 12px;border:1px solid var(--b2);background:var(--s1);color:var(--tx2);border-radius:7px;cursor:pointer;font-size:.76rem;font-weight:600}
.sec-btn:hover{background:var(--s3);color:var(--tx)}
.fcs{display:flex;flex-direction:column;gap:12px}
.fc{background:var(--s1);border:1px solid var(--b1);border-left:5px solid var(--pass);border-radius:var(--r);box-shadow:var(--sh1);overflow:hidden}
.fc.warnx{border-left-color:var(--flaky)}.fc.bad{border-left-color:var(--fail)}
.fc-head,.gr{display:grid;grid-template-columns:18px minmax(150px,240px) 128px minmax(0,1fr) 170px 34px;align-items:center;column-gap:16px}
.fc-head{padding:16px 20px;cursor:pointer}
.fc-head:hover{background:var(--s2)}
.fc.setup .fc-head{padding:11px 20px}
.fc.setup{box-shadow:none;border-left-color:var(--b2);background:var(--s2)}
.chev{width:14px;color:var(--tx3);font-size:.8rem;flex-shrink:0}
.fc-name{font-size:.98rem;font-weight:600;min-width:130px;display:flex;align-items:center;gap:9px}
.fc.setup .fc-name{font-size:.86rem;font-weight:600;color:var(--tx2)}
.pill{justify-self:start;padding:3px 11px;border-radius:12px;font-size:.7rem;font-weight:600;white-space:nowrap}
.pill.good{background:var(--pass-soft);color:var(--pass)}
.pill.bad{background:var(--fail-soft);color:var(--fail)}
.pill.warn{background:var(--flaky-soft);color:var(--flaky)}
.fc-nums{min-width:0;font-size:.74rem;color:var(--tx2)}
.fc-nums b{color:var(--tx);font-weight:600}
.fc-nums .f{color:var(--fail);font-weight:600}
.fc-nums .sep{color:var(--b2);margin:0 5px}
.fc-bar{width:100%}
.fc-link{display:flex;justify-content:flex-end}
.sbar{display:flex;height:7px;border-radius:4px;overflow:hidden;background:var(--b1)}
.sbar i{display:block;height:100%}
.vt{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid var(--b2);border-radius:9px;color:var(--tx2);background:var(--s1);cursor:pointer}
.vt:hover{background:var(--tc-bg);color:var(--tc-tx);border-color:var(--tc-bd)}
.wn{color:var(--flaky);font-weight:600;cursor:help}
.fc-body{border-top:1px solid var(--b1)}
.gr{padding:12px 20px;border-top:1px solid var(--b1);cursor:pointer;background:var(--s2)}
.gr:first-child{border-top:none}
.gr:hover{background:var(--s3)}
.gr.bad{background:var(--fail-soft)}
.g-name{min-width:0;font-size:.8rem;font-weight:600;padding-left:12px}
.gsub{display:block;font-weight:400;font-size:.66rem;color:var(--tx3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gr .fc-nums{font-size:.72rem}
@media(max-width:1000px){.fc-head,.gr{display:flex;flex-wrap:wrap}.fc-bar{width:100%}.fc-nums{flex:1;min-width:200px}.g-name{padding-left:0}}
/* Tests panel */
.tests-panel{display:flex;height:calc(100vh - 112px);min-height:480px;overflow:hidden}
.tlist-col{display:flex;flex-direction:column;flex:1;min-width:0;border-right:1px solid var(--b1)}
/* Filter sidebar (left) */
.filter-sidebar{width:0;flex-shrink:0;background:var(--s1);border-right:1px solid var(--b1);
  overflow-y:auto;transition:width .25s ease;padding:0}
.filter-sidebar.open{width:190px;padding:14px 12px}
.filter-sidebar::-webkit-scrollbar{width:5px}.filter-sidebar::-webkit-scrollbar-thumb{background:var(--b2);border-radius:3px}
.fsec{margin-bottom:18px;white-space:nowrap}
.fsec-ttl{font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.6px;
  color:var(--tx3);margin-bottom:8px}
.fsec-list{display:flex;flex-direction:column;gap:5px}
.fsec-list .fbtn,.fsec-list .filter-btn{
  width:100%;text-align:left;border-radius:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.filter-toggle-btn{padding:5px 12px;border:1.5px solid var(--b1);background:var(--s2);color:var(--tx2);
  border-radius:7px;cursor:pointer;font-size:.77rem;font-weight:600;transition:.2s;flex-shrink:0}
.filter-toggle-btn:hover{background:var(--s3);border-color:var(--b2);color:var(--tx)}
.filter-toggle-btn.active{background:var(--pri);color:var(--on-pri);border-color:var(--pri)}
.fbar{display:flex;gap:7px;flex-wrap:wrap;align-items:center;padding:10px 14px;
  background:var(--s1);border-bottom:1px solid var(--b1);flex-shrink:0}
.active-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 14px;
  background:var(--s2);border-bottom:1px solid var(--b1);flex-shrink:0}
.active-chips:empty{display:none;padding:0;border-bottom:none}
.chip{display:inline-flex;align-items:center;gap:6px;padding:3px 6px 3px 11px;
  background:var(--tc-bg);color:var(--tc-tx);border:1px solid var(--tc-bd);
  border-radius:20px;font-size:.72rem;font-weight:600;white-space:nowrap}
.chip-x{cursor:pointer;font-weight:700;opacity:.65;width:15px;height:15px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;transition:.15s;flex-shrink:0}
.chip-x:hover{opacity:1;background:rgba(0,0,0,.12)}
.clear-all-btn{padding:3px 11px;border-radius:20px;font-size:.72rem;font-weight:600;
  background:var(--s3);color:var(--tx2);border:1px solid var(--b2);cursor:pointer;transition:.15s;flex-shrink:0}
.clear-all-btn:hover{background:var(--fail);color:#fff;border-color:var(--fail)}
.fbtn{padding:5px 13px;border:1.5px solid var(--b1);background:var(--s2);color:var(--tx2);
  border-radius:7px;cursor:pointer;font-size:.77rem;font-weight:600;transition:.2s}
.fbtn:hover,.fbtn.active{background:var(--pri);color:var(--on-pri);border-color:var(--pri)}
.srch{flex:1;min-width:130px;padding:6px 10px 6px 30px;border:1.5px solid var(--b1);
  border-radius:7px;background:var(--s2);color:var(--tx);font-size:.82rem;outline:none;
  transition:.2s;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23718096' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:9px center}
.srch:focus{border-color:var(--pri)}
.srch::placeholder{color:var(--tx3)}
.type-fbar{padding-top:7px}
/* Type & Module tree (sidebar) — merges what used to be two separate flat
   button groups (Type, Module) into one 2-level expandable tree: clicking a
   parent (Type) both filters to it AND toggles its children open/closed in
   one click; clicking a child (Module) filters to just that module. */
.tree-node{margin-bottom:2px}
.tree-node.tree-empty{opacity:.45}
.tree-parent{display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:7px;
  cursor:pointer;font-size:.8rem;font-weight:600;color:var(--tx2);transition:.15s;white-space:nowrap}
.tree-node.tree-empty .tree-parent{cursor:default}
.tree-parent:hover{background:var(--s3)}
.tree-node.tree-empty .tree-parent:hover{background:none}
.tree-parent.active{background:var(--tc-bg);color:var(--tc-tx)}
.tree-chevron{flex-shrink:0;width:12px;font-size:.62rem;color:var(--tx3);transition:transform .15s}
.tree-chevron-none{visibility:hidden}
.tree-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.tree-count{flex-shrink:0;font-size:.68rem;font-weight:600;color:var(--tx3)}
.tree-parent.active .tree-count{color:var(--tc-tx)}
.tree-children{margin-left:18px;border-left:1px dashed var(--b2);padding-left:2px}
.tree-child{display:flex;align-items:center;gap:6px;padding:4px 8px 4px 10px;border-radius:7px;
  cursor:pointer;font-size:.77rem;color:var(--tx2);transition:.15s;white-space:nowrap}
.tree-child:hover{background:var(--s3)}
.tree-child.active{background:var(--tc-bg);color:var(--tc-tx)}
.tree-child .tree-label{overflow:hidden;text-overflow:ellipsis;min-width:0}
.tree-child .tree-count{color:var(--tx3);flex-shrink:0}
.tree-child.active .tree-count{color:var(--tc-tx)}
.tree-child-parent .tree-chevron{flex-shrink:0;width:11px;font-size:.6rem;color:var(--tx3)}
.tree-grandchildren{margin-left:16px;border-left:1px dashed var(--b2);padding-left:2px}
.tree-grandchild{display:flex;align-items:center;gap:6px;padding:3px 8px 3px 10px;border-radius:7px;
  cursor:pointer;font-size:.74rem;color:var(--tx2);transition:.15s;white-space:nowrap}
.tree-grandchild:hover{background:var(--s3)}
.tree-grandchild.active{background:var(--tc-bg);color:var(--tc-tx)}
.tree-grandchild .tree-label{overflow:hidden;text-overflow:ellipsis;min-width:0}
.tree-grandchild .tree-count{color:var(--tx3);flex-shrink:0}
.tree-grandchild.active .tree-count{color:var(--tc-tx)}
.type-tag{padding:2px 6px;border-radius:9px;font-size:.62rem;font-weight:600;flex-shrink:0}
.type-tag.functional{background:var(--type-func-bg);color:var(--type-func-tx);border:1px solid var(--type-func-bd)}
.type-tag.e2e{background:var(--type-e2e-bg);color:var(--type-e2e-tx);border:1px solid var(--type-e2e-bd)}
.type-tag.api{background:var(--type-api-bg);color:var(--type-api-tx);border:1px solid var(--type-api-bd)}
/* Module / Tag filters (dynamically generated) */
.filter-btn{padding:4px 12px;border:1.5px solid var(--b1);background:var(--s2);color:var(--tx2);
  border-radius:20px;cursor:pointer;font-size:.73rem;font-weight:600;transition:.2s}
.filter-btn:hover{background:var(--s3);border-color:var(--b2);color:var(--tx)}
.filter-btn.active{background:var(--tc-bg);color:var(--tc-tx);border-color:var(--tc-bd)}
.module-tag{padding:2px 6px;border-radius:9px;font-size:.62rem;font-weight:600;flex-shrink:0;
  background:var(--s3);color:var(--tx2);border:1px solid var(--b2)}
.tag-badge{padding:2px 6px;border-radius:9px;font-size:.62rem;font-weight:600;flex-shrink:0}
.tag-badge.tag-smoke{background:var(--flaky-soft);color:var(--flaky);border:1px solid var(--flaky)}
.tag-badge.tag-regression{background:var(--tc-bg);color:var(--tc-tx);border:1px solid var(--tc-bd)}
/* Before/After Hooks */
.hookgrp{margin-bottom:8px;border:1px solid var(--b1);border-radius:7px;overflow:hidden;background:var(--s2)}
.hookgrp.herr{border-color:rgba(220,38,38,.4)}
.hookgrp-hdr{display:flex;align-items:center;gap:7px;padding:7px 10px;cursor:pointer;
  font-size:.78rem;color:var(--tx2);user-select:none}
.hookgrp-hdr:hover{background:var(--s3)}
.hookgrp-ttl{flex:1;font-weight:600}
.hookgrp.herr .hookgrp-ttl{color:var(--fail)}
.hookgrp-dur{font-size:.7rem;color:var(--tx3)}
.hookgrp-chevron{font-size:.6rem;color:var(--tx3);transition:transform .15s;flex-shrink:0}
.hookgrp.open .hookgrp-chevron{transform:rotate(90deg)}
.hookgrp-body{display:none;padding:2px 10px 10px 28px}
.hookgrp.open .hookgrp-body{display:block}
.htree-item{padding:3px 0 3px 10px;font-size:.76rem;color:var(--tx2);border-left:1px dashed var(--b2)}
.htree-cat{font-size:.6rem;padding:1px 5px;border-radius:6px;background:var(--s3);color:var(--tx3);
  margin-right:5px;font-family:monospace}
.htree-dur{font-size:.68rem;color:var(--tx3);margin-left:5px}
.htree-err{color:var(--fail);font-size:.72rem;margin-top:2px;font-family:monospace}
.htree-children{margin-left:10px}
.grp-hdr{display:flex;justify-content:space-between;align-items:center;gap:10px;
  padding:7px 10px;margin:14px 0 6px;font-size:.72rem;font-weight:600;
  text-transform:uppercase;letter-spacing:.5px;color:var(--tx3);
  border-bottom:1.5px solid var(--b2)}
.grp-hdr:first-child{margin-top:2px}
.grp-hdr-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.grp-hdr-cnt{flex-shrink:0;background:var(--s3);color:var(--tx2);padding:1px 8px;
  border-radius:9px;font-size:.68rem;font-weight:600}
.tlist{flex:1;overflow-y:auto;padding:10px}
.tlist::-webkit-scrollbar{width:5px}.tlist::-webkit-scrollbar-thumb{background:var(--b2);border-radius:3px}
.ti{display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:8px;
  border:1px solid var(--b1);cursor:pointer;transition:.15s;margin-bottom:5px;background:var(--s1);
  position:relative;overflow:hidden}
.ti::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px}
.ti.tp::before{background:var(--pass)}.ti.tf::before{background:var(--fail)}
.ti.tk::before{background:var(--flaky)}.ti.ts::before{background:var(--skip)}
.ti:hover{background:var(--s2)}
.ti.sel{background:var(--s3);border-color:var(--pri)}
.ti-ic{flex-shrink:0;width:17px;height:17px}
.tc-tag{flex-shrink:0;padding:2px 6px;border-radius:5px;font-size:.65rem;font-weight:600;
  background:var(--tc-bg);color:var(--tc-tx);border:1px solid var(--tc-bd)}
.ti-body{flex:1;min-width:0}
.ti-title{font-size:.85rem;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ti-meta{display:flex;gap:7px;align-items:center;margin-top:2px}
.ti-file{font-size:.68rem;color:var(--tx3)}
.ti-dur{font-size:.68rem;color:var(--tx3)}
.retry-tag{font-size:.65rem;color:var(--flaky);font-weight:600}
.spill{flex-shrink:0;padding:2px 8px;border-radius:8px;font-size:.65rem;font-weight:600;
  text-transform:uppercase;letter-spacing:.3px;color:var(--on-solid)}
.spill.passed{background:var(--pass)}.spill.failed{background:var(--fail)}
.spill.flaky{background:var(--flaky)}.spill.skipped{background:var(--skip)}
/* Detail sidebar */
.dsb{width:0;overflow:hidden;background:var(--s1);transition:width .35s cubic-bezier(.4,0,.2,1);flex-shrink:0}
.dsb.open{width:52%;overflow-y:auto}
/* Code snippet */
.code-block{margin-top:6px;background:var(--s3);border:1px solid var(--b1);border-radius:7px;
  overflow-x:auto;font-family:'Consolas','Menlo','Monaco',monospace;font-size:.73rem;line-height:1.65;
  padding:6px 0}
.code-line{padding:1px 14px;white-space:pre;color:var(--tx2)}
.code-line.fail-line{background:rgba(220,38,38,.12);color:var(--fail);font-weight:600}
.code-line.ptr-line{padding:1px 14px;white-space:pre;color:var(--fail)}
.step-src{display:none;margin-top:5px}
.step.expanded .step-src,.step.sfail .step-src{display:block}
.step-tog{background:none;border:1px solid var(--b1);color:var(--tx3);cursor:pointer;
  font-size:.65rem;padding:2px 7px;border-radius:4px;transition:.15s;flex-shrink:0;margin-left:6px;
  white-space:nowrap}
.warn-box{border:1px solid var(--flaky);background:var(--flaky-soft);color:var(--flaky);border-radius:8px;
  padding:8px 12px;margin-bottom:10px;font-size:12px;line-height:1.5}
.warn-box b{display:block;margin-bottom:2px}
.warn-tag{flex-shrink:0;padding:1px 6px;border-radius:5px;font-size:.62rem;font-weight:600;
  background:var(--flaky-soft);color:var(--flaky);border:1px solid var(--flaky)}
.exp{display:flex;gap:8px;align-items:baseline;padding:2px 8px;font-size:12px;line-height:1.5}
.exp-mark{font-weight:600;flex:none;width:14px}
.exp-ok .exp-mark{color:var(--ok,#16a34a)}
.exp-fail .exp-mark{color:var(--err,#dc2626)}
.exp-fail .exp-lbl{color:var(--err,#dc2626)}
.exp-lbl{color:var(--tx2)}
.exp-code{display:block;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;color:var(--tx3);word-break:break-all}
.exp-where{color:var(--tx3);font-size:10px;margin-left:auto;flex:none}
.exp-aux{margin:2px 0 4px;font-size:11px;color:var(--tx3)}
.exp-aux summary{cursor:pointer;padding:2px 8px}
.step-tog:hover{background:var(--s3);border-color:var(--b2);color:var(--tx2)}
.dsb::-webkit-scrollbar{width:5px}.dsb::-webkit-scrollbar-thumb{background:var(--b2);border-radius:3px}
.dh{padding:18px 20px 14px;border-bottom:1px solid var(--b1);position:sticky;top:0;background:var(--s1);z-index:5}
.dcls{float:right;width:28px;height:28px;border-radius:50%;border:none;background:var(--s3);
  color:var(--tx2);cursor:pointer;display:flex;align-items:center;justify-content:center;
  font-size:.85rem;transition:.2s;margin-left:10px}
.dcls:hover{background:var(--fail);color:var(--on-solid)}
.dttl{font-size:.95rem;font-weight:600;color:var(--tx);line-height:1.4;margin-bottom:8px}
.dmeta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.att-tabs{display:flex;gap:5px;padding:12px 20px 0;border-bottom:1px solid var(--b1)}
.att-tab{padding:5px 13px;border:1.5px solid var(--b1);background:var(--s2);color:var(--tx2);
  border-radius:7px 7px 0 0;cursor:pointer;font-size:.75rem;font-weight:600;transition:.2s;
  display:flex;align-items:center;gap:4px}
.att-tab.active{border-color:var(--pri);color:var(--pri);background:var(--s1);border-bottom-color:var(--s1);margin-bottom:-1px}
.att-body{padding:16px 20px;display:none}
.att-body.active{display:block}
/* Steps */
.sec-ttl{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--tx3);margin-bottom:8px}
.step{display:flex;align-items:flex-start;gap:7px;padding:8px 10px;border-radius:7px;
  background:var(--s2);border:1px solid var(--b1);border-left:3px solid var(--b2);
  margin-bottom:4px;transition:transform .15s}
.step:hover{background:var(--s3)}
.step.sok{border-left-color:var(--pass)}.step.sfail{border-left-color:var(--fail)}
.sn{flex-shrink:0;width:19px;height:19px;border-radius:50%;background:var(--pri);color:var(--on-pri);
  font-size:.6rem;font-weight:600;display:flex;align-items:center;justify-content:center}
.st{flex:1;font-size:.82rem;color:var(--tx)}
.sd{font-size:.68rem;color:var(--tx3);white-space:nowrap}
.serr{font-size:.72rem;color:var(--fail);margin-top:3px;font-family:monospace}
/* Steps as a readable checklist (detail panel): sentences, one value per passed check, expected/got only for failures */
.dtop{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 0 12px}
.dsum{font-size:.78rem;color:var(--tx3)}
.dsum b{color:var(--tx2);font-weight:600}
.tech-btn{border:1px solid var(--b2);background:var(--s1);color:var(--tx2);border-radius:7px;padding:4px 11px;font-size:.72rem;font-weight:600;cursor:pointer;white-space:nowrap}
.tech-btn:hover{background:var(--s3);color:var(--tx)}
.cl{display:flex;flex-direction:column;gap:10px;margin-bottom:8px}
.cs{border:1px solid var(--b1);border-radius:10px;background:var(--s1);padding:12px 14px}
.cs.fail{border-color:var(--fail);background:var(--fail-soft)}
.cs-h{display:flex;align-items:center;gap:10px;font-size:.92rem;font-weight:600;color:var(--tx);line-height:1.35}
.cs-t{flex:1;min-width:0}
.cs-time{font-size:.72rem;font-weight:500;color:var(--tx3);white-space:nowrap;font-variant-numeric:tabular-nums}
.cs-vc{font-size:.68rem;font-weight:600;border-radius:999px;padding:2px 8px;white-space:nowrap;background:var(--pass-soft);color:var(--pass)}
.cs.fail .cs-vc{background:var(--fail);color:var(--on-solid)}
.cs-vc.none{background:var(--s3);color:var(--tx3)}
.cs-nov{margin:6px 0 0 32px;font-size:.78rem;color:var(--tx3);font-style:italic}
.cs-vh{font-size:.62rem;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--tx3);margin:0 0 1px}
.ck-sub{font-weight:400;color:var(--tx3);font-size:.78rem;margin-left:4px;overflow-wrap:anywhere}
.ck-subj{font-weight:500}
.ck-eg{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:5px 10px;margin-top:5px;align-items:center}
.ck-eg i{font-style:normal;font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;border-radius:5px;padding:3px 8px;background:var(--s3);color:var(--tx2);justify-self:start;white-space:nowrap}
.ck-eg i.ok{background:var(--pass-soft);color:var(--pass)}
.ck-eg i.got{background:var(--pass-soft);color:var(--pass)}
.ck-eg b{font-weight:500;color:var(--tx);overflow-wrap:anywhere;justify-self:start;min-width:0;border-radius:6px;padding:2px 9px;background:var(--s2);border:1px solid var(--b1)}
.ck-eg i.ok+b,.ck-eg i.got+b{background:var(--pass-soft);border-color:transparent}
.ck-eg em{color:var(--tx3);font-style:italic;font-weight:400}
.eg-r span{border-radius:5px;padding:2px 8px;background:var(--s3);font-weight:700;justify-self:start;text-align:center;min-width:64px}
.eg-r.got span{background:var(--fail);color:var(--on-solid)}
.dstrip{display:flex;gap:3px;margin:0 0 14px}
.dseg{flex:1;min-width:0;height:22px;border-radius:5px;background:var(--pass-soft);color:var(--pass);font-size:.66rem;font-weight:600;display:flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid transparent}
.dseg:hover{border-color:var(--pass)}
.dseg.fail{background:var(--fail);color:var(--on-solid)}
.dseg.none{background:var(--s3);color:var(--tx3)}
.ck-time{font-size:.68rem;color:var(--tx3);white-space:nowrap;margin-left:auto;padding-left:8px;font-variant-numeric:tabular-nums;flex-shrink:0;margin-top:2px}
.cs-n{width:22px;height:22px;border-radius:6px;background:var(--s3);color:var(--tx2);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:600;flex-shrink:0}
.cs.fail .cs-n{background:var(--fail);color:var(--on-solid)}
.cs.fail .cs-h{color:var(--fail)}
.cs-d{margin:9px 0 0 32px;display:flex;flex-direction:column;gap:6px}
.ck{display:flex;gap:9px;align-items:flex-start;font-size:.85rem;color:var(--tx2);line-height:1.5;padding-left:calc(var(--d,0)*16px)}
.ck-m{color:var(--pass);font-weight:700;flex-shrink:0;width:14px}
.ck.fail .ck-m{color:var(--fail)}
.ck-t{min-width:0;flex:1}
.ck-l{color:var(--tx)}
.ck-clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;cursor:pointer}
.ck-clamp.open{display:block;overflow:visible}
.ck-line{display:flex;gap:6px;flex-wrap:wrap;align-items:baseline}
.ck-v{color:var(--tx2);min-width:0;flex:1 1 200px}
.eg{margin-top:6px;border:1px solid var(--b2);border-left:4px solid var(--fail);border-radius:8px;background:var(--fail-soft);padding:8px 12px;font-size:.82rem}
.eg-r{display:grid;grid-template-columns:84px minmax(0,1fr);gap:10px;padding:2px 0;align-items:baseline}
.eg-r span{color:var(--tx3);font-size:.66rem;text-transform:uppercase;letter-spacing:.5px}
.eg-r b{font-weight:600;color:var(--tx);overflow-wrap:anywhere;white-space:pre-wrap}
.eg-r.got b{color:var(--fail)}
.tech,.tech-inline,.cs-tech{display:none}
.tech-on .tech{display:block;color:var(--tx3);font-size:.7rem;margin-top:1px}
.tech-on .cs-tech{display:block;margin:8px 0 0 32px}
.cs-tech .code-block{margin-top:4px}
/* Error box */
.ebox{background:rgba(220,38,38,.08);border:1.5px solid rgba(220,38,38,.25);border-radius:9px;
  padding:14px;margin-bottom:16px}
.ebox-ttl{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--fail);margin-bottom:6px}
.ebox-msg{font-size:.82rem;color:var(--tx);white-space:pre-wrap;word-break:break-word;font-family:monospace;line-height:1.5}
.ebox-snip{margin-top:8px;background:var(--s3);border:1px solid var(--b1);border-radius:7px;
  padding:10px;font-size:.75rem;color:var(--tx2);white-space:pre-wrap;overflow-x:auto;font-family:monospace}
/* Screenshot */
.shot-img{width:100%;border-radius:7px;border:1px solid var(--b1);cursor:zoom-in;
  transition:opacity .2s;margin-bottom:12px}
.shot-img:hover{opacity:.9}
/* Buttons */
.tbtn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:var(--pri);color:var(--on-pri);
  border:none;border-radius:7px;cursor:pointer;font-size:.75rem;font-weight:600;transition:.2s;
  text-decoration:none;margin-right:6px;margin-bottom:14px}
.tbtn:hover{background:var(--pri2)}
/* Stdout */
.stdout{background:var(--s3);color:var(--tx2);border-radius:8px;padding:12px;font-size:.75rem;
  font-family:monospace;max-height:180px;overflow-y:auto;line-height:1.6;border:1px solid var(--b1);margin-bottom:12px}
/* Errors tab */
.epanel{padding:22px;max-width:880px;margin:0 auto}
.no-err{text-align:center;padding:56px;color:var(--tx3);font-size:.95rem}
.eg{background:var(--s1);border:1px solid var(--b1);border-left:4px solid var(--fail);
  border-radius:var(--r);margin-bottom:12px;box-shadow:var(--sh0);overflow:hidden;transition:.2s}
.eg:hover{box-shadow:var(--sh1)}
.eg-hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:15px 17px}
.eg-msg{flex:1;font-size:.88rem;font-weight:600;color:var(--tx);word-break:break-word}
.eg-cnt{flex-shrink:0;padding:3px 9px;background:var(--fail);color:var(--on-solid);border-radius:8px;
  font-size:.7rem;font-weight:600}
.eg-tests{border-top:1px solid var(--b1);padding:10px 17px;display:flex;flex-direction:column;gap:4px}
.etlink{display:flex;align-items:center;gap:7px;font-size:.82rem;color:var(--pri);
  cursor:pointer;padding:5px 9px;border-radius:6px;transition:.15s}
.etlink:hover{background:var(--s2)}
/* Lightbox */
.lb{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;
  align-items:center;justify-content:center}
.lb.open{display:flex}
.lb-inner{position:relative;max-width:92vw;max-height:92vh}
@keyframes zoomin{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
.lb-inner img{max-width:100%;max-height:90vh;border-radius:10px;display:block}
.lb-cls{position:absolute;top:-13px;right:-13px;width:30px;height:30px;border-radius:50%;
  background:var(--fail);color:var(--on-solid);border:none;cursor:pointer;display:flex;align-items:center;
  justify-content:center;font-size:.85rem;font-weight:600;box-shadow:var(--sh1);transition:.2s}
.lb-cls:hover{background:var(--fail)}
/* Video */
.vid-wrap{margin-top:4px}
.vid-wrap video{width:100%;border-radius:8px;background:#000;display:block;max-height:360px}
/* Type summary cards */
.type-cards{display:flex;gap:14px;flex-wrap:wrap;padding:0 36px 28px}
.type-card{flex:1;min-width:180px;border:1.5px solid;border-radius:var(--r);padding:18px 20px;
  cursor:pointer;transition:.2s}
.type-card:hover{box-shadow:var(--sh1)}
.type-card-title{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.6px;
  margin-bottom:10px}
.type-card-rate{font-size:2.2rem;font-weight:600;line-height:1;margin-bottom:6px}
.type-card-detail{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.72rem;margin-bottom:10px;
  color:var(--tx2)}
.type-card-bar{height:4px;background:var(--b1);border-radius:2px;overflow:hidden}
.type-card-bar-fill{height:100%;border-radius:2px;transition:width .6s ease}
/* API calls */
.api-call{margin-bottom:7px;border:1px solid var(--b1);border-radius:8px;overflow:hidden}
.api-call-hdr{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--s2);
  cursor:pointer;transition:.15s;user-select:none}
.api-call-hdr:hover{background:var(--s3)}
.api-meth{padding:2px 7px;border-radius:4px;font-size:.67rem;font-weight:700;font-family:monospace;flex-shrink:0}
.api-meth.GET{background:rgba(37,99,235,.15);color:#3b82f6}
.api-meth.POST{background:rgba(5,150,105,.15);color:#10b981}
.api-meth.PUT{background:rgba(217,119,6,.15);color:#f59e0b}
.api-meth.DELETE{background:rgba(220,38,38,.15);color:#ef4444}
.api-meth.PATCH{background:rgba(109,40,217,.15);color:#8b5cf6}
.api-url{flex:1;font-size:.75rem;font-family:monospace;color:var(--tx);white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.api-status{padding:2px 7px;border-radius:4px;font-size:.67rem;font-weight:600;font-family:monospace;flex-shrink:0}
.api-status.s2{background:rgba(5,150,105,.15);color:#10b981}
.api-status.s3{background:rgba(37,99,235,.15);color:#3b82f6}
.api-status.s4{background:rgba(217,119,6,.15);color:#f59e0b}
.api-status.s5{background:rgba(220,38,38,.15);color:#ef4444}
.api-dur{font-size:.67rem;color:var(--tx3);flex-shrink:0}
.api-chevron{font-size:.58rem;color:var(--tx3);flex-shrink:0;transition:transform .2s}
.api-call.open .api-chevron{transform:rotate(90deg)}
.api-detail{display:none;padding:12px 14px;border-top:1px solid var(--b1)}
.api-call.open .api-detail{display:block}
.api-dlabel{font-size:.63rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px;
  color:var(--tx3);margin-bottom:4px;margin-top:10px}
.api-dlabel:first-child{margin-top:0}
.api-json{background:var(--s3);border:1px solid var(--b1);border-radius:6px;padding:8px 12px;
  font-size:.72rem;font-family:monospace;overflow-x:auto;white-space:pre;color:var(--tx2);
  max-height:220px;overflow-y:auto;line-height:1.5}
/* Toast */
#qr-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
  background:var(--hdr-a);color:var(--s1);padding:10px 22px;border-radius:9px;
  font-size:.82rem;font-weight:500;z-index:99999;pointer-events:none;
  border:1px solid var(--hdr-a);white-space:nowrap;opacity:0;transition:opacity .25s}
#qr-toast.toast-show{opacity:1}
</style>
</head>
<body>

<header class="hdr good" id="hdr">
  <div class="hdr-left">
    <div class="eyebrow"><span class="dot"></span><span id="hdr-status">Loading&hellip;</span></div>
    <h1>${esc(TITLE)}</h1>
    <div class="hdr-meta" id="hdr-meta"></div>
  </div>
  <div class="hdr-right">
    <div class="hdr-stats">
      <div class="hdr-stat"><div class="hdr-stat-n c-p" id="hn-p">&mdash;</div><div class="hdr-stat-l">Passed</div></div>
      <div class="hdr-stat"><div class="hdr-stat-n c-f" id="hn-f">&mdash;</div><div class="hdr-stat-l">Failed</div></div>
      <div class="hdr-stat"><div class="hdr-stat-n c-k" id="hn-k">&mdash;</div><div class="hdr-stat-l">Flaky</div></div>
      <div class="hdr-stat"><div class="hdr-stat-n c-s" id="hn-s">&mdash;</div><div class="hdr-stat-l">Skipped</div></div>
    </div>
    <button class="theme-btn" id="theme-btn" title="Toggle theme">\u{1f319}</button>
  </div>
</header>

<div class="tabs">
  <button class="tab active" data-tab="summary">Summary <span class="badge" id="b-sum">&mdash;</span></button>
  <button class="tab" data-tab="tests">Test Cases <span class="badge" id="b-tests">&mdash;</span></button>
  <button class="tab" data-tab="errors">Errors <span class="badge" id="b-err">&mdash;</span></button>
</div>

<!-- Summary -->
<div class="panel active" id="panel-summary">
  <div class="sum-top">
    <div class="card">
      <div class="card-ttl">Result Distribution</div>
      <div class="donut-wrap">
        <div class="donut-pos">
          <svg id="donut-svg" viewBox="0 0 220 220" width="250" height="250"></svg>
          <div class="donut-lbl">
            <span class="donut-pct" id="d-pct">&mdash;</span>
            <span class="donut-sub">Pass Rate</span>
          </div>
        </div>
        <div class="legend" id="d-legend"></div>
      </div>
    </div>
    <div class="card">
      <div class="card-ttl">This run <small id="run-sub"></small></div>
      <div class="run-bar" id="run-bar"></div>
      <div class="stat-grid" id="stat-grid"></div>
      <div class="run-info" id="run-info"></div>
    </div>
  </div>
  <div class="info-card" id="info-card"></div>
  <div class="sum-sec">
    <div class="sec-head">
      <div>
        <h2>Results by feature</h2>
        <p class="hint">A feature opens by itself when something in it failed. Click a feature to open or close it.</p>
      </div>
      <div class="sec-actions">
        <button class="sec-btn" onclick="ftAll(true)">Open all</button>
        <button class="sec-btn" onclick="ftAll(false)">Close all</button>
      </div>
    </div>
    <div class="fcs" id="feat-table"></div>
  </div>
  <div class="type-cards" id="type-summary-section" style="display:none"></div>
</div>

<!-- Tests -->
<div class="panel" id="panel-tests">
  <div class="tests-panel">
    <div class="filter-sidebar open" id="filter-sidebar">
      <div class="fsec">
        <div class="fsec-ttl">Status</div>
        <div class="fsec-list">
          <button class="fbtn active" data-f="all">All</button>
          <button class="fbtn" data-f="passed">Passed</button>
          <button class="fbtn" data-f="failed">Failed</button>
          <button class="fbtn" data-f="flaky">Flaky</button>
          <button class="fbtn" data-f="skipped">Skipped</button>
        </div>
      </div>
      <div class="fsec">
        <div class="fsec-ttl">Type &amp; Module</div>
        <div id="type-module-tree"></div>
      </div>
      <div class="fsec">
        <div class="fsec-ttl">Tags</div>
        <div class="fsec-list" id="tag-fbar"></div>
      </div>
    </div>
    <div class="tlist-col">
      <div class="fbar">
        <button class="filter-toggle-btn" id="filter-toggle-btn" onclick="toggleFilterSidebar()" title="Show/hide filters">&#9776; Filters</button>
        <input class="srch" id="srch" type="text" placeholder="Search tests…">
      </div>
      <div class="active-chips" id="active-chips"></div>
      <div class="tlist" id="tlist"></div>
    </div>
    <div class="dsb" id="dsb"></div>
  </div>
</div>

<!-- Errors -->
<div class="panel" id="panel-errors">
  <div class="epanel" id="epanel"></div>
</div>

<!-- Lightbox -->
<div class="lb" id="lb">
  <div class="lb-inner">
    <button class="lb-cls" id="lb-cls">&#x2715;</button>
    <img id="lb-img" src="" alt="">
  </div>
</div>

<script>
var S = ${INJECT};
var TESTS = ${TESTS_JSON};
var EG    = ${ERRORS_JSON};

// Theme
var darkMode = localStorage.getItem('qa-theme') === 'dark';
function applyTheme() {
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  document.getElementById('theme-btn').textContent = darkMode ? '☀️' : '🌙';
  localStorage.setItem('qa-theme', darkMode ? 'dark' : 'light');
  renderDonut(); // re-render with correct CSS var colours
}
applyTheme();
document.getElementById('theme-btn').addEventListener('click', function() { darkMode = !darkMode; applyTheme(); });

// Tabs
document.querySelectorAll('.tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});
function toggleFilterSidebar() {
  var sb = document.getElementById('filter-sidebar');
  var btn = document.getElementById('filter-toggle-btn');
  var open = sb.classList.toggle('open');
  btn.classList.toggle('active', open);
  localStorage.setItem('qa-filters-open', open ? '1' : '0');
}

function switchToTests(filter) {
  document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelector('[data-tab="tests"]').classList.add('active');
  document.getElementById('panel-tests').classList.add('active');
  if (filter) setStatusFilter(filter);
}

// Format
function fmtMs(ms) {
  if (ms >= 60000) return Math.floor(ms/60000) + 'm ' + Math.round((ms%60000)/1000) + 's';
  if (ms >= 1000)  return (ms/1000).toFixed(1) + 's';
  return ms + 'ms';
}
function xesc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Status icon SVG — colours come from the theme variables
function sIcon(st) {
  var m = {passed:['--pass','M5 8.2l2 2 4-4'], failed:['--fail','M5.5 5.5l5 5M10.5 5.5l-5 5'],
           flaky:['--flaky','M8 5v4M8 11v.5'], skipped:['--skip','M5.5 8h5']};
  var d = m[st] || m.skipped;
  return '<svg class="ti-ic" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" style="fill:var(--s3);stroke:var(' + d[0] + ')" stroke-width="1.3"/>' +
         '<path d="' + d[1] + '" style="stroke:var(' + d[0] + ')" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// ── Summary ───────────────────────────────────────────────────────────────
function renderSummary() {
  ['p','f','k','s'].forEach(function(k) { var v = {p:S.passed, f:S.failed, k:S.flaky, s:S.skipped}[k]; document.getElementById('hn-' + k).parentNode.classList.toggle('zero', v === 0); });
  document.getElementById('hn-p').textContent = S.passed;
  document.getElementById('hn-f').textContent = S.failed;
  document.getElementById('hn-k').textContent = S.flaky;
  document.getElementById('hn-s').textContent = S.skipped;

  var dt = new Date(S.startISO);
  renderHeader(dt);

  document.getElementById('b-sum').textContent   = S.total;
  document.getElementById('b-tests').textContent = TESTS.length;
  document.getElementById('b-err').textContent   = EG.length;

  renderDonut();
  renderRun(dt);
}

function renderHeader(dt) {
  var cls = S.failed > 0 ? 'bad' : (S.flaky > 0 ? 'warnx' : 'good');
  var label = S.failed > 0 ? (S.failed + ' failed') : (S.flaky > 0 ? 'Passed with flaky tests' : 'All passed');
  var nw = testsWithWarnings();
  document.getElementById('hdr').className = 'hdr ' + cls;
  document.getElementById('hdr-status').textContent = label + (nw ? '  ·  ' + nw + ' with warnings' : '');
  var ic = function(p) { return '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; };
  var cal = ic('<rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/>');
  var clock = ic('<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.2 1.4"/>');
  var chips = '<span class="mchip">' + cal + xesc(dt.toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short', hourCycle:'h23'})) + '</span>' +
              '<span class="mchip">' + clock + 'Duration <b>' + xesc(fmtMs(S.totalMs)) + '</b></span>';
  chips += '<span class="mchip muted">latest run only</span>';
  document.getElementById('hdr-meta').innerHTML = chips;
}

function pctOf(n) { return S.total ? Math.round(n / S.total * 100) : 0; }

function renderRun(dt) {
  var tot = S.total || 1;
  document.getElementById('run-sub').textContent = S.total + ' tests  ·  ' + fmtMs(S.totalMs);
  document.getElementById('run-bar').innerHTML =
    '<i style="width:' + (S.passed / tot * 100) + '%;background:var(--pass)"></i>' +
    '<i style="width:' + (S.failed / tot * 100) + '%;background:var(--fail)"></i>' +
    '<i style="width:' + (S.flaky / tot * 100) + '%;background:var(--flaky)"></i>' +
    '<i style="width:' + (S.skipped / tot * 100) + '%;background:var(--skip)"></i>';
  var avg = S.total ? Math.round(S.totalMs / S.total) : 0;
  var cards = [
    {cls:'ct', n:S.total, lbl:'Total', sub:'tests in this run'},
    {cls:'cp clickable', n:S.passed, lbl:'Passed', sub:pctOf(S.passed) + '% of tests', f:'passed'},
    {cls:'cf clickable', n:S.failed, lbl:'Failed', sub:pctOf(S.failed) + '% of tests', f:'failed'},
    {cls:'cfk clickable', n:S.flaky, lbl:'Flaky', sub:'passed after a retry', f:'flaky'},
    {cls:'csk clickable', n:S.skipped, lbl:'Skipped', sub:pctOf(S.skipped) + '% of tests', f:'skipped'},
    {cls:'cd', n:fmtMs(S.totalMs), lbl:'Duration', sub:'about ' + fmtMs(avg) + ' per test'},
  ];
  var sg = '';
  cards.forEach(function(c) {
    sg += '<div class="sc ' + c.cls + (c.n === 0 ? ' zero' : '') + '"' + (c.f ? ' data-filter="' + c.f + '" onclick="switchToTests(this.dataset.filter)"' : '') + '>' +
          '<div class="sc-n">' + xesc(String(c.n)) + '</div><div class="sc-l">' + xesc(c.lbl) + '</div><div class="sc-s">' + xesc(c.sub) + '</div></div>';
  });
  document.getElementById('stat-grid').innerHTML = sg;
  var feats = buildMods().filter(function(m) { return !isSetup(m.module); }).map(function(m) { return featureName(m.module); });
  var rows = [
    ['Date', dt.toLocaleDateString(undefined, {weekday:'short', year:'numeric', month:'short', day:'numeric'})],
    ['Started', dt.toLocaleTimeString(undefined, {hourCycle:'h23'})],
    ['Ran', feats.length ? feats.join(', ') : '-'],
    ['With warnings', testsWithWarnings() + ' test(s)'],
  ];
  var ri = '';
  rows.forEach(function(r) { ri += '<div class="ri"><span>' + xesc(r[0]) + '</span><b>' + xesc(r[1]) + '</b></div>'; });
  document.getElementById('run-info').innerHTML = ri;
}

function testsWithWarnings() { return TESTS.filter(function(t) { return allWarnings(t).length > 0; }).length; }

function renderDonut() {
  var R = 82, SZ = 220, C = 2 * Math.PI * R, cx = 110, cy = 110;
  var segs = [
    {v: S.passed,  col: 'var(--pass)', lbl: 'Passed'},
    {v: S.failed,  col: 'var(--fail)', lbl: 'Failed'},
    {v: S.flaky,   col: 'var(--flaky)', lbl: 'Flaky'},
    {v: S.skipped, col: 'var(--skip)', lbl: 'Skipped'},
  ].filter(function(s) { return s.v > 0; });

  var total2 = S.total || 1;
  var offset = 0;
  var arcs = '<circle cx="110" cy="110" r="82" fill="none" stroke="var(--b1)" stroke-width="18"/>';
  for (var i = 0; i < segs.length; i++) {
    var pct = segs[i].v / total2;
    var dash = (pct * C).toFixed(2);
    var gap  = (C - pct * C).toFixed(2);
    var off  = (-offset * C).toFixed(2);
    arcs += '<circle cx="110" cy="110" r="82" fill="none" stroke="' + segs[i].col +
            '" stroke-width="18" stroke-dasharray="' + dash + ' ' + gap +
            '" stroke-dashoffset="' + off + '" transform="rotate(-90 110 110)"/>';
    offset += pct;
  }
  document.getElementById('donut-svg').innerHTML = arcs;
  document.getElementById('d-pct').textContent = S.rate + '%';

  var rowsDef = [['Passed', S.passed, 'var(--pass)'], ['Failed', S.failed, 'var(--fail)'], ['Flaky', S.flaky, 'var(--flaky)'], ['Skipped', S.skipped, 'var(--skip)']];
  var leg = '';
  rowsDef.forEach(function(r) {
    leg += '<div class="lg-row' + (r[1] ? '' : ' zero') + '"><span class="lg-dot" style="background:' + r[2] + '"></span><span>' + r[0] + '</span>' +
           '<span class="lg-n">' + r[1] + '</span><span class="lg-p">' + pctOf(r[1]) + '%</span></div>';
  });
  var nw = testsWithWarnings();
  if (nw) leg += '<div class="leg-warn">&#9888; ' + nw + ' passed with a warning</div>';
  document.getElementById('d-legend').innerHTML = leg;
}

function renderTypeSummary() {
  var ts = S.typeStats;
  var container = document.getElementById('type-summary-section');
  if (!ts || !container) return;
  var types = [
    {key:'functional', label:'Functional', color:'var(--type-func-tx)', bg:'var(--type-func-bg)', bd:'var(--type-func-bd)'},
    {key:'e2e',        label:'E2E',        color:'var(--type-e2e-tx)',  bg:'var(--type-e2e-bg)',  bd:'var(--type-e2e-bd)'},
    {key:'api',        label:'API',        color:'var(--type-api-tx)',  bg:'var(--type-api-bg)',  bd:'var(--type-api-bd)'},
  ];
  var html = '';
  for (var i = 0; i < types.length; i++) {
    var tp = types[i];
    var d = ts[tp.key];
    if (!d || !d.total) continue;
    var r2 = d.total ? Math.round(d.passed / d.total * 100) : 0;
    var detail = '<span style="color:var(--pass)">' + d.passed + ' passed</span>';
    if (d.failed)  detail += '<span style="color:var(--fail)">'  + d.failed  + ' failed</span>';
    if (d.flaky)   detail += '<span style="color:var(--flaky)">' + d.flaky   + ' flaky</span>';
    if (d.skipped) detail += '<span style="color:var(--skip)">'  + d.skipped + ' skipped</span>';
    detail += '<span style="color:var(--tx3)">' + d.total + ' total</span>';
    html += '<div class="type-card" style="border-color:' + tp.bd + ';background:' + tp.bg + '" ' +
      'data-t="' + tp.key + '" onclick="switchToTestsByType(this.dataset.t)" title="Click to filter test list">' +
      '<div class="type-card-title" style="color:' + tp.color + '">' + tp.label + '</div>' +
      '<div class="type-card-rate" style="color:' + tp.color + '">' + r2 + '%</div>' +
      '<div class="type-card-detail">' + detail + '</div>' +
      '<div class="type-card-bar"><div class="type-card-bar-fill" style="width:' + r2 + '%;background:' + tp.color + '"></div></div>' +
      '</div>';
  }
  container.innerHTML = html;
}

function switchToTestsByType(type) {
  document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelector('[data-tab="tests"]').classList.add('active');
  document.getElementById('panel-tests').classList.add('active');
  setTypeFilter(type);
}

// ── Results by feature ───────────────────────────────────────────────────
function prettyName(s) {
  return String(s || '').replace('.spec.ts', '').replace('.setup.ts', ' setup').replace(/[-_]+/g, ' ').split(' ').map(function(w) {
    return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }).join(' ');
}
function isSetup(mod) { return String(mod).indexOf('.setup.') >= 0; }
function featureName(mod) {
  if (isSetup(mod)) return 'Setup (sign-in)';
  return (S.featureNames && S.featureNames[mod]) || prettyName(mod);
}
function allWarnings(t) {
  var out = [];
  (t.attempts || []).forEach(function(a) { (a.warnings || []).forEach(function(w) { out.push(w); }); });
  return out;
}
function scopeText() {
  var order = [], n = {};
  TESTS.forEach(function(t) { if (isSetup(t.module)) return; if (!(t.module in n)) { n[t.module] = 0; order.push(t.module); } n[t.module]++; });
  var parts = order.map(function(m) { return featureName(m) + ' (' + n[m] + ')'; });
  return (order.length === 1 ? 'Ran only: ' : 'Ran: ') + parts.join(' · ') + '  ·  latest run only';
}
function buildGroups() {
  var map = {}, order = [];
  TESTS.forEach(function(t) {
    var key = t.type + '::' + t.module + '::' + t.file;
    var g = map[key];
    if (!g) {
      g = map[key] = {type:t.type, module:t.module, file:t.file, suite:t.suite || '', total:0, passed:0, failed:0, flaky:0, skipped:0, warn:0, ms:0, notes:[]};
      order.push(g);
    }
    g.total++;
    if (t.status in g) g[t.status]++;
    g.ms += t.duration || 0;
    var w = allWarnings(t);
    if (w.length) { g.warn++; w.forEach(function(x) { if (g.notes.indexOf(x) < 0) g.notes.push(x); }); }
  });
  return order;
}
function buildMods() {
  var groups = buildGroups(), mods = [], byMod = {};
  groups.forEach(function(g) {
    var k = g.type + '::' + g.module;
    if (!byMod[k]) { byMod[k] = {key:k, type:g.type, module:g.module, groups:[], tot:{total:0, passed:0, failed:0, flaky:0, skipped:0, warn:0, ms:0, notes:[]}}; mods.push(byMod[k]); }
    var m = byMod[k];
    m.groups.push(g);
    ['total', 'passed', 'failed', 'flaky', 'skipped', 'warn', 'ms'].forEach(function(f) { m.tot[f] += g[f]; });
    g.notes.forEach(function(x) { if (m.tot.notes.indexOf(x) < 0) m.tot.notes.push(x); });
  });
  mods.sort(function(a, b) { return (isSetup(a.module) ? 1 : 0) - (isSetup(b.module) ? 1 : 0); });
  return mods;
}
function ftNums(c) {
  var parts = ['<b>' + c.total + '</b> tests'];
  if (c.passed) parts.push(c.passed + ' passed');
  if (c.failed) parts.push('<span class="f">' + c.failed + ' failed</span>');
  if (c.flaky) parts.push(c.flaky + ' flaky');
  if (c.skipped) parts.push(c.skipped + ' skipped');
  if (c.warn) parts.push('<span class="wn" title="' + xesc(c.notes.slice(0, 6).join(' | ').slice(0, 700)) + '">&#9888; ' + c.warn + '</span>');
  parts.push(fmtMs(c.ms));
  return parts.join('<span class="sep">|</span>');
}
function ftBar(c) {
  var tot = c.total || 1;
  return '<div class="sbar"><i style="width:' + (c.passed / tot * 100) + '%;background:var(--pass)"></i>' +
         '<i style="width:' + (c.failed / tot * 100) + '%;background:var(--fail)"></i>' +
         '<i style="width:' + (c.flaky / tot * 100) + '%;background:var(--flaky)"></i>' +
         '<i style="width:' + (c.skipped / tot * 100) + '%;background:var(--skip)"></i></div>';
}
function ftPill(c) {
  if (c.failed) return '<span class="pill bad">' + c.failed + ' failed</span>';
  if (c.flaky) return '<span class="pill warn">' + c.flaky + ' flaky</span>';
  if (c.warn) return '<span class="pill warn">Passed &middot; &#9888; ' + c.warn + '</span>';
  return '<span class="pill good">All passed</span>';
}
// Icon button that opens the tests of a feature / group (arrow leaving a list)
var VT = '<a class="vt" data-go="1" role="button" title="View tests" aria-label="View tests">' +
         '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
         '<path d="M3 4h5M3 8h3M3 12h5"/><path d="M9.5 9.5L13 6M10 6h3v3"/></svg></a>';
var ftOpen = {};
function ftIsOpen(m) { return (m.key in ftOpen) ? ftOpen[m.key] : m.tot.failed > 0; }
function ftAll(open) { buildMods().forEach(function(m) { ftOpen[m.key] = open; }); renderFeatureTable(); }
function renderFeatureTable() {
  var el = document.getElementById('feat-table');
  if (!el) return;
  var h = '';
  buildMods().forEach(function(m) {
    var setup = isSetup(m.module);
    var open = ftIsOpen(m);
    var cls = m.tot.failed ? 'bad' : (m.tot.warn ? 'warnx' : 'good');
    h += '<div class="fc ' + cls + (setup ? ' setup' : '') + '" data-k="' + xesc(m.key) + '">' +
         '<div class="fc-head" data-k="' + xesc(m.key) + '" data-t="' + m.type + '" data-m="' + xesc(m.module) + '">' +
         '<span class="chev">' + (open ? '&#9662;' : '&#9656;') + '</span>' +
         '<div class="fc-name">' + xesc(featureName(m.module)) + (setup ? '' : '<span class="type-tag ' + m.type + '">' + xesc(m.type) + '</span>') + '</div>' +
         ftPill(m.tot) + '<div class="fc-nums">' + ftNums(m.tot) + '</div>' +
         '<div class="fc-bar">' + ftBar(m.tot) + '</div>' +
         '<div class="fc-link">' + VT + '</div></div>';
    if (open) {
      h += '<div class="fc-body">';
      m.groups.forEach(function(g) {
        h += '<div class="gr' + (g.failed ? ' bad' : '') + '" data-t="' + g.type + '" data-m="' + xesc(g.module) + '" data-f="' + xesc(g.file) + '">' +
             '<span class="chev"></span><div class="g-name">' + xesc(prettyName(g.file)) + (g.suite ? '<span class="gsub" title="' + xesc(g.suite) + '">' + xesc(g.suite) + '</span>' : '') + '</div>' +
             ftPill(g) + '<div class="fc-nums">' + ftNums(g) + '</div><div class="fc-bar">' + ftBar(g) + '</div>' +
             '<div class="fc-link">' + VT + '</div></div>';
      });
      h += '</div>';
    }
    h += '</div>';
  });
  el.innerHTML = h;
  el.onclick = function(e) {
    var node = e.target.closest ? e.target.closest('.gr, .fc-head') : null;
    if (!node) return;
    var isGo = e.target.closest ? e.target.closest('[data-go]') : null;
    if (node.classList.contains('fc-head') && !isGo) {
      var k = node.getAttribute('data-k');
      var m = buildMods().filter(function(x) { return x.key === k; })[0];
      if (m) { ftOpen[k] = !ftIsOpen(m); renderFeatureTable(); }
      return;
    }
    gotoGroup(node.getAttribute('data-t'), node.getAttribute('data-m'), node.getAttribute('data-f') || 'all');
  };
}
function gotoGroup(type, module, file) {
  document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelector('[data-tab="tests"]').classList.add('active');
  document.getElementById('panel-tests').classList.add('active');
  setStatusFilter('all');
  curType = type; curModule = module; curFile = file;
  expandedTypes[type] = true;
  expandedModules[type + '::' + module] = true;
  renderTypeModuleTree();
  renderTagFilters();
  renderList();
}

// ── Tests list ──────────────────────────────────────────────────────────
var curFilter = 'all';
var curType   = 'all';
var curModule = 'all';
var curFile   = 'all';
var curTag    = 'all';
var curSearch = '';
// Which Type nodes are expanded — independent per node (expanding
// Functional doesn't collapse E2E), starts all-collapsed per the design:
// the whole point of the tree is a compact default.
var expandedTypes = { functional: false, e2e: false, api: false };
// Which Module nodes are expanded, keyed by "type::module" — only modules
// that are an actual subfolder spanning more than one spec file get this
// third level at all (see renderTypeModuleTree); a module backed by a
// single flat file has nothing further to drill into, so it's a leaf like
// before.
var expandedModules = {};

// Sidebar Type & Module tree — 3 levels: Type -> Module (subfolder) -> File
// (spec file), replacing what used to be two separate flat button groups
// (Type, Module). Every row's single click both sets the filter AND
// toggles its own children open — re-clicking an already-active,
// already-expanded row only collapses it (doesn't touch the filter), so
// toggling visibility never surprises you by silently changing what's
// filtered. A Type with zero tests still renders (dimmed, not clickable)
// rather than disappearing, so it's clear the category exists even before
// any test lands in it (e.g. API today).
function renderTypeModuleTree() {
  var container = document.getElementById('type-module-tree');
  if (!container) return;
  var typeDefs = [
    { key: 'functional', label: 'Functional' },
    { key: 'e2e',        label: 'E2E' },
    { key: 'api',        label: 'API' },
  ];
  var html = '';
  for (var i = 0; i < typeDefs.length; i++) {
    var type  = typeDefs[i].key;
    var label = typeDefs[i].label;
    var testsOfType = TESTS.filter(function(t) { return (t.type||'functional') === type; });
    var total = testsOfType.length;
    var empty = total === 0;
    var isActiveWholeType = (curType === type && curModule === 'all');
    var typeExpanded = !!expandedTypes[type];

    // Group this type's tests by module.
    var moduleTests = {};
    for (var j = 0; j < testsOfType.length; j++) {
      var m = testsOfType[j].module || '';
      if (!moduleTests[m]) moduleTests[m] = [];
      moduleTests[m].push(testsOfType[j]);
    }
    var moduleNames = Object.keys(moduleTests).sort(function(a, b) { return moduleTests[b].length - moduleTests[a].length; });

    html += '<div class="tree-node' + (empty ? ' tree-empty' : '') + '">' +
      '<div class="tree-parent' + (isActiveWholeType ? ' active' : '') + '"' +
        (empty ? '' : ' data-tree-type="' + type + '"') +
        ' title="' + xesc(label) + ' (' + total + ')">' +
        (empty
          ? '<span class="tree-chevron tree-chevron-none">&#9654;</span>'
          : '<span class="tree-chevron">' + (typeExpanded ? '&#9660;' : '&#9654;') + '</span>') +
        '<span class="tree-label">' + xesc(label) + '</span>' +
        '<span class="tree-count">' + total + '</span>' +
      '</div>';

    if (!empty && typeExpanded && moduleNames.length) {
      html += '<div class="tree-children">';
      for (var k = 0; k < moduleNames.length; k++) {
        var m2 = moduleNames[k];
        var testsInModule = moduleTests[m2];
        var filesInModule = uniqueSorted(testsInModule.map(function(t) { return t.file; }));

        if (filesInModule.length <= 1) {
          // Flat module (module === its one file) — leaf, same as before.
          var isActiveLeaf = (curType === type && curModule === m2);
          html += '<div class="tree-child' + (isActiveLeaf ? ' active' : '') + '" ' +
            'data-tree-type="' + type + '" data-tree-module="' + xesc(m2) + '" ' +
            'title="' + xesc(m2) + ' (' + testsInModule.length + ')">' +
            '<span class="tree-label">' + xesc(m2) + '</span>' +
            '<span class="tree-count">' + testsInModule.length + '</span>' +
          '</div>';
          continue;
        }

        // Real subfolder spanning multiple spec files — gets its own
        // expandable third level, one row per file.
        var moduleKey = type + '::' + m2;
        var isActiveWholeModule = (curType === type && curModule === m2 && curFile === 'all');
        var moduleExpanded = !!expandedModules[moduleKey];

        html += '<div class="tree-node">' +
          '<div class="tree-child tree-child-parent' + (isActiveWholeModule ? ' active' : '') + '" ' +
            'data-tree-type="' + type + '" data-tree-module2="' + xesc(m2) + '" ' +
            'title="' + xesc(m2) + ' (' + testsInModule.length + ')">' +
            '<span class="tree-chevron">' + (moduleExpanded ? '&#9660;' : '&#9654;') + '</span>' +
            '<span class="tree-label">' + xesc(m2) + '</span>' +
            '<span class="tree-count">' + testsInModule.length + '</span>' +
          '</div>';

        if (moduleExpanded) {
          var fileCounts = {};
          for (var f = 0; f < testsInModule.length; f++) {
            fileCounts[testsInModule[f].file] = (fileCounts[testsInModule[f].file]||0) + 1;
          }
          var fileNames = Object.keys(fileCounts).sort(function(a, b) { return fileCounts[b] - fileCounts[a]; });
          html += '<div class="tree-grandchildren">';
          for (var fi = 0; fi < fileNames.length; fi++) {
            var fname = fileNames[fi];
            var isActiveFile = (curType === type && curModule === m2 && curFile === fname);
            html += '<div class="tree-grandchild' + (isActiveFile ? ' active' : '') + '" ' +
              'data-tree-type="' + type + '" data-tree-module3="' + xesc(m2) + '" data-tree-file="' + xesc(fname) + '" ' +
              'title="' + xesc(fname) + ' (' + fileCounts[fname] + ')">' +
              '<span class="tree-label">' + xesc(fname) + '</span>' +
              '<span class="tree-count">' + fileCounts[fname] + '</span>' +
            '</div>';
          }
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  container.innerHTML = html;

  container.querySelectorAll('.tree-parent[data-tree-type]').forEach(function(el) {
    el.addEventListener('click', function() { onTypeNodeClick(el.dataset.treeType); });
  });
  container.querySelectorAll('.tree-child[data-tree-module]').forEach(function(el) {
    el.addEventListener('click', function() { onModuleNodeClick(el.dataset.treeType, el.dataset.treeModule); });
  });
  container.querySelectorAll('.tree-child-parent[data-tree-module2]').forEach(function(el) {
    el.addEventListener('click', function() { onModuleParentClick(el.dataset.treeType, el.dataset.treeModule2); });
  });
  container.querySelectorAll('.tree-grandchild[data-tree-file]').forEach(function(el) {
    el.addEventListener('click', function() { onFileNodeClick(el.dataset.treeType, el.dataset.treeModule3, el.dataset.treeFile); });
  });
}

function onTypeNodeClick(type) {
  var alreadyWholeType = (curType === type && curModule === 'all');
  if (alreadyWholeType) {
    // Repeat click on the already-active whole-type view — just fold the
    // children back up, leave the filter exactly as it is.
    expandedTypes[type] = !expandedTypes[type];
  } else {
    curType = type;
    curModule = 'all';
    curFile = 'all';
    expandedTypes[type] = true;
  }
  renderTypeModuleTree();
  renderTagFilters();
  renderList();
}

// Flat-module leaf click (module === its one file) — unchanged behavior.
function onModuleNodeClick(type, module) {
  curType = type;
  curModule = module;
  curFile = 'all';
  expandedTypes[type] = true;
  renderTypeModuleTree();
  renderTagFilters();
  renderList();
}

// Click on a real subfolder's own row (the one with a chevron, spanning
// multiple files) — same "click toggles expand+filter, repeat-click on an
// already-active whole-module view just collapses" pattern as the Type
// level, one level down.
function onModuleParentClick(type, module) {
  var moduleKey = type + '::' + module;
  var alreadyWholeModule = (curType === type && curModule === module && curFile === 'all');
  if (alreadyWholeModule) {
    expandedModules[moduleKey] = !expandedModules[moduleKey];
  } else {
    curType = type;
    curModule = module;
    curFile = 'all';
    expandedTypes[type] = true;
    expandedModules[moduleKey] = true;
  }
  renderTypeModuleTree();
  renderTagFilters();
  renderList();
}

function onFileNodeClick(type, module, file) {
  curType = type;
  curModule = module;
  curFile = file;
  expandedTypes[type] = true;
  expandedModules[type + '::' + module] = true;
  renderTypeModuleTree();
  renderTagFilters();
  renderList();
}

function uniqueSorted(values) {
  var seen = {}, out = [];
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    if (v && !seen[v]) { seen[v] = true; out.push(v); }
  }
  return out.sort();
}

// Scoped to the current Type filter — e2e/functional/api modules don't mix
// (a functional-only module button staying selected while Type=E2E used to
// silently zero out the list even though the E2E count badge still showed
// its total). Sorted by count descending so the modules with the most
// tests are easiest to find first, especially now that functional alone
// spans several subfolders.
function modulesForCurrentType() {
  return curType === 'all' ? TESTS : TESTS.filter(function(t) { return (t.type||'functional') === curType; });
}

// Used by the "Module: X" active-filter chip's clear button — drops back
// to the whole-type view (the tree's parent-row selection) rather than
// clearing Type too, since only the Module half of the filter was removed.
function setModuleFilterValue(val) {
  curModule = val;
  curFile = 'all';
  renderTypeModuleTree();
  renderList();
}

// Used by the "File: X" active-filter chip's clear button — drops back to
// the whole-module view, same idea as setModuleFilterValue one level down.
function setFileFilterValue(val) {
  curFile = val;
  renderTypeModuleTree();
  renderList();
}

// Scoped to the current Type filter, same reasoning as the Type & Module tree.
function renderTagFilters() {
  var bar = document.getElementById('tag-fbar');
  if (!bar) return;
  var scoped = modulesForCurrentType();
  var counts = {};
  for (var i = 0; i < scoped.length; i++) {
    var tgs = scoped[i].tags || [];
    for (var j = 0; j < tgs.length; j++) counts[tgs[j]] = (counts[tgs[j]]||0) + 1;
  }
  var tags = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
  if (!tags.length) { bar.innerHTML = ''; return; }
  var html = '<button class="filter-btn active" data-tg="all" onclick="setTagFilter(this)">All Tags</button>';
  for (var i = 0; i < tags.length; i++) {
    var tg = tags[i];
    html += '<button class="filter-btn" data-tg="' + xesc(tg) + '" onclick="setTagFilter(this)" title="@' + xesc(tg) + ' (' + counts[tg] + ')">' +
      '@' + xesc(tg) + ' (' + counts[tg] + ')</button>';
  }
  bar.innerHTML = html;
}

function setTagFilter(btn) { setTagFilterValue(btn.dataset.tg); }
function setTagFilterValue(val) {
  curTag = val;
  document.querySelectorAll('#tag-fbar .filter-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tg === val);
  });
  renderList();
}

function renderList() {
  var list = document.getElementById('tlist');
  var srch = curSearch.toLowerCase();
  var filtered = [];
  for (var i = 0; i < TESTS.length; i++) {
    var t = TESTS[i];
    if (curFilter !== 'all' && t.status !== curFilter) continue;
    if (curType   !== 'all' && (t.type||'functional') !== curType) continue;
    if (curModule !== 'all' && (t.module||'') !== curModule) continue;
    if (curFile   !== 'all' && (t.file||'') !== curFile) continue;
    if (curTag    !== 'all' && (t.tags||[]).indexOf(curTag) < 0) continue;
    if (srch && t.title.toLowerCase().indexOf(srch) < 0) continue;
    filtered.push(t);
  }

  // Divider header per group — mirrors whichever level of the sidebar tree
  // is still "mixed" in the current view: grouped by Module when browsing
  // across modules (Module = All), or by File once narrowed to one Module
  // but still seeing every file in it (a module spanning several spec
  // files, e.g. "juristic-general-info" containing business-info.spec.ts,
  // directors-shareholders.spec.ts, ...). Once File is also pinned there's
  // only one group left, so no header is shown. TESTS is already
  // contiguous per module/file (extractSuite finishes one spec file before
  // starting the next), so a plain "insert a header whenever the group key
  // changes" pass is enough — no separate grouping/sorting pass needed.
  var groupField = curModule === 'all' ? 'module' : (curFile === 'all' ? 'file' : null);
  var groupCounts = {};
  if (groupField) {
    for (var i = 0; i < filtered.length; i++) {
      var gk = filtered[i][groupField] || '';
      groupCounts[gk] = (groupCounts[gk]||0) + 1;
    }
  }

  var html = '';
  var lastGroup = null;
  for (var i = 0; i < filtered.length; i++) {
    var t = filtered[i];
    if (groupField && t[groupField] !== lastGroup) {
      lastGroup = t[groupField];
      var gLabel = t[groupField] || '(none)';
      html += '<div class="grp-hdr"><span class="grp-hdr-name" title="' + xesc(gLabel) + '">' +
        xesc(gLabel) + '</span>' +
        '<span class="grp-hdr-cnt">' + groupCounts[t[groupField]||''] + ' test' + (groupCounts[t[groupField]||''] > 1 ? 's' : '') + '</span></div>';
    }
    var stMap = {passed:'tp', failed:'tf', flaky:'tk', skipped:'ts'};
    var stCls = stMap[t.status] || 'ts';
    var tp = t.type || 'functional';
    var tagBadges = (t.tags||[]).map(function(tg) {
      return '<span class="tag-badge tag-' + xesc(tg) + '" title="@' + xesc(tg) + '">@' + xesc(tg) + '</span>';
    }).join('');
    html += '<div class="ti ' + stCls + '" data-id="' + t.id + '" onclick="showDetail(' + t.id + ')">' +
      sIcon(t.status) +
      (t.tc ? '<span class="tc-tag">' + xesc(t.tc) + '</span>' : '') +
      '<div class="ti-body">' +
        '<div class="ti-title" title="' + xesc(t.title) + '">' + xesc(t.label) + '</div>' +
        '<div class="ti-meta">' +
          '<span class="ti-file" title="' + xesc(t.file) + '">' + xesc(t.file) + '</span>' +
          '<span class="type-tag ' + tp + '">' + tp + '</span>' +
          (t.module ? '<span class="module-tag" title="' + xesc(t.module) + '">' + xesc(t.module) + '</span>' : '') +
          tagBadges +
          (lastAttemptWarnings(t) ? '<span class="warn-tag" title="Has a warning — see the details">&#9888; ' + lastAttemptWarnings(t) + '</span>' : '') +
          '<span class="ti-dur">' + fmtMs(t.duration) + '</span>' +
          (t.retries > 0 ? '<span class="retry-tag">↺ ' + t.retries + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<span class="spill ' + t.status + '">' + t.status + '</span>' +
    '</div>';
  }
  if (!html) {
    var parts = [];
    if (curFilter !== 'all') parts.push('status "' + curFilter + '"');
    if (curType   !== 'all') parts.push('type "' + curType + '"');
    if (curModule !== 'all') parts.push('module "' + curModule + '"');
    if (curFile   !== 'all') parts.push('file "' + curFile + '"');
    if (curTag    !== 'all') parts.push('tag "@' + curTag + '"');
    if (curSearch)           parts.push('search "' + curSearch + '"');
    var reason = parts.length ? ' matching ' + parts.join(' + ') : '';
    html = '<div style="text-align:center;padding:40px;color:var(--tx3)">' +
      '<p>No tests' + xesc(reason) + '.</p>' +
      (parts.length ? '<button class="clear-all-btn" style="margin-top:14px" onclick="clearAllFilters()">Clear all filters</button>' : '') +
      '</div>';
  }
  list.innerHTML = html;
  renderActiveChips();
}

// Summarizes every active filter as a removable chip so it's obvious *why*
// the list looks the way it does (e.g. a leftover Module selection from
// before switching Type) instead of a silent empty/short list with no
// visible cause.
function renderActiveChips() {
  var el = document.getElementById('active-chips');
  if (!el) return;
  var chips = [];
  if (curFilter !== 'all') chips.push({ label: 'Status: ' + curFilter, clear: function() { setStatusFilter('all'); } });
  if (curType   !== 'all') chips.push({ label: 'Type: ' + curType, clear: function() { setTypeFilter('all'); } });
  if (curModule !== 'all') chips.push({ label: 'Module: ' + curModule, clear: function() { setModuleFilterValue('all'); } });
  if (curFile   !== 'all') chips.push({ label: 'File: ' + curFile, clear: function() { setFileFilterValue('all'); } });
  if (curTag    !== 'all') chips.push({ label: 'Tag: @' + curTag, clear: function() { setTagFilterValue('all'); } });
  if (curSearch)           chips.push({ label: 'Search: "' + curSearch + '"', clear: function() {
    var s = document.getElementById('srch'); if (s) s.value = ''; curSearch = ''; renderList();
  } });
  if (!chips.length) { el.innerHTML = ''; return; }
  var html = '';
  for (var i = 0; i < chips.length; i++) {
    html += '<span class="chip">' + xesc(chips[i].label) + '<span class="chip-x" data-ci="' + i + '">&times;</span></span>';
  }
  html += '<button class="clear-all-btn" onclick="clearAllFilters()">Clear all</button>';
  el.innerHTML = html;
  var xs = el.querySelectorAll('.chip-x');
  xs.forEach(function(x) {
    x.addEventListener('click', function() { chips[Number(x.dataset.ci)].clear(); });
  });
}

function setStatusFilter(val) {
  curFilter = val;
  document.querySelectorAll('.fbtn').forEach(function(b) { b.classList.toggle('active', b.dataset.f === val); });
  renderList();
}
// Switching Type resets Module/Tag — the Tag list is re-generated scoped
// to the new type (see renderTagFilters), so a tag from the previous type
// would otherwise stay selected and silently zero out the list. Also
// expands that type's tree node, same as clicking it directly.
function setTypeFilter(val) {
  curType = val;
  curModule = 'all';
  curFile = 'all';
  curTag = 'all';
  if (val !== 'all') expandedTypes[val] = true;
  renderTypeModuleTree();
  renderTagFilters();
  renderList();
}
function clearAllFilters() {
  curFilter = 'all'; curType = 'all'; curModule = 'all'; curFile = 'all'; curTag = 'all'; curSearch = '';
  var s = document.getElementById('srch');
  if (s) s.value = '';
  document.querySelectorAll('.fbtn').forEach(function(b) { b.classList.toggle('active', b.dataset.f === 'all'); });
  expandedTypes = { functional: false, e2e: false, api: false };
  expandedModules = {};
  renderTypeModuleTree();
  renderTagFilters();
  renderList();
}

document.querySelectorAll('.fbtn').forEach(function(btn) {
  btn.addEventListener('click', function() { setStatusFilter(btn.dataset.f); });
});
document.getElementById('srch').addEventListener('input', function(e) {
  curSearch = e.target.value;
  renderList();
});

// ── Detail sidebar ───────────────────────────────────────────────────────
function showDetail(id) {
  var t = null;
  for (var i = 0; i < TESTS.length; i++) {
    if (TESTS[i].id === id) { t = TESTS[i]; break; }
  }
  if (!t) return;

  document.querySelectorAll('.ti').forEach(function(el) {
    el.classList.toggle('sel', el.dataset.id == id);
  });

  var sb = document.getElementById('dsb');
  sb.classList.add('open');

  var retries = t.attempts.length - 1;
  var head = '<div class="dh">' +
    '<button class="dcls" onclick="closeDetail()">&#x2715;</button>' +
    '<div class="dttl">' + xesc(t.label) + '</div>' +
    '<div class="dmeta">' +
      '<span class="spill ' + t.status + '">' + t.status + '</span>' +
      (t.tc ? '<span class="tc-tag">' + xesc(t.tc) + '</span>' : '') +
      '<span style="font-size:.72rem;color:var(--tx3)">' + xesc(t.file) + '</span>' +
      (retries > 0 ? '<span class="retry-tag">↺ ' + retries + ' retr' + (retries > 1 ? 'ies' : 'y') + '</span>' : '') +
    '</div></div>';

  var attTabs = '';
  var attBodies = '';
  if (t.attempts.length > 1) {
    attTabs = '<div class="att-tabs">';
    for (var i = 0; i < t.attempts.length; i++) {
      var a = t.attempts[i];
      var icon = a.status === 'passed' ? '✓' : (a.status === 'failed' || a.status === 'timedOut') ? '✗' : '⏭';
      attTabs += '<button class="att-tab' + (i===0?' active':'') + '" onclick="switchAttempt(' + id + ',' + i + ')">' +
                 icon + ' Attempt ' + (i+1) + '</button>';
    }
    attTabs += '</div>';
  }

  for (var j = 0; j < t.attempts.length; j++) {
    attBodies += '<div class="att-body' + (j===0?' active':'') + '" id="ab-' + id + '-' + j + '">' +
                 renderAttempt(t.attempts[j]) + '</div>';
  }

  sb.innerHTML = head + attTabs + '<div style="overflow:hidden">' + attBodies + '</div>';
}

function switchAttempt(testId, idx) {
  var bodies = document.querySelectorAll('[id^="ab-' + testId + '-"]');
  bodies.forEach(function(el, i) { el.classList.toggle('active', i === idx); });
  document.querySelectorAll('.att-tab').forEach(function(tab, i) { tab.classList.toggle('active', i === idx); });
}

function hookHasError(steps) {
  for (var i = 0; i < (steps||[]).length; i++) {
    if (steps[i].error) return true;
    if (hookHasError(steps[i].steps)) return true;
  }
  return false;
}

function renderHookSteps(steps) {
  if (!steps || !steps.length) return '';
  var html = '<div class="htree-children">';
  for (var i = 0; i < steps.length; i++) {
    var s = steps[i];
    html += '<div class="htree-item">' +
      '<span class="htree-cat">' + xesc(s.category || '') + '</span>' +
      xesc(s.title) +
      (s.duration ? '<span class="htree-dur">' + fmtMs(s.duration) + '</span>' : '') +
      (s.error ? '<div class="htree-err">' + xesc(s.error.message || '') + '</div>' : '') +
      renderHookSteps(s.steps) +
    '</div>';
  }
  html += '</div>';
  return html;
}

function renderHookGroups(hooks) {
  var html = '';
  for (var i = 0; i < (hooks||[]).length; i++) {
    var h = hooks[i];
    var hasErr = hookHasError([h]);
    html += '<div class="hookgrp' + (hasErr ? ' herr open' : '') + '">' +
      '<div class="hookgrp-hdr" onclick="toggleHookGroup(this)">' +
        '<span class="hookgrp-chevron">&#9654;</span>' +
        '<span class="hookgrp-ttl">' + xesc(h.title) + '</span>' +
        '<span class="hookgrp-dur">' + fmtMs(h.duration || 0) + '</span>' +
      '</div>' +
      '<div class="hookgrp-body">' + renderHookSteps(h.steps) + '</div>' +
    '</div>';
  }
  return html;
}

function toggleHookGroup(el) {
  el.closest('.hookgrp').classList.toggle('open');
}


// One readable line per expect: ✓/✗ + what was checked (+ source line when
// the expect had no message, since then the title omits the expected value).
function renderExpectLine(s, depth) {
  return '<div class="exp ' + (s.errMsg ? 'exp-fail' : 'exp-ok') + '" style="margin-left:' + (depth * 20 + 28) + 'px">' +
    '<span class="exp-mark">' + (s.errMsg ? '&#10007;' : '&#10003;') + '</span>' +
    '<span style="flex:1"><span class="exp-lbl">' + xesc(s.title) + '</span>' +
      (s.code ? '<span class="exp-code">' + xesc(s.code) + '</span>' : '') +
      (s.errMsg ? '<span class="exp-code">' + xesc(s.errMsg) + '</span>' : '') +
    '</span>' +
    '<span class="exp-where">' + xesc(s.where || '') + '</span>' +
  '</div>';
}

// Page-object waits/checks without a message are useful for debugging but
// noisy for a reader — fold them under a <details>, open when one failed.
function renderAuxExpects(list, depth) {
  if (!list.length) return '';
  var failed = false;
  for (var i = 0; i < list.length; i++) if (list[i].errMsg) failed = true;
  var html = '<details class="exp-aux" style="margin-left:' + (depth * 20 + 28) + 'px"' + (failed ? ' open' : '') + '>' +
    '<summary>Waits/checks inside the page object (' + list.length + ')</summary>';
  for (var j = 0; j < list.length; j++) html += renderExpectLine(list[j], 0);
  return html + '</details>';
}

// Recurses into nested test.step() calls (e.g. a field-by-field verifier's
// per-field steps nested under a parent "Verify ..." step), indenting each
// level so per-field expected/actual comparisons are visible without
// flattening them into their parent's title.
function renderStepList(steps, depth) {
  var html = '';
  var aux = [];
  for (var i = 0; i < (steps||[]).length; i++) {
    var s = steps[i];
    if (s.kind === 'expect') {
      if (s.aux) aux.push(s); else html += renderExpectLine(s, depth);
      continue;
    }
    var hasSrc = !!(s.snippet || s.sourceCode);
    var togBtn = hasSrc && !s.snippet
      ? '<button class="step-tog" onclick="toggleSrc(this)">&#9654; Source</button>'
      : '';
    var stepBody = '<div style="flex:1"><span class="st">' + xesc(s.title) + '</span>' +
      (s.errMsg ? '<div class="serr">' + xesc(s.errMsg) + '</div>' : '');
    if (s.snippet) {
      var snipLines = s.snippet.split('\\n');
      stepBody += '<div class="step-src code-block">';
      for (var si = 0; si < snipLines.length; si++) {
        var sl = snipLines[si];
        var isFail = /^\\s*>/.test(sl);
        var isPtr  = /^\\s*\\|/.test(sl) && !/\\d\\s*\\|/.test(sl);
        var scls   = isFail ? ' fail-line' : isPtr ? ' ptr-line' : '';
        stepBody += '<div class="code-line' + scls + '">' + xesc(sl) + '</div>';
      }
      stepBody += '</div>';
    } else if (s.sourceCode) {
      var srcLines = s.sourceCode.split('\\n');
      stepBody += '<div class="step-src code-block">';
      for (var si = 0; si < srcLines.length; si++) {
        stepBody += '<div class="code-line">' + xesc(srcLines[si]) + '</div>';
      }
      stepBody += '</div>';
    }
    stepBody += '</div>';
    var numLabel = depth === 0 ? String(i + 1) : '&bull;';
    html += '<div class="step ' + (s.errMsg ? 'sfail' : 'sok') + '"' +
      (depth ? ' style="margin-left:' + (depth * 20) + 'px"' : '') + '>' +
      '<span class="sn">' + numLabel + '</span>' +
      stepBody +
      (s.dur ? '<span class="sd">' + fmtMs(s.dur) + '</span>' : '') +
      togBtn +
    '</div>';
    if (s.steps && s.steps.length) {
      html += renderStepList(s.steps, depth + 1);
    }
  }
  html += renderAuxExpects(aux, depth);
  return html;
}

function renderStepListWithApi(steps, depth, stepApiMap) {
  var html = '';
  var aux = [];
  for (var i = 0; i < (steps||[]).length; i++) {
    var s = steps[i];
    if (s.kind === 'expect') {
      if (s.aux) aux.push(s); else html += renderExpectLine(s, depth);
      continue;
    }
    var hasSrc = !!(s.snippet || s.sourceCode);
    var togBtn = hasSrc && !s.snippet
      ? '<button class="step-tog" onclick="toggleSrc(this)">&#9654; Source</button>'
      : '';
    var stepBody = '<div style="flex:1"><span class="st">' + xesc(s.title) + '</span>' +
      (s.errMsg ? '<div class="serr">' + xesc(s.errMsg) + '</div>' : '');
    if (s.snippet) {
      var snipLines = s.snippet.split('\\n');
      stepBody += '<div class="step-src code-block">';
      for (var si = 0; si < snipLines.length; si++) {
        var sl = snipLines[si];
        var isFail = /^\\s*>/.test(sl);
        var isPtr  = /^\\s*\\|/.test(sl) && !/\\d\\s*\\|/.test(sl);
        var scls   = isFail ? ' fail-line' : isPtr ? ' ptr-line' : '';
        stepBody += '<div class="code-line' + scls + '">' + xesc(sl) + '</div>';
      }
      stepBody += '</div>';
    } else if (s.sourceCode) {
      var srcLines = s.sourceCode.split('\\n');
      stepBody += '<div class="step-src code-block">';
      for (var si = 0; si < srcLines.length; si++) {
        stepBody += '<div class="code-line">' + xesc(srcLines[si]) + '</div>';
      }
      stepBody += '</div>';
    }
    stepBody += '</div>';
    var numLabel = depth === 0 ? String(i + 1) : '&bull;';
    html += '<div class="step ' + (s.errMsg ? 'sfail' : 'sok') + '"' +
      (depth ? ' style="margin-left:' + (depth * 20) + 'px"' : '') + '>' +
      '<span class="sn">' + numLabel + '</span>' +
      stepBody +
      (s.dur ? '<span class="sd">' + fmtMs(s.dur) + '</span>' : '') +
      togBtn +
    '</div>';
    // Render API calls inline under this step (matched by step title)
    var calls = stepApiMap[s.title];
    if (calls && calls.length) {
      for (var ci = 0; ci < calls.length; ci++) {
        html += '<div style="margin-left:' + ((depth + 1) * 20) + 'px;margin-bottom:4px">' +
          renderApiCall(calls[ci], ci) + '</div>';
      }
    }
    if (s.steps && s.steps.length) {
      html += renderStepListWithApi(s.steps, depth + 1, stepApiMap);
    }
  }
  html += renderAuxExpects(aux, depth);
  return html;
}

// ── Steps as a readable checklist ───────────────────────────────────────────
// A check title written by the report helpers looks like "<label>: expected <x> — got <y>": split it into its parts.
function parseEG(title) {
  var t = String(title || '');
  var i = t.indexOf(': expected ');
  var j = t.indexOf(' — got ');
  if (i < 0 || j < i) return null;
  return {label: t.slice(0, i), exp: t.slice(i + 11, j), got: t.slice(j + 7)};
}
function dtFlatten(steps, depth, apiMap, out, ctr) {
  var aux = [];
  (steps || []).forEach(function(st) {
    if (st.kind === 'expect') {
      if (st.aux) aux.push(st); else { ctr.checks++; out.push({k:'chk', s:st, d:depth, fail:!!st.errMsg}); }
      return;
    }
    var calls = apiMap[st.title] || [];
    if (depth === 0) { ctr.steps++; out.push({k:'step', s:st, n:ctr.steps, fail:!!st.errMsg, calls:calls}); }
    else { ctr.checks++; out.push({k:'chk', s:st, d:depth, fail:!!st.errMsg, calls:calls}); }
    if (st.steps && st.steps.length) dtFlatten(st.steps, depth + 1, apiMap, out, ctr);
  });
  if (aux.length) out.push({k:'aux', list:aux, d:depth});
}
function dtCode(st) {
  var h = '';
  if (st.snippet) {
    var lines = st.snippet.split('\\n');
    h += '<div class="code-block">';
    for (var i = 0; i < lines.length; i++) {
      var sl = lines[i];
      var isFail = /^\\s*>/.test(sl);
      var isPtr = /^\\s*\\|/.test(sl) && !/\\d\\s*\\|/.test(sl);
      h += '<div class="code-line' + (isFail ? ' fail-line' : isPtr ? ' ptr-line' : '') + '">' + xesc(sl) + '</div>';
    }
    h += '</div>';
  } else if (st.sourceCode) {
    var src = st.sourceCode.split('\\n');
    h += '<div class="code-block">';
    for (var k = 0; k < src.length; k++) h += '<div class="code-line">' + xesc(src[k]) + '</div>';
    h += '</div>';
  }
  return h;
}
function dtCalls(calls) {
  var h = '';
  for (var i = 0; i < (calls || []).length; i++) h += '<div style="margin-top:6px">' + renderApiCall(calls[i], i) + '</div>';
  return h;
}
function toggleTech(btn) {
  var w = btn.closest('.dwrap');
  var on = w.classList.toggle('tech-on');
  btn.innerHTML = 'Technical details ' + (on ? '&#9662;' : '&#9656;');
}
function egVal(v) { return v === '""' || v === '' ? '<em>(empty)</em>' : xesc(v); }
function dtSplit(label) {
  var t = String(label || '').replace(/^Tracking · /, '');
  var m = t.match(/^(.*?) \(([^()]*)\)$/);
  return m ? {subj: m[1], sub: m[2].replace(/^· /, '')} : {subj: t, sub: ''};
}
function dtLabel(label) {
  var p = dtSplit(label);
  return '<span class="ck-l ck-subj">' + xesc(p.subj) + '</span>' + (p.sub ? '<span class="ck-sub">' + xesc(p.sub) + '</span>' : '');
}
function dtCheckLine(r) {
  var st = r.s;
  var eg = parseEG(st.title);
  var where = st.where ? '<div class="tech">' + xesc(st.where) + '</div>' : '';
  var tm = st.dur ? '<span class="ck-time">' + xesc(fmtMs(st.dur)) + '</span>' : '';
  var open = ' onclick="this.classList.toggle(&quot;open&quot;)" title="Click to show all"';
  var body;
  if (r.fail) {
    var box = eg
      ? '<div class="eg"><div class="eg-r"><span>Expected</span><b>' + egVal(eg.exp) + '</b></div><div class="eg-r got"><span>Got</span><b>' + egVal(eg.got) + '</b></div></div>'
      : (st.errMsg ? '<div class="eg"><div class="eg-r got"><span>Error</span><b>' + xesc(st.errMsg) + '</b></div></div>' : '');
    body = dtLabel(eg ? eg.label : st.title) + box;
  } else if (eg) {
    body = dtLabel(eg.label) + (eg.exp === eg.got
      ? '<div class="ck-eg"><i class="ok">&#10003; Expected = Got</i><b>' + egVal(eg.got) + '</b></div>'
      : '<div class="ck-eg"><i>Expected</i><b>' + egVal(eg.exp) + '</b><i class="got">Got</i><b>' + egVal(eg.got) + '</b></div>');
  } else {
    var p = dtSplit(st.title);
    body = '<span class="ck-clamp"' + open + '><span class="ck-l ck-subj">' + xesc(p.subj) + '</span>' + (p.sub ? '<span class="ck-sub">' + xesc(p.sub) + '</span>' : '') + '</span>';
  }
  return '<div class="ck' + (r.fail ? ' fail' : '') + '" style="--d:' + Math.max(0, r.d - 1) + '"><span class="ck-m">' + (r.fail ? '&#10007;' : '&#10003;') + '</span><div class="ck-t">' + body + where + '</div>' + tm + '</div>';
}
function renderStepTable(steps, apiMap) {
  var rows = [], ctr = {steps:0, checks:0};
  dtFlatten(steps, 0, apiMap, rows, ctr);
  var failed = rows.filter(function(r) { return r.k === 'chk' && r.fail; }).length;
  // group the flat rows: a step followed by its checks
  var groups = [], cur = null;
  rows.forEach(function(r) {
    if (r.k === 'step') { cur = {n:r.n, s:r.s, fail:r.fail, calls:r.calls, checks:[], aux:[]}; groups.push(cur); return; }
    if (!cur) { cur = {n:0, s:{title:'Checks'}, fail:false, calls:[], checks:[], aux:[]}; groups.push(cur); }
    if (r.k === 'aux') cur.aux = cur.aux.concat(r.list); else { cur.checks.push(r); if (r.calls && r.calls.length) cur.calls = cur.calls.concat(r.calls); }
  });
  var h = '<div class="dwrap"><div class="dtop"><div class="dsum"><b>' + ctr.steps + '</b> steps &middot; <b>' + ctr.checks + '</b> checks' +
          (failed ? ' &middot; <b style="color:var(--fail)">' + failed + ' failed</b>' : '') + '</div>' +
          '<button class="tech-btn" onclick="toggleTech(this)">Technical details &#9656;</button></div>' +
          '<div class="dstrip">' + groups.map(function(g, gi) {
            var bad = g.fail || g.checks.some(function(c) { return c.fail; });
            return '<div class="dseg' + (bad ? ' fail' : g.checks.length ? '' : ' none') + '" title="' + xesc((g.n ? g.n + '. ' : '') + g.s.title + ' — ' + (g.checks.length ? g.checks.length + ' verification(s)' : 'no verification')) + '" onclick="var e=document.getElementById(&quot;cs-' + gi + '&quot;);if(e)e.scrollIntoView({behavior:&quot;smooth&quot;,block:&quot;center&quot;})">' + (g.n || '') + '</div>';
          }).join('') + '</div><div class="cl">';
  groups.forEach(function(g, gi) {
    var anyCheckFail = g.checks.some(function(c) { return c.fail; });
    h += '<div class="cs' + (g.fail || anyCheckFail ? ' fail' : '') + '" id="cs-' + gi + '"><div class="cs-h">' + (g.n ? '<span class="cs-n">' + g.n + '</span>' : '') +
         '<span class="cs-t">' + xesc(g.s.title) + '</span>' +
         (g.checks.length ? '<span class="cs-vc">' + (anyCheckFail ? g.checks.filter(function(c) { return c.fail; }).length + ' of ' + g.checks.length + ' failed' : g.checks.length + (g.checks.length === 1 ? ' verification' : ' verifications')) + '</span>' : '<span class="cs-vc none">no verification</span>') +
         (g.s.dur ? '<span class="cs-time">' + xesc(fmtMs(g.s.dur)) + '</span>' : '') + '</div>';
    if (g.fail && !anyCheckFail && g.s.errMsg) h += '<div class="cs-d"><div class="eg"><div class="eg-r got"><span>Error</span><b>' + xesc(g.s.errMsg) + '</b></div></div></div>';
    if (g.checks.length) { h += '<div class="cs-d"><div class="cs-vh">Verifications</div>'; g.checks.forEach(function(c) { h += dtCheckLine(c); }); h += '</div>'; }
    var tech = dtCode(g.s) + dtCalls(g.calls);
    if (g.aux.length) {
      tech += '<div class="dsum" style="margin-top:6px">Waits/checks inside the page object (' + g.aux.length + ')</div>';
      g.aux.forEach(function(x) { tech += renderExpectLine(x, 0); });
    }
    if (tech) h += '<div class="cs-tech">' + tech + '</div>';
    h += '</div>';
  });
  return h + '</div></div>';
}

function lastAttemptWarnings(t) {
  var a = (t.attempts || [])[(t.attempts || []).length - 1];
  return a && a.warnings ? a.warnings.length : 0;
}

function renderAttempt(a) {
  var html = '';

  if (a.warnings && a.warnings.length) {
    html += '<div class="warn-box"><b>&#9888; Warning (does not fail the test)</b>';
    for (var wi = 0; wi < a.warnings.length; wi++) html += '<div>' + xesc(a.warnings[wi]) + '</div>';
    html += '</div>';
  }

  if (a.beforeHooks && a.beforeHooks.length) {
    html += renderHookGroups(a.beforeHooks);
  }

  // Steps with inline HTTP calls (grouped by step name)
  if (a.steps && a.steps.length) {
    html += '<div class="sec-ttl" style="margin-bottom:8px">Steps</div>';
    // Build a map: step title → api calls that belong to it
    var stepApiMap = {};
    var unmappedCalls = [];
    if (a.apiLogs && a.apiLogs.length) {
      for (var ai = 0; ai < a.apiLogs.length; ai++) {
        var log = a.apiLogs[ai];
        if (log.step) {
          if (!stepApiMap[log.step]) stepApiMap[log.step] = [];
          stepApiMap[log.step].push(log);
        } else {
          unmappedCalls.push(log);
        }
      }
    }
    html += renderStepTable(a.steps, stepApiMap);
    html += '<div style="height:14px"></div>';

    // Show unmapped calls (calls without a step label) in a separate section
    if (unmappedCalls.length) {
      html += '<div class="sec-ttl" style="margin-bottom:8px">HTTP Calls (unlinked: ' + unmappedCalls.length + ')</div>';
      for (var ui = 0; ui < unmappedCalls.length; ui++) {
        html += renderApiCall(unmappedCalls[ui], ui);
      }
      html += '<div style="height:14px"></div>';
    }
  } else if (a.apiLogs && a.apiLogs.length) {
    // No steps but has API calls — show standalone
    html += '<div class="sec-ttl" style="margin-bottom:8px">HTTP Calls (' + a.apiLogs.length + ')</div>';
    for (var ai2 = 0; ai2 < a.apiLogs.length; ai2++) {
      html += renderApiCall(a.apiLogs[ai2], ai2);
    }
    html += '<div style="height:14px"></div>';
  }

  if (a.afterHooks && a.afterHooks.length) {
    html += renderHookGroups(a.afterHooks);
    html += '<div style="height:14px"></div>';
  }

  // Screenshot
  if (a.screenshot) {
    html += '<div class="sec-ttl">Screenshot</div>' +
      '<img class="shot-img" src="' + a.screenshot + '" alt="screenshot">';
  }

  // Video
  if (a.videoRel) {
    html += '<div class="sec-ttl" style="margin-top:14px">Video</div>' +
      '<div class="vid-wrap"><video controls src="' + xesc(a.videoRel) + '"></video></div>';
  }

  // Trace button — opens inline viewer when served via HTTP, copies CLI command otherwise
  if (a.traceFilename) {
    html += '<a class="tbtn" href="#" data-trace-file="traces/' + xesc(a.traceFilename) + '" data-trace-abs="' + xesc(a.traceAbs || '') + '" onclick="openTraceViewer(this);return false;">🔍 View Trace</a>';
  }

  // Error
  if (a.errors && a.errors.length) {
    html += '<div class="ebox"><div class="ebox-ttl">Error</div>' +
      '<div class="ebox-msg">' + xesc(a.errors[0].slice(0, 800)) + '</div></div>';
  }

  // Stdout
  if (a.stdout && a.stdout.trim()) {
    html += '<div class="sec-ttl">Console</div><div class="stdout">' + xesc(a.stdout.slice(0, 1500)) + '</div>';
  }

  return html || '<p style="color:var(--tx3);font-size:.82rem">No additional details.</p>';
}

function toggleSrc(btn) {
  var step = btn.closest('.step');
  step.classList.toggle('expanded');
  btn.innerHTML = step.classList.contains('expanded') ? '&#9660; Source' : '&#9654; Source';
}

function toggleApiCall(btn) {
  btn.closest('.api-call').classList.toggle('open');
}

function renderApiCall(log, idx) {
  var meth = (log.method || 'GET').toUpperCase();
  var statusClass = 's' + Math.floor((log.status || 0) / 100);
  var reqHeaders = log.reqHeaders ? JSON.stringify(log.reqHeaders, null, 2) : null;
  var reqJson = log.reqBody != null ? JSON.stringify(log.reqBody, null, 2) : null;
  var resJson = log.resBody != null ? JSON.stringify(log.resBody, null, 2) : null;
  var detail = '';
  if (reqHeaders) {
    detail += '<div class="api-dlabel">Request Headers</div>' +
      '<div class="api-json">' + xesc(reqHeaders) + '</div>';
  }
  if (reqJson) {
    detail += '<div class="api-dlabel">Request Body</div>' +
      '<div class="api-json">' + xesc(reqJson) + '</div>';
  }
  if (resJson) {
    detail += '<div class="api-dlabel">Response Body</div>' +
      '<div class="api-json">' + xesc(resJson) + '</div>';
  }
  return '<div class="api-call">' +
    '<div class="api-call-hdr" onclick="toggleApiCall(this)">' +
      '<span class="api-meth ' + meth + '">' + meth + '</span>' +
      '<span class="api-url" title="' + xesc(log.url || '') + '">' + xesc(log.url || '') + '</span>' +
      '<span class="api-status ' + statusClass + '">' + (log.status || '?') + '</span>' +
      (log.duration ? '<span class="api-dur">' + fmtMs(log.duration) + '</span>' : '') +
      '<span class="api-chevron">&#9654;</span>' +
    '</div>' +
    (detail ? '<div class="api-detail">' + detail + '</div>' : '') +
  '</div>';
}

function closeDetail() {
  document.getElementById('dsb').classList.remove('open');
  document.querySelectorAll('.ti').forEach(function(el) { el.classList.remove('sel'); });
}

// Fix screenshot onclick
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('shot-img')) openLb(e.target.src);
});

function openTraceViewer(el) {
  var traceFile = el.getAttribute('data-trace-file');
  var traceAbs = el.getAttribute('data-trace-abs');
  // If served via HTTP, open trace.playwright.dev with the trace URL
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    var base = location.href.replace(/\\/[^/]*$/, '/');
    var traceUrl = base + traceFile;
    window.open('https://trace.playwright.dev/?trace=' + encodeURIComponent(traceUrl), '_blank');
  } else {
    // Fallback: copy npx command for local file
    var cmd = 'npx playwright show-trace "' + traceAbs + '"';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cmd).then(function() {
        showToast('📋 Copied! Paste in terminal to view trace');
      }).catch(function() { prompt('Copy and run in terminal:', cmd); });
    } else {
      prompt('Copy and run in terminal:', cmd);
    }
  }
}

function showToast(msg) {
  var el = document.getElementById('qr-toast');
  if (!el) { el = document.createElement('div'); el.id = 'qr-toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('toast-show');
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.classList.remove('toast-show'); }, 3000);
}

// ── Errors tab ─────────────────────────────────────────────────────────
function renderErrors() {
  var panel = document.getElementById('epanel');
  if (!EG.length) {
    panel.innerHTML = '<div class="no-err">🎉 No errors found!</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < EG.length; i++) {
    var g = EG[i];
    var cnt = g.ids.length;
    html += '<div class="eg"><div class="eg-hdr">' +
      '<div class="eg-msg">' + xesc(g.msg) + '</div>' +
      '<div class="eg-cnt">' + cnt + ' test' + (cnt > 1 ? 's' : '') + '</div>' +
    '</div><div class="eg-tests">';
    for (var j = 0; j < g.ids.length; j++) {
      var tid = g.ids[j];
      var tst = null;
      for (var k = 0; k < TESTS.length; k++) { if (TESTS[k].id === tid) { tst = TESTS[k]; break; } }
      if (tst) {
        html += '<div class="etlink" onclick="jumpToTest(' + tid + ')">' +
          (tst.tc ? '<span class="tc-tag">' + xesc(tst.tc) + '</span>' : '') +
          xesc(tst.label) + '</div>';
      }
    }
    html += '</div></div>';
  }
  panel.innerHTML = html;
}

function jumpToTest(id) {
  switchToTests(null);
  setTimeout(function() {
    showDetail(id);
    var el = document.querySelector('[data-id="' + id + '"]');
    if (el) el.scrollIntoView({behavior:'smooth', block:'center'});
  }, 80);
}

// ── Lightbox ─────────────────────────────────────────────────────────
function openLb(src) {
  document.getElementById('lb-img').src = src;
  document.getElementById('lb').classList.add('open');
}
function closeLb() {
  document.getElementById('lb').classList.remove('open');
  document.getElementById('lb-img').src = '';
}
document.getElementById('lb-cls').addEventListener('click', closeLb);
document.getElementById('lb').addEventListener('click', function(e) {
  if (e.target === document.getElementById('lb')) closeLb();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeLb(); closeDetail(); }
});

// ── Init ──────────────────────────────────────────────────────────────
renderSummary();
renderTypeSummary();
renderFeatureTable();
renderTypeModuleTree();
renderTagFilters();
renderList();
renderErrors();

// Restore filter sidebar open/closed state from the last visit
if (localStorage.getItem('qa-filters-open') === '0') {
  document.getElementById('filter-sidebar').classList.remove('open');
} else {
  document.getElementById('filter-toggle-btn').classList.add('active');
}
</script>
</body>
</html>`;

// ── Write ────────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');

// ── Copy trace files to qa-report/traces/ ────────────────────────────────────
const TRACE_DIR = path.join(OUT_DIR, 'traces');
fs.mkdirSync(TRACE_DIR, { recursive: true });
let tracesCopied = 0;
for (const t of tests) {
  for (const a of t.attempts) {
    if (a.traceAbs && fs.existsSync(a.traceAbs)) {
      // Use parent directory name as unique filename (e.g. "functional-auth-Login-...-chromium.zip")
      const parentDir = path.basename(path.dirname(a.traceAbs));
      const dest = path.join(TRACE_DIR, parentDir + '.zip');
      a._traceFilename = parentDir + '.zip';
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(a.traceAbs, dest);
      }
      tracesCopied++;
    }
  }
}
if (tracesCopied) console.log('  📦  ' + tracesCopied + ' trace(s) → qa-report/traces/');

console.log('  ✅  ' + OUT);
console.log('  📊  ' + passed + '/' + total + ' passed \xb7 ' + rate + '% \xb7 ' + fmt(totalMs));

// ── Serve & Open ───────────────────────────────────────────────────────────────
// Report generation must also work in CI and unattended debug runs.
if (process.env.QA_REPORT_OPEN !== '1') process.exit(0);
// Open via http://localhost instead of file:// so "View Trace" can hand the .zip
// to trace.playwright.dev (it can't fetch a local file://) and so <video> tags
// pointing outside qa-report/ (into test-results/) resolve correctly.
const PORT = Number(process.env.QA_REPORT_PORT) || 9234;
const REPORT_URL = 'http://localhost:' + PORT + '/qa-report/index.html';

function openUrl(url) {
  try {
    const pl = process.platform;
    if (pl === 'win32') execSync('start "" "' + url + '"', { stdio: 'ignore' });
    else if (pl === 'darwin') execSync('open "' + url + '"', { stdio: 'ignore' });
    else execSync('xdg-open "' + url + '"', { stdio: 'ignore' });
  } catch {}
}

function isServerUp(cb) {
  const req = http.get({ host: 'localhost', port: PORT, path: '/', timeout: 800 }, res => {
    res.resume();
    cb(true);
  });
  req.on('error', () => cb(false));
  req.on('timeout', () => { req.destroy(); cb(false); });
}

isServerUp(up => {
  if (up) {
    console.log('  🌐  ' + REPORT_URL);
    openUrl(REPORT_URL);
    return;
  }
  // Spawn detached so it keeps running after this script (and `npm test`) exits.
  const child = spawn(process.execPath, [path.join(__dirname, 'serve-report.js')], {
    cwd: CWD,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  setTimeout(() => {
    console.log('  🌐  ' + REPORT_URL);
    openUrl(REPORT_URL);
  }, 400);
});
