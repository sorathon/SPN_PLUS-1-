// File: config/logger.js
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';

// Configuration
const DEBUG_MODE = __ENV.DEBUG_LOG === 'true' || __ENV.DEBUG_LOG === '1';
const LOG_ALL_REQUESTS = __ENV.LOG_ALL === 'true' || __ENV.LOG_ALL === '1';

console.log(`[LOGGER INIT] Debug mode: ${DEBUG_MODE}, Log all: ${LOG_ALL_REQUESTS}`);

// ใช้ array ธรรมดา - k6 จะรวมจาก VUs ทั้งหมดตอน teardown
let responseLogs = [];
let detailedRequestLogs = [];
let consoleLogs = [];

// ตัวนับเพื่อตรวจสอบ
let logCount = 0;

/**
 * Log console messages
 */
export function logToConsole(level, scenarioName, message, data = null) {
  const timestamp = new Date().toISOString();
  const vuId = exec.vu.idInTest || 0;
  const iteration = exec.vu.iterationInScenario || 0;
  
  const logEntry = {
    timestamp,
    level,
    scenario: scenarioName || 'general',
    vu: vuId,
    iteration,
    message,
    data: data ? JSON.stringify(data, null, 2) : null,
  };
  
  if (DEBUG_MODE) {
    consoleLogs.push(logEntry);
    console.log(`[CONSOLE_LOG] Added entry. Total: ${consoleLogs.length}`);
  }
  
  const prefix = `[${level}][${scenarioName || 'SYSTEM'}][VU:${vuId}]`;
  switch (level) {
    case 'ERROR':
      console.error(`${prefix} ${message}`);
      if (data) console.error(data);
      break;
    case 'WARN':
      console.warn(`${prefix} ${message}`);
      if (data) console.warn(data);
      break;
    case 'DEBUG':
      if (DEBUG_MODE) {
        console.log(`${prefix} ${message}`);
        if (data) console.log(data);
      }
      break;
    default:
      console.log(`${prefix} ${message}`);
      if (data) console.log(data);
  }
}

/**
 * Log detailed request
 */
export function logDetailedRequest(scenarioName, requestConfig, baseURL) {
  if (!DEBUG_MODE && !LOG_ALL_REQUESTS) return;
  
  const timestamp = new Date().toISOString();
  const vuId = exec.vu.idInTest || 0;
  const iteration = exec.vu.iterationInScenario || 0;
  
  const url = `${baseURL}${requestConfig.path}`;
  const method = requestConfig.method.toUpperCase();
  
  const logEntry = {
    timestamp,
    scenario: scenarioName,
    vu: vuId,
    iteration,
    request: {
      method,
      url,
      headers: requestConfig.params?.headers || {},
      payload: requestConfig.payload || null,
    }
  };
  
  detailedRequestLogs.push(logEntry);
  
  if (DEBUG_MODE) {
    logToConsole('DEBUG', scenarioName, `Sending ${method} ${url}`);
    if (requestConfig.payload) {
      logToConsole('DEBUG', scenarioName, 'Request Payload:', requestConfig.payload);
    }
  }
}

/**
 * Log HTTP Response
 */
