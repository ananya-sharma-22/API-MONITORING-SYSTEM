import './style.css'

type Trend = 'up' | 'down'
type EndpointMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type LatencyTone = 'good' | 'warn' | 'bad'
type Severity = 'critical' | 'warning' | 'healthy'
type PageId = 'dashboard' | 'logs' | 'endpoints' | 'alerts'
type ConnectionState = 'loading' | 'live' | 'offline'

type SummaryCard = {
  label: string
  value: string
  delta: string
  trend: Trend
}

type EndpointRecord = {
  endpoint: string
  method: EndpointMethod
  requests: number
  latency: number
  latencyTone: LatencyTone
  success: number
  error: number
}

type LogRecord = {
  requestId: string
  url: string
  method: EndpointMethod
  statusCode: number
  responseTime: number
  source: string
  timestamp: string
}

type AlertRecord = {
  id: string
  title: string
  service: string
  severity: Severity
  startedAt: string
  owner: string
  status: string
  summary: string
}

type DashboardPayload = {
  generatedAt: string
  summary: SummaryCard[]
  endpoints: EndpointRecord[]
  logs: LogRecord[]
  alerts: AlertRecord[]
}

type AppState = {
  data: DashboardPayload
  connection: ConnectionState
  message: string
}

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('App root not found')
}

const appRoot = root
const apiBaseUrl = `${window.location.protocol}//${window.location.hostname || 'localhost'}:5001/api`

const fallbackData: DashboardPayload = {
  generatedAt: new Date().toISOString(),
  summary: [
    { label: 'Requests today', value: '84.2K', delta: '+12.8%', trend: 'up' },
    { label: 'Avg response time', value: '412ms', delta: '-8.4%', trend: 'down' },
    { label: 'Healthy endpoints', value: '28 / 31', delta: '+3 routes', trend: 'up' },
    { label: 'Open alerts', value: '3', delta: '2 critical', trend: 'up' },
  ],
  endpoints: [
    { endpoint: '/api/products/1', method: 'PUT', requests: 13, latency: 486, latencyTone: 'warn', success: 76.9, error: 23.1 },
    { endpoint: '/api/analytics/report', method: 'GET', requests: 12, latency: 689, latencyTone: 'warn', success: 91.7, error: 8.3 },
    { endpoint: '/api/users', method: 'GET', requests: 10, latency: 279, latencyTone: 'good', success: 90, error: 10 },
    { endpoint: '/api/auth/login', method: 'POST', requests: 10, latency: 822, latencyTone: 'warn', success: 100, error: 0 },
    { endpoint: '/api/orders/42', method: 'DELETE', requests: 8, latency: 1330, latencyTone: 'bad', success: 62.5, error: 37.5 },
    { endpoint: '/api/payments/charge', method: 'POST', requests: 8, latency: 225, latencyTone: 'good', success: 75, error: 25 },
    { endpoint: '/api/products', method: 'GET', requests: 8, latency: 478, latencyTone: 'warn', success: 100, error: 0 },
    { endpoint: '/api/auth/profile', method: 'GET', requests: 7, latency: 742, latencyTone: 'warn', success: 71.4, error: 28.6 },
    { endpoint: '/api/users', method: 'POST', requests: 7, latency: 1089, latencyTone: 'bad', success: 100, error: 0 },
    { endpoint: '/api/notifications', method: 'GET', requests: 7, latency: 1603, latencyTone: 'bad', success: 71.4, error: 28.6 },
  ],
  logs: [
    { requestId: 'REQ-1942', url: '/api/auth/login', method: 'POST', statusCode: 200, responseTime: 182, source: 'web-frontend', timestamp: '2026-03-27T13:58:12+05:30' },
    { requestId: 'REQ-1938', url: '/api/orders/42', method: 'DELETE', statusCode: 503, responseTime: 1330, source: 'ops-console', timestamp: '2026-03-27T13:55:48+05:30' },
    { requestId: 'REQ-1930', url: '/api/products', method: 'GET', statusCode: 200, responseTime: 278, source: 'mobile-app', timestamp: '2026-03-27T13:52:30+05:30' },
    { requestId: 'REQ-1926', url: '/api/payments/charge', method: 'POST', statusCode: 429, responseTime: 842, source: 'checkout-ui', timestamp: '2026-03-27T13:47:11+05:30' },
    { requestId: 'REQ-1918', url: '/api/analytics/report', method: 'GET', statusCode: 200, responseTime: 664, source: 'internal-cron', timestamp: '2026-03-27T13:41:24+05:30' },
    { requestId: 'REQ-1904', url: '/api/notifications', method: 'GET', statusCode: 500, responseTime: 1603, source: 'worker-cluster', timestamp: '2026-03-27T13:33:09+05:30' },
  ],
  alerts: [
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
  ],
}

