const http = require('node:http')

const { buildDashboardPayload } = require('../shared/mock-data')
const { fetchAlerts } = require('../shared/db')
const { handlePreflight, sendJson, sendNotFound } = require('../shared/http')

const PORT = Number(process.env.ALERT_SERVICE_PORT || 5003)

const server = http.createServer(async (req, res) => {
  if (handlePreflight(req, res)) {
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { service: 'alert-service', status: 'ok' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/alerts') {
    try {
      sendJson(res, 200, { alerts: await fetchAlerts(50) })
    } catch {
      sendJson(res, 200, { alerts: buildDashboardPayload().alerts })
    }
    return
  }

  if (req.method === 'GET' && url.pathname === '/alerts/summary') {
    try {
      const alerts = await fetchAlerts(50)
      const openAlerts = alerts.filter((alert) => alert.status !== 'resolved')
      sendJson(res, 200, {
        total: alerts.length,
        open: openAlerts.length,
        critical: alerts.filter((alert) => alert.severity === 'critical' && alert.status !== 'resolved').length,
        investigating: alerts.filter((alert) => alert.status === 'investigating').length,
      })
    } catch {
      const alerts = buildDashboardPayload().alerts
      const openAlerts = alerts.filter((alert) => alert.status !== 'resolved')
      sendJson(res, 200, {
        total: alerts.length,
        open: openAlerts.length,
        critical: alerts.filter((alert) => alert.severity === 'critical' && alert.status !== 'resolved').length,
        investigating: alerts.filter((alert) => alert.status === 'investigating').length,
      })
    }
    return
  }

  sendNotFound(res, url.pathname)
})

server.listen(PORT, () => {
  console.log(`alert-service listening on http://localhost:${PORT}`)
})
