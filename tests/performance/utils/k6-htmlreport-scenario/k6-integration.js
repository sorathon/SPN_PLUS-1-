// k6-integration.js — Redesigned Report v3
// Tabs: Overview | Details | Network | Errors | Thresholds

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export function handleSummary(data, reportOptions = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testType    = reportOptions.testType    || 'load';
    const environment = reportOptions.environment || 'local';
    const profile     = (reportOptions.profile  || '').replace(/\s+/g, '-').toLowerCase();
    const runLabel    = (reportOptions.runLabel  || '').replace(/\s+/g, '-').toLowerCase();
    const scenariosConfig  = reportOptions.scenariosConfig  || {};
    const enabledScenarios = reportOptions.enabledScenarios || null;
    const executionMode    = reportOptions.executionMode    || 'parallel';

    // Build optional suffix: -profile-label (omit empty parts)
    const _suffix = [profile, runLabel].filter(Boolean).map(s => `-${s}`).join('');

    console.log('📊 Generating HTML performance report...');

    const responseLogs = reportOptions.responseLogs || [];
    const thresholds = deriveThresholds(scenariosConfig, enabledScenarios);
    const htmlContent = generateHTMLReport(data, {
        title:    reportOptions.customTitle    || 'K6 Performance Test Report',
        subtitle: reportOptions.customSubtitle || `${environment} — ${testType}`,
        enabledScenarios,
        scenariosConfig,
        thresholds,
        testType,
        environment,
        executionMode,
        profile,
        responseLogs,
    });

    // Embed run metadata into JSON results for Trend Analyzer
    const resultData = {
        _meta: {
            testType,
            environment,
            profile:  profile  || null,
            runLabel: runLabel || null,
            runAt:    new Date().toISOString(),
        },
        ...data,
    };

    return {
        [`reports/k6-report-${testType}-${environment}${_suffix}-${timestamp}.html`]: htmlContent,
        [`reports/k6-results-${testType}-${environment}${_suffix}-${timestamp}.json`]: JSON.stringify(resultData, null, 2),
        stdout: generateConsoleSummary(data, testType, thresholds),
    };
}

// ==============================================================================
// DERIVE THRESHOLDS FROM SCENARIO CONFIG
// ==============================================================================
function deriveThresholds(scenariosConfig, enabledScenarios) {
    const names  = enabledScenarios || Object.keys(scenariosConfig || {});
    const active = names.filter(n => scenariosConfig?.[n]?.thresholds);
    if (active.length === 0) return { p95: 1000, failRate: 5, checksPass: 90, minThroughput: 1 };

    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
        p95: Math.round(avg(active.map(n => scenariosConfig[n].thresholds?.duration_p95 || 1000))),
        failRate: avg(active.map(n => {
            const fr = scenariosConfig[n].thresholds?.failure_rate || 'rate<0.05';
            const m  = fr.match(/rate\s*<\s*([\d.]+)/);
            return m ? parseFloat(m[1]) * 100 : 5;
        })),
        checksPass:    Math.round(avg(active.map(n => scenariosConfig[n].thresholds?.checks_pass    ?? 90))),
        minThroughput: Math.round(avg(active.map(n => scenariosConfig[n].thresholds?.min_throughput ?? 1))),
    };
}

// ==============================================================================
// MAIN REPORT GENERATOR
// ==============================================================================
function generateHTMLReport(data, options) {
    const processed = processK6Results(data, options);
    let html = getEmbeddedTemplate();
    Object.keys(processed).forEach(key => {
        const value = String(processed[key] ?? '');
        // Replacer must be a function — a string replacement would let JS interpret
        // "$&", "$'", "$1" etc. inside check names / error text as special patterns,
        // corrupting/duplicating the template (e.g. a check name ending in "...)$'").
        html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), () => value);
    });
    return html.replace(/\{\{[^}]+\}\}/g, '');
}

// ==============================================================================
// PROCESS K6 RESULTS → TEMPLATE VARIABLES
// ==============================================================================
function processK6Results(data, options) {
    const metrics = data.metrics || {};
    const state   = data.state   || {};

    const httpReqDuration = metrics.http_req_duration?.values || {};
    const httpReqs        = metrics.http_reqs?.values         || {};
    const httpReqFailed   = metrics.http_req_failed?.values   || {};
    const vusMax          = metrics.vus_max?.values           || {};
    const checks          = metrics.checks?.values            || {};

    const httpErrorRate       = (httpReqFailed.rate || 0) * 100;
    const httpFailedRequests  = httpReqFailed.passes || 0;
    const validationErrors    = metrics.validation_errors?.values || {};
    const validationErrorRate = (validationErrors.rate || 0) * 100;
    const validationFailCount = metrics.validation_error_count?.values?.count || 0;
    const combinedErrorRate   = Math.max(httpErrorRate, validationErrorRate);
    const totalErrors         = Math.max(httpFailedRequests, validationFailCount);
    const totalRequests       = httpReqs.count || 0;
    const duration            = Math.round((state.testRunDurationMs || 0) / 1000);
    const checksRate          = (checks.rate || 0) * 100;
    const p95ResponseTime     = Math.round(httpReqDuration['p(95)'] || 0);
    const throughput          = (httpReqs.rate || 0);
    const maxVUs              = vusMax.max || 0;

    const thresholds = options.thresholds || {};
    const enabledScenarios = options.enabledScenarios || null;

    // Status helpers
    const rtStatus     = getResponseTimeStatus(p95ResponseTime, thresholds.p95);
    const errStatus    = getErrorRateStatus(combinedErrorRate, thresholds.failRate);
    const chkStatus    = getChecksStatus(checksRate, thresholds.checksPass);
    const chartData    = generateChartData(metrics);
    const verdict      = getOverallVerdict(metrics);

    // KPI suggestions
    const kpiSugg = generateKPISuggestions(p95ResponseTime, combinedErrorRate, throughput, checksRate, thresholds);

    // Analysis cards
    const quickAnalysis = generateQuickAnalysisCards(
        p95ResponseTime, combinedErrorRate, throughput, checksRate,
        maxVUs, totalRequests, duration, chartData.distribution, thresholds
    );

    // Distribution
    const distLabels = ['< 500ms', '500ms–1s', '1s–2s', '> 2s'];
    const distColors = ['dist-bar-excellent', 'dist-bar-good', 'dist-bar-fair', 'dist-bar-poor'];
    const distData   = distLabels.map((label, i) => ({
        label, pct: Math.round(chartData.distribution[i]), color: distColors[i],
    })).sort((a, b) => b.pct - a.pct);

    // Sections
    const networkSection      = processNetworkTiming(metrics);
    const percentileSection   = processPercentileTable(metrics);
    const scenarioBreakdown   = processTaggedMetrics(metrics, 'scenario', 'Scenario Performance Breakdown', enabledScenarios, options.scenariosConfig || {});
    const checksTable         = processChecksTable(data, enabledScenarios);
    const thresholdsSection   = processThresholds(metrics, enabledScenarios);
    const errorDetails        = processErrorDetails(data, enabledScenarios);
    const responseErrorGroups = processFailedCheckEndpoints(data, options.scenariosConfig || {});

    // Config bar — compute start/end time from testRunDurationMs
    const endTimeMs   = Date.now();
    const startTimeMs = endTimeMs - (state.testRunDurationMs || 0);
    const startTimeStr = formatDate(new Date(startTimeMs));
    const endTimeStr   = formatDate(new Date(endTimeMs));
    const configBar = buildConfigBar(options, maxVUs, duration, startTimeStr, endTimeStr);

    // Overview key metrics (numbers only, no guide text)
    const overviewKeyMetrics = generateOverviewKeyMetrics(metrics, maxVUs, duration, totalRequests);
    const overviewLoadProfile = processLoadProfileCard(options);

    // Guide overview summary (narrative, no grade)
    const p50ResponseTime = Math.round(httpReqDuration['med'] || 0);
    const overviewSummary = generateOverviewSummary(
        p95ResponseTime, p50ResponseTime, Math.round(httpReqDuration['avg'] || 0),
        combinedErrorRate, throughput, checksRate,
        maxVUs, totalRequests, duration, chartData.distribution, thresholds
    );

    return {
        // Meta
        title:     options.title,
        subtitle:  options.subtitle,
        timestamp: formatDate(new Date()),
        config_bar: configBar,

        // Verdict
        verdict_label: verdict.label,
        verdict_class: verdict.class,
        verdict_icon:  verdict.icon,
        verdict_text:  verdict.text,

        // KPI strip
        kpi_p95:           p95ResponseTime,
        kpi_p95_status:    rtStatus.class,
        kpi_p95_sugg:      kpiSugg.p95,
        kpi_error:         combinedErrorRate.toFixed(2),
        kpi_error_status:  errStatus.class,
        kpi_error_sugg:    kpiSugg.error,
        kpi_throughput:    throughput.toFixed(0),
        kpi_tp_sugg:       kpiSugg.throughput,
        kpi_checks:        checksRate.toFixed(1),
        kpi_checks_status: chkStatus.class,
        kpi_checks_sugg:   kpiSugg.checks,
        kpi_requests:      totalRequests.toLocaleString(),
        kpi_duration:      formatDuration(duration),
        kpi_vus:           maxVUs,

        // Overview
        sorted_distribution_data: JSON.stringify(distData),
        overview_load_profile:    overviewLoadProfile,
        overview_key_metrics:     overviewKeyMetrics,

        // Guide tab
        overview_summary:     overviewSummary,
        quick_analysis_cards: quickAnalysis,

        // Details tab
        percentile_table:    percentileSection,
        scenario_breakdown:  scenarioBreakdown,
        checks_table:        checksTable,

        // Network tab
        network_rows:   networkSection.html,
        network_sugg:   networkSection.ttfbSugg,
        data_received:  networkSection.dataReceived,
        data_sent:      networkSection.dataSent,
        data_recv_rate: networkSection.dataReceivedRate,
        data_sent_rate: networkSection.dataSentRate,

        // Errors tab
        total_failed_requests: totalErrors.toLocaleString(),
        error_rate:            combinedErrorRate.toFixed(2),
        failed_check_types:    (data.root_group?.checks || []).filter(c => c.fails > 0).length,
        error_details:         errorDetails,
        response_error_groups: responseErrorGroups,

        // Thresholds tab
        thresholds_section: thresholdsSection,
    };
}

