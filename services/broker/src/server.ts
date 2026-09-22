import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { EXACT_BUDGETS, evaluatePolicyGuard, isAllowedOrigin, type ActionBudget } from '@orbit/contracts'
import { SqliteMissionStore, type ResearchPointStatus } from './store.js'
import type { MissionId } from '@orbit/contracts'

export type BrokerOptions = Readonly<{
  host?: string
  port?: number
  databasePath?: string
  writeToken?: string
  allowedExtensionOrigins?: readonly string[]
}>

const ZERO_USAGE: ActionBudget = Object.freeze({ wallClockMs: 0, providerCalls: 0, inputTokens: 0, outputTokens: 0, knowledgeReads: 0, bytesStored: 0, retries: 0, spendUsdCents: 0 })
const CHROME_EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/

export function parseAllowedExtensionOrigins(configured: string | undefined): readonly string[] {
  if (!configured?.trim()) return Object.freeze([])
  const origins = configured.split(',').map((value) => value.trim()).filter(Boolean)
  for (const origin of origins) {
    if (!CHROME_EXTENSION_ORIGIN.test(origin)) {
      throw new Error('ORBIT_ALLOWED_EXTENSION_ORIGINS must contain comma-separated chrome-extension://<32-character-id> origins.')
    }
  }
  return Object.freeze([...new Set(origins)])
}

export function createBroker(options: BrokerOptions = {}): Server {
  const store = new SqliteMissionStore(options.databasePath)
  const server = createServer(async (request, response) => {
    const origin = header(request, 'origin')
    if (origin && !isAllowedOrigin(origin, options.allowedExtensionOrigins ?? [])) return respond(response, 403, { error: 'Origin denied' })
    applyCors(response, origin)
    if (request.method === 'OPTIONS') { response.writeHead(204); return response.end() }
    try {
      await route(request, response, store, options)
    } catch (error) {
      respond(response, 400, { error: error instanceof Error ? error.message : 'Invalid request' })
    }
  })
  server.on('close', () => store.close())
  return server
}

export async function startBroker(options: BrokerOptions = {}): Promise<Server> {
  const server = createBroker(options)
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error)
    server.once('error', onError)
    server.listen(options.port ?? 47_831, options.host ?? '127.0.0.1', () => {
      server.off('error', onError)
      resolve()
    })
  })
  return server
}

async function route(request: IncomingMessage, response: ServerResponse, store: SqliteMissionStore, options: BrokerOptions): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  if (request.method === 'GET' && url.pathname === '/health') return respond(response, 200, { status: 'ok', mode: 'loopback-only', mutations: options.writeToken ? 'token-required' : 'disabled' })
  if (request.method === 'GET' && url.pathname === '/capabilities') return respond(response, 200, { readOnly: ['missions', 'research-points', 'sources'], externalProviders: 'BLOCKED_EXTERNAL' })
  if (request.method === 'GET' && url.pathname === '/missions') return respond(response, 200, { missions: store.list() })
  if (request.method === 'GET' && url.pathname === '/research-points') {
    const { offset, limit } = page(url)
    const items = store.listResearchPoints(offset, limit)
    const total = store.countResearchPoints()
    return respond(response, 200, { items, offset, limit, total, nextOffset: offset + items.length < total ? offset + items.length : null })
  }
  if (request.method === 'GET' && url.pathname === '/sources') {
    const { offset, limit } = page(url)
    const query = (url.searchParams.get('query') ?? '').trim().slice(0, 200)
    const items = store.searchSources(query, offset, limit)
    const total = store.countSources(query)
    return respond(response, 200, { items, offset, limit, total, nextOffset: offset + items.length < total ? offset + items.length : null })
  }
  const sourceMatch = /^\/sources\/([^/]+)$/.exec(url.pathname)
  if (request.method === 'GET' && sourceMatch) {
    const source = store.receipts.sources.get(decodeURIComponent(sourceMatch[1]) as `source_${string}`)
    return source ? respond(response, 200, { source }) : respond(response, 404, { error: 'Source not found' })
  }
  const missionMatch = /^\/missions\/([^/]+)$/.exec(url.pathname)
  if (request.method === 'GET' && missionMatch) {
    const mission = store.get(decodeURIComponent(missionMatch[1]))
    return mission ? respond(response, 200, { mission, checkpoints: store.checkpoints(mission.id) }) : respond(response, 404, { error: 'Mission not found' })
  }
  if (request.method === 'POST' && url.pathname === '/missions') {
    const payload = await authorizedJson(request, options, 'broker_create_mission')
    const mission = store.create({ id: requiredMissionId(payload.id), title: requiredString(payload.title, 'title') })
    const checkpoint = store.checkpoint({ missionId: mission.id, label: 'created', detail: 'Created by local loopback broker.' })
    return respond(response, 201, { mission, checkpoint })
  }
  if (request.method === 'POST' && url.pathname === '/research-points') {
    const payload = await authorizedJson(request, options, 'broker_upsert_research_point')
    const point = store.upsertResearchPoint({
      id: requiredString(payload.id, 'id'),
      missionId: requiredMissionId(payload.missionId),
      title: requiredString(payload.title, 'title'),
      status: requiredStatus(payload.status),
      detail: optionalString(payload.detail, 'detail'),
    })
    return respond(response, 201, { point })
  }
  if (request.method === 'POST' && url.pathname === '/sources') {
    const payload = await authorizedJson(request, options, 'broker_create_source')
    const id = requiredString(payload.id, 'id')
    if (!/^source_[A-Za-z0-9_-]+$/.test(id)) throw new Error('Source id must use source_<identifier>.')
    const source = store.receipts.sources.create({
      id: id as `source_${string}`,
      title: requiredString(payload.title, 'title'),
      uri: requiredHttpUrl(payload.uri, 'uri'),
      normalizedUri: requiredHttpUrl(payload.normalizedUri, 'normalizedUri'),
      observedAt: typeof payload.observedAt === 'string' ? payload.observedAt : new Date().toISOString(),
    })
    return respond(response, 201, { source })
  }
  respond(response, 404, { error: 'Unknown route' })
}