export function logResponse(scenarioName, response, additionalInfo = {}) {
  logCount++;
  
  const timestamp = new Date().toISOString();
  const vuId = exec.vu.idInTest || 0;
  const iteration = exec.vu.iterationInScenario || 0;
  
  const logEntry = {
    timestamp,
    scenario: scenarioName,
    vu: vuId,
    iteration,
    request: {
      method: response.request.method,
      url: response.url,
      headers: response.request.headers || {},
    },
    response: {
      status: response.status,
      statusText: response.status_text || '',
      duration: Math.round(response.timings.duration),
      size: response.body ? response.body.length : 0,
      headers: response.headers || {},
    },
    body: null,
    error: null,
    errorType: null,
    ...additionalInfo
  };

  // Parse body
  try {
    if (response.headers['Content-Type']?.includes('application/json')) {
      logEntry.body = response.json();
    } else {
      logEntry.body = response.body?.substring(0, 500) || '';
    }
  } catch (e) {
    logEntry.body = response.body?.substring(0, 500) || '';
    logEntry.error = `Failed to parse body: ${e.message}`;
  }

  // Classify error type
  const isHttpError = response.status === 0 || response.status >= 400;
  const hasValidationError = additionalInfo.checksPassed === false;
  
  if (isHttpError) {
    logEntry.errorType = 'HTTP_ERROR';
  } else if (hasValidationError) {
    logEntry.errorType = 'VALIDATION_ERROR';
  }

  // Add to logs
  responseLogs.push(logEntry);
  
  // Console output ทุก 10 logs
  if (logCount % 10 === 0 || DEBUG_MODE) {
    console.log(`[LOGGER] Logged ${logCount} responses so far. Array size: ${responseLogs.length}`);
  }
  
  const shouldLog = isHttpError || hasValidationError || DEBUG_MODE || LOG_ALL_REQUESTS;
  
  if (shouldLog) {
    const logLevel = (isHttpError || hasValidationError) ? 'ERROR' : 'INFO';
    console.log(`[${logLevel}][${scenarioName}][VU:${vuId}] ${response.request.method} ${response.url} - Status: ${response.status} - Duration: ${logEntry.response.duration}ms`);
    
    if (isHttpError || hasValidationError || DEBUG_MODE) {
      const bodyStr = JSON.stringify(logEntry.body, null, 2);
      console.error(`[${scenarioName}] Response Body (first 500 chars):`, bodyStr.substring(0, 500));
    }
  }

  return logEntry;
}

/**
 * Get logs (จะถูกเรียกใน handleSummary)
 */
export function getResponseLogs() {
  console.log(`[GET_LOGS] Returning ${responseLogs.length} response logs`);
  return responseLogs;
}

export function getDetailedRequestLogs() {
  console.log(`[GET_LOGS] Returning ${detailedRequestLogs.length} detailed request logs`);
  return detailedRequestLogs;
}

export function getConsoleLogs() {
  console.log(`[GET_LOGS] Returning ${consoleLogs.length} console logs`);
  return consoleLogs;
}

export function clearAllLogs() {
  const before = responseLogs.length;
  responseLogs = [];
  detailedRequestLogs = [];
  consoleLogs = [];
  logCount = 0;
  console.log(`[CLEAR_LOGS] Cleared ${before} logs`);
}

/**
 * Generate files
 */
export function generateLogFile(logs) {
  if (!logs || logs.length === 0) {
    console.warn('[GEN_LOG] No logs to generate JSONL');
    return '# No logs collected\n';
  }
  console.log(`[GEN_LOG] Generating JSONL from ${logs.length} logs`);
  return logs.map(log => JSON.stringify(log)).join('\n');
}

export function generateDetailedRequestLogFile(logs) {
  if (!logs || logs.length === 0) {
    console.warn('[GEN_LOG] No detailed request logs');
    return '# No detailed request logs collected\n';
  }
  console.log(`[GEN_LOG] Generating detailed request JSONL from ${logs.length} logs`);
  return logs.map(log => JSON.stringify(log)).join('\n');
}

export function generateConsoleLogFile(logs) {
  if (!logs || logs.length === 0) {
    console.warn('[GEN_LOG] No console logs');
    return '# No console logs collected\n';
  }
  console.log(`[GEN_LOG] Generating console JSONL from ${logs.length} logs`);
  return logs.map(log => JSON.stringify(log)).join('\n');
}

