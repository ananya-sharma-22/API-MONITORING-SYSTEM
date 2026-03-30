const summary = [
  { label: 'Requests today', value: '84.2K', delta: '+12.8%', trend: 'up' },
  { label: 'Avg response time', value: '412ms', delta: '-8.4%', trend: 'down' },
  { label: 'Healthy endpoints', value: '28 / 31', delta: '+3 routes', trend: 'up' },
  { label: 'Open alerts', value: '3', delta: '2 critical', trend: 'up' },
]

const endpoints = [
  { endpoint: '/api/products/1', method: 'PUT', requests: 13, latency: 486, latencyTone: 'warn', success: 76.9, error: 23.1 },
  { endpoint: '/api/analytics/report', method: 'GET', requests: 12, latency: 689, latencyTone: 'warn', success: 91.7, error: 8.3 },
  { endpoint: '/api/users', method: 'GET', requests: 10, latency: 279, latencyTone: 'good', success: 90.0, error: 10.0 },
  { endpoint: '/api/auth/login', method: 'POST', requests: 10, latency: 822, latencyTone: 'warn', success: 100.0, error: 0.0 },
  { endpoint: '/api/orders/42', method: 'DELETE', requests: 8, latency: 1330, latencyTone: 'bad', success: 62.5, error: 37.5 },
  { endpoint: '/api/payments/charge', method: 'POST', requests: 8, latency: 225, latencyTone: 'good', success: 75.0, error: 25.0 },
  { endpoint: '/api/products', method: 'GET', requests: 8, latency: 478, latencyTone: 'warn', success: 100.0, error: 0.0 },
  { endpoint: '/api/auth/profile', method: 'GET', requests: 7, latency: 742, latencyTone: 'warn', success: 71.4, error: 28.6 },
  { endpoint: '/api/users', method: 'POST', requests: 7, latency: 1089, latencyTone: 'bad', success: 100.0, error: 0.0 },
  { endpoint: '/api/notifications', method: 'GET', requests: 7, latency: 1603, latencyTone: 'bad', success: 71.4, error: 28.6 },
]

const logs = [
  { requestId: 'REQ-1942', url: '/api/auth/login', method: 'POST', statusCode: 200, responseTime: 182, source: 'web-frontend', timestamp: '2026-03-27T13:58:12+05:30' },
  { requestId: 'REQ-1938', url: '/api/orders/42', method: 'DELETE', statusCode: 503, responseTime: 1330, source: 'ops-console', timestamp: '2026-03-27T13:55:48+05:30' },
  { requestId: 'REQ-1930', url: '/api/products', method: 'GET', statusCode: 200, responseTime: 278, source: 'mobile-app', timestamp: '2026-03-27T13:52:30+05:30' },
  { requestId: 'REQ-1926', url: '/api/payments/charge', method: 'POST', statusCode: 429, responseTime: 842, source: 'checkout-ui', timestamp: '2026-03-27T13:47:11+05:30' },
  { requestId: 'REQ-1918', url: '/api/analytics/report', method: 'GET', statusCode: 200, responseTime: 664, source: 'internal-cron', timestamp: '2026-03-27T13:41:24+05:30' },
  { requestId: 'REQ-1904', url: '/api/notifications', method: 'GET', statusCode: 500, responseTime: 1603, source: 'worker-cluster', timestamp: '2026-03-27T13:33:09+05:30' },
]

const alerts = [
  {
    id: 'ALT-401',
    title: 'Orders API latency spike',
    service: 'Order Engine',
    severity: 'critical',
    startedAt: '2026-03-27T13:56:00+05:30',
    owner: 'SRE Team',
    status: 'open',
    summary: 'P95 latency crossed 1.2s after a burst of delete and refund traffic.',
  },
  {
    id: 'ALT-398',
    title: 'Webhook retries elevated',
    service: 'Notification Worker',
    severity: 'warning',
    startedAt: '2026-03-27T13:34:00+05:30',
    owner: 'Platform Ops',
    status: 'investigating',
    summary: 'Retry queue increased by 37% and upstream delivery is oscillating.',
  },
  {
    id: 'ALT-392',
    title: 'Auth flow recovered',
    service: 'Identity Gateway',
    severity: 'healthy',
    startedAt: '2026-03-27T13:47:00+05:30',
    owner: 'Access Team',
    status: 'resolved',
    summary: 'Token refresh incidents auto-resolved after cache warm-up completed.',
  },
]

function buildDashboardPayload() {
  return {
    generatedAt: new Date().toISOString(),
    summary,
    endpoints,
    logs,
    alerts,
  }
}

module.exports = {
  alerts,
  buildDashboardPayload,
  endpoints,
  logs,
  summary,
}
