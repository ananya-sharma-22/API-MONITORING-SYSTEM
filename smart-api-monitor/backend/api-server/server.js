const http = require('node:http')

const { buildDashboardPayload } = require('../shared/mock-data')
const {
  fetchAlerts,
  fetchEndpoints,
  fetchLogs,
  fetchSummary,
  getDatabaseHealth,
  ingestLog,
  safeDashboardPayload,
  updateAlertStatus,
} = require('../shared/db')
const { handlePreflight, readJsonBody, sendJson, sendNotFound } = require('../shared/http')

const PORT = Number(process.env.API_SERVER_PORT || 5001)
const monitoringServiceUrl = process.env.MONITORING_SERVICE_URL || `http://localhost:${process.env.MONITORING_SERVICE_PORT || 5002}`
const alertServiceUrl = process.env.ALERT_SERVICE_URL || `http://localhost:${process.env.ALERT_SERVICE_PORT || 5003}`

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/html; charset=utf-8',
  })
  res.end(html)
}

function docsPage(databaseHealth) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Smart API Monitor API</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Manrope, Segoe UI, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(31, 124, 148, 0.18), transparent 24%),
          linear-gradient(180deg, #071019 0%, #08111a 100%);
        color: #e7edf7;
      }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 32px; }
      main { width: min(960px, 100%); border: 1px solid rgba(116, 136, 164, 0.12); border-radius: 28px; background: rgba(11, 18, 28, 0.95); box-shadow: 0 30px 60px rgba(2, 8, 15, 0.36); padding: 28px; }
      .eyebrow, .label { color: #22d3ee; text-transform: uppercase; letter-spacing: .08em; font-size: .8rem; }
      h1 { margin: 10px 0 8px; font-size: clamp(2rem, 4vw, 3.4rem); }
      p, li { color: #95a3b8; line-height: 1.7; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 22px; }
      .card { border: 1px solid rgba(116, 136, 164, 0.12); border-radius: 20px; padding: 18px; background: rgba(9, 15, 24, 0.72); }
      a { color: #86f4ff; text-decoration: none; }
      code { color: #d8e5f5; }
      ul { padding-left: 18px; }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Smart API Monitor</div>
      <h1>Backend API is running</h1>
      <p>Frontend can connect to <code>/api/dashboard</code>. Database status is <code>${databaseHealth}</code>.</p>
      <div class="grid">
        <section class="card">
          <div class="label">Read APIs</div>
          <p><a href="/health">/health</a></p>
          <p><a href="/api/dashboard">/api/dashboard</a></p>
          <p><a href="/api/summary">/api/summary</a></p>
          <p><a href="/api/endpoints">/api/endpoints</a></p>
          <p><a href="/api/logs">/api/logs</a></p>
          <p><a href="/api/alerts">/api/alerts</a></p>
        </section>
        <section class="card">
          <div class="label">Write APIs</div>
          <ul>
            <li><code>POST /api/ingest/log</code></li>
            <li><code>PATCH /api/alerts/:id/status</code></li>
          </ul>
        </section>
        <section class="card">
          <div class="label">Services</div>
          <p><a href="${monitoringServiceUrl}/health">${monitoringServiceUrl}/health</a></p>
          <p><a href="${alertServiceUrl}/health">${alertServiceUrl}/health</a></p>
          <p><code>docker compose --profile database up --build</code></p>
        </section>
      </div>
    </main>
  </body>
</html>`
}

function validateIngestPayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Payload must be a JSON object'
  if (!payload.url || typeof payload.url !== 'string') return 'Field "url" is required'
  if (!payload.method || typeof payload.method !== 'string') return 'Field "method" is required'
  if (!Number.isInteger(payload.statusCode)) return 'Field "statusCode" must be an integer'
  if (!Number.isInteger(payload.responseTime)) return 'Field "responseTime" must be an integer'
  return null
}

async function safeCall(fn, fallback) {
  try {
    return await fn()
  } catch {
    return fallback()
  }
}

const server = http.createServer(async (req, res) => {
  if (handlePreflight(req, res)) {
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'GET' && url.pathname === '/') {
    const databaseHealth = await getDatabaseHealth()
    sendHtml(res, 200, docsPage(databaseHealth))
    return
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    const database = await getDatabaseHealth()
    sendJson(res, 200, {
      service: 'api-server',
      status: 'ok',
      database,
      upstreams: {
        monitoringService: monitoringServiceUrl,
        alertService: alertServiceUrl,
      },
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/dashboard') {
    sendJson(res, 200, await safeDashboardPayload())
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/monitor') {
    const logs = await safeCall(() => fetchLogs(20), () => buildDashboardPayload().logs)
    sendJson(res, 200, logs.map((log) => ({
      timestamp: new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      url: log.url,
      statusCode: log.statusCode,
      responseTime: log.responseTime,
    })))
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/summary') {
    sendJson(res, 200, { summary: await safeCall(fetchSummary, () => buildDashboardPayload().summary) })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/endpoints') {
    sendJson(res, 200, { endpoints: await safeCall(() => fetchEndpoints(50), () => buildDashboardPayload().endpoints) })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/logs') {
    sendJson(res, 200, { logs: await safeCall(() => fetchLogs(50), () => buildDashboardPayload().logs) })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/alerts') {
    sendJson(res, 200, { alerts: await safeCall(() => fetchAlerts(50), () => buildDashboardPayload().alerts) })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/ingest/log') {
    try {
      const payload = await readJsonBody(req)
      const error = validateIngestPayload(payload)

      if (error) {
        sendJson(res, 400, { error })
        return
      }

      const result = await ingestLog(payload)
      sendJson(res, 201, {
        message: 'Log ingested successfully',
        ...result,
      })
      return
    } catch (error) {
      sendJson(res, 500, {
        error: 'Failed to ingest log',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      return
    }
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/alerts/') && url.pathname.endsWith('/status')) {
    try {
      const alertId = url.pathname.split('/')[3]
      const payload = await readJsonBody(req)

      if (!payload.status || typeof payload.status !== 'string') {
        sendJson(res, 400, { error: 'Field "status" is required' })
        return
      }

      const updatedAlert = await updateAlertStatus(alertId, payload.status)

      if (!updatedAlert) {
        sendJson(res, 404, { error: 'Alert not found' })
        return
      }

      sendJson(res, 200, {
        message: 'Alert updated',
        alert: updatedAlert,
      })
      return
    } catch (error) {
      sendJson(res, 500, {
        error: 'Failed to update alert',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      return
    }
  }

  if (!['GET', 'POST', 'PATCH'].includes(req.method || '')) {
    sendJson(res, 405, { error: 'Method Not Allowed' })
    return
  }

  sendNotFound(res, url.pathname)
})

server.listen(PORT, () => {
  console.log(`api-server listening on http://localhost:${PORT}`)
})