// ==============================================================================
// OVERALL VERDICT
// ==============================================================================
function getOverallVerdict(metrics) {
    let passed = 0, failed = 0;
    for (const key in metrics) {
        const m = metrics[key];
        if (m.thresholds) {
            for (const cond in m.thresholds) {
                m.thresholds[cond].ok ? passed++ : failed++;
            }
        }
    }
    if (failed > 0) return { label: 'FAIL', class: 'verdict-fail', icon: '❌', text: `${failed} threshold${failed > 1 ? 's' : ''} failed` };
    if (passed > 0) return { label: 'PASS', class: 'verdict-pass', icon: '✅', text: `All ${passed} thresholds passed` };
    return { label: 'INFO', class: 'verdict-info', icon: 'ℹ️', text: 'No thresholds defined' };
}

// ==============================================================================
// KPI MICRO-SUGGESTIONS
// ==============================================================================
function generateKPISuggestions(p95, errorRate, throughput, checksRate, thresholds) {
    const p95Threshold  = thresholds.p95      || 1000;
    const failThreshold = thresholds.failRate  || 5;
    const ratio    = p95Threshold > 0 ? p95 / p95Threshold : 1;
    const headroom = Math.round((1 - ratio) * 100);

    // P95: อธิบายว่า 95th percentile หมายถึงอะไร + ชี้ไปที่ table
    const p95Sugg = ratio <= 1.0
        ? `95 ใน 100 request ได้รับ response ภายใน <strong>${p95}ms</strong> — ยังเหลือ headroom ${headroom}% ก่อนถึง threshold ${p95Threshold}ms ดู Percentile Table ใน Details เพื่อเทียบ P50 vs P95 (gap ใหญ่ = variance สูง)`
        : `P95 = <strong>${p95}ms</strong> เกิน threshold ${p95Threshold}ms — ดู Network tab เพื่อดูว่า phase ไหน (TTFB/TCP/Sending) คิดเป็นสัดส่วนใหญ่ที่สุด`;

    // Error: แยกแยะ HTTP error กับ validation + ชี้ไปที่ Errors tab
    let errorSugg;
    if (errorRate === 0) {
        errorSugg = 'ไม่พบ HTTP error ในการทดสอบนี้ — ดู Checks tab เพื่อตรวจสอบว่า response body/header ตรงกับ expectation ที่กำหนด';
    } else if (errorRate < failThreshold) {
        errorSugg = `${errorRate.toFixed(2)}% ของ request ได้รับ HTTP error — ดู Errors tab เพื่อดู status code และ pattern ว่าเกิดช่วงไหนของ test`;
    } else {
        errorSugg = `${errorRate.toFixed(2)}% เกิน threshold ${failThreshold}% — ดู Errors tab เพื่อแยกว่าเป็น network timeout, 4xx (client error) หรือ 5xx (server error)`;
    }

    // Throughput: อธิบายความหมาย req/s ในบริบท + แนะนำเทียบกับ production
    const throughputSugg = `${Math.round(throughput)} req/s คือ throughput ที่ทำได้ด้วย VU ชุดนี้ — เทียบกับ production peak traffic เพื่อดูว่าต้องการ VU เท่าไหร่ในการ simulate load จริง`;

    // Checks: อธิบายความต่างของ HTTP error กับ assertion fail
    let checksSugg;
    if (checksRate >= 100) {
        checksSugg = 'Response ตรงตาม assertion ทุก request — ทบทวนใน Checks tab ว่า assertion ครอบคลุม business logic (status, body field, response time) ที่ต้องการหรือยัง';
    } else {
        const failPct = (100 - checksRate).toFixed(1);
        checksSugg = `${failPct}% ของ request ไม่ผ่าน assertion — ดู Checks tab เพื่อดูว่า check ไหนที่ fail (status code, response body, หรือ header)`;
    }

    return { p95: p95Sugg, error: errorSugg, throughput: throughputSugg, checks: checksSugg };
}

// ==============================================================================
// QUICK ANALYSIS CARDS (Guide tab — concise interpretation, not value-specific)
// ==============================================================================
function generateOverviewSummary(p95, p50, avg, errorRate, throughput, checksRate, vus, totalRequests, duration, distribution, thresholds) {
    const rps      = parseFloat(throughput);
    const tpTarget = thresholds.minThroughput || 0;
    const p95T     = thresholds.p95 || 0;
    const excPct   = Math.round(distribution[0] || 0);
    const slowPct  = Math.round((distribution[2] || 0) + (distribution[3] || 0));

    // Throughput sentence
    const tpLine = tpTarget > 1
        ? `ทดสอบด้วย <strong>${vus} VUs</strong> นาน <strong>${formatDuration(duration)}</strong> ส่ง request ทั้งหมด <strong>${totalRequests.toLocaleString()} ครั้ง</strong> ที่ throughput <strong>${rps.toFixed(1)} req/s</strong> (target ${tpTarget} req/s)`
        : `ทดสอบด้วย <strong>${vus} VUs</strong> นาน <strong>${formatDuration(duration)}</strong> ส่ง request ทั้งหมด <strong>${totalRequests.toLocaleString()} ครั้ง</strong> ที่ throughput <strong>${rps.toFixed(1)} req/s</strong>`;

    // Response time sentence
    let rtLine;
    if (p50 < 50 && avg > p50 * 5) {
        rtLine = `Response time มี spread กว้าง — P50 = <strong>${p50}ms</strong> แต่ Avg = <strong>${avg}ms</strong>, P95 = <strong>${p95}ms</strong> บ่งชี้ว่ามี request บางส่วนที่ใช้เวลาสูงกว่าค่าทั่วไปมาก`;
    } else {
        rtLine = `Response time อยู่ที่ P50 <strong>${p50}ms</strong>, Avg <strong>${avg}ms</strong>, P95 <strong>${p95}ms</strong>`;
    }
    if (p95T > 0) {
        rtLine += p95 <= p95T
            ? ` — อยู่ในเกณฑ์ threshold ที่กำหนด (<strong>${p95T}ms</strong>)`
            : ` — เกิน threshold ที่กำหนด (<strong>${p95T}ms</strong>)`;
    }

    // Distribution sentence
    const distLine = `<strong>${excPct}%</strong> ของ request ตอบภายใน 500ms${slowPct > 0 ? `, มี <strong>${slowPct}%</strong> ที่ใช้เวลาเกิน 1 วินาที` : ''}`;

    // Error/checks sentence
    const errLine = errorRate === 0 && checksRate >= 100
        ? `ไม่พบ HTTP error และ checks ผ่านครบ <strong>100%</strong>`
        : errorRate === 0
        ? `ไม่พบ HTTP error แต่ checks ผ่าน <strong>${checksRate.toFixed(1)}%</strong>`
        : `Error rate <strong>${errorRate.toFixed(2)}%</strong>, checks ผ่าน <strong>${checksRate.toFixed(1)}%</strong>`;

    return `
    <div class="card" style="margin-bottom:1.25rem">
      <h2 class="card-title">📋 Test Summary</h2>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:.6rem;font-size:.875rem;color:var(--text-secondary);line-height:1.6">
        <li>🔹 ${tpLine}</li>
        <li>⏱ ${rtLine}</li>
        <li>📊 ${distLine}</li>
        <li>🛡️ ${errLine}</li>
      </ul>
    </div>`;
}

