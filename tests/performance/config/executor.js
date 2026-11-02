import http from 'k6/http';
import { group, sleep } from 'k6';
import { executeChecks } from './checks.js';
import { logResponse, logDetailedRequest } from './logger.js';

import exec from 'k6/execution';

// ✅ Debug mode from environment variable
const DEBUG = __ENV.DEBUG_LOG === 'true' || __ENV.DEBUG === 'true';
// CHECK_FAIL_LOG: log response automatically when ANY check fails (lighter than DEBUG)
// Set -e CHECK_FAIL_LOG=true  OR auto-enabled when DEBUG=true
const CHECK_FAIL_LOG = __ENV.CHECK_FAIL_LOG === 'true' || DEBUG;

// ----------------------------------------------------------------
// ✅ Helper: ฟังก์ชันสำหรับแทนที่ตัวแปร ${VAR_NAME} ด้วยค่าจริง
// ----------------------------------------------------------------
function substituteVariables(target, data) {
    if (!target || !data) return target;

    // แปลง Object/Array เป็น String เพื่อทำ Regex Replace ทีเดียว
    const jsonStr = JSON.stringify(target);

    // ค้นหา pattern ${...} และแทนที่ด้วยค่าจาก data พร้อม JSON-escape ค่าให้ปลอดภัย
    const finalStr = jsonStr.replace(/\${(\w+)}/g, (match, varName) => {
        if (data[varName] !== undefined) {
            // JSON.stringify().slice(1,-1) → escape " \ และ control chars ให้ปลอดภัยใน JSON string
            return JSON.stringify(String(data[varName])).slice(1, -1);
        }
        return match;
    });

    return JSON.parse(finalStr);
}

