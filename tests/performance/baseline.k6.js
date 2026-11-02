// File: baseline.k6.js
// Vendored from k6-code-builder's k6-std-script-template main.js.
// Do not edit by hand for per-scenario changes — see scenario.js instead.
// See .kiro/steering/performance-test-generation.md for the ownership boundary.
import http from 'k6/http';
import exec from 'k6/execution';
import crypto from 'k6/crypto';
import { b64encode } from 'k6/encoding';
import { handleSummary as k6IntegrationHandleSummary } from './utils/k6-htmlreport-scenario/k6-integration.js';
import { Rate, Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { scenariosConfig } from './scenario.js';
import {
  getResponseLogs,
  getDetailedRequestLogs,
  getConsoleLogs,
  generateLogFile,
  generateReadableLogFile,
  generateDetailedRequestLogFile,
  generateDetailedRequestLogFileReadable,
  generateConsoleLogFile,
  generateConsoleLogReadable,
  isDebugMode,
  isLogAllRequests
} from './config/logger.js';


// --- Read Configuration Files ---
// This framework always targets exactly one deployment per checkout (localhost
// during dev, or a UAT/staging site in CI) — same convention as Playwright's
// APP_BASE_URL/API_BASE_URL. There's no multi-named-environment selection here.
const configEnv = JSON.parse(open('./config/environments/default.json'));
const configBase = JSON.parse(open('./config/base.json'));
const config = { ...configBase, ...configEnv };

// Resolve `${VAR}` placeholders in baseURL from real env vars — config files are
// committed to the repo, so a real target URL must never be hardcoded in them.
if (typeof config.baseURL === 'string') {
  config.baseURL = config.baseURL.replace(/\$\{(\w+)\}/g, (_, k) => {
    const v = __ENV[k];
    if (v === undefined) {
      throw new Error(`Missing required env var "${k}" for config.baseURL — set it before running k6 (see tests/.env.example).`);
    }
    return v;
  });
}
if (!config.baseURL) {
  throw new Error('config.baseURL is not set — check tests/performance/config/environments/default.json.');
}

const HTTP_TIMEOUT = config.httpTimeout || '';

// --- [NEW] Execution Mode Configuration ---
const executionModeConfig = config.executionMode || { mode: 'parallel' };

// ── Pre-load payloadFiles arrays at init time ──────────────────────────────
// executor.js cannot do this reliably due to circular import with scenario.js.
// main.js imports scenario.js last so scenariosConfig is fully populated here.
const _payloadArrays = {};
for (const [_scName, _sc] of Object.entries(scenariosConfig || {})) {
  const _files = _sc?.request?.payloadFiles;
  if (Array.isArray(_files) && _files.length > 0) {
    _payloadArrays[_scName] = new SharedArray(`${_scName}_payloads`, function () {
      return _files.map(f => JSON.parse(open(f)));
    });
  }
}
const EXECUTION_MODE = __ENV.EXEC_MODE || executionModeConfig.mode || 'parallel';

// --- K6_PHASE: 'baseline' (default) never fails the run on a threshold breach;
// 'enforce' (set by `npm run test:perf:enforce`, and by CI's scheduled job)
// registers thresholds for real, so a breach exits non-zero. k6 has no native
// "warn only" threshold mode — this is why the gating happens in JS below.
const K6_PHASE = __ENV.K6_PHASE === 'enforce' ? 'enforce' : 'baseline';

// --- Performance Metrics ---
const excellentRate = new Rate('response_time_excellent');
const goodRate = new Rate('response_time_good');
const fairRate = new Rate('response_time_fair');
const poorRate = new Rate('response_time_poor');

// --- Error Metrics ---
const errorRate = new Rate('scenario_errors');
const errorCounter = new Counter('scenario_error_count');
const errorsByType = new Counter('scenario_errors_by_type');
const errorResponseTime = new Trend('scenario_error_duration');

// --- Validation Error Metrics ---
const validationErrorRate = new Rate('validation_errors');
const validationErrorCounter = new Counter('validation_error_count');


// ==============================================================================
// [NEW] EXECUTION MODE HELPERS
// ==============================================================================

/**
 * Parse K6 duration string to seconds (e.g., '1m30s' -> 90)
 */
function parseK6Duration(duration) {
  if (!duration) return 0;
  if (typeof duration === 'number') return duration;

  let total = 0;
  const str = String(duration).toLowerCase();
  const matches = str.match(/(\d+)([hms])/g) || [];

  for (const m of matches) {
    const val = parseInt(m);
    if (m.includes('h')) total += val * 3600;
    else if (m.includes('m')) total += val * 60;
    else total += val;
  }

  if (matches.length === 0 && !isNaN(parseInt(str))) {
    total = parseInt(str);
  }

  return total;
}

/**
 * Calculate total duration from stages array
 */
function calculateStageDuration(stages) {
  if (!stages || !Array.isArray(stages)) return 30;
  return stages.reduce((sum, stage) => sum + parseK6Duration(stage.duration), 0);
}

/**
 * Get default stages from config
 */
function getDefaultStages() {
  return config.stageProfiles?.defaultRamp || [
    { duration: '10s', target: 1 },
    { duration: '20s', target: 5 },
    { duration: '10s', target: 0 }
  ];
}

/**
 * Get enabled scenarios as array
 * Respects optional RUNNER_SCENARIOS env var (comma-separated list from Test Runner UI)
 */
function getEnabledScenariosList() {
  const runnerFilter = __ENV.RUNNER_SCENARIOS;
  const filterList = runnerFilter
    ? runnerFilter.split(',').map(s => s.trim()).filter(Boolean)
    : null;
  return Object.entries(scenariosConfig)
    .filter(([name, sc]) => sc.enabled && (!filterList || filterList.includes(name)))
    .map(([name, sc]) => ({ name, config: sc }));
}


// ==============================================================================
// [NEW] SCENARIO BUILDERS FOR EACH MODE
// ==============================================================================

/**
 * Build scenarios for PARALLEL mode (Default - all run concurrently)
 */
const STAGES_EXECUTORS = new Set(['ramping-vus', 'ramping-arrival-rate']);

function buildParallelScenarios(enabledList) {
  const scenarios = {};
  let index = 0;

  for (const { name, config: sc } of enabledList) {
    const executor = sc.options?.executor || 'ramping-vus';
    const usesStages = STAGES_EXECUTORS.has(executor);
    const stages = usesStages ? (sc.options?.stages || getDefaultStages()) : undefined;

    scenarios[name] = {
      ...sc.options,
      exec: 'runScenario',
      ...(usesStages && { stages }),
      env: { BASE_URL: config.baseURL, HTTP_TIMEOUT: HTTP_TIMEOUT },
    };

    // Stagger start times slightly to avoid thundering herd (original behavior)
    if (index > 0) {
      scenarios[name].startTime = `${index * 5}s`;
    }

    index++;
  }

  return scenarios;
}

/**
 * Build scenarios for SEQUENTIAL mode (one after another)
 */
function buildSequentialScenarios(enabledList) {
  const scenarios = {};
  const delaySeconds = parseK6Duration(executionModeConfig.sequentialDelay || '5s');

  // Sort by order array or by execution.priority
  let sorted = [...enabledList];

  if (executionModeConfig.order && executionModeConfig.order.length > 0) {
    // Use explicit order from config
    const orderMap = new Map(executionModeConfig.order.map((name, idx) => [name, idx]));
    sorted = sorted.sort((a, b) => {
      const orderA = orderMap.has(a.name) ? orderMap.get(a.name) : 999;
      const orderB = orderMap.has(b.name) ? orderMap.get(b.name) : 999;
      return orderA - orderB;
    });
  } else {
    // Sort by priority in execution config
    sorted = sorted.sort((a, b) => {
      const prioA = a.config.execution?.priority ?? 99;
      const prioB = b.config.execution?.priority ?? 99;
      return prioA - prioB;
    });
  }

  let accumulatedTime = 0;

  for (const { name, config: sc } of sorted) {
    const executor = sc.options?.executor || 'ramping-vus';
    const usesStages = STAGES_EXECUTORS.has(executor);
    const stages = usesStages ? (sc.options?.stages || getDefaultStages()) : undefined;
    const scenarioDuration = usesStages
      ? calculateStageDuration(stages)
      : parseK6Duration(sc.options?.duration || sc.options?.maxDuration || '30s');

    scenarios[name] = {
      ...sc.options,
      exec: 'runScenario',
      ...(usesStages && { stages }),
      env: { BASE_URL: config.baseURL, HTTP_TIMEOUT: HTTP_TIMEOUT },
    };

    if (accumulatedTime > 0) {
      scenarios[name].startTime = `${accumulatedTime}s`;
    }

    // Next scenario starts after this one completes + delay
    accumulatedTime += scenarioDuration + delaySeconds;
  }

  console.log(`[Sequential Mode] Total estimated duration: ${accumulatedTime}s`);

  return scenarios;
}

/**
 * Build scenarios for MIXED mode (groups with dependencies)
 */
function buildMixedScenarios(enabledList) {
  const scenarios = {};
  const groups = executionModeConfig.groups || [];

  // If no groups defined, fallback to parallel
  if (groups.length === 0) {
    console.warn('[Mixed Mode] No groups defined, falling back to parallel mode');
    return buildParallelScenarios(enabledList);
  }

  // Track when each group ends for dependency resolution
  const groupEndTimes = {};

  for (const group of groups) {
    // Calculate start time based on dependencies
    let groupStartTime = 0;
    if (group.dependsOn && groupEndTimes[group.dependsOn] !== undefined) {
      groupStartTime = groupEndTimes[group.dependsOn];
    }

    // Find scenarios in this group
    const groupScenarios = group.scenarios
      .map(name => enabledList.find(e => e.name === name))
      .filter(Boolean);

    if (groupScenarios.length === 0) {
      console.warn(`[Mixed Mode] No enabled scenarios found for group "${group.name}"`);
      continue;
    }

    let maxEndTime = groupStartTime;
    let inGroupOffset = 0;

    for (const { name, config: sc } of groupScenarios) {
      const executor = sc.options?.executor || 'ramping-vus';
      const usesStages = STAGES_EXECUTORS.has(executor);
      const stages = usesStages ? (sc.options?.stages || getDefaultStages()) : undefined;
      const duration = usesStages
        ? calculateStageDuration(stages)
        : parseK6Duration(sc.options?.duration || sc.options?.maxDuration || '30s');

      // Calculate this scenario's start time
      let startTime = groupStartTime;
      if (!group.parallel) {
        // Sequential within group
        startTime = groupStartTime + inGroupOffset;
        inGroupOffset += duration;
      }

      scenarios[name] = {
        ...sc.options,
        exec: 'runScenario',
        ...(usesStages && { stages }),
        env: { BASE_URL: config.baseURL, GROUP: group.name, HTTP_TIMEOUT: HTTP_TIMEOUT },
      };

      if (startTime > 0) {
        scenarios[name].startTime = `${startTime}s`;
      }

      maxEndTime = Math.max(maxEndTime, startTime + duration);
    }

    // Record when this group ends
    groupEndTimes[group.name] = group.parallel ? maxEndTime : groupStartTime + inGroupOffset;
  }

  // Handle scenarios not in any group (run them in parallel at the end)
  const groupedScenarioNames = new Set(groups.flatMap(g => g.scenarios));
  const ungrouped = enabledList.filter(e => !groupedScenarioNames.has(e.name));

  if (ungrouped.length > 0) {
    const lastEndTime = Math.max(...Object.values(groupEndTimes), 0);

    for (const { name, config: sc } of ungrouped) {
      const executor = sc.options?.executor || 'ramping-vus';
      const usesStages = STAGES_EXECUTORS.has(executor);
      const stages = usesStages ? (sc.options?.stages || getDefaultStages()) : undefined;

      scenarios[name] = {
        ...sc.options,
        exec: 'runScenario',
        ...(usesStages && { stages }),
        env: { BASE_URL: config.baseURL, GROUP: 'ungrouped', HTTP_TIMEOUT: HTTP_TIMEOUT },
        startTime: lastEndTime > 0 ? `${lastEndTime}s` : undefined,
      };
    }
  }

  return scenarios;
}

/**
 * Main scenario builder - routes to appropriate mode builder
 */
function buildScenariosByMode() {
  const enabledList = getEnabledScenariosList();

  if (enabledList.length === 0) {
    console.error('No enabled scenarios found!');
    return {};
  }

  // --- [NEW] SINGLE SCENARIO TEST MODE ---
  // ถ้าระบุ Environment Variable "TEST_SCENARIO" มา ให้รันแค่อันนั้น
  const targetScenario = __ENV.TEST_SCENARIO;
  if (targetScenario) {
    console.log(`\n🎯 TARGET TEST MODE: Running only "${targetScenario}"`);

    const found = enabledList.find(s => s.name === targetScenario);
    if (!found) {
      console.error(`❌ Scenario "${targetScenario}" not found or disabled.`);
      return {};
    }

    // Force configuration for quick test
    // รันแค่ 1 VU, 1 Iteration เพื่อดูผลเร็วๆ
    return {
      [targetScenario]: {
        executor: 'shared-iterations',
        vus: 1,
        iterations: 1,
        maxDuration: __ENV.DRY_RUN_TIMEOUT || '30s',
        exec: 'runScenario',
        env: { BASE_URL: config.baseURL, HTTP_TIMEOUT: HTTP_TIMEOUT }
      }
    };
  }
  // ---------------------------------------

  console.log(`\n========================================`);
  console.log(`Execution Mode: ${EXECUTION_MODE.toUpperCase()}`);
  console.log(`Enabled Scenarios: ${enabledList.map(e => e.name).join(', ')}`);
  console.log(`========================================\n`);

  switch (EXECUTION_MODE.toLowerCase()) {
    case 'sequential':
      return buildSequentialScenarios(enabledList);
    case 'mixed':
      return buildMixedScenarios(enabledList);
    case 'parallel':
    default:
      return buildParallelScenarios(enabledList);
  }
}


// ==============================================================================
// DYNAMIC SCENARIO AND THRESHOLD GENERATION
// ==============================================================================

// [MODIFIED] Use mode-based builder instead of original loop
const enabledScenarios = buildScenariosByMode();

// DRY_RUN: override ทุก scenario ให้รันแค่ 1 VU / 1 iteration แล้วหยุด
if (__ENV.DRY_RUN === 'true') {
  for (const name of Object.keys(enabledScenarios)) {
    enabledScenarios[name] = {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: __ENV.DRY_RUN_TIMEOUT || '1m',
      gracefulStop: '5s',
      exec: 'runScenario',
      env: enabledScenarios[name].env || { BASE_URL: config.baseURL },
    };
  }
}

const thresholds = { ...config.thresholds };

// Build thresholds (same as original)
for (const scenarioName in scenariosConfig) {
  const scenario = scenariosConfig[scenarioName];

  if (scenario.enabled) {
    const scenarioThreshold = scenario.thresholds;
    if (scenarioThreshold) {
      thresholds[`http_req_duration{scenario:${scenarioName}}`] = [`p(95)<${scenarioThreshold.duration_p95}`];
      thresholds[`http_reqs{scenario:${scenarioName}}`] = [`count>${scenarioThreshold.min_requests}`];

      const failureRate = scenarioThreshold.failure_rate || 'rate<0.01';
      thresholds[`http_req_failed{scenario:${scenarioName}}`] = [failureRate];

      // Threshold for k6's built-in check() pass-rate, scoped to this scenario —
      // only registered if the scenario declares any checks in scenario.js.
      // (Reads scenario.request.checks directly — checks.js stays 100% generic
      // and doesn't need a per-scenario registry to answer this.)
      if (scenario.request?.checks?.length > 0) {
        thresholds[`checks{scenario:${scenarioName}}`] = ['rate>0.95'];
      }

      // Threshold for HTTP Error Metrics
      thresholds[`scenario_errors{scenario:${scenarioName}}`] = [failureRate];
      thresholds[`scenario_error_count{scenario:${scenarioName}}`] = ['count<10'];

      // Threshold for Validation Error Metrics
      thresholds[`validation_errors{scenario:${scenarioName}}`] = ['rate<0.05'];
      thresholds[`validation_error_count{scenario:${scenarioName}}`] = ['count<10'];
    }
  }
}

console.log(`Enabled scenarios: ${Object.keys(enabledScenarios).join(', ')}`);
console.log(`K6_PHASE: ${K6_PHASE}${K6_PHASE === 'baseline' ? ' (thresholds computed for the report, but will not fail this run)' : ' (thresholds enforced — a breach fails this run)'}`);

// --- k6 Options ---
export const options = {
  scenarios: enabledScenarios,
  // Only hand k6 a `thresholds` object in 'enforce' phase — k6 has no native
  // "warn only" mode, so registering it in 'baseline' phase would fail the
  // run's exit code on any breach, defeating the point of a baseline run.
  ...(K6_PHASE === 'enforce' ? { thresholds } : {}),
};

// ==============================================================================
// [UPDATED] LIFECYCLE FUNCTION: SETUP (MULTI-STEP)
// ==============================================================================
export function setup() {
  const setupConfig = config.setupConfig;

  if (!setupConfig || !setupConfig.enabled) {
    console.log('--- Setup: Disabled or not configured ---');
    return null;
  }

  // Support both new format (requests[]) and legacy format (single url/method)
  let requests = [];
  if (Array.isArray(setupConfig.requests) && setupConfig.requests.length > 0) {
    requests = setupConfig.requests;
  } else if (setupConfig.url) {
    // Legacy single-request format
    requests = [setupConfig];
  }

  if (requests.length === 0) {
    console.log('--- Setup: No requests configured ---');
    return null;
  }

  let extractedData = {};
  let cookieVarNames = [];

  for (let step = 0; step < requests.length; step++) {
    const req = requests[step];
    const stepNum = step + 1;
    const stepName = req.name || `Step ${stepNum}`;
    console.log(`--- Setup Step ${stepNum}: ${stepName} (${(req.method || 'POST').toUpperCase()} ${req.url}) ---`);

    // Resolve ${VAR} tokens in URL from previously extracted data
    let url = req.url || '';
    url = url.replace(/\$\{([^}]+)\}/g, (_, k) => (extractedData[k] !== undefined ? extractedData[k] : ''));

    // Append query_params (with ${VAR} substitution)
    const qp = req.query_params || {};
    if (Object.keys(qp).length > 0) {
      const qs = Object.entries(qp)
        .map(([k, v]) => {
          const resolvedV = String(v || '').replace(/\$\{([^}]+)\}/g, (_, vk) => (extractedData[vk] !== undefined ? extractedData[vk] : ''));
          return `${encodeURIComponent(k)}=${encodeURIComponent(resolvedV)}`;
        })
        .join('&');
      url = url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
    }

    // Build headers (with ${VAR} substitution)
    let headers = {};
    for (const [hk, hv] of Object.entries(req.headers || {})) {
      headers[hk] = String(hv || '').replace(/\$\{([^}]+)\}/g, (_, k) => (extractedData[k] !== undefined ? extractedData[k] : ''));
    }

    const bodyType = (req.body_type || 'json').toLowerCase();
    const method = (req.method || 'POST').toUpperCase();
    let body = null;

    // Resolve ${VAR} tokens from previously extracted steps in this chain
    const resolveToken = (val) => {
      if (typeof val !== 'string') return val;
      return val.replace(/\$\{([^}]+)\}/g, (_, k) =>
        extractedData[k] !== undefined ? String(extractedData[k]) : '');
    };

    if (method === 'GET') {
      // GET: merge payload into query string
      if (req.payload && typeof req.payload === 'object') {
        const qs = Object.entries(req.payload)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(resolveToken(String(v)))}`)
          .join('&');
        if (qs) url = url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
      }
    } else if (bodyType === 'form-urlencoded') {
      if (req.payload && typeof req.payload === 'object') {
        body = Object.entries(req.payload)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(resolveToken(String(v)))}`)
          .join('&');
      }
      headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
    } else if (bodyType !== 'none') {
      let resolvedPayload = req.payload;
      if (resolvedPayload && typeof resolvedPayload === 'object') {
        resolvedPayload = JSON.parse(JSON.stringify(resolvedPayload));
        for (const key of Object.keys(resolvedPayload)) {
          if (typeof resolvedPayload[key] === 'string') {
            resolvedPayload[key] = resolveToken(resolvedPayload[key]);
          }
        }
      } else if (typeof resolvedPayload === 'string') {
        resolvedPayload = resolveToken(resolvedPayload);
      }
      body = JSON.stringify(resolvedPayload);
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const res = http.request(method, url, body, { headers });

    if (res.status >= 400) {
      console.error(`Setup Step ${stepNum} (${stepName}) Failed! Status: ${res.status} Body: ${res.body}`);
      throw new Error(`Suite Setup step ${stepNum} (${stepName}) failed with status ${res.status}.`);
    }

    console.log(`Setup Step ${stepNum} (${stepName}) OK — status ${res.status}`);

    // Extract variables
    const extractors = req.extractors || {};
    for (const [varName, rawPath] of Object.entries(extractors)) {
      try {
        let extType = 'json';
        let extPath = rawPath;
        if (rawPath && rawPath.includes('::')) {
          const sep = rawPath.indexOf('::');
          extType = rawPath.substring(0, sep);
          extPath = rawPath.substring(sep + 2);
        }

        let val = null;
        if (extType === 'json') {
          val = res.json(extPath);
        } else if (extType === 'html_input') {
          val = res.html().find(`input[name="${extPath}"]`).attr('value') || '';
        } else if (extType === 'html_regex') {
          const m = new RegExp(extPath).exec(res.body);
          val = m ? m[1] : null;
        } else if (extType === 'cookie') {
          const cookieArr = res.cookies[extPath];
          val = (cookieArr && cookieArr.length > 0) ? cookieArr[0].value : null;
          if (!cookieVarNames.includes(varName)) cookieVarNames.push(varName);
        } else {
          val = res.json(extPath);
        }

        extractedData[varName] = val;
        const display = val !== null && val !== undefined ? (String(val).substring(0, 30) + (String(val).length > 30 ? '...' : '')) : 'null';
        console.log(`  Extracted '${varName}' [${extType}]: ${display}`);
      } catch (e) {
        console.warn(`  Failed to extract '${varName}' from path '${rawPath}': ${e.message}`);
      }
    }
  }

  return { ...extractedData, _cookieVars: cookieVarNames };
}