function generateQuickAnalysisCards(p95, errorRate, throughput, checksRate, vus, totalRequests, duration, distribution, thresholds) {
    const p95T     = thresholds.p95 || 1000;
    const failT    = thresholds.failRate || 5;
    const ratio    = p95T > 0 ? p95 / p95T : 1;
    const excPct   = Math.round(distribution[0] || 0);
    const slowPct  = Math.round((distribution[2] || 0) + (distribution[3] || 0));
    const rps      = parseFloat(throughput);

    // ── Response Time guide ──
    // ratio > 1.0 means threshold exceeded; but if P95 < 1000ms it's still moderate, not "poor"
    const perfStatus = ratio <= 0.3 && excPct >= 70 ? 'excellent'
                     : ratio <= 0.7                  ? 'good'
                     : ratio <= 1.0                  ? 'fair'
                     : p95 < 1000                    ? 'fair' : 'poor';
    const perfText = ratio <= 1.0
        ? `P95 อยู่ในเกณฑ์ threshold — ดู <em>Details › Percentile Table</em> เพื่อเทียบ P50 vs P95<br>
           <strong>Gap ใหญ่</strong> = มี outlier ที่ตอบช้า · <strong>Gap เล็ก</strong> = response สม่ำเสมอ`
        : `P95 เกิน threshold — ดู <em>Network tab</em> เพื่อหา phase ที่ใช้เวลามากที่สุด<br>
           TTFB สูง = server processing · TCP/TLS สูง = network · Sending สูง = payload ใหญ่`;

    // ── Error & Checks guide ──
    let stabStatus, stabText;
    if (errorRate === 0 && checksRate >= 100) {
        stabStatus = 'excellent';
        stabText   = `ไม่พบ HTTP error และ checks ผ่านทั้งหมด<br>
                      ทบทวนว่า assertion ครอบคลุม business logic ที่ต้องการหรือยัง (status, body field, header)`;
    } else if (errorRate === 0 && checksRate < 100) {
        stabStatus = 'fair';
        stabText   = `HTTP error = 0% แต่ checks ไม่ผ่านทั้งหมด<br>
                      Server ตอบ 2xx แต่ response body/header ไม่ตรง assertion — ดู <em>Errors tab</em>`;
    } else {
        stabStatus = errorRate >= failT ? 'poor' : 'fair';
        stabText   = `พบ HTTP error และ/หรือ checks fail<br>
                      4xx = client/auth error · 5xx = server error · timeout = capacity/network<br>
                      ดู <em>Errors tab</em> เพื่อดูรายละเอียดและ pattern ที่เกิดขึ้น`;
    }

    // ── Throughput & Scaling guide ──
    // If a target TPS is configured, rate against it (arrival-rate tests); else use absolute bands
    const tpTarget = thresholds.minThroughput || 0;
    const capStatus = tpTarget > 1
        ? (rps / tpTarget >= 0.95 ? 'excellent' : rps / tpTarget >= 0.80 ? 'good' : rps / tpTarget >= 0.60 ? 'fair' : 'poor')
        : (rps >= 500 ? 'excellent' : rps >= 100 ? 'good' : rps >= 15 ? 'fair' : 'poor');
    const rpsPerVU  = vus > 0 ? (rps / vus).toFixed(2) : '—';
    let capText;
    if (tpTarget > 1) {
        const tpRatio   = rps / tpTarget;
        const tpPct     = Math.round(tpRatio * 100);
        const tpAchieved = `achieved <strong>${rps.toFixed(1)}/${tpTarget} req/s (${tpPct}%)</strong>`;
        const stability  = tpRatio >= 0.95
            ? `throughput เสถียร ส่งได้ตามเป้า`
            : tpRatio >= 0.80
            ? `throughput ใกล้เคียงเป้าแต่มี jitter`
            : `throughput ต่ำกว่าเป้า — อาจมี bottleneck`;
        const nextStep   = tpRatio >= 0.95
            ? `ลองเพิ่ม target TPS เพื่อหา capacity limit ของระบบ`
            : tpRatio >= 0.80
            ? `ตรวจสอบว่า VU pool เพียงพอ และดู P95 ว่า response ช้าลงหรือไม่`
            : `ตรวจสอบ VU pool size และ server capacity — อาจเป็น bottleneck`;
        capText = `${tpAchieved} — ${stability}<br>
                   req/s per VU = <strong>${rpsPerVU}</strong> (ปกติสำหรับ TPS mode เพราะ VU ส่วนใหญ่ idle รอ slot)<br>
                   <strong>ขั้นต่อไป:</strong> ${nextStep}`;
    } else {
        const nextStep = rps >= 100
            ? `ลอง stress test โดยเพิ่ม VU ขึ้นเรื่อยๆ แล้วดูว่า req/s/VU เริ่มลดลงที่จุดไหน`
            : rps >= 15
            ? `เพิ่ม VU แล้วเทียบ req/s/VU — ถ้าลดลงแสดงว่าถึง server capacity แล้ว`
            : `throughput ต่ำ — ตรวจสอบ response time และ error rate ก่อนเพิ่ม VU`;
        capText = `req/s per VU = <strong>${rpsPerVU}</strong> — บอกประสิทธิภาพของแต่ละ VU<br>
                   เพิ่ม VUs แล้ว req/s/VU <strong>ลดลง</strong> = server contention · <strong>คงที่</strong> = scale ได้ดี<br>
                   <strong>ขั้นต่อไป:</strong> ${nextStep}`;
    }

    return [
        { icon: '🏃', title: 'Response Time', status: perfStatus, text: perfText },
        { icon: '🛡️', title: 'Error & Validation', status: stabStatus, text: stabText },
        { icon: '⚡', title: 'Throughput & Scaling', status: capStatus, text: capText },
    ].map(c => `
        <div class="analysis-card border-${c.status}">
            <div class="analysis-header">
                <span class="analysis-icon">${c.icon}</span>
                <span class="analysis-title">${c.title}</span>
                <span class="status-badge ${c.status}">${
                    c.status === 'excellent' ? '🌟 Excellent' :
                    c.status === 'good'      ? '✅ Good'      :
                    c.status === 'fair'      ? '⚠️ Fair'      : '❌ Poor'
                }</span>
            </div>
            <p class="analysis-text">${c.text}</p>
        </div>
    `).join('');
}

// ==============================================================================
// LOAD PROFILE CARD (Overview tab)
// ==============================================================================
function processLoadProfileCard(options) {
    const scenariosConfig  = options.scenariosConfig  || {};
    const enabledScenarios = options.enabledScenarios || Object.keys(scenariosConfig);
    const profile      = options.profile      || null;
    const executionMode = (options.executionMode || 'parallel').toUpperCase();

    // Pick load config from first enabled scenario (all share the same profile)
    const firstName = enabledScenarios[0];
    const firstOpts = firstName ? (scenariosConfig[firstName]?.options || {}) : {};
    const executor  = firstOpts.executor || '—';

    // Format load shape based on executor type
    function formatLoad(opts) {
        if (opts.executor === 'ramping-vus' || opts.executor === 'ramping-arrival-rate') {
            const stages = opts.stages || [];
            if (stages.length === 0) return '—';
            let prev = 0;
            const parts = stages.map(s => {
                const t = s.target ?? 0;
                const label = prev === t
                    ? `<span class="lp-hold">${t} VU · ${s.duration}</span>`
                    : `<span class="lp-ramp">${prev}→${t} VU · ${s.duration}</span>`;
                prev = t;
                return label;
            });
            return parts.join('<span class="lp-arrow">›</span>');
        }
        if (opts.executor === 'constant-vus') {
            return `<span class="lp-hold">${opts.vus || 0} VUs · ${opts.duration || '—'}</span>`;
        }
        if (opts.executor === 'constant-arrival-rate') {
            const unit = opts.timeUnit || '1s';
            return `<span class="lp-hold">${opts.rate || 0} req/${unit} · ${opts.duration || '—'}</span>`;
        }
        if (opts.executor === 'per-vu-iterations' || opts.executor === 'shared-iterations') {
            return `<span class="lp-hold">${opts.vus || 0} VUs · ${opts.iterations || 0} iterations</span>`;
        }
        return opts.duration || '—';
    }

    const loadShape = formatLoad(firstOpts);
    const gracefulStop = firstOpts.gracefulStop || null;

    // Scenarios list
    const scenarioItems = enabledScenarios.map(n =>
        `<span class="lp-scenario-chip">${_esc(n)}</span>`
    ).join('');

    return `
    <div class="card lp-card">
        <div class="lp-grid">
            <div class="lp-col">
                <div class="lp-col-title">⚡ Load Profile</div>
                <table class="lp-table">
                    ${profile ? `<tr><td class="lp-label">Profile</td><td class="lp-val"><strong>${_esc(profile)}</strong></td></tr>` : ''}
                    <tr><td class="lp-label">Executor</td><td class="lp-val"><code class="lp-code">${_esc(executor)}</code></td></tr>
                    <tr><td class="lp-label">Load</td><td class="lp-val lp-shape">${loadShape}</td></tr>
                    ${gracefulStop ? `<tr><td class="lp-label">Graceful Stop</td><td class="lp-val">${_esc(gracefulStop)}</td></tr>` : ''}
                    <tr><td class="lp-label">Mode</td><td class="lp-val">${executionMode}</td></tr>
                </table>
            </div>
            <div class="lp-divider"></div>
            <div class="lp-col">
                <div class="lp-col-title">📋 Active Scenarios <span class="lp-count">${enabledScenarios.length}</span></div>
                <div class="lp-scenarios">${scenarioItems}</div>
            </div>
        </div>
    </div>`;
}