export function generateReadableLogFile(logs) {
  if (!logs || logs.length === 0) {
    return '=== K6 LOAD TEST - NO RESPONSE LOGS COLLECTED ===\n' +
           'Possible reasons:\n' +
           '- Logs array is empty\n' +
           '- Check that logResponse() is being called\n' +
           '- Verify executor.js is importing and calling logger functions\n';
  }
  
  let content = '='.repeat(100) + '\n';
  content += 'K6 LOAD TEST - RESPONSE LOG\n';
  content += `Generated: ${new Date().toISOString()}\n`;
  content += `Total Requests: ${logs.length}\n`;
  content += `Debug Mode: ${DEBUG_MODE ? 'ENABLED' : 'DISABLED'}\n`;
  content += `Log All Requests: ${LOG_ALL_REQUESTS ? 'ENABLED' : 'DISABLED'}\n`;
  
  const httpErrors = logs.filter(l => l.errorType === 'HTTP_ERROR').length;
  const validationErrors = logs.filter(l => l.errorType === 'VALIDATION_ERROR').length;
  const successful = logs.length - httpErrors - validationErrors;
  
  content += `Successful: ${successful} | HTTP Errors: ${httpErrors} | Validation Errors: ${validationErrors}\n`;
  content += '='.repeat(100) + '\n\n';

  logs.forEach((log, index) => {
    const isError = log.errorType !== null;
    const marker = isError ? '⚠️ ERROR' : '✅ SUCCESS';
    
    content += `\n[${index + 1}] ${marker} - ${log.timestamp}\n`;
    content += '-'.repeat(100) + '\n';
    content += `Scenario: ${log.scenario} | VU: ${log.vu} | Iteration: ${log.iteration}\n`;
    content += `Request: ${log.request.method} ${log.request.url}\n`;
    content += `Status: ${log.response.status} ${log.response.statusText || ''} | Duration: ${log.response.duration}ms | Size: ${log.response.size} bytes\n`;
    
    if (isError) {
      content += `Error Type: ${log.errorType}\n`;
      content += `Response Body:\n${JSON.stringify(log.body, null, 2)}\n`;
      
      if (log.error) {
        content += `Parse Error: ${log.error}\n`;
      }
      
      if (log.checksPassed === false) {
        content += `⚠️ VALIDATION CHECKS FAILED\n`;
      }
    }
    
    content += '\n';
  });

  console.log(`[GEN_LOG] Generated readable log: ${content.length} bytes`);
  return content;
}

export function generateDetailedRequestLogFileReadable(logs) {
  if (!logs || logs.length === 0) {
    return '=== K6 LOAD TEST - NO DETAILED REQUEST LOGS ===\n';
  }
  
  let content = '='.repeat(100) + '\n';
  content += 'K6 LOAD TEST - DETAILED REQUEST LOG (DEBUG MODE)\n';
  content += `Generated: ${new Date().toISOString()}\n`;
  content += `Total Requests Sent: ${logs.length}\n`;
  content += '='.repeat(100) + '\n\n';

  logs.forEach((log, index) => {
    content += `\n[${index + 1}] REQUEST - ${log.timestamp}\n`;
    content += '-'.repeat(100) + '\n';
    content += `Scenario: ${log.scenario} | VU: ${log.vu} | Iteration: ${log.iteration}\n`;
    content += `Method: ${log.request.method}\n`;
    content += `URL: ${log.request.url}\n`;
    
    if (Object.keys(log.request.headers).length > 0) {
      content += `Headers:\n${JSON.stringify(log.request.headers, null, 2)}\n`;
    }
    
    if (log.request.payload) {
      content += `Payload:\n${JSON.stringify(log.request.payload, null, 2)}\n`;
    }
    
    content += '\n';
  });

  return content;
}

export function generateConsoleLogReadable(logs) {
  if (!logs || logs.length === 0) {
    return '=== K6 LOAD TEST - NO CONSOLE LOGS ===\n';
  }
  
  let content = '='.repeat(100) + '\n';
  content += 'K6 LOAD TEST - CONSOLE OUTPUT (DEBUG MODE)\n';
  content += `Generated: ${new Date().toISOString()}\n`;
  content += `Total Console Entries: ${logs.length}\n`;
  content += '='.repeat(100) + '\n\n';

  logs.forEach((log, index) => {
    const levelIcon = {
      'ERROR': '❌',
      'WARN': '⚠️',
      'INFO': 'ℹ️',
      'DEBUG': '🐛'
    }[log.level] || '📝';
    
    content += `\n[${index + 1}] ${levelIcon} ${log.level} - ${log.timestamp}\n`;
    content += '-'.repeat(100) + '\n';
    content += `Scenario: ${log.scenario} | VU: ${log.vu} | Iteration: ${log.iteration}\n`;
    content += `Message: ${log.message}\n`;
    
    if (log.data) {
      content += `Data:\n${log.data}\n`;
    }
    
    content += '\n';
  });

  return content;
}

export function isDebugMode() {
  return DEBUG_MODE;
}

export function isLogAllRequests() {
  return LOG_ALL_REQUESTS;
}