import { parseAllowedExtensionOrigins, startBroker } from './server.js'
import { randomBytes } from 'node:crypto'

const configuredPort = process.env.ORBIT_BROKER_PORT
const port = configuredPort === undefined ? 47_831 : Number(configuredPort)
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('ORBIT_BROKER_PORT must be an integer between 1 and 65535.')
}

const writeToken = process.env.ORBIT_BROKER_WRITE_TOKEN ?? randomBytes(24).toString('base64url')
const allowedExtensionOrigins = parseAllowedExtensionOrigins(process.env.ORBIT_ALLOWED_EXTENSION_ORIGINS)
const server = await startBroker({ port, writeToken, allowedExtensionOrigins })
const address = server.address()
console.log(`Orbit broker listening on ${typeof address === 'string' ? address : `http://127.0.0.1:${address?.port}`}`)
console.log(`Ephemeral write token (this process only): ${writeToken}`)
if (allowedExtensionOrigins.length === 0) {
  console.log('No extension origin is allowlisted; browser tools are blocked. Set ORBIT_ALLOWED_EXTENSION_ORIGINS after Chrome assigns the unpacked extension ID.')
}
