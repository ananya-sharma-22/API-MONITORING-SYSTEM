const { spawn } = require('node:child_process')
const path = require('node:path')

const rootDir = path.resolve(__dirname, '..')

const services = [
  { name: 'api-server', file: path.join(rootDir, 'backend/api-server/server.js') },
  { name: 'monitoring-service', file: path.join(rootDir, 'backend/monitoring-service/server.js') },
  { name: 'alert-service', file: path.join(rootDir, 'backend/alert-service/server.js') },
]

for (const service of services) {
  const child = spawn(process.execPath, [service.file], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  })

  child.on('exit', (code) => {
    console.log(`${service.name} exited with code ${code ?? 0}`)
  })
}
