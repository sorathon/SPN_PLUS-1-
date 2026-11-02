'use strict';
// Captures two step trees the built-in `json` reporter omits (it only serializes
// category:"test.step" entries):
//   1. beforeEach/afterEach ("Before Hooks" / "After Hooks")  → test-results/hooks.json
//   2. the test body's test.step + expect tree, so the report can show WHAT each
//      "Verify …" step checked without opening the source → test-results/steps.json
// Runs alongside the `json` reporter — keyed by test.id so generate-report.js can
// merge this back onto the matching test/attempt.
const fs = require('fs');
const path = require('path');

function serialize(steps) {
  return (steps || []).map(s => ({
    title: s.title,
    category: s.category,
    duration: s.duration,
    error: s.error ? { message: s.error.message } : null,
    steps: serialize(s.steps),
  }));
}

// Keep only what a reader cares about in the body: test.step and expect.
// Other categories (pw:api, fixture, hook) are dropped, but their expect /
// test.step descendants are kept (lifted to the nearest kept ancestor).
function serializeBody(steps) {
  const out = [];
  for (const s of steps || []) {
    if (s.category === 'test.step' || s.category === 'expect') {
      out.push({
        title: s.title,
        category: s.category,
        duration: s.duration,
        line: s.location ? s.location.line : null,
        file: s.location ? path.basename(s.location.file) : null,
        error: s.error ? { message: s.error.message || '' } : null,
        steps: serializeBody(s.steps),
      });
    } else {
      out.push(...serializeBody(s.steps));
    }
  }
  return out;
}

class QAHooksReporter {
  constructor() {
    this.hooks = {};
    this.steps = {};
  }
  onTestEnd(test, result) {
    const top = result.steps || [];
    const before = top.filter(s => s.category === 'hook' && /^before/i.test(s.title));
    const after = top.filter(s => s.category === 'hook' && /^after/i.test(s.title));
    if (before.length || after.length) {
      if (!this.hooks[test.id]) this.hooks[test.id] = [];
      this.hooks[test.id].push({
        retry: result.retry,
        before: serialize(before),
        after: serialize(after),
      });
    }
    const body = top.filter(s => s.category !== 'hook');
    if (!this.steps[test.id]) this.steps[test.id] = [];
    this.steps[test.id].push({ retry: result.retry, steps: serializeBody(body) });
  }
  onEnd() {
    const outDir = path.resolve(process.cwd(), process.env.PW_HOOKS_DIR || 'test-results');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'hooks.json'), JSON.stringify(this.hooks));
    fs.writeFileSync(path.join(outDir, 'steps.json'), JSON.stringify(this.steps));
  }
}
module.exports = QAHooksReporter;