// ==============================================================================
// OVERVIEW KEY METRICS TABLE (Overview tab — numbers only)
// ==============================================================================
function generateOverviewKeyMetrics(metrics, vus, duration, totalReqs) {
    const dur  = metrics.http_req_duration?.values || {};
    const reqs = metrics.http_reqs?.values || {};

    const rows = [
        ['Min', Math.round(dur.min   || 0) + 'ms'],
        ['Average', Math.round(dur.avg   || 0) + 'ms'],
        ['Median (P50)', Math.round(dur.med   || 0) + 'ms'],
        ['P90', Math.round(dur['p(90)'] || 0) + 'ms'],
        ['P95', Math.round(dur['p(95)'] || 0) + 'ms'],
        ['Max', Math.round(dur.max   || 0) + 'ms'],
    ].map(([label, val]) => `
        <tr>
            <td style="font-weight:600;color:var(--text-secondary)">${label}</td>
            <td class="text-mono font-bold">${val}</td>
        </tr>`).join('');

    return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-top:1.25rem">
            <div class="card">
                <h2 class="card-title">⏱ Response Time Summary</h2>
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
            <div class="card">
                <h2 class="card-title">📋 Test Summary</h2>
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>Item</th><th>Value</th></tr></thead>
                        <tbody>
                            <tr><td style="font-weight:600;color:var(--text-secondary)">Virtual Users</td><td class="text-mono font-bold">${vus}</td></tr>
                            <tr><td style="font-weight:600;color:var(--text-secondary)">Duration</td><td class="text-mono font-bold">${formatDuration(duration)}</td></tr>
                            <tr><td style="font-weight:600;color:var(--text-secondary)">Total Requests</td><td class="text-mono font-bold">${totalReqs.toLocaleString()}</td></tr>
                            <tr><td style="font-weight:600;color:var(--text-secondary)">Throughput</td><td class="text-mono font-bold">${(reqs.rate || 0).toFixed(1)} req/s</td></tr>
                            <tr><td style="font-weight:600;color:var(--text-secondary)">Req/s per VU</td><td class="text-mono font-bold">${vus > 0 ? ((reqs.rate || 0) / vus).toFixed(2) : '—'}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ==============================================================================
// CONFIG BAR
// ==============================================================================
function buildConfigBar(options, vus, duration, startTime, endTime) {
    const env      = options.environment  || '—';
    const mode     = (options.executionMode || 'parallel').toUpperCase();
    const scCount = (options.enabledScenarios || []).length || '—';
    return `
        <div class="config-bar">
            <span>📍 <strong>${env}</strong></span>
            <span class="sep">|</span>
            <span>📝 ${scCount} scenario${scCount > 1 ? 's' : ''}</span>
            <span class="sep">|</span>
            <span>👥 <strong>${vus}</strong> VUs</span>
            <span class="sep">|</span>
            <span>⏱ <strong>${formatDuration(duration)}</strong></span>
            <span class="sep">|</span>
            <span>🔄 ${mode}</span>
            <span class="sep">|</span>
            <span>🟢 Start: <strong>${startTime}</strong></span>
            <span class="sep">→</span>
            <span>🔴 End: <strong>${endTime}</strong></span>
        </div>
    `;
}

// ==============================================================================
// PERCENTILE TABLE (Details tab)
// ==============================================================================
function processPercentileTable(metrics) {
    const dur = metrics.http_req_duration?.values || {};
    const maxVal = Math.round(dur.max || 1);
    const rows = [
        { label: 'Min',         value: Math.round(dur.min   || 0) },
        { label: 'Average',     value: Math.round(dur.avg   || 0) },
        { label: 'P50 (Median)',value: Math.round(dur.med   || 0) },
        { label: 'P90',         value: Math.round(dur['p(90)'] || 0) },
        { label: 'P95',         value: Math.round(dur['p(95)'] || 0) },
        { label: 'Max',         value: maxVal },
    ];

    return `
        <div class="card" style="margin-bottom:24px">
            <h2 class="card-title">⏱ Response Time Percentiles</h2>
            <div class="table-container">
                <table class="data-table">
                    <thead><tr>
                        <th>Metric</th><th>Value</th><th style="min-width:200px">Distribution</th>
                    </tr></thead>
                    <tbody>
                        ${rows.map(r => {
                            const pct   = maxVal > 0 ? Math.min(100, Math.round((r.value / maxVal) * 100)) : 0;
                            const color = r.value > 2000 ? '#ef4444' : r.value > 1000 ? '#f59e0b' : r.value > 500 ? '#06b6d4' : '#10b981';
                            const cls   = r.value > 2000 ? 'poor' : r.value > 1000 ? 'fair' : '';
                            return `<tr>
                                <td style="font-weight:600">${r.label}</td>
                                <td class="text-mono font-bold ${cls}">${r.value}ms</td>
                                <td><div class="time-bar-wrap"><div class="time-bar" style="width:${pct}%;background:${color}"></div></div></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ==============================================================================
// CHECKS TABLE (Details tab)
// ==============================================================================
function processChecksTable(data, enabledScenarios) {
    const groups    = data.root_group?.groups || [];
    const flatChecks = data.root_group?.checks || [];
    const hasGroups = groups.some(g => (g.checks || []).length > 0);

    function buildRows(checks) {
        return checks.map(c => {
            const total = c.passes + c.fails;
            const rate  = total > 0 ? ((c.passes / total) * 100).toFixed(1) : '100.0';
            const cls   = parseFloat(rate) >= 95 ? 'excellent' : parseFloat(rate) >= 80 ? 'fair' : 'poor';
            return `<tr>
                <td style="font-weight:600">${c.name}</td>
                <td class="text-mono">${c.passes.toLocaleString()}</td>
                <td class="text-mono ${c.fails > 0 ? 'poor' : ''}">${c.fails.toLocaleString()}</td>
                <td class="text-mono font-bold ${cls}">${rate}%</td>
                <td><span class="status-badge ${cls}">${parseFloat(rate) >= 95 ? '✅ Pass' : '❌ Fail'}</span></td>
            </tr>`;
        }).join('');
    }

    function buildTable(checks, title) {
        if (checks.length === 0) return '';
        return `
            <div style="margin-bottom:20px">
                ${title ? `<div style="font-weight:600;color:#e6b450;font-size:0.85rem;margin-bottom:6px">📋 ${title}</div>` : ''}
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr>
                            <th>Check Name</th><th>Passed</th><th>Failed</th><th>Pass Rate</th><th>Status</th>
                        </tr></thead>
                        <tbody>${buildRows(checks)}</tbody>
                    </table>
                </div>
            </div>`;
    }

    // ── Grouped by scenario (when executor uses group()) ──
    if (hasGroups) {
        const tables = groups
            .filter(g => (g.checks || []).length > 0)
            .map(g => buildTable(g.checks, g.name))
            .join('');
        if (!tables) return '<div class="no-data">No checks recorded.</div>';
        return `<div class="card"><h2 class="card-title">🛡️ Checks Breakdown</h2>${tables}</div>`;
    }

    // ── Fallback: flat checks ──
    if (flatChecks.length === 0) return '<div class="no-data">No checks recorded.</div>';
    return `<div class="card"><h2 class="card-title">🛡️ Checks Breakdown</h2>${buildTable(flatChecks, '')}</div>`;
}

// ==============================================================================
// NETWORK TIMING (Network tab)
// ==============================================================================
function processNetworkTiming(metrics) {
    const phases = [
        { key: 'http_req_blocked',         label: 'DNS / Queuing',  color: '#6366f1', desc: 'รอ connection slot หรือ DNS resolve' },
        { key: 'http_req_connecting',       label: 'TCP Connect',   color: '#0ea5e9', desc: 'สร้าง TCP connection' },
        { key: 'http_req_tls_handshaking',  label: 'TLS Handshake', color: '#8b5cf6', desc: 'negotiate SSL/TLS' },
        { key: 'http_req_sending',          label: 'Sending',       color: '#f59e0b', desc: 'ส่ง request body ไปยัง server' },
        { key: 'http_req_waiting',          label: 'TTFB',          color: '#ef4444', desc: 'Time to First Byte — server ประมวลผล' },
        { key: 'http_req_receiving',        label: 'Receiving',     color: '#10b981', desc: 'download response body' },
    ];

    const phaseData = phases.map(p => ({
        ...p,
        avg: Math.round(metrics[p.key]?.values?.avg       || 0),
        p95: Math.round(metrics[p.key]?.values?.['p(95)'] || 0),
    }));

    const totalAvg = phaseData.reduce((s, p) => s + p.avg, 0) || 1;
    const ttfb     = phaseData.find(p => p.key === 'http_req_waiting');

    let ttfbSugg;
    const ta      = ttfb?.avg || 0;
    const ttfbPct = totalAvg > 0 ? Math.round((ta / totalAvg) * 100) : 0;
    // TTFB = เวลาที่ server ใช้ประมวลผลก่อนส่ง byte แรกกลับ (ไม่รวม network transit)
    // อธิบายความหมาย + ชี้ให้ดูว่าควร investigate อะไรต่อ
    if (ta < 50) {
        ttfbSugg = `TTFB avg = <strong>${ta}ms</strong> (${ttfbPct}% ของ total response time) — server ประมวลผลและส่ง byte แรกกลับเร็ว ถ้า total response time ยังสูง ให้ดูที่ network phase อื่น เช่น TCP connect หรือ Receiving`;
    } else if (ta < 200) {
        ttfbSugg = `TTFB avg = <strong>${ta}ms</strong> (${ttfbPct}% ของ total response time) — เวลา server ประมวลผลอยู่ในระดับปกติ ถ้าต้องการลดเพิ่มเติม ให้ตรวจสอบ DB query plan และ application-level cache`;
    } else if (ta < 500) {
        ttfbSugg = `TTFB avg = <strong>${ta}ms</strong> (${ttfbPct}% ของ total response time) — TTFB คิดเป็นสัดส่วนใหญ่ของ response time บ่งชี้ว่า server ใช้เวลา processing นาน ตรวจสอบ: slow DB query, N+1 query, หรือ synchronous blocking call`;
    } else if (ta < 1000) {
        ttfbSugg = `TTFB avg = <strong>${ta}ms</strong> (${ttfbPct}% ของ total response time) — TTFB สูง server ใช้เวลา processing มาก แนะนำตรวจสอบ: DB index, query optimization, caching layer (Redis/Memcached), หรือ async processing`;
    } else {
        ttfbSugg = `TTFB avg = <strong>${ta}ms</strong> (${ttfbPct}% ของ total response time) — TTFB >1s แสดงว่า server ใช้เวลามากในการ generate response ตรวจสอบ: DB connection pool exhaustion, long-running transaction, memory pressure, หรือ external service dependency`;
    }

    const html = phaseData.map(p => {
        const pct = Math.round((p.avg / totalAvg) * 100);
        return `<tr>
            <td><span class="phase-dot" style="background:${p.color}"></span>${p.label}</td>
            <td class="text-mono font-bold">${p.avg}ms</td>
            <td class="text-mono">${p.p95}ms</td>
            <td style="width:180px">
                <div class="phase-bar-wrap">
                    <div class="phase-bar" style="width:${pct}%;background:${p.color}"></div>
                </div>
            </td>
            <td class="text-sm text-muted">${p.desc}</td>
        </tr>`;
    }).join('');

    // Data transfer
    const recv     = metrics.data_received?.values || {};
    const sent     = metrics.data_sent?.values     || {};
    const dataReceived     = formatBytes(recv.count || 0);
    const dataSent         = formatBytes(sent.count || 0);
    const dataReceivedRate = formatBytes(recv.rate  || 0) + '/s';
    const dataSentRate     = formatBytes(sent.rate  || 0) + '/s';

    return { html, ttfbSugg, dataReceived, dataSent, dataReceivedRate, dataSentRate };
}

// ==============================================================================
// SCENARIO BREAKDOWN (Details tab — same logic as before)
// ==============================================================================
function processTaggedMetrics(metrics, tagName, cardTitle, enabledScenarios = null, scenariosConfig = {}) {
    let validScenarios = new Set();
    if (enabledScenarios?.length > 0) {
        enabledScenarios.forEach(s => validScenarios.add(s));
    } else {
        for (const key in metrics) {
            if (key.startsWith('http_req_duration') && key.includes(`{${tagName}:`)) {
                const m = key.match(new RegExp(`{${tagName}:([^}]+)}`));
                if (m?.[1]) validScenarios.add(m[1]);
            }
        }
    }
    if (validScenarios.size === 0) return '';

    const taggedData = {};
    validScenarios.forEach(s => { taggedData[s] = { count: 0, fails: 0, avg: 0, p95: 0, rate: 0, errorRate: 0, hasSpecificFailData: false }; });

    const globalErrorRate = (metrics.http_req_failed?.values?.rate || 0) * 100;
    for (const key in metrics) {
        if (!key.includes(`{${tagName}:`)) continue;
        const m = key.match(new RegExp(`{${tagName}:([^}]+)}`));
        if (!m?.[1] || !validScenarios.has(m[1])) continue;
        const sc     = m[1];
        const metric = metrics[key];
        if (!metric?.values) continue;
        if (key.startsWith('http_req_duration'))  { taggedData[sc].avg = metric.values.avg || 0; taggedData[sc].p95 = metric.values['p(95)'] || 0; }
        else if (key.startsWith('http_req_failed')) { taggedData[sc].errorRate = (metric.values.rate || 0) * 100; taggedData[sc].hasSpecificFailData = true; }
        else if (key.startsWith('http_reqs') && !key.includes('failed')) { taggedData[sc].count = metric.values.count || 0; taggedData[sc].rate = metric.values.rate || 0; }
    }

    // Fallback for request counts
    const totalScReqs  = Object.values(taggedData).reduce((s, d) => s + d.count, 0);
    const globalTotal  = metrics.http_reqs?.values?.count || 0;
    if (totalScReqs === 0 && enabledScenarios && globalTotal > 0) {
        const perSc   = Math.floor(globalTotal / validScenarios.size);
        const ratePerSc = (metrics.http_reqs?.values?.rate || 0) / validScenarios.size;
        validScenarios.forEach(s => { taggedData[s].count = perSc; taggedData[s].rate = ratePerSc; });
    }

    const globalDur = metrics.http_req_duration?.values || {};
    validScenarios.forEach(s => {
        if (taggedData[s].avg === 0 && globalDur.avg)         taggedData[s].avg = globalDur.avg;
        if (taggedData[s].p95 === 0 && globalDur['p(95)'])    taggedData[s].p95 = globalDur['p(95)'];
    });

    const rows = Array.from(validScenarios).sort().map(s => {
        const d   = taggedData[s];
        const errRate = d.hasSpecificFailData ? d.errorRate.toFixed(2) : (globalErrorRate > 0 ? globalErrorRate.toFixed(2) + '*' : '0.00');
        const req     = scenariosConfig[s]?.request || {};
        const pathInfo = req.path
            ? `<div class="text-mono" style="font-size:.72rem;font-weight:400;color:var(--text-secondary);margin-top:2px">${_esc(req.method || '')} ${_esc(req.path)}</div>`
            : '';
        return `<tr>
            <td style="font-weight:600">${s}${pathInfo}</td>
            <td class="text-mono">${(d.count || 0).toLocaleString()}</td>
            <td class="text-mono">${(d.rate || 0).toFixed(2)}</td>
            <td class="text-mono">${Math.round(d.avg || 0)}ms</td>
            <td class="text-mono">${Math.round(d.p95 || 0)}ms</td>
            <td class="text-mono ${parseFloat(errRate) > 5 ? 'poor' : ''}">${errRate}%</td>
        </tr>`;
    }).join('');

    return `
        <div class="card" style="margin-top:24px">
            <h2 class="card-title">📊 ${cardTitle}</h2>
            <div class="table-container">
                <table class="data-table">
                    <thead><tr>
                        <th>Scenario</th><th>Requests</th><th>Throughput (req/s)</th>
                        <th>Avg (ms)</th><th>P95 (ms)</th><th>Error Rate</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

// ==============================================================================
// THRESHOLDS (moved to own tab)
// ==============================================================================
function processThresholds(metrics, enabledScenarios = null) {
    const results = [];
    for (const metricName in metrics) {
        const metric = metrics[metricName];
        if (!metric.thresholds) continue;
        if (enabledScenarios?.length > 0 && metricName.includes('{scenario:')) {
            const m = metricName.match(/\{scenario:([^}]+)\}/);
            if (m?.[1] && !enabledScenarios.includes(m[1])) continue;
        }
        for (const cond in metric.thresholds) {
            const result = metric.thresholds[cond];
            let actualValue;
            const match = cond.match(/(p\(\d+\)|avg|rate|count)/);
            if (match && metric.values) {
                actualValue = match[1] === 'rate' ? metric.values.rate : metric.values[match[1]];
            }
            results.push({ name: metricName, condition: cond, pass: result.ok, actual: actualValue });
        }
    }

    if (results.length === 0) return '<div class="no-data">No thresholds defined.</div>';

    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;

    const items = results.sort((a, b) => {
        if (a.pass !== b.pass) return a.pass ? 1 : -1;
        return a.name.localeCompare(b.name);
    }).map(t => {
        let displayValue = 'N/A';
        if (typeof t.actual === 'number') {
            if (t.condition.includes('rate'))  displayValue = (t.actual * 100).toFixed(2) + '%';
            else if (t.condition.includes('count')) displayValue = Math.round(t.actual).toLocaleString();
            else if (t.actual > 1000)          displayValue = (t.actual / 1000).toFixed(2) + 's';
            else                               displayValue = Math.round(t.actual) + 'ms';
        }
        return `
            <li class="threshold-item">
                <div class="threshold-info">
                    <div class="threshold-name">${t.name}</div>
                    <div class="threshold-condition">${t.condition} <span class="actual-val">(actual: ${displayValue})</span></div>
                </div>
                <div>${t.pass ? '<span class="status-badge excellent">✅ Pass</span>' : '<span class="status-badge poor">❌ Fail</span>'}</div>
            </li>`;
    }).join('');

    return `
        <div class="threshold-summary">
            <span class="ts-pass">✅ Passed: <strong>${passed}</strong></span>
            <span class="ts-fail ${failed > 0 ? 'has-fail' : ''}">❌ Failed: <strong>${failed}</strong></span>
        </div>
        <ul class="threshold-list">${items}</ul>
    `;
}

// ==============================================================================
// ERROR DETAILS (Errors tab — same as before)
// ==============================================================================
function processErrorDetails(data, enabledScenarios = null) {
    // ── Try to read from groups (executor wraps checks in group(scenarioName)) ──
    const groups = data.root_group?.groups || [];
    const hasGroups = groups.some(g => (g.checks || []).some(c => c.fails > 0 || c.passes > 0));

    if (hasGroups) {
        // Build scenario → failed checks map
        const scenarioItems = [];
        groups.forEach(g => {
            const failed = (g.checks || []).filter(c => c.fails > 0);
            if (failed.length === 0) return;
            const rows = failed.map(c => {
                const total = c.passes + c.fails;
                const rate  = total > 0 ? ((c.fails / total) * 100).toFixed(1) : '100.0';
                return `
                    <li class="error-item">
                        <div class="error-details">
                            <div class="error-name">${c.name}</div>
                            <div class="error-path">${rate}% fail rate (${c.fails.toLocaleString()} / ${total.toLocaleString()})</div>
                        </div>
                        <div class="error-count">${c.fails.toLocaleString()} fails</div>
                    </li>`;
            }).join('');
            scenarioItems.push(`
                <div style="margin-bottom:16px">
                    <div style="font-weight:600;color:#e6b450;margin-bottom:6px;font-size:0.85rem;">
                        📋 ${g.name}
                    </div>
                    <ul class="error-list" style="margin:0">${rows}</ul>
                </div>`);
        });
        if (scenarioItems.length === 0)
            return '<div class="no-errors">✅ ไม่พบ failed checks — ระบบทำงานถูกต้องทุก request</div>';
        return scenarioItems.join('');
    }

    // ── Fallback: flat root_group.checks (no group context) ──
    const failed = (data.root_group?.checks || []).filter(c => c.fails > 0);
    if (failed.length === 0)
        return '<div class="no-errors">✅ ไม่พบ failed checks — ระบบทำงานถูกต้องทุก request</div>';

    return failed.map(c => {
        const path = c.path.replace(/^::/, '').replace(/::/g, ' → ');
        return `
            <li class="error-item">
                <div class="error-details">
                    <div class="error-name">${c.name}</div>
                    <div class="error-path">${path}</div>
                </div>
                <div class="error-count">${c.fails.toLocaleString()} fails</div>
            </li>`;
    }).join('');
}

// ==============================================================================
// FAILED ENDPOINTS (grouped by scenario — from root_group checks, no logger needed)
// ==============================================================================
function processFailedCheckEndpoints(data, scenariosConfig) {
    const groups = data.root_group?.groups || [];
    const items = [];

    groups.forEach(g => {
        const failedChecks = (g.checks || []).filter(c => c.fails > 0);
        if (failedChecks.length === 0) return;

        const sc      = scenariosConfig[g.name] || {};
        const req     = sc.request || {};
        const method  = req.method || 'REQUEST';
        const path    = req.path   || null;

        const totalFails  = failedChecks.reduce((s, c) => s + c.fails, 0);
        const totalChecks = (g.checks || []).reduce((s, c) => s + c.passes + c.fails, 0);
        const failRate    = totalChecks > 0 ? ((totalFails / totalChecks) * 100).toFixed(1) : '100.0';

        const checkRows = failedChecks.map(c => {
            const t = c.passes + c.fails;
            const r = t > 0 ? ((c.fails / t) * 100).toFixed(1) : '100.0';
            return `
                <div class="erg-row">
                    <span class="erg-row-text">❌ ${_esc(c.name)}</span>
                    <span class="erg-badge">${c.fails.toLocaleString()} fails · ${r}%</span>
                </div>`;
        }).join('');

        // Build collapsible request config (body + query params from scenario config)
        const payload     = req.payload || null;
        const queryParams = req.queryParams && Object.keys(req.queryParams).length > 0 ? req.queryParams : null;
        let configBlock = '';
        if (payload || queryParams) {
            const payloadStr = payload
                ? `<div class="erg-config-label">Body <span class="erg-config-note">(configured template)</span></div>
                   <pre class="erg-pre">${_esc(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2))}</pre>`
                : '';
            const qpStr = queryParams
                ? `<div class="erg-config-label">Query Params</div>
                   <pre class="erg-pre">${_esc(JSON.stringify(queryParams, null, 2))}</pre>`
                : '';
            configBlock = `
            <details class="erg-details">
                <summary class="erg-details-summary">🔍 Request Config <span class="erg-config-note">(template — ค่าจริงดูใน log)</span></summary>
                <div class="erg-details-body">${payloadStr}${qpStr}</div>
            </details>`;
        }

        items.push(`
        <div class="erg-card">
            <div class="erg-header">
                <span class="erg-type-badge">${_esc(method)}</span>
                <span class="erg-status-label" style="font-weight:700">${_esc(g.name)}</span>
                <span class="erg-total" style="color:var(--danger)">×${totalFails.toLocaleString()} failures</span>
            </div>
            ${path ? `<div class="erg-meta"><code class="erg-url-code">${_esc(path)}</code></div>` : ''}
            <div class="erg-section">
                <div class="erg-section-label">Failed checks (${failedChecks.length})</div>
                ${checkRows}
            </div>
            <div style="margin-top:.45rem;font-size:.75rem;color:var(--text-muted)">
                Overall check fail rate: <strong style="color:var(--danger)">${failRate}%</strong>
            </div>
            ${configBlock}
        </div>`);
    });

    if (items.length === 0)
        return '<div class="no-errors">✅ ไม่พบ failed checks — ระบบทำงานถูกต้องทุก request</div>';

    return items.join('');
}

function _esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==============================================================================
// HELPERS
// ==============================================================================
function getResponseTimeStatus(p95, threshold = 1000) {
    if (p95 <= threshold * 0.3) return { class: 'excellent', badge: '🌟 Excellent' };
    if (p95 <= threshold)       return { class: 'good',      badge: '✅ Good'      };
    if (p95 <= threshold * 2)   return { class: 'fair',      badge: '⚠️ Fair'      };
    return                             { class: 'poor',      badge: '❌ Poor'      };
}
function getErrorRateStatus(rate, threshold = 5) {
    if (rate < threshold * 0.2) return { class: 'excellent', badge: '🌟 Excellent', analysis: 'System is highly stable.' };
    if (rate <= threshold)      return { class: 'good',      badge: '✅ Good',      analysis: 'Acceptable for production.' };
    if (rate <= threshold * 2)  return { class: 'fair',      badge: '⚠️ Fair',      analysis: 'Elevated rate, monitor closely.' };
    return                             { class: 'poor',      badge: '❌ High',      analysis: 'Requires immediate investigation.' };
}
function getChecksStatus(rate, threshold = 90) {
    if (rate >= Math.min(99, threshold + 5)) return { class: 'excellent', badge: '🌟 Excellent' };
    if (rate >= threshold)                   return { class: 'good',      badge: '✅ Pass'      };
    return                                          { class: 'fair',      badge: '⚠️ Fail'      };
}
function formatDuration(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
}
function formatDate(d) {
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function formatBytes(bytes) {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
    return Math.round(bytes) + ' B';
}
function generateChartData(metrics) {
    const e = (metrics.response_time_excellent?.values?.rate || 0) * 100;
    const g = (metrics.response_time_good?.values?.rate      || 0) * 100;
    const f = (metrics.response_time_fair?.values?.rate      || 0) * 100;
    const p = (metrics.response_time_poor?.values?.rate      || 0) * 100;
    if (e + g + f + p > 0) return { distribution: [e, g, f, p] };
    const p95 = metrics.http_req_duration?.values?.['p(95)'] || 0;
    if (p95 <= 500)  return { distribution: [70, 20, 8,  2]  };
    if (p95 <= 1000) return { distribution: [50, 30, 15, 5]  };
    if (p95 <= 2000) return { distribution: [30, 35, 25, 10] };
    return                  { distribution: [15, 25, 35, 25] };
}
function generateConsoleSummary(data, testType, thresholds = {}) {
    const state      = data.state || {};
    const dur        = data.metrics.http_req_duration?.values || {};
    const reqs       = data.metrics.http_reqs?.values         || {};
    const failed     = data.metrics.http_req_failed?.values   || {};
    const p95        = Math.round(dur['p(95)'] || 0);
    const errorRate  = (failed.rate || 0) * 100;
    const throughput = reqs.rate || 0;
    const duration   = Math.round((state.testRunDurationMs || 0) / 1000);
    const p95L = thresholds.p95 || 1000, errL = thresholds.failRate || 5, tpL = thresholds.minThroughput || 1;
    return `
🚀 K6 Performance Test Summary — ${testType.toUpperCase()}
${'='.repeat(60)}
   Duration      : ${formatDuration(duration)}
   Total Requests: ${(reqs.count || 0).toLocaleString()}
   Virtual Users : ${data.metrics.vus_max?.values?.max || 0}
   P95 Response  : ${p95}ms ${p95 <= p95L ? '✅' : p95 <= p95L*2 ? '⚠️' : '❌'} (threshold: ${p95L}ms)
   Error Rate    : ${errorRate.toFixed(2)}% ${errorRate <= errL ? '✅' : '❌'} (threshold: ${errL}%)
   Throughput    : ${throughput.toFixed(2)} req/s ${throughput >= tpL ? '✅' : '❌'} (min: ${tpL})
${'='.repeat(60)}
${textSummary(data, { indent: '   ', enableColors: true })}`;
}

// ==============================================================================
// HTML TEMPLATE
// ==============================================================================
function getEmbeddedTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{{title}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{
  --primary:#2563eb;--success:#10b981;--warning:#f59e0b;--danger:#ef4444;--info:#06b6d4;
  --bg-body:#d8e2ed;--bg-card:#e4ecf4;--bg-secondary:#ccd6e3;
  --text-primary:#1a2535;--text-secondary:#3d5170;--text-muted:#6d8095;
  --border:#adbccc;--border-light:#bfcbd8;
  --shadow:0 1px 3px rgb(0 0 0/.07);--shadow-lg:0 10px 15px -3px rgb(0 0 0/.09),0 4px 6px -4px rgb(0 0 0/.08);
  --radius:0.75rem;--radius-xl:1rem;
}
body.dark{
  --bg-body:#0f172a;--bg-card:#1e293b;--bg-secondary:#334155;
  --text-primary:#f1f5f9;--text-secondary:#94a3b8;--text-muted:#64748b;
  --border:#334155;--border-light:#475569;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:var(--bg-body);color:var(--text-primary);transition:background .3s,color .3s}
.container{max-width:1400px;margin:0 auto;padding:2rem}

/* HEADER */
.header{background:var(--bg-card);border-radius:var(--radius-xl);box-shadow:var(--shadow);border:1px solid var(--border);margin-bottom:1.5rem;overflow:hidden}
.verdict-banner{padding:.75rem 2rem;font-size:.9rem;font-weight:700;letter-spacing:.04em;display:flex;align-items:center;gap:.75rem}
.verdict-pass{background:#dcfce7;color:#15803d}
.verdict-fail{background:#fee2e2;color:#991b1b}
.verdict-info{background:#dbeafe;color:#1d4ed8}
body.dark .verdict-pass{background:#052e16;color:#4ade80}
body.dark .verdict-fail{background:#450a0a;color:#f87171}
body.dark .verdict-info{background:#1e3a5f;color:#60a5fa}
.header-body{padding:1.25rem 2rem 1.5rem;display:flex;justify-content:space-between;align-items:flex-start}
.header-body h1{font-size:1.75rem;font-weight:800;color:var(--text-primary)}
.header-body .subtitle{font-size:.95rem;color:var(--text-secondary);margin-top:.25rem}
.theme-btn{cursor:pointer;background:var(--bg-secondary);border:1px solid var(--border);border-radius:9999px;padding:.4rem .9rem;font-size:.8rem;color:var(--text-secondary);transition:all .2s;white-space:nowrap}
.theme-btn:hover{background:var(--primary);color:white;border-color:var(--primary)}
.config-bar{background:var(--bg-secondary);padding:.75rem 2rem;font-size:.82rem;color:var(--text-secondary);display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;border-top:1px solid var(--border)}
.config-bar strong{color:var(--text-primary)}
.config-bar .sep{color:var(--border);user-select:none}

/* KPI STRIP */
.kpi-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:1rem;margin-bottom:1.5rem}
.kpi-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.1rem 1.25rem;box-shadow:var(--shadow);transition:transform .2s,box-shadow .2s}
.kpi-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg)}
.kpi-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:.5rem}
.kpi-value{font-size:1.85rem;font-weight:800;line-height:1;margin-bottom:.35rem;font-variant-numeric:tabular-nums}
.kpi-value.excellent{color:var(--success)}
.kpi-value.good{color:var(--success)}
.kpi-value.fair{color:var(--warning)}
.kpi-value.poor{color:var(--danger)}
.kpi-value.neutral{color:var(--text-primary)}
.kpi-sugg{font-size:.75rem;color:var(--text-muted);line-height:1.4;padding-top:.35rem;border-top:1px solid var(--border-light);margin-top:.35rem}

/* TABS */
.tabs{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap}
.tab-btn{flex:1;min-width:110px;padding:.65rem 1rem;font-size:.82rem;font-weight:600;border:1px solid var(--border);background:var(--bg-card);color:var(--text-secondary);border-radius:var(--radius);cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:.4rem;box-shadow:var(--shadow)}
.tab-btn:hover{background:var(--bg-secondary)}
.tab-btn.active{background:var(--primary);color:white;border-color:var(--primary)}
.tab-content{display:none}
.tab-content.active{display:block;animation:fadeIn .25s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(.5rem)}to{opacity:1;transform:translateY(0)}}

/* CARDS */
.card{background:var(--bg-card);border-radius:var(--radius);padding:1.5rem;box-shadow:var(--shadow);border:1px solid var(--border)}
.card-title{font-size:1rem;font-weight:700;margin-bottom:1rem;color:var(--text-primary);display:flex;align-items:center;gap:.6rem}

/* ANALYSIS CARDS */
.analysis-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;margin-top:1.5rem}
.analysis-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;box-shadow:var(--shadow);border-left-width:4px}
.border-excellent{border-left-color:var(--success)}
.border-good{border-left-color:#22c55e}
.border-fair{border-left-color:var(--warning)}
.border-poor{border-left-color:var(--danger)}
.analysis-header{display:flex;align-items:center;gap:.6rem;margin-bottom:.85rem;flex-wrap:wrap}
.analysis-icon{font-size:1.3rem}
.analysis-title{font-weight:700;font-size:.95rem;color:var(--text-primary);flex:1}
.analysis-text{font-size:.875rem;color:var(--text-secondary);line-height:1.65}
.analysis-text strong{color:var(--text-primary)}

/* DISTRIBUTION */
.dist-chart{margin-top:.75rem}
.dist-row{display:grid;grid-template-columns:90px 1fr 52px;align-items:center;gap:.75rem;margin-bottom:.65rem;font-size:.8rem}
.dist-label{font-weight:500;color:var(--text-secondary)}
.dist-bar-container{background:var(--border-light);border-radius:9999px;height:14px;overflow:hidden}
.dist-bar{height:100%;border-radius:9999px;transition:width .5s ease-out}
.dist-bar-excellent{background:var(--success)}
.dist-bar-good{background:var(--info)}
.dist-bar-fair{background:var(--warning)}
.dist-bar-poor{background:var(--danger)}
.dist-value{font-weight:600;color:var(--text-primary);text-align:right}

/* TABLES */
.table-container{overflow-x:auto}
.data-table{width:100%;border-collapse:collapse;font-size:.875rem}
.data-table th,.data-table td{padding:.7rem 1rem;text-align:left;border-bottom:1px solid var(--border)}
.data-table th{background:var(--bg-secondary);font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;font-size:.72rem}
.data-table tr:last-child td{border-bottom:none}
.data-table td{color:var(--text-primary)}
.text-mono{font-variant-numeric:tabular-nums}
.font-bold{font-weight:700}
.text-sm{font-size:.78rem}
.text-muted{color:var(--text-muted)}
.poor{color:var(--danger)}
.fair{color:var(--warning)}
.excellent{color:var(--success)}

/* STATUS BADGES */
.status-badge{display:inline-flex;align-items:center;gap:.2rem;padding:.2rem .65rem;border-radius:9999px;font-size:.72rem;font-weight:600}
.status-badge.excellent,.status-badge.good{background:#dcfce7;color:#15803d}
.status-badge.fair{background:#fef9c3;color:#854d0e}
.status-badge.poor{background:#fee2e2;color:#991b1b}
body.dark .status-badge.excellent,body.dark .status-badge.good{background:#052e16;color:#4ade80}
body.dark .status-badge.fair{background:#423006;color:#facc15}
body.dark .status-badge.poor{background:#450a0a;color:#f87171}

/* THRESHOLDS */
.threshold-summary{display:flex;gap:1.5rem;margin-bottom:1rem;font-size:.9rem}
.ts-pass{color:var(--success)}
.ts-fail{color:var(--text-muted)}
.ts-fail.has-fail{color:var(--danger);font-weight:700}
.threshold-list{list-style:none;display:flex;flex-direction:column;gap:.5rem}
.threshold-item{display:flex;justify-content:space-between;align-items:center;background:var(--bg-secondary);padding:.7rem 1rem;border-radius:.5rem}
.threshold-name{font-weight:600;font-size:.8rem;color:var(--text-primary)}
.threshold-condition{font-size:.75rem;color:var(--text-muted);margin-top:.1rem}
.actual-val{color:var(--text-secondary)}

/* NETWORK */
.phase-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:.5rem;vertical-align:middle}
.phase-bar-wrap{background:var(--border-light);border-radius:9999px;height:10px;overflow:hidden}
.phase-bar{height:100%;border-radius:9999px;transition:width .5s ease}
.time-bar-wrap{background:var(--border-light);border-radius:9999px;height:8px;overflow:hidden}
.time-bar{height:100%;border-radius:9999px;transition:width .5s ease}
.network-sugg{margin:1rem 0;padding:.85rem 1rem;background:var(--bg-secondary);border-radius:.5rem;font-size:.875rem;color:var(--text-secondary);line-height:1.5;border-left:3px solid var(--primary)}
.data-transfer-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.5rem}
.dt-card{background:var(--bg-secondary);border-radius:var(--radius);padding:1.1rem 1.25rem;border:1px solid var(--border)}
.dt-icon{font-size:1.4rem;margin-bottom:.4rem}
.dt-value{font-size:1.5rem;font-weight:800;color:var(--text-primary)}
.dt-rate{font-size:.8rem;color:var(--text-muted);margin-top:.2rem}

/* ERRORS */
.error-overview{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem}
.error-stat{text-align:center;padding:1rem;background:var(--bg-secondary);border-radius:var(--radius);border:1px solid var(--border)}
.error-stat-value{font-size:1.8rem;font-weight:800;color:var(--danger)}
.error-stat-label{font-size:.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-top:.25rem}
.error-list{list-style:none;display:flex;flex-direction:column;gap:.75rem}
.error-item{display:grid;grid-template-columns:1fr auto;align-items:center;gap:1rem;padding:1rem 1.25rem;background:var(--bg-secondary);border-radius:var(--radius);border-left:4px solid var(--danger)}
.error-name{font-weight:600;color:var(--text-primary);font-size:.9rem}
.error-path{font-size:.8rem;color:var(--text-muted);margin-top:.25rem;background:var(--bg-card);padding:.2rem .5rem;border-radius:.25rem;display:inline-block}
.error-count{font-weight:700;color:var(--danger);font-size:1rem;background:rgba(239,68,68,.1);padding:.4rem .85rem;border-radius:9999px;border:1px solid rgba(239,68,68,.2);white-space:nowrap}
.no-errors,.no-data{padding:2rem;text-align:center;color:var(--text-secondary);font-size:.9rem}

/* RESPONSE ERROR GROUPS */
.erg-card{background:var(--bg-secondary);border-radius:var(--radius);border:1px solid var(--border);border-left:4px solid var(--danger);padding:.9rem 1.1rem;margin-bottom:.65rem}
.erg-header{display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;margin-bottom:.5rem}
.erg-status-chip{font-size:.82rem;font-weight:800;font-family:monospace;padding:.15rem .55rem;border-radius:.3rem;border:1px solid;letter-spacing:.02em}
.erg-status-label{font-weight:600;color:var(--text-primary);font-size:.88rem;flex:1;min-width:0}
.erg-type-badge{font-size:.72rem;color:var(--text-muted);padding:.1rem .45rem;border-radius:9999px;border:1px solid var(--border);white-space:nowrap}
.erg-total{font-weight:700;font-size:.85rem;white-space:nowrap;margin-left:auto}
.erg-meta{font-size:.8rem;color:var(--text-muted);margin-bottom:.4rem}
.erg-meta em{color:var(--text-secondary);font-style:normal}
.erg-section{margin-top:.45rem}
.erg-section-label{font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.3rem}
.erg-row{display:flex;justify-content:space-between;align-items:center;padding:.25rem .5rem;background:var(--bg-card);border-radius:.25rem;margin-bottom:.2rem;gap:.5rem}
.erg-row-text{font-size:.8rem;color:var(--text-primary);word-break:break-word;flex:1}
.erg-url-code{font-size:.75rem;color:#58a6ff;word-break:break-all;background:transparent;padding:0}
.erg-badge{font-size:.72rem;color:var(--text-muted);white-space:nowrap;background:var(--bg-secondary);padding:.1rem .35rem;border-radius:9999px;border:1px solid var(--border);flex-shrink:0}

/* LOAD PROFILE CARD */
.lp-card{margin-bottom:1.25rem}
.lp-grid{display:grid;grid-template-columns:1fr 1px 1fr;gap:1.5rem;align-items:start}
.lp-divider{background:var(--border);align-self:stretch}
.lp-col{}
.lp-col-title{font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:.85rem;display:flex;align-items:center;gap:.5rem}
.lp-count{background:var(--bg-secondary);border:1px solid var(--border);border-radius:9999px;padding:.05rem .5rem;font-size:.72rem;color:var(--text-secondary)}
.lp-table{border-collapse:collapse;font-size:.855rem;width:100%}
.lp-table tr{border-bottom:1px solid var(--border-light)}
.lp-table tr:last-child{border-bottom:none}
.lp-label{color:var(--text-muted);padding:.45rem .75rem .45rem 0;width:100px;white-space:nowrap;vertical-align:top}
.lp-val{color:var(--text-primary);padding:.45rem 0;font-weight:500}
.lp-code{font-family:monospace;font-size:.82rem;background:var(--bg-secondary);padding:.1rem .4rem;border-radius:.25rem;color:var(--info)}
.lp-shape{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem}
.lp-ramp{background:rgba(99,102,241,.12);color:#818cf8;padding:.15rem .5rem;border-radius:.35rem;font-size:.78rem;font-weight:600;white-space:nowrap}
.lp-hold{background:rgba(16,185,129,.12);color:#34d399;padding:.15rem .5rem;border-radius:.35rem;font-size:.78rem;font-weight:600;white-space:nowrap}
.lp-arrow{color:var(--text-muted);font-size:.9rem;padding:0 .1rem}
.lp-scenarios{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.25rem;max-height:160px;overflow-y:auto;padding-right:.25rem}
.lp-scenarios::-webkit-scrollbar{width:4px}.lp-scenarios::-webkit-scrollbar-track{background:var(--bg-secondary)}.lp-scenarios::-webkit-scrollbar-thumb{background:var(--border);border-radius:9999px}
.lp-scenario-chip{background:var(--bg-secondary);border:1px solid var(--border);border-radius:.4rem;padding:.3rem .75rem;font-size:.8rem;color:var(--text-primary);font-weight:500;white-space:nowrap}
.erg-details{margin-top:.6rem;border-top:1px solid var(--border-light);padding-top:.5rem}
.erg-details-summary{font-size:.78rem;color:var(--text-secondary);cursor:pointer;list-style:none;display:flex;align-items:center;gap:.4rem;user-select:none;padding:.2rem 0}
.erg-details-summary::-webkit-details-marker{display:none}
.erg-details-summary::before{content:'▶';font-size:.65rem;transition:transform .2s;display:inline-block}
details[open] .erg-details-summary::before{transform:rotate(90deg)}
.erg-details-body{margin-top:.5rem;display:flex;flex-direction:column;gap:.5rem}
.erg-config-label{font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.2rem}
.erg-config-note{font-size:.68rem;color:var(--text-muted);font-weight:400;text-transform:none;letter-spacing:0}
.erg-pre{font-family:monospace;font-size:.75rem;background:var(--bg-card);border:1px solid var(--border-light);border-radius:.35rem;padding:.6rem .75rem;overflow-x:auto;color:var(--text-secondary);line-height:1.5;white-space:pre;max-height:160px;overflow-y:auto}
@media(max-width:700px){.lp-grid{grid-template-columns:1fr}.lp-divider{display:none}}

/* GUIDE TAB */
.guide-intro{display:flex;align-items:flex-start;gap:.85rem;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.25rem;margin-bottom:1.25rem}
.guide-intro-icon{font-size:1.6rem;line-height:1;flex-shrink:0}
.guide-intro-title{font-weight:700;font-size:.95rem;color:var(--text-primary);margin-bottom:.2rem}
.guide-intro-sub{font-size:.82rem;color:var(--text-secondary);line-height:1.5}

@media(max-width:1100px){.kpi-strip{grid-template-columns:repeat(3,1fr)}.analysis-grid{grid-template-columns:1fr}}
@media(max-width:640px){.kpi-strip{grid-template-columns:1fr 1fr}.container{padding:1rem}}
</style>
</head>
<body>
<div class="container">

<!-- HEADER -->
<div class="header">
  <div class="verdict-banner {{verdict_class}}">
    {{verdict_icon}} {{verdict_label}} — {{verdict_text}}
  </div>
  <div class="header-body">
    <div>
      <h1>{{title}}</h1>
      <p class="subtitle">{{subtitle}}</p>
    </div>
    <button class="theme-btn" onclick="toggleTheme()">🌙 Dark Mode</button>
  </div>
  {{config_bar}}
</div>

<!-- KPI STRIP -->
<div class="kpi-strip">
  <div class="kpi-card">
    <div class="kpi-label">⏱ P95 Response</div>
    <div class="kpi-value {{kpi_p95_status}}">{{kpi_p95}}ms</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">🚨 Error Rate</div>
    <div class="kpi-value {{kpi_error_status}}">{{kpi_error}}%</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">⚡ Throughput</div>
    <div class="kpi-value neutral">{{kpi_throughput}}<span style="font-size:1rem;font-weight:500"> req/s</span></div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">🛡️ Checks Pass</div>
    <div class="kpi-value {{kpi_checks_status}}">{{kpi_checks}}%</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">📋 Total Requests</div>
    <div class="kpi-value neutral" style="font-size:1.5rem">{{kpi_requests}}</div>
    <div style="font-size:.78rem;color:var(--text-muted);margin-top:.3rem">{{kpi_vus}} VUs · {{kpi_duration}}</div>
  </div>
</div>

<!-- TABS -->
<div class="tabs">
  <button class="tab-btn active" onclick="openTab(event,'Overview')">📊 Overview</button>
  <button class="tab-btn" onclick="openTab(event,'Details')">🔬 Details</button>
  <button class="tab-btn" onclick="openTab(event,'Network')">🌐 Network</button>
  <button class="tab-btn" onclick="openTab(event,'Errors')">🚨 Errors</button>
  <button class="tab-btn" onclick="openTab(event,'Thresholds')">🛡️ Thresholds</button>
  <button class="tab-btn" onclick="openTab(event,'Guide')">💡 Guide</button>
</div>

<!-- ====== OVERVIEW TAB ====== -->
<div id="Overview" class="tab-content active">
  {{overview_load_profile}}
  <div class="card" style="margin-bottom:1.25rem">
    <h2 class="card-title">📊 Response Time Distribution</h2>
    <div class="dist-chart" id="dist-chart"></div>
  </div>
  {{overview_key_metrics}}
</div>

<!-- ====== DETAILS TAB ====== -->
<div id="Details" class="tab-content">
  {{percentile_table}}
  {{scenario_breakdown}}
  <div style="margin-top:24px">{{checks_table}}</div>
</div>

<!-- ====== NETWORK TAB ====== -->
<div id="Network" class="tab-content">
  <div class="card" style="margin-bottom:1.25rem">
    <h2 class="card-title">🔗 Request Timing Breakdown</h2>
    <div class="network-sugg">{{network_sugg}}</div>
    <div class="table-container">
      <table class="data-table">
        <thead><tr>
          <th>Phase</th><th>Avg</th><th>P95</th><th style="min-width:160px">Proportion</th><th>Description</th>
        </tr></thead>
        <tbody>{{network_rows}}</tbody>
      </table>
    </div>
  </div>
  <div class="card">
    <h2 class="card-title">📦 Data Transfer</h2>
    <div class="data-transfer-grid">
      <div class="dt-card">
        <div class="dt-icon">⬇️</div>
        <div class="dt-value">{{data_received}}</div>
        <div class="dt-rate">{{data_recv_rate}} average</div>
        <div class="text-muted text-sm" style="margin-top:.25rem">Received from server</div>
      </div>
      <div class="dt-card">
        <div class="dt-icon">⬆️</div>
        <div class="dt-value">{{data_sent}}</div>
        <div class="dt-rate">{{data_sent_rate}} average</div>
        <div class="text-muted text-sm" style="margin-top:.25rem">Sent to server</div>
      </div>
    </div>
  </div>
</div>

<!-- ====== ERRORS TAB ====== -->
<div id="Errors" class="tab-content">
  <div class="card">
    <h2 class="card-title">🚨 Error Overview</h2>
    <div class="error-overview">
      <div class="error-stat"><div class="error-stat-value">{{total_failed_requests}}</div><div class="error-stat-label">Total Failures</div></div>
      <div class="error-stat"><div class="error-stat-value">{{error_rate}}%</div><div class="error-stat-label">Failure Rate</div></div>
      <div class="error-stat"><div class="error-stat-value">{{failed_check_types}}</div><div class="error-stat-label">Failed Check Types</div></div>
    </div>
    <h3 style="font-size:.95rem;font-weight:700;margin-bottom:.75rem;color:var(--text-primary)">📍 Failed Endpoints</h3>
    <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:.85rem">
      Endpoint และ checks ที่ fail — แยกตาม scenario (ข้อมูลจาก k6 summary โดยตรง)
    </p>
    <div>{{response_error_groups}}</div>
  </div>
</div>

<!-- ====== THRESHOLDS TAB ====== -->
<div id="Thresholds" class="tab-content">
  <div class="card">
    <h2 class="card-title">🛡️ Threshold Results</h2>
    {{thresholds_section}}
  </div>
</div>

<!-- ====== GUIDE TAB ====== -->
<div id="Guide" class="tab-content">
  <div class="guide-intro">
    <span class="guide-intro-icon">💡</span>
    <div>
      <div class="guide-intro-title">How to interpret your results</div>
      <div class="guide-intro-sub">คำแนะนำด้านล่างช่วยอ่านผลในแต่ละมิติ — ดูรายละเอียดตัวเลขได้ที่ตัวเลข KPI ด้านบนและแต่ละ Tab</div>
    </div>
  </div>
  {{overview_summary}}
  <div class="analysis-grid">{{quick_analysis_cards}}</div>
  <div class="card" style="margin-top:1.25rem">
    <h2 class="card-title">🌐 TTFB Guide</h2>
    <div class="network-sugg">{{network_sugg}}</div>
  </div>
</div>

</div><!-- /container -->

<script>
function toggleTheme(){
  document.body.classList.toggle('dark');
  const btn = document.querySelector('.theme-btn');
  btn.textContent = document.body.classList.contains('dark') ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('k6-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}
(function(){
  const t = localStorage.getItem('k6-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (t === 'dark' || (!t && prefersDark)) {
    document.body.classList.add('dark');
    document.querySelector('.theme-btn').textContent = '☀️ Light Mode';
  }
})();

function openTab(evt, name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  evt.currentTarget.classList.add('active');
  if (name === 'Overview') renderDist();
}

const distData = JSON.parse('{{sorted_distribution_data}}' || '[]');
function renderDist() {
  const c = document.getElementById('dist-chart');
  if (!c || c.childElementCount > 0) return;
  distData.forEach(item => {
    const row = document.createElement('div');
    row.className = 'dist-row';
    row.innerHTML = \`<div class="dist-label">\${item.label}</div><div class="dist-bar-container"><div class="dist-bar \${item.color}" style="width:0%"></div></div><div class="dist-value">\${item.pct}%</div>\`;
    c.appendChild(row);
    setTimeout(() => row.querySelector('.dist-bar').style.width = item.pct + '%', 80);
  });
}
document.addEventListener('DOMContentLoaded', renderDist);
</script>
</body>
</html>`;
}
