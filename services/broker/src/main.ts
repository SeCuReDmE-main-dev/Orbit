import { parseAllowedExtensionOrigins, startBroker } from './server.js'
import { randomBytes } from 'node:crypto'
import { ExaSearch } from '@orbit/providers'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { localCodex } from './companion.js'

// Explicit project root and allowlist: deployment credentials never enter the broker environment.
const environmentPath = fileURLToPath(new URL('../../../.env', import.meta.url))
const localSettings: Record<string, string> = {}
if (existsSync(environmentPath)) for (const line of readFileSync(environmentPath, 'utf8').split(/\r?\n/)) {
  const match = /^\s*(EXA_API_KEY|ORBIT_ALLOWED_EXTENSION_ORIGINS|ORBIT_BROKER_PORT)\s*=\s*(.*?)\s*$/.exec(line)
  if (match) { if (match[1] in localSettings) throw new Error('Duplicate local broker setting.'); localSettings[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2') }
}

const configuredPort = process.env.ORBIT_BROKER_PORT ?? localSettings.ORBIT_BROKER_PORT
const port = configuredPort === undefined ? 47_831 : Number(configuredPort)
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('ORBIT_BROKER_PORT must be an integer between 1 and 65535.')
}

const writeToken = process.env.ORBIT_BROKER_WRITE_TOKEN ?? randomBytes(24).toString('base64url')
const associationCode = randomBytes(18).toString('base64url')
const allowedExtensionOrigins = parseAllowedExtensionOrigins(process.env.ORBIT_ALLOWED_EXTENSION_ORIGINS ?? localSettings.ORBIT_ALLOWED_EXTENSION_ORIGINS)
const exa = localSettings.EXA_API_KEY ? new ExaSearch(localSettings.EXA_API_KEY) : undefined
const companion = localCodex(fileURLToPath(new URL('../../../', import.meta.url)))
const server = await startBroker({ port, writeToken, associationCode, allowedExtensionOrigins, companion, search: exa ? (query, signal) => exa.search(query, ['nasa.gov'], 5, signal, true) : undefined })
const address = server.address()
console.log(`Orbit broker listening on ${typeof address === 'string' ? address : `http://127.0.0.1:${address?.port}`}`)
console.log(`Association code (single use, expires in five minutes): ${associationCode}`)
if (allowedExtensionOrigins.length === 0) {
  console.log('No extension origin is allowlisted; browser tools are blocked. Set ORBIT_ALLOWED_EXTENSION_ORIGINS after Chrome assigns the unpacked extension ID.')
}
