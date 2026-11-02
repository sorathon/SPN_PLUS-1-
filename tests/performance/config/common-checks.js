// File: config/common-checks.js
// ไลบรารี checks ที่ใช้บ่อยที่สุด

import { Rate } from 'k6/metrics';

/**
 * Common Check Helpers - ครอบคลุม 95% ของการใช้งาน
 */
export const C = {
  // ============ Status Checks ============
  status200: (r) => r.status === 200,
  status201: (r) => r.status === 201,
  status204: (r) => r.status === 204,
  statusOk: (r) => r.status >= 200 && r.status < 300,
  
  // ============ Response Type Checks ============
  isJson: (r) => {
    try {
      r.json();
      return true;
    } catch {
      return false;
    }
  },
  
  // ============ Data Existence Checks ============
  hasData: (r) => {
    try {
      const body = r.json();
      return body !== null && body !== undefined;
    } catch {
      return false;
    }
  },
  
  // ============ Array Checks ============
  isArray: (r) => {
    try {
      return Array.isArray(r.json());
    } catch {
      return false;
    }
  },
  
  notEmptyArray: (r) => {
    try {
      const body = r.json();
      return Array.isArray(body) && body.length > 0;
    } catch {
      return false;
    }
  },
  
  arrayMinLength: (minLength) => (r) => {
    try {
      const body = r.json();
      return Array.isArray(body) && body.length >= minLength;
    } catch {
      return false;
    }
  },
  
  // ============ Field Existence Checks ============
  hasField: (field) => (r) => {
    try {
      const body = r.json();
      return body && body[field] !== undefined;
    } catch {
      return false;
    }
  },
  
  hasFields: (...fields) => (r) => {
    try {
      const body = r.json();
      return fields.every(field => body && body[field] !== undefined);
    } catch {
      return false;
    }
  },
  
  // Nested Field Check
  hasPath: (path) => (r) => {
    try {
      const body = r.json();
      const keys = path.split('.');
      let value = body;
      
      for (const key of keys) {
        if (!value || value[key] === undefined) return false;
        value = value[key];
      }
      
      return true;
    } catch {
      return false;
    }
  },
  
  // ============ NULL/EMPTY Checks ============
  
  // ตรวจสอบว่า field ไม่เป็น null และไม่เป็น undefined
  fieldNotNull: (field) => (r) => {
    try {
      const body = r.json();
      const value = body[field];
      return value !== null && value !== undefined;
    } catch {
      return false;
    }
  },
  
  // ตรวจสอบว่า field มีข้อมูล (ไม่ว่าง)
  fieldNotEmpty: (field) => (r) => {
    try {
      const body = r.json();
      const value = body[field];
      
      if (value === null || value === undefined) return false;
      
      // String ต้องไม่ว่าง
      if (typeof value === 'string') return value.trim().length > 0;
      
      // Array ต้องมีข้อมูล
      if (Array.isArray(value)) return value.length > 0;
      
      // Object ต้องมี keys
      if (typeof value === 'object') return Object.keys(value).length > 0;
      
      // Number, Boolean ถือว่ามีข้อมูล
      return true;
    } catch {
      return false;
    }
  },
  
  // ตรวจสอบหลาย fields ว่าไม่เป็น null
  fieldsNotNull: (...fields) => (r) => {
    try {
      const body = r.json();
      return fields.every(field => {
        const value = body[field];
        return value !== null && value !== undefined;
      });
    } catch {
      return false;
    }
  },
  
  // ตรวจสอบหลาย fields ว่ามีข้อมูล (ไม่ว่าง)
  fieldsNotEmpty: (...fields) => (r) => {
    try {
      const body = r.json();
      return fields.every(field => {
        const value = body[field];
        
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        
        return true;
      });
    } catch {
      return false;
    }
  },
  
  // ตรวจสอบ nested field ไม่เป็น null
  pathNotNull: (path) => (r) => {
    try {
      const body = r.json();
      const keys = path.split('.');
      let value = body;
      
      for (const key of keys) {
        if (!value || value[key] === undefined) return false;
        value = value[key];
      }
      
      return value !== null && value !== undefined;
    } catch {
      return false;
    }
  },
  
  // ตรวจสอบ nested field มีข้อมูล (ไม่ว่าง)
  pathNotEmpty: (path) => (r) => {
    try {
      const body = r.json();
      const keys = path.split('.');
      let value = body;
      
      for (const key of keys) {
        if (!value || value[key] === undefined) return false;
        value = value[key];
      }
      
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      
      return true;
    } catch {
      return false;
    }
  },
  
  // ============ Value Checks ============
  fieldEquals: (field, expectedValue) => (r) => {
    try {
      const body = r.json();
      return body && body[field] === expectedValue;
    } catch {
      return false;
    }
  },
  
  fieldNotEquals: (field, unexpectedValue) => (r) => {
    try {
      const body = r.json();
      return body && body[field] !== unexpectedValue;
    } catch {
      return false;
    }
  },
  
  // ============ Type Checks ============
  fieldIsString: (field) => (r) => {
    try {
      const body = r.json();
      return typeof body[field] === 'string';
    } catch {
      return false;
    }
  },
  
  fieldIsNumber: (field) => (r) => {
    try {
      const body = r.json();
      return typeof body[field] === 'number';
    } catch {
      return false;
    }
  },
  
  fieldIsBoolean: (field) => (r) => {
    try {
      const body = r.json();
      return typeof body[field] === 'boolean';
    } catch {
      return false;
    }
  },
  
  fieldIsArray: (field) => (r) => {
    try {
      const body = r.json();
      return Array.isArray(body[field]);
    } catch {
      return false;
    }
  },
  
  fieldIsObject: (field) => (r) => {
    try {
      const body = r.json();
      const value = body[field];
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    } catch {
      return false;
    }
  },
  
  // ============ Number Range Checks ============
  fieldGreaterThan: (field, minValue) => (r) => {
    try {
      const body = r.json();
      return typeof body[field] === 'number' && body[field] > minValue;
    } catch {
      return false;
    }
  },
  
  fieldLessThan: (field, maxValue) => (r) => {
    try {
      const body = r.json();
      return typeof body[field] === 'number' && body[field] < maxValue;
    } catch {
      return false;
    }
  },
  
  fieldBetween: (field, minValue, maxValue) => (r) => {
    try {
      const body = r.json();
      const value = body[field];
      return typeof value === 'number' && value >= minValue && value <= maxValue;
    } catch {
      return false;
    }
  },
  
  // ============ String Checks ============
  fieldContains: (field, substring) => (r) => {
    try {
      const body = r.json();
      const value = body[field];
      return typeof value === 'string' && value.includes(substring);
    } catch {
      return false;
    }
  },
  
  fieldStartsWith: (field, prefix) => (r) => {
    try {
      const body = r.json();
      const value = body[field];
      return typeof value === 'string' && value.startsWith(prefix);
    } catch {
      return false;
    }
  },
  
  fieldMatchesPattern: (field, pattern) => (r) => {
    try {
      const body = r.json();
      const value = body[field];
      return typeof value === 'string' && pattern.test(value);
    } catch {
      return false;
    }
  },
  
  // ============ Performance Checks ============
  fastResponse: (maxMs = 1000) => (r) => r.timings.duration < maxMs,
  
  // ============ Array Item Checks ============
  arrayContains: (condition) => (r) => {
    try {
      const body = r.json();
      if (!Array.isArray(body)) return false;
      return body.some(condition);
    } catch {
      return false;
    }
  },
  
  arrayEvery: (condition) => (r) => {
    try {
      const body = r.json();
      if (!Array.isArray(body)) return false;
      return body.every(condition);
    } catch {
      return false;
    }
  },
};

/**
 * Auto-create metrics and checks configuration
 */
export function defineChecks(scenarioName, checkDefinitions) {
  const metrics = {};
  const config = {};
  
  checkDefinitions.forEach((def, index) => {
    const metricName = `check_${scenarioName}_${def.id || index}`;
    metrics[metricName] = new Rate(metricName);
    
    config[def.name] = {
      condition: def.check,
      metric: metrics[metricName],
    };
  });
  
  return { metrics, config };
}