import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { SqliteMissionStore } from './store.js'
import type { MissionId } from '@orbit/contracts'

export type BrokerOptions = Readonly<{ host?: string; port?: number; databasePath?: string }>

export function createBroker(options: BrokerOptions = {}): Server {
  const store = new SqliteMissionStore(options.databasePath)
  const server = createServer(async (request, response) => {
    try {
      await route(request, response, store)
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

async function route(request: IncomingMessage, response: ServerResponse, store: SqliteMissionStore): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  if (request.method === 'GET' && url.pathname === '/health') return respond(response, 200, { status: 'ok', mode: 'loopback-only' })
  if (request.method === 'GET' && url.pathname === '/missions') return respond(response, 200, { missions: store.list() })
  const missionMatch = /^\/missions\/([^/]+)$/.exec(url.pathname)
  if (request.method === 'GET' && missionMatch) {
    const mission = store.get(decodeURIComponent(missionMatch[1]))
    return mission ? respond(response, 200, { mission, checkpoints: store.checkpoints(mission.id) }) : respond(response, 404, { error: 'Mission not found' })
  }
  if (request.method === 'POST' && url.pathname === '/missions') {
    const payload = await jsonBody(request)
    const mission = store.create({ id: requiredMissionId(payload.id), title: requiredString(payload.title, 'title') })
    const checkpoint = store.checkpoint({ missionId: mission.id, label: 'created', detail: 'Created by local loopback broker.' })
    return respond(response, 201, { mission, checkpoint })
  }
  respond(response, 404, { error: 'Unknown route' })
}

function respond(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(body))
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

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string.`)
  return value.trim()
}

function requiredMissionId(value: unknown): MissionId {
  const id = requiredString(value, 'id')
  if (!/^mission_[a-zA-Z0-9_-]+$/.test(id)) throw new Error('id must use the mission_<identifier> format.')
  return id as MissionId
}
