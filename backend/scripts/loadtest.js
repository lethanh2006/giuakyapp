import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';

// REST baseline for NRApp. Login/OTP, writes and Socket.IO are separate workloads.
const baseUrl = (__ENV.BASE_URL || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(baseUrl)) {
  throw new Error('Set BASE_URL to the deployed API origin, e.g. https://api.example.com');
}
const tokens = new SharedArray('test access tokens', () => {
  const values = __ENV.TOKENS_FILE
    ? JSON.parse(open(__ENV.TOKENS_FILE))
    : [__ENV.TOKEN];
  if (!Array.isArray(values) || !values.length || values.some(t => typeof t !== 'string' || !t.trim())) {
    throw new Error('Supply TOKEN, or TOKENS_FILE containing a JSON array of access tokens');
  }
  return values;
});
const mode = __ENV.MODE || 'smoke';
if (!['smoke', 'load'].includes(mode)) throw new Error('MODE must be smoke or load');
const targetVUs = mode === 'smoke' ? 1 : Number(__ENV.TARGET_VUS || 10);
if (!Number.isInteger(targetVUs) || targetVUs < 1) throw new Error('TARGET_VUS must be a positive integer');
if (__ENV.TOKENS_FILE && tokens.length < targetVUs) {
  throw new Error('TOKENS_FILE must contain at least TARGET_VUS tokens, one per VU');
}
function seconds(name, fallback) {
  const value = Number(__ENV[name] || fallback);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}
const rampSeconds = seconds('RAMP_SECONDS', 60);
const holdSeconds = seconds('HOLD_SECONDS', 180);
const downSeconds = seconds('DOWN_SECONDS', 30);

const rateLimited = new Counter('rate_limited');
const authErrors = new Counter('auth_errors');
const serverErrors = new Counter('server_errors');
const holdRequests = new Counter('hold_requests');
const holdSuccess = new Rate('hold_success');
const holdDuration = new Trend('hold_duration', true);
const endpoints = [
  { name: 'profile', path: '/api/user/me' },
  { name: 'my_tasks', path: '/api/todo/my-tasks' },
  { name: 'chats', path: '/api/chat/chat/all' },
];
const holdEndpointDuration = Object.fromEntries(endpoints.map(endpoint => [
  endpoint.name,
  new Trend(`hold_duration_${endpoint.name}`, true),
]));

export const options = {
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  ...(mode === 'smoke'
    ? { vus: 1, duration: __ENV.SMOKE_DURATION || '20s' }
    : {
        stages: [
          { duration: `${rampSeconds}s`, target: targetVUs },
          { duration: `${holdSeconds}s`, target: targetVUs },
          { duration: `${downSeconds}s`, target: 0 },
        ],
      }),
  thresholds: {
    // Example goals. Adjust them to the application's actual latency budget.
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '20s' }],
    checks: ['rate>0.99'],
    rate_limited: ['count==0'],
    auth_errors: ['count==0'],
    server_errors: ['count==0'],
    ...(mode === 'load' ? {
      hold_success: ['rate>0.99'],
      hold_duration: ['p(95)<500', 'p(99)<500'],
      ...Object.fromEntries(endpoints.map(endpoint => [
        `hold_duration_${endpoint.name}`,
        ['p(95)<500', 'p(99)<500'],
      ])),
    } : {}),
    ...(mode === 'smoke' ? Object.fromEntries(endpoints.map(endpoint => [
      `http_req_duration{endpoint:${endpoint.name}}`,
      ['p(95)<500', 'p(99)<500'],
    ])) : {}),
  },
};

export function setup() {
  if (targetVUs > 1 && !__ENV.TOKENS_FILE) {
    console.warn('All VUs share one account: this run measures repeated reads for that account, not distinct active users.');
  }
}

export default function () {
  const token = tokens[(__VU - 1) % tokens.length];
  for (const endpoint of endpoints) {
    const response = http.get(`${baseUrl}${endpoint.path}`, {
      headers: { Authorization: `Bearer ${token}` },
      tags: { name: endpoint.path, endpoint: endpoint.name },
      timeout: '10s',
      redirects: 0,
    });
    if (__ENV.PERF_TRACE === '1' && response.timings.duration >= 500) {
      console.warn(JSON.stringify({
        event: 'slow_response',
        endpoint: endpoint.name,
        request_id: response.headers['X-Request-Id'] || response.headers['x-request-id'] || null,
        duration_ms: response.timings.duration,
        waiting_ms: response.timings.waiting,
        receiving_ms: response.timings.receiving,
        connecting_ms: response.timings.connecting,
        tls_ms: response.timings.tls_handshaking,
        status: response.status,
      }));
    }
    rateLimited.add(response.status === 429 ? 1 : 0);
    authErrors.add([401, 403].includes(response.status) ? 1 : 0);
    serverErrors.add(response.status >= 500 ? 1 : 0);
    let validJson = false;
    try {
      const body = response.json();
      validJson = body !== null && typeof body === 'object' && body.success !== false;
    } catch (_) {
      // An HTML proxy error must not count as a successful API response.
    }
    check(response, {
      [`${endpoint.name}: HTTP 200`]: r => r.status === 200,
      [`${endpoint.name}: JSON without explicit failure`]: () => validJson,
    }, { endpoint: endpoint.name });
    // Count responses completed during the fixed-load interval. Its throughput
    // is count / HOLD_SECONDS, rather than k6's average over the entire run.
    const elapsed = exec.instance.currentTestRunDuration;
    if (mode === 'load' && elapsed >= rampSeconds * 1000 && elapsed < (rampSeconds + holdSeconds) * 1000) {
      holdRequests.add(1);
      holdSuccess.add(response.status === 200 && validJson);
      holdDuration.add(response.timings.duration);
      holdEndpointDuration[endpoint.name].add(response.timings.duration);
    }
    sleep(0.3 + Math.random() * 0.7);
  }
  sleep(1 + Math.random() * 2);
}