// ----------------------------------------------------------------
// Main Executor
// ----------------------------------------------------------------
// ✅ เพิ่ม parameter 'setupData' (ตัวที่ 4) เพื่อรับค่าจาก Suite Setup
function executeRequest(baseURL, requestConfig, scenarioName, setupData) {

    // 1. รวมข้อมูลจาก Setup (Login Token)
    let contextData = { ...(setupData || {}) };

    // 2. เตรียม Headers และ Payload
    let headers = (requestConfig.params && requestConfig.params.headers) ? requestConfig.params.headers : {};
    // Payload: main.js resolves payloadFiles rotation into requestConfig.payload
    // before calling scenario.exec (k6 init-context requires SharedArray creation
    // at main.js's top level) — this executor only ever sees the resolved payload.
    let payload = requestConfig.payload;

    // (Logic Deep Copy Payload ถ้ามีในโค้ดเดิม ให้คงไว้ หรือใช้แบบง่ายด้านล่างนี้)
    if (payload && typeof payload === 'object') {
         payload = JSON.parse(JSON.stringify(payload));
    }

    // ✅ [แก้ไขจุดนี้] 3. แทนค่าตัวแปรโดยใช้ 'contextData' แทน 'setupData'
    if (DEBUG) console.log(`[DEBUG] Substituting variables for ${scenarioName}...`);
    headers = substituteVariables(headers, contextData);
    payload = substituteVariables(payload, contextData);

    // 3. Prepare URL & Method
    let url = `${baseURL}${substituteVariables(requestConfig.path, contextData)}`;
    const method = (requestConfig.method || 'GET').toUpperCase();

    // Build query string from queryParams (supports variable substitution)
    if (requestConfig.queryParams && Object.keys(requestConfig.queryParams).length > 0) {
        const substitutedQP = substituteVariables(requestConfig.queryParams, contextData);
        const queryString = Object.entries(substitutedQP)
            .filter(([k, v]) => k && v !== undefined && v !== '')
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        if (queryString) {
            url = url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
        }
    }

    // แปลง Payload เป็น String (ต้องทำหลัง Substitute แล้ว)
    let bodyStr = null;
    const _bodyType = (requestConfig.bodyType || '').toLowerCase();

    if (_bodyType === 'form-data' || requestConfig.formFiles) {
        // multipart/form-data — build object; k6 sets Content-Type + boundary automatically
        const fd = {};
        if (payload && typeof payload === 'object') {
            for (const [k, v] of Object.entries(payload)) {
                fd[k] = String(v !== null && v !== undefined ? v : '');
            }
        }
        if (requestConfig.formFiles) {
            for (const [k, ff] of Object.entries(requestConfig.formFiles)) {
                fd[k] = http.file(ff.data, ff.filename, ff.mime);
            }
        }
        bodyStr = Object.keys(fd).length > 0 ? fd : null;
    } else if (payload) {
        // ดึง Content-Type แบบ Case-Insensitive
        const contentTypeKey = Object.keys(headers).find(k => k.toLowerCase() === 'content-type');
        const contentType = contentTypeKey ? headers[contentTypeKey] : '';

        if (typeof payload === 'string') {
            // กรณี XML หรือ Raw String -> ส่งไปตรงๆ ไม่ต้อง Stringify ซ้ำ
            bodyStr = payload;
        } else if (contentType.includes('application/x-www-form-urlencoded') ||
                   (!contentType && typeof payload === 'object')) {
            // K6 จัดการแปลง Object เป็น Form string ให้เองอัตโนมัติ
            bodyStr = payload;
        } else {
            // Default: JSON (เช่น application/json หรือไม่ระบุ)
            bodyStr = JSON.stringify(payload);
        }
    }

    // Merge headers
    const params = {
        headers: headers,
        tags: requestConfig.tags || {}
    };
    // responseType controls how k6 handles the response body:
    //   'text' (default) — string, 'binary' — ArrayBuffer, 'none' — discard body
    if (requestConfig.responseType && requestConfig.responseType !== 'text') {
        params.responseType = requestConfig.responseType;
    }
    // Global HTTP timeout from environment config (e.g. '30000ms'). Omitted = k6 default (60s).
    if (__ENV.HTTP_TIMEOUT) {
        params.timeout = __ENV.HTTP_TIMEOUT;
    }

    // ✅ DEBUG: Log Request (แสดงค่าที่แปลงแล้ว)
    if (DEBUG) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`📤 [REQUEST] ${scenarioName}`);
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`   Method:  ${method}`);
        console.log(`   URL:     ${url}`);
        console.log(`   Headers: ${JSON.stringify(headers)}`);
        if (bodyStr) {
            console.log(`   Body:    ${bodyStr}`);
        }
        console.log('───────────────────────────────────────────────────────────────');
    }

    // Log request (to file)
    // หมายเหตุ: ส่ง headers/payload ที่แปลงค่าแล้วไปเก็บ Log
    const logConfig = { ...requestConfig, payload: payload, params: { headers: headers } };
    logDetailedRequest(scenarioName, logConfig, baseURL);

    let res;

    // Execute HTTP request
    try {
        switch (method) {
            case 'POST':
                res = http.post(url, bodyStr, params);
                break;
            case 'PUT':
                res = http.put(url, bodyStr, params);
                break;
            case 'DELETE':
                res = http.del(url, bodyStr, params);
                break;
            case 'PATCH':
                res = http.patch(url, bodyStr, params);
                break;
            default:
                res = http.get(url, params);
        }
    } catch (e) {
        console.error(`Request failed: ${e.message}`);
        // สร้าง Dummy Response กรณี Request Error (เพื่อไม่ให้ Script Crash)
        res = {
            status: 0,
            status_text: e.message,
            timings: { duration: 0 },
            body: null,
            headers: {}
        };
    }

    // Execute checks and get result
    // Execute checks inside group(scenarioName) so summary JSON records
    // checks under data.root_group.groups[i] with path "::scenarioName::checkName"
    // — this lets the HTML report show which scenario each failed check belongs to.
    let checksPassed;
    let failedCheckNames = [];
    group(scenarioName, () => {
        const checkResult = executeChecks(res, requestConfig.checks || [], contextData);
        // executeChecks returns { passed, failed } or boolean (backward compat)
        if (checkResult && typeof checkResult === 'object') {
            checksPassed = checkResult.passed;
            failedCheckNames = checkResult.failed || [];
        } else {
            checksPassed = checkResult;
        }
    });

    // ✅ CHECK_FAIL_LOG: log failed check details automatically (no full DEBUG needed)
    if (!checksPassed && CHECK_FAIL_LOG) {
        const _iter = exec.scenario.iterationInTest;
        const _bodyPreview = res.body
            ? (res.body.length > 800 ? res.body.substring(0, 800) + ' …(truncated)' : res.body)
            : '(empty)';
        console.log('');
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log(`❌ [CHECK FAILED] ${scenarioName}  (iter #${_iter})`);
        console.log('╠══════════════════════════════════════════════════════════════╣');
        console.log(`   URL:      ${url}`);
        console.log(`   Status:   ${res.status} ${res.status_text || ''}`);
        console.log(`   Duration: ${res.timings ? res.timings.duration.toFixed(2) : 0}ms`);
        if (failedCheckNames.length > 0) {
            console.log(`   ❌ Failed checks (${failedCheckNames.length}):`);
            failedCheckNames.forEach(n => console.log(`      • ${n}`));
        }
        console.log(`   Response body:`);
        console.log(`   ${_bodyPreview}`);
        console.log('╚══════════════════════════════════════════════════════════════╝');
        console.log('');
    }

    // ✅ DEBUG: Log Response (all iterations)
    if (DEBUG) {
        console.log('');
        console.log(`📥 [RESPONSE] ${scenarioName}`);
        console.log('───────────────────────────────────────────────────────────────');
        console.log(`   Status:   ${res.status} ${res.status_text || ''}`);
        console.log(`   Duration: ${res.timings ? res.timings.duration.toFixed(2) : 0}ms`);
        console.log(`   Size:     ${res.body ? res.body.length : 0} bytes`);
        console.log(`   Checks:   ${checksPassed ? '✅ PASSED' : '❌ FAILED'}`);

        // Response Headers
        if (res.headers) {
            console.log(`   Headers:  ${JSON.stringify(res.headers)}`);
        }

        // Response Body (truncate if too long)
        if (res.body) {
            const bodyPreview = res.body.length > 500
                ? res.body.substring(0, 500) + '... (truncated)'
                : res.body;
            console.log(`   Body:     ${bodyPreview}`);
        }
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
    }

    // Log response (to file)
    logResponse(scenarioName, res, { checksPassed });

    // Think time — realistic pause between iterations
    const tt = requestConfig.thinkTime;
    if (tt && tt.mode === 'constant' && tt.ms > 0) {
        sleep(tt.ms / 1000);
    } else if (tt && tt.mode === 'random' && tt.maxMs > 0) {
        const minS = (tt.minMs || 0) / 1000;
        const maxS = tt.maxMs / 1000;
        sleep(minS + Math.random() * (maxS - minS));
    }

    return {
        response: res,
        checksPassed: checksPassed
    };
}

// ✅ Default export for scenario.js
export default executeRequest;

// ✅ Named export for backward compatibility
export { executeRequest };

// Helper function updated to accept data
export function runScenario(scenario, envConfig, data) {
    return executeRequest(envConfig.BASE_URL, scenario, scenario.name || 'unknown', data);
}