function respond(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  response.end(JSON.stringify(body))
}

function applyCors(response: ServerResponse, origin: string | undefined): void {
  if (origin) response.setHeader('access-control-allow-origin', origin)
  response.setHeader('vary', 'Origin')
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
  response.setHeader('access-control-allow-headers', 'authorization, content-type')
}

async function authorizedJson(request: IncomingMessage, options: BrokerOptions, toolId: string): Promise<Record<string, unknown>> {
  if (!options.writeToken) throw new Error('Broker mutations are disabled.')
  if (header(request, 'authorization') !== `Bearer ${options.writeToken}`) throw new Error('Write token is missing or invalid.')
  const payload = await jsonBody(request)
  const decision = evaluatePolicyGuard({
    origin: header(request, 'origin') ?? 'http://127.0.0.1',
    toolId,
    body: payload,
    untrustedContent: '',
    usage: ZERO_USAGE,
    requested: ZERO_USAGE,
  }, {
    allowedExtensionOrigins: options.allowedExtensionOrigins ?? [],
    allowedToolIds: ['broker_create_mission', 'broker_upsert_research_point', 'broker_create_source'],
    maxBodyBytes: 65_536,
    maxBodyDepth: 8,
    maxObjectKeys: 32,
    maxArrayItems: 100,
    maxStringBytes: 16_384,
    maxUntrustedContentBytes: 0,
    quota: EXACT_BUDGETS.approvedExternalAction,
  })
  if (!decision.allowed) throw new Error(`${decision.code}: ${decision.detail}`)
  return payload
}

async function jsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const parts: Buffer[] = []
  let size = 0
  for await (const part of request) {
    const buffer = Buffer.isBuffer(part) ? part : Buffer.from(part)
    size += buffer.length
    if (size > 65_536) throw new Error('Request body exceeds 64 KiB.')
    parts.push(buffer)
  }
  const parsed: unknown = JSON.parse(Buffer.concat(parts).toString('utf8'))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object.')
  return parsed as Record<string, unknown>
}

function page(url: URL): Readonly<{ offset: number; limit: number }> {
  const offset = integer(url.searchParams.get('offset'), 0, 0, 10_000)
  const limit = integer(url.searchParams.get('limit'), 10, 1, 25)
  return { offset, limit }
}

function integer(value: string | null, fallback: number, minimum: number, maximum: number): number {
  if (value === null) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`Expected an integer from ${minimum} to ${maximum}.`)
  return parsed
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string.`)
  return value.trim()
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return requiredString(value, field)
}

function requiredHttpUrl(value: unknown, field: string): string {
  const text = requiredString(value, field)
  const url = new URL(text)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(`${field} must be a public HTTP(S) URL without credentials.`)
  return url.toString()
}

function requiredMissionId(value: unknown): MissionId {
  const id = requiredString(value, 'id')
  if (!/^mission_[a-zA-Z0-9_-]+$/.test(id)) throw new Error('id must use the mission_<identifier> format.')
  return id as MissionId
}

function requiredStatus(value: unknown): ResearchPointStatus {
  if (!['planned', 'active', 'complete', 'blocked'].includes(String(value))) throw new Error('Invalid research point status.')
  return value as ResearchPointStatus
}

function header(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name]
  return Array.isArray(value) ? value[0] : value
}
