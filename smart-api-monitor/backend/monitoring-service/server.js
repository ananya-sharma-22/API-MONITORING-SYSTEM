const http = require('node:http')

const { buildDashboardPayload } = require('../shared/mock-data')
const { fetchEndpoints, fetchLogs, fetchSummary } = require('../shared/db')
const { handlePreflight, sendJson, sendNotFound } = require('../shared/http')

const PORT = Number(process.env.MONITORING_SERVICE_PORT || 5002)

const server = http.createServer(async (req, res) => {
  if (handlePreflight(req, res)) {
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { service: 'monitoring-service', status: 'ok' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/monitor/summary') {
    try {
      sendJson(res, 200, { summary: await fetchSummary() })
    } catch {
      sendJson(res, 200, { summary: buildDashboardPayload().summary })
    }
    return
  }

  if (req.method === 'GET' && url.pathname === '/monitor/endpoints') {
    try {
      sendJson(res, 200, { endpoints: await fetchEndpoints(50) })
    } catch {
      sendJson(res, 200, { endpoints: buildDashboardPayload().endpoints })
    }
    return
  }

  if (req.method === 'GET' && url.pathname === '/monitor/logs') {
    try {
      sendJson(res, 200, { logs: await fetchLogs(50) })
    } catch {
      sendJson(res, 200, { logs: buildDashboardPayload().logs })
    }
    return
  }

  if (req.method === 'GET' && url.pathname === '/monitor') {
    try {
      const logs = await fetchLogs(20)
      sendJson(res, 200, logs.map((log) => ({
        timestamp: new Date(log.timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        url: log.url,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
      })))
    } catch {
      const logs = buildDashboardPayload().logs
      sendJson(res, 200, logs.map((log) => ({
        timestamp: new Date(log.timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        url: log.url,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
      })))
    }
    return
  }

  sendNotFound(res, url.pathname)
})

server.listen(PORT, () => {
  console.log(`monitoring-service listening on http://localhost:${PORT}`)
})
