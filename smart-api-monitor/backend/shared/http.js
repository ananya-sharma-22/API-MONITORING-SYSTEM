function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload, null, 2))
}

function sendNotFound(res, path) {
  sendJson(res, 404, {
    error: 'Not Found',
    message: `No route registered for ${path}`,
  })
}

function handlePreflight(req, res) {
  if (req.method !== 'OPTIONS') {
    return false
  }

  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end()
  return true
}

async function readJsonBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')
  return JSON.parse(rawBody)
}

module.exports = {
  handlePreflight,
  readJsonBody,
  sendJson,
  sendNotFound,
}
