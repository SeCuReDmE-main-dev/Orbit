import { startBroker } from './server.js'

const configuredPort = process.env.ORBIT_BROKER_PORT
const port = configuredPort === undefined ? 47_831 : Number(configuredPort)
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('ORBIT_BROKER_PORT must be an integer between 1 and 65535.')
}

const server = await startBroker({ port })
const address = server.address()
console.log(`Orbit broker listening on ${typeof address === 'string' ? address : `http://127.0.0.1:${address?.port}`}`)
