const { buildDashboardPayload } = require('./mock-data')

let pool
let poolError

function databaseConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  }

  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    database: process.env.DATABASE_NAME || 'smart_monitor',
    user: process.env.DATABASE_USER || 'smart_monitor',
    password: process.env.DATABASE_PASSWORD || 'smart_monitor',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  }
}

function getPool() {
  if (pool) {
    return pool
  }

  if (poolError) {
    throw poolError
  }

  try {
    const { Pool } = require('pg')
    pool = new Pool(databaseConfig())
    return pool
  } catch (error) {
    poolError = error
    throw error
  }
}

async function query(text, params = []) {
  const activePool = getPool()
  return activePool.query(text, params)
}

async function testDatabaseConnection() {
  try {
    await query('SELECT 1')
    return true
  } catch {
    return false
  }
}

async function getDatabaseHealth() {
  const healthy = await testDatabaseConnection()
  return healthy ? 'connected' : 'unavailable'
}

function mapLogRow(row) {
  return {
    requestId: row.request_id,
    url: row.url,
    method: row.method,
    statusCode: row.status_code,
    responseTime: row.response_time_ms,
    source: row.source,
    timestamp: row.observed_at,
  }
}

function mapEndpointRow(row) {
  return {
    endpoint: row.endpoint,
    method: row.method,
    requests: row.total_requests,
    latency: row.avg_latency_ms,
    latencyTone: row.latency_tone,
    success: Number(row.success_rate),
    error: Number(row.error_rate),
  }
}

function mapAlertRow(row) {
  return {
    id: `ALT-${row.id}`,
    title: row.title,
    service: row.service,
    severity: row.severity,
    startedAt: row.started_at,
    owner: row.owner,
    status: row.status,
    summary: row.summary,
  }
}

async function fetchLogs(limit = 20) {
  const result = await query(
    `SELECT request_id, url, method, status_code, response_time_ms, source, observed_at
     FROM request_logs
     ORDER BY observed_at DESC
     LIMIT $1`,
    [limit],
  )

  return result.rows.map(mapLogRow)
}

async function fetchEndpoints(limit = 20) {
  const result = await query(
    `SELECT endpoint, method, total_requests, avg_latency_ms, latency_tone, success_rate, error_rate, updated_at
     FROM endpoint_metrics
     ORDER BY avg_latency_ms DESC, total_requests DESC
     LIMIT $1`,
    [limit],
  )

  return result.rows.map(mapEndpointRow)
}

async function fetchAlerts(limit = 20) {
  const result = await query(
    `SELECT id, title, service, severity, started_at, owner, status, summary
     FROM alerts
     ORDER BY started_at DESC
     LIMIT $1`,
    [limit],
  )

  return result.rows.map(mapAlertRow)
}

function deriveTrend(value, inverse = false) {
  if (inverse) {
    return value > 0 ? 'down' : 'up'
  }

  return value >= 0 ? 'up' : 'down'
}

async function fetchSummary() {
  const [totalsResult, endpointResult, alertsResult] = await Promise.all([
    query(
      `SELECT
         COUNT(*)::int AS total_logs,
         COALESCE(AVG(response_time_ms), 0)::int AS avg_response_time
       FROM request_logs`,
    ),
    query(
      `SELECT
         COUNT(*)::int AS total_endpoints,
         COUNT(*) FILTER (WHERE latency_tone = 'good')::int AS healthy_endpoints
       FROM endpoint_metrics`,
    ),
    query(
      `SELECT
         COUNT(*) FILTER (WHERE status <> 'resolved')::int AS open_alerts,
         COUNT(*) FILTER (WHERE severity = 'critical' AND status <> 'resolved')::int AS critical_alerts
       FROM alerts`,
    ),
  ])

  const totals = totalsResult.rows[0]
  const endpointStats = endpointResult.rows[0]
  const alertStats = alertsResult.rows[0]
  const healthyRatio = endpointStats.total_endpoints
    ? `${endpointStats.healthy_endpoints} / ${endpointStats.total_endpoints}`
    : '0 / 0'

  return [
    {
      label: 'Requests today',
      value: `${totals.total_logs}`,
      delta: '+live feed',
      trend: 'up',
    },
    {
      label: 'Avg response time',
      value: `${totals.avg_response_time}ms`,
      delta: totals.avg_response_time > 600 ? 'latency elevated' : 'stable',
      trend: deriveTrend(totals.avg_response_time - 600, true),
    },
    {
      label: 'Healthy endpoints',
      value: healthyRatio,
      delta: `${endpointStats.healthy_endpoints} stable`,
      trend: 'up',
    },
    {
      label: 'Open alerts',
      value: `${alertStats.open_alerts}`,
      delta: `${alertStats.critical_alerts} critical`,
      trend: alertStats.open_alerts > 0 ? 'up' : 'down',
    },
  ]
}

async function buildDashboardPayloadFromDatabase() {
  const [summary, endpoints, logs, alerts] = await Promise.all([
    fetchSummary(),
    fetchEndpoints(),
    fetchLogs(),
    fetchAlerts(),
  ])

  return {
    generatedAt: new Date().toISOString(),
    summary,
    endpoints,
    logs,
    alerts,
  }
}

