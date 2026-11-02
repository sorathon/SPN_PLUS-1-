require("./prepare-gcl-local.cjs");
const fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process");
const cwd = path.resolve(__dirname, ".."),
  root = path.resolve(cwd, "../ai-support/docs");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const clean = (s) =>
  String(s || "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/UCODE=[^&\s"'<>]+/gi, "UCODE=[redacted]");
const idOf = (s) => s.match(/TC-GCL-(?:NEW-)?\d{3}/)?.[0];
const files = (p) =>
  fs.existsSync(p)
    ? fs
        .readdirSync(p, { withFileTypes: true })
        .flatMap((e) =>
          e.isDirectory()
            ? files(path.join(p, e.name))
            : [path.join(p, e.name)],
        )
    : [];
const manifestFile = path.join(
  cwd,
  "../ai-support/evidence/gcl-test-manifest.json",
);
function visit(suite, fn) {
  for (const spec of suite.specs || [])
    for (const test of spec.tests || []) fn(spec, test);
  for (const s of suite.suites || []) visit(s, fn);
}
if (process.argv.includes("--manifest") || !fs.existsSync(manifestFile)) {
  const p = spawnSync(
    process.execPath,
    [
      require.resolve("@playwright/test/cli"),
      "test",
      "--project=gcl",
      "--no-deps",
      "--list",
      "--reporter=json",
    ],
    { cwd, encoding: "utf8" },
  );
  if (p.status !== 0) throw Error(p.stderr || p.stdout);
  const output = JSON.parse(p.stdout),
    cases = [];
  for (const suite of output.suites)
    visit(suite, (spec, test) => {
      const id = idOf(spec.title);
      if (id)
        cases.push({
          id,
          title: spec.title,
          file: spec.file.replace(/\\/g, "/"),
          line: spec.line,
          project: test.projectName,
        });
    });
  if (cases.length !== 123 || new Set(cases.map((c) => c.id)).size !== 123)
    throw Error("Expected exactly 123 unique GCL registrations");
  const csvIds = ["027", "150", "151", "152", "153", "154", "156"].map(
    (n) => "TC-GCL-" + n,
  );
  const sendFileIds = Array.from(
    { length: 8 },
    (_, i) => "TC-GCL-" + (160 + i),
  );
  if (!sendFileIds.every((id) => cases.some((c) => c.id === id)))
    throw Error("All eight Send file/print cases must be registered");
  if (!csvIds.every((id) => cases.some((c) => c.id === id)))
    throw Error("All seven CSV cases must be registered");
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(
    manifestFile,
    JSON.stringify(
      {
        total: cases.length,
        main: 105,
        newUpper: 18,
        excludedCsv: [],
        csvCases: csvIds,
        sendFileCases: sendFileIds,
        cases,
      },
      null,
      2,
    ),
  );
  console.log(
    "Manifest verified: 105 main + 18 New upper = 123 scripts; all 7 CSV and 8 Send file/print cases registered.",
  );
  if (process.argv.includes("--manifest")) process.exit(0);
}
const manifest = read(manifestFile),
  latest = new Map();
const archives = files(path.join(cwd, "../ai-support/evidence/gcl-runs"))
  .filter((f) => path.basename(f) === "results.json")
  .sort();
for (const file of archives) {
  const data = read(file);
  for (const suite of data.suites || [])
    visit(suite, (spec, test) => {
      const id = idOf(spec.title);
      if (!id) return;
      const run = test.results?.at(-1);
      if (!run) return;
      const annotations = [
        ...(test.annotations || []),
        ...(run.annotations || []),
      ];
      const status =
        run.status === "passed"
          ? "PASS"
          : run.status === "skipped"
            ? annotations.some((a) => a.type === "skip")
              ? "SKIP"
              : "NOT_RUN"
            : ["failed", "timedOut", "interrupted"].includes(run.status)
              ? "FAIL"
              : "NOT_RUN";
      latest.set(id, {
        id,
        title: spec.title,
        status,
        durationMs: run.duration,
        reason:
          status === "SKIP"
            ? annotations
                .filter((a) => a.type === "skip")
                .map((a) => a.description)
                .join("; ")
            : clean((run.errors?.[0] || run.error || {}).message).slice(
                0,
                2400,
              ),
        annotations: annotations.filter((a) =>
          [
            "gcl-reference",
            "cleanup-warning",
            "source-export",
            "warning",
          ].includes(a.type),
        ),
        attachments: (run.attachments || []).map((a) => ({
          name: a.name,
          contentType: a.contentType,
          ...(a.path ? { path: a.path } : {}),
        })),
        run: path.relative(root, file).replace(/\\/g, "/"),
        started: run.startTime,
      });
    });
}
// A stopped run may have completed individual cases without finalizing JSON.
// Keep these explicitly labelled observations separate from complete-run evidence.
for (const file of files(
  path.join(cwd, "../ai-support/evidence/gcl-interrupted"),
)
  .filter((f) => path.basename(f) === "observations.json")
  .sort()) {
  const data = read(file);
  for (const row of data.cases || []) {
    if (
      latest.has(row.id) &&
      new Date(latest.get(row.id).started) > new Date(row.started)
    )
      continue;
    latest.set(row.id, {
      ...row,
      annotations: [],
      attachments: row.attachments || [],
      run: path.relative(root, file).replace(/\\/g, "/"),
      partialRun: true,
    });
  }
}
const cases = manifest.cases.map((c) => ({
  ...c,
  ...(latest.get(c.id) || {
    status: "NOT_RUN",
    reason: "No archived execution",
  }),
}));
const stats = (rows) => ({
  total: rows.length,
  pass: rows.filter((c) => c.status === "PASS").length,
  fail: rows.filter((c) => c.status === "FAIL").length,
  blocked: rows.filter((c) => c.status === "BLOCKED").length,
  skip: rows.filter((c) => c.status === "SKIP").length,
  notRun: rows.filter((c) => c.status === "NOT_RUN").length,
});
const summary = {
  updated: new Date().toISOString(),
  coverage: {
    mainPlan: 105,
    mainScripts: 105,
    newUpperScripts: 18,
    registered: 123,
    csvExcluded: manifest.excludedCsv,
  },
  overall: stats(cases),
  main: stats(cases.filter((c) => !c.id.includes("-NEW-"))),
  newUpper: stats(cases.filter((c) => c.id.includes("-NEW-"))),
  scopeNotes: [
    "Send screen TC-GCL-160..163 and TC-GCL-166 (Online) check file receipt only; TC-GCL-164, 165 and 167 check popup creation only. These cases never submit Send or email forms.",
    "CSV upload uses the user-supplied TestCSV.csv; all seven CSV scenarios are registered.",
    "CSV checks 57 mapped Header and 13 UI Detail fields. LastEntry XML values are observational unless SPN_GCL_CSV_LAST_ENTRY_MODE is explicitly configured. Workspace legacy CSV format remains distinct from New H/D CSV.",
    "Older runs include explicitly labelled partial observations from a prior HTTP 503 outage. Latest completed runs take precedence; blocked attempts are not passes.",
    "Proportion/complete-validation/mixed-unit/DAT cases require confirmed fixtures or oracles; Cal VGM uses the addition equation visible on the UI. Skipped cases are not passing.",
    "Actual Send is opt-in per authorized reference; TC-GCL-172 checks a status change after Validate and Send. TC-GCL-173 was removed at the user request.",
    "TC-GCL-004 currently exercises Job and Vessel; TC-GCL-006 covers Departure Date. Remaining planned variants require separate fixtures.",
    "TC-GCL-148 checks the port/NEXT guard; TC-GCL-149 checks return-form options without submitting a return request.",
    "PDF checks parse readable text and selected GCL reference as well as file identity/signature/EOF; visual layout and every business field remain separate checks.",
  ],
  cases,
};
fs.writeFileSync(
  path.join(root, "GCL_RUN_RESULTS.json"),
  JSON.stringify(summary, null, 2) + "\n",
);
const indexFile = path.join(root, "GCL_TESTCASE_INDEX.json"),
  index = read(indexFile);
for (const c of index.cases) {
  const script = cases.find((s) => s.id === c.id);
  c.automation = !!script;
  c.status = script?.status || "NOT_RUN";
  c.designStatus = script ? "IMPLEMENTED" : "DRAFT";
  if (!c.designSource) {
    const ln = fs
      .readFileSync(path.join(root, "TESTCASES_GCL.md"), "utf8")
      .split(/\r?\n/)
      .findIndex((s) => s.startsWith("| " + c.id + " |"));
    c.designSource = { file: "TESTCASES_GCL.md", line: ln + 1 };
  }
  if (script) {
    c.source = { file: script.file, line: script.line };
    c.execution = script;
    c.currentExecutionDisposition = script.status;
  } else c.currentExecutionDisposition = "NO_AUTOMATION";
}
Object.assign(index, {
  automated: 105,
  executed: summary.main.pass + summary.main.fail,
  notRun: summary.main.notRun,
  passCount: summary.main.pass,
  failCount: summary.main.fail,
  skipCount: summary.main.skip,
  blockedCount: summary.main.blocked,
  designStatus: "AUTOMATION_WITH_CSV",
  automationReport: "GCL_RUN_RESULTS.md",
});
for (const c of index.currentFocus.scenarios) {
  const script = cases.find((s) => s.id === c.id);
  c.automation = !!script;
  c.designStatus = "IMPLEMENTED";
  c.status = script?.status || "NOT_RUN";
  if (script) c.execution = script;
}
index.currentFocus.automated = 18;
index.currentFocus.latestResults = summary.newUpper;
index.currentFocus.savePerformed = cases.some(
  (c) => c.id === "TC-GCL-025" && c.status === "PASS",
);
index.currentFocus.scope =
  "New GCL first-row lookup and persistence are automated; full module scripts include CSV.";
fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + "\n");
const lines = [
  "# GCL — Automation results",
  "",
  `Updated: ${summary.updated}. Cumulative latest result per ID from archived runs; not a claim that all results came from one run.`,
  "",
  `**123 scripts: PASS ${summary.overall.pass} / FAIL ${summary.overall.fail} / BLOCKED ${summary.overall.blocked} / SKIP ${summary.overall.skip} / NOT_RUN ${summary.overall.notRun}.**`,
  "",
  `Main plan: 105 scripted of 105 (CSV included): PASS ${summary.main.pass} / FAIL ${summary.main.fail} / SKIP ${summary.main.skip}. New upper form: 18 scripts, PASS ${summary.newUpper.pass} / FAIL ${summary.newUpper.fail} / SKIP ${summary.newUpper.skip}.`,
  "",
  "Pages: `tests/pages/gcl/`. Tests: `tests/functional/gcl/`. Project: `gcl`. Type checking: `npm run typecheck`. Run: `npm run test:gcl:headed`. Reports: `tests/gcl-qa-report/index.html`, `tests/gcl-playwright-report/index.html`.",
  "",
  "## Limits and deferred work",
  "",
];
for (const note of summary.scopeNotes) lines.push("- " + note);
lines.push(
  "",
  "## Failures and skips",
  "",
  "| ID | Result | Detail |",
  "|---|---|---|",
);
for (const c of cases.filter((c) =>
  ["FAIL", "BLOCKED", "SKIP"].includes(c.status),
))
  lines.push(
    `| ${c.id} | ${c.status} | ${clean(c.reason).replace(/\|/g, "/").replace(/\s+/g, " ").slice(0, 950)} |`,
  );
lines.push(
  "",
  "## Latest result by case",
  "",
  "| ID | Result | Scenario | Run evidence |",
  "|---|---|---|---|",
);
for (const c of cases)
  lines.push(
    `| ${c.id} | ${c.status} | ${c.title.replace(/\|/g, "/")} | ${c.run ? "[" + path.basename(path.dirname(c.run)) + "](" + c.run + ")" : "not run"} |`,
  );
lines.push(
  "",
  "BLOCKED means the target server was unavailable before the case could be executed. Partial observations have their own JSON evidence and are not a completed full run.",
  "",
  "SKIP means prerequisites or external-action authorization are missing; it does not count as PASS. Screenshots are captured before owned-draft cleanup. CSV scenarios are registered in csv.spec.ts and use TestCSV.csv plus derived test variants.",
  "",
);
fs.writeFileSync(path.join(root, "GCL_RUN_RESULTS.md"), lines.join("\n"));
console.log(
  JSON.stringify(
    {
      overall: summary.overall,
      main: summary.main,
      newUpper: summary.newUpper,
    },
    null,
    2,
  ),
);