// --- Helper Functions ---
function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomString(length = 8) {
  return b64encode(crypto.randomBytes(length)).substring(0, length);
}

function randomItemFromList(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function trackResponseTime(response, scenarioName) {
  const rt = response.timings.duration;
  const tags = { scenario: scenarioName };
  excellentRate.add(rt < 500, tags);
  goodRate.add(rt >= 500 && rt < 1000, tags);
  fairRate.add(rt >= 1000 && rt < 2000, tags);
  poorRate.add(rt >= 2000, tags);
}

function trackErrors(response, scenarioName) {
  const tags = { scenario: scenarioName };
  const isError = response.status === 0 || response.status >= 400;

  errorRate.add(isError, tags);

  if (isError) {
    errorCounter.add(1, tags);
    errorResponseTime.add(response.timings.duration, tags);

    let errorType = 'unknown';
    if (response.status === 0) {
      errorType = 'network_error';
    } else if (response.status >= 400 && response.status < 500) {
      errorType = '4xx_client_error';
    } else if (response.status >= 500) {
      errorType = '5xx_server_error';
    }

    errorsByType.add(1, {
      scenario: scenarioName,
      error_type: errorType,
      status_code: response.status.toString()
    });

    console.error(`[${scenarioName}] HTTP Error: Status ${response.status}, URL: ${response.url}, Duration: ${response.timings.duration}ms`);
  }
}

function trackValidationErrors(checksPassed, scenarioName) {
  const tags = { scenario: scenarioName };
  const hasValidationError = !checksPassed;

  validationErrorRate.add(hasValidationError, tags);

  if (hasValidationError) {
    validationErrorCounter.add(1, tags);
  }
}

// ==============================================================================
// [UPDATED] DYNAMIC EXECUTOR FUNCTION (WITH TOKEN INJECTION)
// ==============================================================================
export function runScenario(data) {
  const scenarioName = exec.scenario.name;
  const scenario = scenariosConfig[scenarioName];

  if (!scenario || !scenario.request) {
    console.error(`Configuration or request object for scenario "${scenarioName}" not found!`);
    return;
  }

  // Auto-inject cookies จาก setup เข้า VU cookie jar (เฉพาะ extractor type=cookie)
  // ทำเพียงครั้งแรกของแต่ละ VU iteration เท่านั้น ไม่กระทบ scenario ที่ไม่ต้องการ cookie
  if (data && data._cookieVars && data._cookieVars.length > 0) {
    const jar = http.cookieJar();
    for (const cName of data._cookieVars) {
      if (data[cName]) {
        jar.set(config.baseURL, cName, String(data[cName]));
      }
    }
  }

  let requestConfig = JSON.parse(JSON.stringify(scenario.request));

  // 2a. Resolve payloadFiles → set requestConfig.payload before templating
  if (!requestConfig.payload && _payloadArrays[scenarioName]) {
    const _arr = _payloadArrays[scenarioName];
    const _mode = requestConfig.payloadMode || 'sequential';
    const _idx = _mode === 'random'
      ? Math.floor(Math.random() * _arr.length)
      : exec.scenario.iterationInTest % _arr.length;
    requestConfig.payload = JSON.parse(JSON.stringify(_arr[_idx]));
  }

  // 2b. Process Payload (Templating)
  if (requestConfig.payload) {

    // Case A: Payload เป็น Object (JSON หรือ Form Data) -> วนลูปแก้ทีละ Field
    if (typeof requestConfig.payload === 'object') {
      for (const key in requestConfig.payload) {
        let value = requestConfig.payload[key];
        // เช็คเผื่อว่าเป็นตัวเลขหรือ boolean ที่ไม่ต้อง replace
        if (typeof value === 'string') {
           requestConfig.payload[key] = applyTemplating(value);
        }
      }
    }
    // Case B: Payload เป็น String (XML หรือ Raw Text) -> แก้ในก้อนข้อความเลย
    else if (typeof requestConfig.payload === 'string') {
      requestConfig.payload = applyTemplating(requestConfig.payload);
    }
  }

  // 2c. Execute request with automatic checks
  const result = scenario.exec(__ENV.BASE_URL, requestConfig, scenarioName, data);

  // Extract response and checksPassed from result
  let response, checksPassed;
  if (result && result.response) {
    response = result.response;
    checksPassed = result.checksPassed;
  } else {
    // Backward compatibility
    response = result;
    checksPassed = true;
  }

  if (response) {
    trackResponseTime(response, scenarioName);
    trackErrors(response, scenarioName);

    // Track validation errors
    if (checksPassed !== undefined) {
      trackValidationErrors(checksPassed, scenarioName);
    }
  }
}

// --- LIFECYCLE FUNCTION: TEARDOWN ---
export function teardown(data) {
  console.log('--- Running Teardown ---');
  console.log(`Execution Mode: ${EXECUTION_MODE}`);

  // Check token status
  const tokenKeys = data ? Object.keys(data).filter(k => k.toUpperCase().includes('TOKEN')) : [];
  console.log(`Setup Data: ${tokenKeys.length > 0 ? `Found tokens (${tokenKeys.join(', ')})` : 'No tokens found'}`);

  const logs = getResponseLogs();
  console.log(`Total logged requests: ${logs.length}`);
}

// --- Handle Summary ---
export function handleSummary(data) {
  const responseLogs = getResponseLogs();
  const detailedRequestLogs = getDetailedRequestLogs();
  const consoleLogs = getConsoleLogs();

  console.log(`\n📊 Processing logs for export...`);
  console.log(`Response logs: ${responseLogs.length}`);
  console.log(`Detailed request logs: ${detailedRequestLogs.length}`);
  console.log(`Console logs: ${consoleLogs.length}`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/g, '_').replace(/Z/g, '');
  const testType = (config.testType || 'load').replace(/\s+/g, '-').toLowerCase();
  const environment = (config.environment || 'default').replace(/\s+/g, '-').toLowerCase();
  const K6_PROFILE = (__ENV.K6_PROFILE || '').replace(/\s+/g, '-').toLowerCase();
  const RUN_LABEL  = (__ENV.RUN_LABEL  || '').replace(/\s+/g, '-').toLowerCase();

  const result = {
    ...k6IntegrationHandleSummary(data, {
      testType: config.testType || 'load',
      environment: config.environment || 'default',
      profile: K6_PROFILE,
      runLabel: RUN_LABEL,
      enabledScenarios: Object.keys(enabledScenarios),
      executionMode: EXECUTION_MODE,
      customTitle: config.reportTitle,
      customSubtitle: config.reportSubtitle,
      scenariosConfig: scenariosConfig,
      responseLogs: responseLogs,
    }),
    // Response logs (always)
    [`logs/response-logs-${testType}-${environment}-${timestamp}.jsonl`]: generateLogFile(responseLogs),
    [`logs/response-logs-${testType}-${environment}-${timestamp}.txt`]: generateReadableLogFile(responseLogs),
  };

  // Debug mode logs
  if (isDebugMode() || isLogAllRequests()) {
    // Detailed request logs
    result[`logs/detailed-requests-${testType}-${environment}-${timestamp}.jsonl`] = generateDetailedRequestLogFile(detailedRequestLogs);
    result[`logs/detailed-requests-${testType}-${environment}-${timestamp}.txt`] = generateDetailedRequestLogFileReadable(detailedRequestLogs);

    // Console output logs (NEW!)
    result[`logs/console-output-${testType}-${environment}-${timestamp}.jsonl`] = generateConsoleLogFile(consoleLogs);
    result[`logs/console-output-${testType}-${environment}-${timestamp}.txt`] = generateConsoleLogReadable(consoleLogs);

    console.log(`\n🔍 Debug logs enabled:`);
    console.log(`   - Detailed requests: ${detailedRequestLogs.length} entries`);
    console.log(`   - Console output: ${consoleLogs.length} entries`);
  }

  console.log(`\n✅ Log files generated in logs/ directory`);

  return result;
}

// ✅ [NEW] Helper Function สำหรับแทนค่าตัวแปร (รองรับทั้ง XML และ JSON Value)
function applyTemplating(value) {
    if (!value) return value;
    let newValue = value;

    // ใช้ Regex /g เพื่อแทนที่ทุกจุดที่เจอ (สำคัญมากสำหรับ XML)
    if (newValue.includes('{{RANDOM_STRING}}')) {
        newValue = newValue.replace(/{{RANDOM_STRING}}/g, () => randomString());
    }

    if (newValue.includes('{{RANDOM_INT_')) {
        newValue = newValue.replace(/{{RANDOM_INT_(\d+)_(\d+)}}/g, (match, min, max) => {
            return randomIntBetween(parseInt(min), parseInt(max));
        });
    }

    if (newValue.includes('{{RANDOM_FROM_LIST:')) {
        newValue = newValue.replace(/{{RANDOM_FROM_LIST:(.*?)}}/g, (match, listStr) => {
            return randomItemFromList(listStr.split(','));
        });
    }

    // Replace VU and ITER info
    newValue = newValue.replace(/__VU/g, exec.vu.idInTest)
                       .replace(/__ITER/g, exec.vu.iterationInScenario);

    return newValue;
}