async function recalculateEndpointMetric(url, method) {
  await query(
    `INSERT INTO endpoint_metrics (
       endpoint,
       method,
       total_requests,
       avg_latency_ms,
       latency_tone,
       success_rate,
       error_rate,
       updated_at
     )
     SELECT
       url,
       method,
       COUNT(*)::int,
       ROUND(AVG(response_time_ms))::int,
       CASE
         WHEN ROUND(AVG(response_time_ms)) >= 1000 THEN 'bad'
         WHEN ROUND(AVG(response_time_ms)) >= 450 THEN 'warn'
         ELSE 'good'
       END,
       ROUND((COUNT(*) FILTER (WHERE status_code < 400)::numeric / NULLIF(COUNT(*), 0)) * 100, 1),
       ROUND((COUNT(*) FILTER (WHERE status_code >= 400)::numeric / NULLIF(COUNT(*), 0)) * 100, 1),
       NOW()
     FROM request_logs
     WHERE url = $1 AND method = $2
     GROUP BY url, method
     ON CONFLICT (endpoint, method) DO UPDATE SET
       total_requests = EXCLUDED.total_requests,
       avg_latency_ms = EXCLUDED.avg_latency_ms,
       latency_tone = EXCLUDED.latency_tone,
       success_rate = EXCLUDED.success_rate,
       error_rate = EXCLUDED.error_rate,
       updated_at = EXCLUDED.updated_at`,
    [url, method],
  )
}

function deriveAlert(input) {
  if (input.responseTime >= 1000) {
    return {
      title: `Latency spike on ${input.url}`,
      service: serviceNameForEndpoint(input.url),
      severity: 'critical',
      status: 'open',
      owner: 'SRE Team',
      ruleType: 'latency_threshold',
      summary: `Observed ${input.responseTime}ms response time on ${input.method} ${input.url}.`,
    }
  }

  if (input.statusCode >= 500) {
    return {
      title: `Server error on ${input.url}`,
      service: serviceNameForEndpoint(input.url),
      severity: 'critical',
      status: 'open',
      owner: 'Backend Team',
      ruleType: 'server_error',
      summary: `Received ${input.statusCode} for ${input.method} ${input.url}.`,
    }
  }

  if (input.statusCode === 429) {
    return {
      title: `Rate limiting on ${input.url}`,
      service: serviceNameForEndpoint(input.url),
      severity: 'warning',
      status: 'investigating',
      owner: 'Platform Ops',
      ruleType: 'rate_limit',
      summary: `Received 429 while handling ${input.method} ${input.url}.`,
    }
  }

  return null
}

async function createAlertIfNeeded(input) {
  const alert = deriveAlert(input)

  if (!alert) {
    return null
  }

  const existing = await query(
    `SELECT id
     FROM alerts
     WHERE endpoint = $1
       AND rule_type = $2
       AND status <> 'resolved'
       AND started_at >= NOW() - INTERVAL '30 minutes'
     LIMIT 1`,
    [input.url, alert.ruleType],
  )

  if (existing.rowCount > 0) {
    return null
  }

  const created = await query(
    `INSERT INTO alerts (title, service, severity, status, owner, summary, rule_type, endpoint, started_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING id, title, service, severity, started_at, owner, status, summary`,
    [
      alert.title,
      alert.service,
      alert.severity,
      alert.status,
      alert.owner,
      alert.summary,
      alert.ruleType,
      input.url,
    ],
  )

  return mapAlertRow(created.rows[0])
}

async function ingestLog(input) {
  const requestId = input.requestId || `REQ-${Date.now()}`
  const timestamp = input.timestamp || new Date().toISOString()
  const source = input.source || 'unknown-client'

  const inserted = await query(
    `INSERT INTO request_logs (request_id, url, method, status_code, response_time_ms, source, observed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING request_id, url, method, status_code, response_time_ms, source, observed_at`,
    [requestId, input.url, input.method, input.statusCode, input.responseTime, source, timestamp],
  )

  await recalculateEndpointMetric(input.url, input.method)
  const createdAlert = await createAlertIfNeeded({
    url: input.url,
    method: input.method,
    statusCode: input.statusCode,
    responseTime: input.responseTime,
  })

  return {
    log: mapLogRow(inserted.rows[0]),
    alert: createdAlert,
  }
}

async function updateAlertStatus(id, status) {
  const numericId = Number(String(id).replace(/^ALT-/, ''))

  const result = await query(
    `UPDATE alerts
     SET status = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, service, severity, started_at, owner, status, summary`,
    [numericId, status],
  )

  return result.rowCount ? mapAlertRow(result.rows[0]) : null
}

function serviceNameForEndpoint(endpoint) {
  if (endpoint.includes('/auth')) return 'Identity Gateway'
  if (endpoint.includes('/payments')) return 'Payments Core'
  if (endpoint.includes('/orders')) return 'Order Engine'
  if (endpoint.includes('/notifications')) return 'Notification Worker'
  return 'API Platform'
}

async function safeDashboardPayload() {
  try {
    return await buildDashboardPayloadFromDatabase()
  } catch {
    return buildDashboardPayload()
  }
}

module.exports = {
  buildDashboardPayloadFromDatabase,
  fetchAlerts,
  fetchEndpoints,
  fetchLogs,
  fetchSummary,
  getDatabaseHealth,
  ingestLog,
  safeDashboardPayload,
  testDatabaseConnection,
  updateAlertStatus,
}