const pages: Record<PageId, { eyebrow: string; title: string; subcopy: string; actions: string[] }> = {
  dashboard: {
    eyebrow: 'Command center',
    title: 'System Overview',
    subcopy: 'Live reliability snapshot across traffic, health, and incident flow.',
    actions: ['Share snapshot', 'Sync now'],
  },
  logs: {
    eyebrow: 'Traffic audit',
    title: 'Request Activity',
    subcopy: 'Recent API requests with sources, durations, and response codes.',
    actions: ['Download CSV', 'Refresh feed'],
  },
  endpoints: {
    eyebrow: 'Operational view',
    title: 'Endpoint Analytics',
    subcopy: 'Performance breakdown per API route.',
    actions: ['Export report', 'Run health check'],
  },
  alerts: {
    eyebrow: 'Incident control',
    title: 'Alert Console',
    subcopy: 'Track active incidents, owners, and response momentum.',
    actions: ['Escalation map', 'Create incident'],
  },
}

let state: AppState = {
  data: fallbackData,
  connection: 'loading',
  message: 'Connecting to backend...',
}

window.addEventListener('hashchange', renderApp)

if (!window.location.hash) {
  window.location.hash = '#endpoints'
}

renderApp()
void refreshData()

async function refreshData() {
  state = {
    ...state,
    connection: 'loading',
    message: 'Connecting to backend...',
  }
  renderApp()

  try {
    const response = await fetch(`${apiBaseUrl}/dashboard`)

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`)
    }

    const payload = (await response.json()) as DashboardPayload
    state = {
      data: payload,
      connection: 'live',
      message: `Live backend connected · ${formatDateTime(payload.generatedAt)}`,
    }
  } catch {
    state = {
      data: fallbackData,
      connection: 'offline',
      message: 'Backend unavailable, showing demo snapshot',
    }
  }

  renderApp()
}

function renderApp() {
  const page = getCurrentPage()
  const pageConfig = pages[page]
  const topAlerts = state.data.alerts.slice(0, 3)
  const topEndpoints = state.data.endpoints.slice(0, 10)
  const topLogs = state.data.logs.slice(0, 6)
  const healthyCount = state.data.endpoints.filter((item) => item.latencyTone === 'good').length
  const warningCount = state.data.endpoints.filter((item) => item.latencyTone === 'warn').length
  const badCount = state.data.endpoints.filter((item) => item.latencyTone === 'bad').length
  const totalAlerts = state.data.alerts.filter((item) => item.status !== 'resolved').length

  appRoot.innerHTML = `
    <main class="dashboard-shell">
      <aside class="sidebar">
        <div class="sidebar-top">
          <div class="brand-lockup">
            <div class="brand-mark">S</div>
            <div>
              <p class="brand-title">Smart Monitor</p>
              <p class="brand-subtitle">API control center</p>
            </div>
          </div>

          <nav class="sidebar-nav" aria-label="Primary">
            ${navLink('dashboard', gridIcon(), 'Dashboard')}
            ${navLink('logs', logsIcon(), 'Request Logs')}
            ${navLink('endpoints', pulseIcon(), 'Endpoints')}
            ${navLink('alerts', alertIcon(), 'Alerts', String(totalAlerts))}
          </nav>
        </div>

        <section class="status-panel">
          <p class="status-kicker">System status</p>
          <div class="status-line">
            <span class="status-dot"></span>
            ${state.connection === 'live' ? 'Backend connected' : 'Demo mode active'}
          </div>
          <p class="status-copy">${state.message}</p>
        </section>
      </aside>

      <section class="main-panel">
        <header class="topbar">
          <div>
            <p class="eyebrow">${pageConfig.eyebrow}</p>
            <h1>${pageConfig.title}</h1>
            <p class="subcopy">${pageConfig.subcopy}</p>
          </div>

          <div class="topbar-actions">
            <span class="connection-chip ${state.connection}">${state.connection === 'live' ? 'Live API' : state.connection === 'loading' ? 'Connecting' : 'Fallback data'}</span>
            <button class="ghost-btn" type="button">${pageConfig.actions[0]}</button>
            <button class="primary-btn" type="button" data-action="refresh">${pageConfig.actions[1]}</button>
          </div>
        </header>

        ${renderPage(page, {
          alerts: topAlerts,
          endpoints: topEndpoints,
          logs: topLogs,
          healthyCount,
          warningCount,
          badCount,
          totalAlerts,
        })}
      </section>
    </main>
  `

  const refreshButton = appRoot.querySelector<HTMLButtonElement>('[data-action="refresh"]')
  refreshButton?.addEventListener('click', () => {
    void refreshData()
  })
}

function getCurrentPage(): PageId {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'dashboard' || hash === 'logs' || hash === 'endpoints' || hash === 'alerts') {
    return hash
  }

  return 'endpoints'
}

function renderPage(
  page: PageId,
  context: {
    alerts: AlertRecord[]
    endpoints: EndpointRecord[]
    logs: LogRecord[]
    healthyCount: number
    warningCount: number
    badCount: number
    totalAlerts: number
  },
) {
  if (page === 'dashboard') {
    return `
      <section class="summary-grid">
        ${state.data.summary.map((card) => summaryCard(card)).join('')}
      </section>

      <section class="dashboard-layout">
        <article class="table-card">
          <div class="table-head">
            <div>
              <p class="section-kicker">Overview</p>
              <h2>Service health board</h2>
            </div>
            <div class="pill-filter">${formatDateTime(state.data.generatedAt)}</div>
          </div>

          <div class="service-grid">
            ${serviceStatusCard('Healthy endpoints', `${context.healthyCount}`, 'sub-300ms avg', 'healthy')}
            ${serviceStatusCard('Warning endpoints', `${context.warningCount}`, 'needs review', 'warning')}
            ${serviceStatusCard('Critical endpoints', `${context.badCount}`, 'slow or unstable', 'critical')}
            ${serviceStatusCard('Open alerts', `${context.totalAlerts}`, 'active right now', context.totalAlerts > 0 ? 'warning' : 'healthy')}
          </div>

          <div class="spotlight-grid">
            ${metricPanel('Top latency route', context.endpoints[0]?.endpoint || '/api/orders/42', `${context.endpoints[0]?.latency || 0}ms at the latest snapshot`)}
            ${metricPanel('Latest request', context.logs[0]?.requestId || 'REQ-1942', `${context.logs[0]?.url || '/api/auth/login'} from ${context.logs[0]?.source || 'web-frontend'}`)}
            ${metricPanel('Incident focus', context.alerts[0]?.title || 'Orders API latency spike', context.alerts[0]?.summary || 'Monitoring feed connected')}
          </div>
        </article>

        <aside class="insight-rail">
          <article class="insight-card">
            <p class="section-kicker">Response mix</p>
            <h2>Status distribution</h2>
            <div class="donut-card">
              <div class="donut-ring">
                <div class="donut-core">${Math.max(0, 100 - context.badCount * 7)}%</div>
              </div>
              <div class="legend-list">
                ${legendRow('Healthy routes', `${context.healthyCount}`, 'good')}
                ${legendRow('Warning routes', `${context.warningCount}`, 'warn')}
                ${legendRow('Critical routes', `${context.badCount}`, 'bad')}
              </div>
            </div>
          </article>

          <article class="insight-card">
            <p class="section-kicker">Watchlist</p>
            <h2>Critical paths</h2>
            <div class="alert-stack">
              ${context.alerts.map((item) => alertRow(item.title, relativeTime(item.startedAt), severityToTone(item.severity))).join('')}
            </div>
          </article>
        </aside>
      </section>
    `
  }

  if (page === 'logs') {
    return `
      <section class="summary-grid compact-grid">
        ${summaryCard({ label: 'Requests / min', value: `${state.data.logs.length * 240}`, delta: '+6.2%', trend: 'up' })}
        ${summaryCard({ label: 'Error burst', value: `${state.data.logs.filter((log) => log.statusCode >= 400).length}`, delta: 'latest batch', trend: 'down' })}
        ${summaryCard({ label: 'Slow traces', value: `${state.data.logs.filter((log) => log.responseTime > 900).length}`, delta: 'p95 > 900ms', trend: 'up' })}
      </section>

      <section class="analytics-layout logs-layout">
        <article class="table-card">
          <div class="table-head">
            <div>
              <p class="section-kicker">Realtime feed</p>
              <h2>Recent request logs</h2>
            </div>
            <div class="filter-row">
              <span class="filter-chip active">All traffic</span>
              <span class="filter-chip">Errors</span>
              <span class="filter-chip">Slow only</span>
            </div>
          </div>

          <div class="analytics-table" role="table" aria-label="Request logs">
            <div class="table-row table-header log-header" role="row">
              <span role="columnheader">Request id</span>
              <span role="columnheader">Route</span>
              <span role="columnheader">Method</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Duration</span>
              <span role="columnheader">Source</span>
              <span role="columnheader">Time</span>
            </div>
            ${context.logs.map((record) => logRow(record)).join('')}
          </div>
        </article>

        <aside class="insight-rail">
          <article class="insight-card">
            <p class="section-kicker">Trace notes</p>
            <h2>Routing hotspots</h2>
            <div class="mini-bars">
              ${miniBar('Auth flow', 72)}
              ${miniBar('Payments', 61)}
              ${miniBar('Analytics', 48)}
            </div>
          </article>

          <article class="insight-card">
            <p class="section-kicker">Queue depth</p>
            <h2>Worker health</h2>
            <div class="stat-list">
              ${statLine('Error responses', String(state.data.logs.filter((log) => log.statusCode >= 500).length))}
              ${statLine('Rate limited', String(state.data.logs.filter((log) => log.statusCode === 429).length))}
              ${statLine('Fast paths', String(state.data.logs.filter((log) => log.responseTime < 300).length))}
            </div>
          </article>
        </aside>
      </section>
    `
  }

  if (page === 'alerts') {
    return `
      <section class="summary-grid compact-grid">
        ${summaryCard({ label: 'Active incidents', value: String(context.totalAlerts), delta: 'live backend', trend: 'up' })}
        ${summaryCard({ label: 'Critical alerts', value: String(state.data.alerts.filter((item) => item.severity === 'critical').length), delta: 'needs action', trend: 'up' })}
        ${summaryCard({ label: 'Resolved', value: String(state.data.alerts.filter((item) => item.status === 'resolved').length), delta: 'latest snapshot', trend: 'down' })}
      </section>

      <section class="dashboard-layout">
        <article class="table-card">
          <div class="table-head">
            <div>
              <p class="section-kicker">Active queue</p>
              <h2>Incident board</h2>
            </div>
            <div class="pill-filter">${context.totalAlerts} open alerts</div>
          </div>

          <div class="incident-stack">
            ${state.data.alerts.map((record) => incidentCard(record)).join('')}
          </div>
        </article>

        <aside class="insight-rail">
          <article class="insight-card">
            <p class="section-kicker">Runbook</p>
            <h2>Response checklist</h2>
            <div class="checklist">
              ${checkItem('Validate upstream dependency health')}
              ${checkItem('Confirm impact scope by endpoint and region')}
              ${checkItem('Notify owners and post status update')}
              ${checkItem('Capture mitigation notes for follow-up')}
            </div>
          </article>

          <article class="insight-card">
            <p class="section-kicker">Escalation map</p>
            <h2>Owners on duty</h2>
            <div class="stat-list">
              ${statLine('SRE primary', state.data.alerts[0]?.owner || 'SRE Team')}
              ${statLine('Backend owner', state.data.alerts[1]?.owner || 'Platform Ops')}
              ${statLine('Comms', 'Incident Desk')}
            </div>
          </article>
        </aside>
      </section>
    `
  }

  return `
    <section class="summary-grid">
      ${state.data.summary.map((card) => summaryCard(card)).join('')}
    </section>

    <section class="analytics-layout">
      <article class="table-card">
        <div class="table-head">
          <div>
            <p class="section-kicker">Traffic matrix</p>
            <h2>Endpoint Analytics</h2>
          </div>
          <div class="pill-filter">${formatDateTime(state.data.generatedAt)}</div>
        </div>

        <div class="analytics-table" role="table" aria-label="Endpoint analytics">
          <div class="table-row table-header" role="row">
            <span role="columnheader">Endpoint</span>
            <span role="columnheader">Method</span>
            <span role="columnheader">Total requests</span>
            <span role="columnheader">Avg latency</span>
            <span role="columnheader">Success / error rate</span>
            <span role="columnheader"></span>
          </div>
          ${context.endpoints.map((record) => endpointRow(record)).join('')}
        </div>
      </article>

      <aside class="insight-rail">
        <article class="insight-card">
          <p class="section-kicker">Live issues</p>
          <h2>Alert stream</h2>
          <div class="alert-stack">
            ${context.alerts.map((item) => alertRow(item.title, relativeTime(item.startedAt), severityToTone(item.severity))).join('')}
          </div>
        </article>

        <article class="insight-card">
          <p class="section-kicker">Hot services</p>
          <h2>Throughput share</h2>
          <div class="mini-bars">
            ${miniBar('Auth service', 78)}
            ${miniBar('Products API', 64)}
            ${miniBar('Payments core', 51)}
          </div>
        </article>
      </aside>
    </section>
  `
}

function navLink(page: PageId, icon: string, label: string, badge?: string) {
  const activeClass = getCurrentPage() === page ? 'active' : ''

  return `
    <a class="nav-item ${activeClass}" href="#${page}">
      <span class="nav-icon">${icon}</span>
      ${label}
      ${badge ? `<span class="nav-badge">${badge}</span>` : ''}
    </a>
  `
}

function summaryCard(card: SummaryCard) {
  return `
    <article class="summary-card">
      <p class="summary-label">${card.label}</p>
      <div class="summary-value-row">
        <strong>${card.value}</strong>
        <span class="trend ${card.trend}">${card.delta}</span>
      </div>
    </article>
  `
}

function endpointRow(record: EndpointRecord) {
  return `
    <div class="table-row" role="row">
      <span class="endpoint-name" role="cell">${record.endpoint}</span>
      <span role="cell"><span class="method-chip ${record.method.toLowerCase()}">${record.method}</span></span>
      <span role="cell">${record.requests}</span>
      <span role="cell"><span class="latency-pill ${record.latencyTone}">${record.latency}ms</span></span>
      <span role="cell">
        <div class="rate-cell">
          <div class="rate-values">
            <strong>${record.success.toFixed(1)}%</strong>
            <span>${record.error.toFixed(1)}%</span>
          </div>
          <div class="rate-bar" aria-hidden="true">
            <i class="success" style="width:${record.success}%"></i>
            <i class="error" style="width:${record.error}%"></i>
          </div>
        </div>
      </span>
      <span class="row-link" role="cell">${arrowIcon()}</span>
    </div>
  `
}

function logRow(record: LogRecord) {
  return `
    <div class="table-row log-row" role="row">
      <span class="endpoint-name" role="cell">${record.requestId}</span>
      <span role="cell">${record.url}</span>
      <span role="cell"><span class="method-chip ${record.method.toLowerCase()}">${record.method}</span></span>
      <span role="cell"><span class="status-pill ${statusTone(record.statusCode)}">${record.statusCode}</span></span>
      <span role="cell">${record.responseTime}ms</span>
      <span role="cell">${record.source}</span>
      <span role="cell">${relativeTime(record.timestamp)}</span>
    </div>
  `
}

function incidentCard(record: AlertRecord) {
  return `
    <article class="incident-card ${record.severity}">
      <div class="incident-head">
        <div>
          <p class="incident-service">${record.service}</p>
          <h3>${record.title}</h3>
        </div>
        <span class="severity-pill ${record.severity}">${record.severity}</span>
      </div>

      <p class="incident-summary">${record.summary}</p>

      <div class="incident-meta">
        ${statLine('Started', relativeTime(record.startedAt))}
        ${statLine('Owner', record.owner)}
      </div>
    </article>
  `
}

function serviceStatusCard(name: string, uptime: string, latency: string, severity: Severity) {
  return `
    <article class="service-status-card ${severity}">
      <div class="service-status-head">
        <strong>${name}</strong>
        <span class="severity-pill ${severity}">${severity}</span>
      </div>
      <div class="service-status-metrics">
        <div>
          <span>Count</span>
          <strong>${uptime}</strong>
        </div>
        <div>
          <span>Signal</span>
          <strong>${latency}</strong>
        </div>
      </div>
    </article>
  `
}

function metricPanel(label: string, value: string, copy: string) {
  return `
    <article class="metric-panel">
      <p class="summary-label">${label}</p>
      <strong>${value}</strong>
      <p>${copy}</p>
    </article>
  `
}

function legendRow(label: string, value: string, tone: 'good' | 'warn' | 'bad') {
  return `
    <div class="legend-row">
      <span><i class="legend-dot ${tone}"></i>${label}</span>
      <strong>${value}</strong>
    </div>
  `
}

function alertRow(title: string, time: string, tone: string) {
  return `
    <div class="alert-row">
      <span class="alert-dot ${tone}"></span>
      <div>
        <strong>${title}</strong>
        <p>${time}</p>
      </div>
    </div>
  `
}

function miniBar(label: string, value: number) {
  return `
    <div class="mini-bar-row">
      <div class="mini-bar-label">
        <span>${label}</span>
        <strong>${value}%</strong>
      </div>
      <div class="mini-bar-track">
        <i style="width:${value}%"></i>
      </div>
    </div>
  `
}

function statLine(label: string, value: string) {
  return `
    <div class="stat-line">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `
}

function checkItem(label: string) {
  return `
    <div class="check-item">
      <span class="check-mark"></span>
      ${label}
    </div>
  `
}

function statusTone(status: number) {
  if (status >= 500) return 'bad'
  if (status >= 400) return 'warn'
  return 'good'
}

function severityToTone(severity: Severity) {
  if (severity === 'critical') return 'bad'
  if (severity === 'warning') return 'warn'
  return 'good'
}

function relativeTime(input: string) {
  const date = new Date(input)
  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))

  if (diffMinutes < 60) {
    return `${diffMinutes} mins ago`
  }

  const diffHours = Math.round(diffMinutes / 60)
  return `${diffHours} hrs ago`
}

function formatDateTime(input: string) {
  return new Date(input).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function gridIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.2"></rect>
      <rect x="14" y="4" width="6" height="6" rx="1.2"></rect>
      <rect x="4" y="14" width="6" height="6" rx="1.2"></rect>
      <rect x="14" y="14" width="6" height="6" rx="1.2"></rect>
    </svg>
  `
}

function logsIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14"></path>
      <path d="M5 12h14"></path>
      <path d="M5 17h9"></path>
    </svg>
  `
}

function pulseIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12h4l2.3-5.2L14 18l2.1-6H21"></path>
    </svg>
  `
}

function alertIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4a4 4 0 0 0-4 4v2.5C8 12 7.4 13.4 6 14.4L5 15.1V17h14v-1.9l-1-0.7c-1.4-1-2-2.4-2-3.9V8a4 4 0 0 0-4-4Z"></path>
      <path d="M10 19a2 2 0 0 0 4 0"></path>
    </svg>
  `
}

function arrowIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8h8v8"></path>
      <path d="M8 16 16 8"></path>
    </svg>
  `
}
