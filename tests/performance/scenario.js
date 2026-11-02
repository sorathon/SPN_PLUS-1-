// --- Import Scenario Logic ---
import executeRequest from './config/executor.js';

// --- Master Scenario Configuration ---
// Kiro-generated/updated from specs/perf/perftest.spec.md — see
// .kiro/steering/performance-test-generation.md for the field mapping rules.
// Do not hand-edit the engine files this imports; only this file (and
// config/environments/default.json, data/bodies/**) are Kiro's to change.
export const scenariosConfig = {
  Scenario_1: {
    enabled: true,
    exec: executeRequest,

    // Execution settings
    execution: {
      priority: 99,
      group: 'default',
      dependsOn: null,
      runOnce: false,
    },
    thresholds: {
      duration_p95: 500,
      min_requests: 0,
      failure_rate: 'rate<0.01',
    },
    options: {
      executor: 'ramping-vus',
      tags: { scenario: 'Scenario_1' }
    },
    request: {
      method: 'GET',
      path: '/your-endpoint',
      params: {
        headers: {}
      },
    }
  },
};
