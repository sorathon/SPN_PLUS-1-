// K6 Checks Configuration
import { check } from 'k6';
import { C } from './common-checks.js';
import { logToConsole } from './logger.js';

// Helper function to get nested object value — supports dot and bracket notation
// e.g. "data.items[0].id" or "data.content[0].transid"
function getByPath(obj, path) {
    if (!path) return undefined;
    return path.split(/[.\[\]]+/).filter(Boolean).reduce((acc, part) => {
        if (acc == null) return undefined;
        return acc[part];
    }, obj);
}

// ✅ Export executeChecks for executor.js
export function executeChecks(res, checksList, vars) {
    if (!checksList || checksList.length === 0) {
        check(res, { 'status is 200': (r) => r.status === 200 });
        return true;
    }

    function resolveVar(s) {
        if (!vars || s === undefined || s === null) return s;
        return String(s).replace(/\$\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? String(vars[k]) : ('${' + k + '}'));
    }

    const checkMap = {};

    checksList.forEach(checkStr => {
        const parts = checkStr.split('::');
        const type = parts[0];
        const param1 = resolveVar(parts[1]);
        const param2 = resolveVar(parts[2]);
        const param3 = resolveVar(parts[3]);

        try {
            switch (type) {
                case 'status200':
                    checkMap['status is 200'] = (r) => r.status === 200;
                    break;
                case 'status201':
                    checkMap['status is 201'] = (r) => r.status === 201;
                    break;
                case 'status202':
                    checkMap['status is 202'] = (r) => r.status === 202;
                    break;
                case 'status204':
                    checkMap['status is 204'] = (r) => r.status === 204;
                    break;
                case 'statusOk':
                    checkMap['status is 2xx'] = (r) => r.status >= 200 && r.status < 300;
                    break;
                case 'isJson':
                    checkMap['is json'] = (r) => { try { return r.json() !== undefined; } catch (e) { return false; } };
                    break;
                case 'isArray':
                    checkMap['is array'] = (r) => { try { return Array.isArray(r.json()); } catch (e) { return false; } };
                    break;
                case 'notEmptyArray':
                    checkMap['array is not empty'] = (r) => { try { const a = r.json(); return Array.isArray(a) && a.length > 0; } catch (e) { return false; } };
                    break;
                case 'notEmptyBody':
                    checkMap['body is not empty'] = (r) => r.body != null && r.body.length > 0;
                    break;
                case 'hasField':
                    checkMap[`has field '${param1}'`] = (r) => {
                        try { return getByPath(r.json(), param1) !== undefined; } catch (e) { return false; }
                    };
                    break;
                case 'fieldEquals':
                    checkMap[`field '${param1}' == '${param2}'`] = (r) => {
                        try { return String(getByPath(r.json(), param1)) === String(param2); } catch (e) { return false; }
                    };
                    break;
                case 'fieldContains':
                    checkMap[`field '${param1}' contains '${param2}'`] = (r) => {
                        try { return String(getByPath(r.json(), param1)).includes(String(param2)); } catch (e) { return false; }
                    };
                    break;
                case 'fieldNotNull':
                    checkMap[`field '${param1}' is not null`] = (r) => {
                        try { return getByPath(r.json(), param1) != null; } catch (e) { return false; }
                    };
                    break;
                case 'fieldNotEmpty':
                    checkMap[`field '${param1}' is not empty`] = (r) => {
                        try {
                            const val = getByPath(r.json(), param1);
                            if (val == null) return false;
                            if (typeof val === 'string') return val.trim().length > 0;
                            if (Array.isArray(val)) return val.length > 0;
                            return true;
                        } catch (e) { return false; }
                    };
                    break;
                case 'isHtml':
                    checkMap['is html'] = (r) => {
                        const ct = (r.headers && (r.headers['Content-Type'] || r.headers['content-type'])) || '';
                        return ct.toLowerCase().includes('text/html');
                    };
                    break;
                case 'htmlContains':
                    checkMap[`html contains '${param1}'`] = (r) => {
                        try { return r.body != null && r.body.includes(param1); } catch (e) { return false; }
                    };
                    break;
                case 'htmlHasElement':
                    checkMap[`html has element '${param1}'`] = (r) => {
                        try { return r.html().find(param1).size() > 0; } catch (e) { return false; }
                    };
                    break;
                case 'fieldGreaterThan':
                    checkMap[`field '${param1}' > ${param2}`] = (r) => {
                        try { return Number(getByPath(r.json(), param1)) > Number(param2); } catch (e) { return false; }
                    };
                    break;
                case 'fieldLessThan':
                    checkMap[`field '${param1}' < ${param2}`] = (r) => {
                        try { return Number(getByPath(r.json(), param1)) < Number(param2); } catch (e) { return false; }
                    };
                    break;
                case 'fieldGreaterOrEqual':
                    checkMap[`field '${param1}' >= ${param2}`] = (r) => {
                        try { return Number(getByPath(r.json(), param1)) >= Number(param2); } catch (e) { return false; }
                    };
                    break;
                case 'fieldLessOrEqual':
                    checkMap[`field '${param1}' <= ${param2}`] = (r) => {
                        try { return Number(getByPath(r.json(), param1)) <= Number(param2); } catch (e) { return false; }
                    };
                    break;
                case 'fieldBetween':
                    checkMap[`field '${param1}' between ${param2} and ${param3}`] = (r) => {
                        try { const v = Number(getByPath(r.json(), param1)); return v >= Number(param2) && v <= Number(param3); } catch (e) { return false; }
                    };
                    break;
                case 'arrayLengthGreaterThan':
                    checkMap[`array '${param1}' length > ${param2}`] = (r) => {
                        try { const a = getByPath(r.json(), param1); return Array.isArray(a) && a.length > Number(param2); } catch (e) { return false; }
                    };
                    break;
                case 'arrayLengthEquals':
                    checkMap[`array '${param1}' length = ${param2}`] = (r) => {
                        try { const a = getByPath(r.json(), param1); return Array.isArray(a) && a.length === Number(param2); } catch (e) { return false; }
                    };
                    break;
                case 'fieldMatches':
                    checkMap[`field '${param1}' matches '${param2}'`] = (r) => {
                        try { return new RegExp(param2).test(String(getByPath(r.json(), param1))); } catch (e) { return false; }
                    };
                    break;
                case 'htmlTitleContains':
                    checkMap[`html title contains '${param1}'`] = (r) => {
                        try { return r.html('title').text().includes(param1); } catch (e) { return false; }
                    };
                    break;
                // ── File / Download checks ──────────────────────────────
                case 'contentType':
                    checkMap[`content-type includes '${param1}'`] = (r) => (r.headers['Content-Type'] || '').toLowerCase().includes((param1 || '').toLowerCase());
                    break;
                case 'contentDisposition':
                    checkMap[`content-disposition includes '${param1}'`] = (r) => (r.headers['Content-Disposition'] || '').toLowerCase().includes((param1 || 'attachment').toLowerCase());
                    break;
                case 'contentLengthGt':
                    checkMap[`content-length > ${param1} bytes`] = (r) => parseInt(r.headers['Content-Length'] || '0') > parseInt(param1 || '0');
                    break;
                case 'contentLengthEq':
                    checkMap[`content-length = ${param1} bytes`] = (r) => parseInt(r.headers['Content-Length'] || '0') === parseInt(param1 || '0');
                    break;
                case 'bodySizeGt':
                    checkMap[`body size > ${param1} bytes`] = (r) => { const b = r.body; if (!b) return false; if (b instanceof ArrayBuffer) return b.byteLength > parseInt(param1 || '0'); return (typeof b === 'string' ? b.length : 0) > parseInt(param1 || '0'); };
                    break;
                default:
                    // Fallback: try to use from C library
                    if (C[type]) {
                        checkMap[type] = C[type];
                    }
            }
        } catch (e) {
            console.error(`Check error: ${e.message}`);
        }
    });

    // Run all checks via k6's check() for metrics tracking
    const allPassed = check(res, checkMap);

    // Collect failed check names for CHECK_FAIL_LOG in executor.js
    const failed = [];
    if (!allPassed) {
        for (const [name, fn] of Object.entries(checkMap)) {
            try {
                if (!fn(res)) failed.push(name);
            } catch (e) {
                failed.push(`${name} (error: ${e.message})`);
            }
        }
    }

    return { passed: allPassed, failed };
}

export { C };
