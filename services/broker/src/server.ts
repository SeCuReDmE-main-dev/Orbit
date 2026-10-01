import { researchTurn } from './research-turn.js'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { EXACT_BUDGETS, evaluatePolicyGuard, isAllowedOrigin, type ActionBudget } from '@orbit/contracts'
import { AssociationAuthority, type AssociationScope } from './association.js'
import { SqliteMissionStore, type ResearchPointStatus } from './store.js'
import type { MissionId } from '@orbit/contracts'
import type { ExaSearchResult } from '@orbit/providers'
import { createHash } from 'node:crypto'
import type { CompanionService } from './companion.js'

export type BrokerOptions = Readonly<{ host?: string; port?: number; databasePath?: string; writeToken?: string; associationCode?: string; allowedExtensionOrigins?: readonly string[]; now?: () => number; search?: (query: string, signal: AbortSignal) => Promise<readonly ExaSearchResult[]>; companion?: CompanionService }>
const ZERO_USAGE: ActionBudget = Object.freeze({ wallClockMs: 0, providerCalls: 0, inputTokens: 0, outputTokens: 0, knowledgeReads: 0, bytesStored: 0, retries: 0, spendUsdCents: 0 })
const CHROME_EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/

export function parseAllowedExtensionOrigins(configured: string | undefined): readonly string[] {
  if (!configured?.trim()) return Object.freeze([])
  const origins = configured.split(',').map((value) => value.trim()).filter(Boolean)
  for (const origin of origins) if (!CHROME_EXTENSION_ORIGIN.test(origin)) throw new Error('ORBIT_ALLOWED_EXTENSION_ORIGINS must contain comma-separated chrome-extension://<32-character-id> origins.')
  return Object.freeze([...new Set(origins)])
}

export function createBroker(options: BrokerOptions = {}): Server {
  const store = new SqliteMissionStore(options.databasePath)
  const authority = new AssociationAuthority(options.associationCode ?? '', options.now?.() ?? Date.now(), options.now)
  const server = createServer(async (request, response) => {
    if (!isLoopbackHost(header(request, 'host'))) return respond(response, 400, { error: 'Host denied' })
    const origin = header(request, 'origin')
    if (origin && !isAllowedOrigin(origin, options.allowedExtensionOrigins ?? [])) return respond(response, 403, { error: 'Origin denied' })
    applyCors(response, origin)
    if (request.method === 'OPTIONS') { response.writeHead(204); return response.end() }
    try { await route(request, response, store, authority, options) } catch (error) { respond(response, 400, { error: error instanceof Error ? error.message : 'Invalid request' }) }
  })
  server.on('close', () => store.close())
  return server
}
export async function startBroker(options: BrokerOptions = {}): Promise<Server> {
  if (options.host !== undefined && !isLoopbackHost(options.host)) throw new Error('Broker host must be loopback.')
  const server = createBroker(options)
  await new Promise<void>((resolve, reject) => { const fail = (error: Error) => reject(error); server.once('error', fail); server.listen(options.port ?? 47_831, options.host ?? '127.0.0.1', () => { server.off('error', fail); resolve() }) })
  return server
}

async function route(request: IncomingMessage, response: ServerResponse, store: SqliteMissionStore, authority: AssociationAuthority, options: BrokerOptions): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  if (request.method === 'GET' && url.pathname === '/companion/status') {
    requirePrivateAccess(request, authority, options, 'missions')
    return respond(response, 200, options.companion ? await options.companion.status() : { provider: 'codex', connected: false, reason: 'Local companion is not configured.' })
  }
  const companionMatch = /^\/missions\/([^/]+)\/companion$/.exec(url.pathname)
  if (request.method === 'POST' && companionMatch) {
    const missionId = requiredMissionId(decodeURIComponent(companionMatch[1]))
    requirePrivateAccess(request, authority, options, 'missions', missionId)
    const payload = await jsonBody(request)
    if (Object.keys(payload).some(key => !['question', 'consent', 'context', 'mode'].includes(key)) || payload.consent !== true) throw new Error('Explicit context-transfer consent is required.')
    if (payload.mode !== undefined && !['chat','research'].includes(String(payload.mode))) throw new Error('Invalid companion mode.')
    if (payload.context !== undefined && (typeof payload.context !== 'string' || payload.context.length > 12000)) throw new Error('Invalid selected context.')
    const question = requiredString(payload.question, 'question'); if (Buffer.byteLength(question) > 2000) throw new Error('Question exceeds 2000 bytes.')
    const mission = store.get(missionId); if (!mission) return respond(response, 404, { error: 'Mission not found' })
    if (!options.companion) return respond(response, 503, { error: 'COMPANION_UNCONFIGURED' })
    const snapshot = store.latestCheckpointSnapshot(missionId) ?? {}
    const sources = Array.isArray(snapshot.sources) ? snapshot.sources.slice(0, 10).map((value: any) => ({ title: String(value?.title ?? '').slice(0, 200), url: String(value?.uri ?? '').slice(0, 1000), state: 'saved-not-verified' })) : []
    const context = { selectedPageContext: typeof payload.context === 'string' ? payload.context : '', contentTrust: 'untrusted', missionId, objective: mission.title, sources, lastCompanionResponse: String(snapshot.companionResponse ?? '').slice(0, 4000), status: mission.status }
    const abort = new AbortController(); const onClose = () => { if (!response.writableEnded) abort.abort() }; response.once('close', onClose)
    try {
      const runSignal = AbortSignal.any([abort.signal, AbortSignal.timeout(240000)])
      const research = payload.mode === 'research' ? await researchTurn({companion:options.companion,context,question,signal:runSignal,search:async(query,signal)=>{
        if(!options.search)throw new Error('EXA_UNCONFIGURED')
        const key=createHash('sha256').update(JSON.stringify({query,domains:['nasa.gov'],limit:5,excerpts:true})).digest('hex')
        const cached=store.getSearchCache(missionId,key);if(cached)return cached.filter((row): row is ExaSearchResult => !!row && typeof row === 'object' && typeof (row as ExaSearchResult).url === 'string' && typeof (row as ExaSearchResult).title === 'string' && (row as ExaSearchResult).status === 'discovered' && (row as ExaSearchResult).trust === 'untrusted')
        store.reserveSearchAttempt(missionId)
        const results=await options.search(query,signal);store.saveSearchCache(missionId,key,[...results]);return results
      }}) : undefined
      const result = research ? {text:research.report,model:research.model,axes:research.axes,sources:research.sources} : await options.companion.run(context, question, runSignal)
      if (research) {
        research.axes.forEach((title,i)=>store.upsertResearchPoint({id:`${missionId}_axis_${i}`,missionId,title,status:'planned'}))
        for (const source of research.sources) {
          const id = `source_${createHash('sha256').update(missionId+source.url).digest('hex').slice(0,24)}` as `source_${string}`
          if (!store.receipts.sources.get(id)) store.receipts.sources.create({id,title:source.title,uri:source.url,normalizedUri:source.url,observedAt:new Date().toISOString()})
          store.linkSource(missionId,id)
        }
      }
      const checkpoint = store.checkpoint({ missionId, label: 'companion-response', detail: result.model })
      store.saveCheckpointSnapshot(missionId, checkpoint.sequence, { ...snapshot, companionResponse: result.text, companionModel: result.model, ...(research ? {researchAxes:research.axes,sources:research.sources.map(s=>({title:s.title,uri:s.url,status:s.text?'excerpt-read':'discovered'}))} : {}) })
      return respond(response, 200, { ...result, checkpoint: checkpoint.sequence, transferred: { sources: sources.length, rawHistory: false } })
    } catch { return respond(response, 503, { error: 'COMPANION_UNAVAILABLE', resumable: true }) }
    finally { response.off('close', onClose) }
  }
  const searchMatch = /^\/missions\/([^/]+)\/search$/.exec(url.pathname)
  if (request.method === 'POST' && searchMatch) {
    const missionId = requiredMissionId(decodeURIComponent(searchMatch[1]))
    requirePrivateAccess(request, authority, options, 'sources', missionId)
    const payload = await jsonBody(request)
    if (Object.keys(payload).some(key => key !== 'query')) throw new Error('Only query is accepted.')
    const query = requiredString(payload.query, 'query').replace(/\s+/g, ' ')
    if (Buffer.byteLength(query) > 2000) throw new Error('Query exceeds 2000 bytes.')
    if (!store.get(missionId)) return respond(response, 404, { error: 'Mission not found' })
    const key = createHash('sha256').update(JSON.stringify({ query, domains: ['nasa.gov'], limit: 5 })).digest('hex')
    const cached = store.getSearchCache(missionId, key)
    if (cached) return respond(response, 200, { results: cached, cached: true, status: 'discovered' })
    if (!options.search) return respond(response, 503, { error: 'EXA_UNCONFIGURED' })
    const attempt = store.reserveSearchAttempt(missionId)
    const abort = new AbortController()
    const onClose = () => { if (!response.writableEnded) abort.abort() }
    response.once('close', onClose)
    try {
      const results = await options.search(query, abort.signal)
      store.saveSearchCache(missionId, key, [...results])
      return respond(response, 200, { results, cached: false, attempt, status: 'discovered' })
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : 'UNAVAILABLE'
      return respond(response, 503, { error: ['RATE_LIMITED', 'UNCONFIGURED'].includes(String(code)) ? code : 'EXA_UNAVAILABLE', attempt })
    } finally { response.off('close', onClose) }
  }
  if (request.method === 'GET' && url.pathname === '/health') return respond(response, 200, { status: 'ok', mode: 'loopback-only', association: options.associationCode ? 'consent-required' : 'disabled' })
  if (request.method === 'GET' && url.pathname === '/capabilities') return respond(response, 200, { privateReads: true, externalProviders: 'BLOCKED_EXTERNAL' })
  if (request.method === 'POST' && url.pathname === '/associations') {
    const origin = requireExtensionOrigin(request, options); const payload = await jsonBody(request)
    if (payload.consent !== true) throw new Error('Explicit local association consent is required.')
    const session = authority.exchange(requiredString(header(request, 'x-orbit-association-code'), 'association code'), origin)
    if (payload.restoreMissionId !== undefined) {
      const missionId = requiredMissionId(payload.restoreMissionId)
      if (!store.get(missionId)) throw new Error('Selected mission is not available for restoration.')
      authority.grantMission(session, missionId)
    }
    return respond(response, 201, { session, expiresInSeconds: 3600, scopes: ['missions', 'sources', 'checkpoints'] })
  }
  if (request.method === 'POST' && url.pathname === '/association/revoke') { requirePrivateAccess(request, authority, options, 'missions'); return respond(response, 200, { revoked: authority.revoke(bearer(request)) }) }
  if (request.method === 'GET' && url.pathname === '/missions') { requirePrivateAccess(request, authority, options, 'missions'); const ids = authority.missionIds(bearer(request)); return respond(response, 200, { missions: header(request, 'origin') ? store.list().filter((mission) => ids.includes(mission.id)) : store.list() }) }
  if (request.method === 'GET' && url.pathname === '/research-points') { const missionId = requiredMissionId(url.searchParams.get('missionId')); requirePrivateAccess(request, authority, options, 'missions', missionId); const { offset, limit } = page(url); const items = store.listMissionResearchPoints(missionId, offset, limit); const total = store.countMissionResearchPoints(missionId); return respond(response, 200, { items, offset, limit, total, nextOffset: offset + items.length < total ? offset + items.length : null }) }
  if (request.method === 'GET' && url.pathname === '/sources') { const missionId = requiredMissionId(url.searchParams.get('missionId')); requirePrivateAccess(request, authority, options, 'sources', missionId); const { offset, limit } = page(url); const query = (url.searchParams.get('query') ?? '').trim().slice(0, 200); const items = store.searchMissionSources(missionId, query, offset, limit); const total = store.countMissionSources(missionId, query); return respond(response, 200, { items, offset, limit, total, nextOffset: offset + items.length < total ? offset + items.length : null }) }
  const sourceMatch = /^\/sources\/([^/]+)$/.exec(url.pathname)
  if (request.method === 'GET' && sourceMatch) { const missionId = requiredMissionId(url.searchParams.get('missionId')); requirePrivateAccess(request, authority, options, 'sources', missionId); const sourceId = decodeURIComponent(sourceMatch[1]) as `source_${string}`; const source = store.missionOwnsSource(missionId, sourceId) ? store.receipts.sources.get(sourceId) : undefined; return source ? respond(response, 200, { source }) : respond(response, 404, { error: 'Source not found' }) }
  const missionMatch = /^\/missions\/([^/]+)$/.exec(url.pathname)
  if (request.method === 'GET' && missionMatch) { const missionId = requiredMissionId(decodeURIComponent(missionMatch[1])); requirePrivateAccess(request, authority, options, 'missions', missionId); const mission = store.get(missionId); return mission ? respond(response, 200, { mission, checkpoints: store.checkpoints(mission.id), snapshot: store.latestCheckpointSnapshot(mission.id) ?? null }) : respond(response, 404, { error: 'Mission not found' }) }
  const checkpointMatch = /^\/missions\/([^/]+)\/checkpoints$/.exec(url.pathname)
  if (request.method === 'POST' && checkpointMatch) { const missionId = requiredMissionId(decodeURIComponent(checkpointMatch[1])); requirePrivateAccess(request, authority, options, 'checkpoints', missionId); const payload = await authorizedJson(request, options, 'broker_checkpoint_mission'); const checkpoint = store.checkpoint({ missionId, label: requiredString(payload.label, 'label'), detail: optionalString(payload.detail, 'detail') }); if (payload.snapshot !== undefined) store.saveCheckpointSnapshot(missionId, checkpoint.sequence, requiredSnapshot(payload.snapshot)); return respond(response, 201, { checkpoint }) }
  const stateMatch = /^\/missions\/([^/]+)\/state$/.exec(url.pathname)
  if (request.method === 'POST' && stateMatch) { const missionId = requiredMissionId(decodeURIComponent(stateMatch[1])); requirePrivateAccess(request, authority, options, 'checkpoints', missionId); const payload = await authorizedJson(request, options, 'broker_set_mission_state'); const mission = store.setStatus(missionId, requiredMissionStatus(payload.status)); return respond(response, 200, { mission, checkpoint: store.checkpoint({ missionId, label: `state-${mission.status}`, detail: optionalString(payload.detail, 'detail') }) }) }
  if (request.method === 'POST' && url.pathname === '/missions') { requirePrivateAccess(request, authority, options, 'missions'); const payload = await authorizedJson(request, options, 'broker_create_mission'); const mission = store.create({ id: requiredMissionId(payload.id), title: requiredString(payload.title, 'title') }); if (header(request, 'origin')) authority.grantMission(bearer(request), mission.id); return respond(response, 201, { mission, checkpoint: store.checkpoint({ missionId: mission.id, label: 'created', detail: 'Created by local loopback broker.' }) }) }
  if (request.method === 'POST' && url.pathname === '/research-points') { const payload = await authorizedJson(request, options, 'broker_upsert_research_point'); const missionId = requiredMissionId(payload.missionId); requirePrivateAccess(request, authority, options, 'missions', missionId); return respond(response, 201, { point: store.upsertResearchPoint({ id: requiredString(payload.id, 'id'), missionId, title: requiredString(payload.title, 'title'), status: requiredStatus(payload.status), detail: optionalString(payload.detail, 'detail') }) }) }
  if (request.method === 'POST' && url.pathname === '/sources') { const payload = await authorizedJson(request, options, 'broker_create_source'); const missionId = requiredMissionId(payload.missionId); requirePrivateAccess(request, authority, options, 'sources', missionId); const id = requiredString(payload.id, 'id'); if (!/^source_[A-Za-z0-9_-]+$/.test(id)) throw new Error('Source id must use source_<identifier>.'); const source = store.receipts.sources.create({ id: id as `source_${string}`, title: requiredString(payload.title, 'title'), uri: requiredHttpUrl(payload.uri, 'uri'), normalizedUri: requiredHttpUrl(payload.normalizedUri, 'normalizedUri'), observedAt: typeof payload.observedAt === 'string' ? payload.observedAt : new Date().toISOString() }); store.linkSource(missionId, source.id); return respond(response, 201, { source }) }
  respond(response, 404, { error: 'Unknown route' })
}
function requireExtensionOrigin(request: IncomingMessage, options: BrokerOptions): string { const origin = header(request, 'origin'); if (!origin || !options.allowedExtensionOrigins?.includes(origin)) throw new Error('A configured extension origin is required.'); return origin }
function requirePrivateAccess(request: IncomingMessage, authority: AssociationAuthority, options: BrokerOptions, scope: AssociationScope, missionId?: string): void { const origin = header(request, 'origin'); const token = bearer(request); if (!(origin === undefined && token === options.writeToken && token) && !authority.authorize(token, origin, scope, missionId)) throw new Error('Private broker access requires an associated session.') }
function allowedMission(request: IncomingMessage, authority: AssociationAuthority, missionId: string): boolean { return !header(request, 'origin') || authority.authorize(bearer(request), header(request, 'origin'), 'missions', missionId) }
function bearer(request: IncomingMessage): string | undefined { const value = header(request, 'authorization'); return value?.startsWith('Bearer ') ? value.slice(7) : undefined }
function respond(response: ServerResponse, status: number, body: unknown): void { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); response.end(JSON.stringify(body)) }
function applyCors(response: ServerResponse, origin: string | undefined): void { if (origin) response.setHeader('access-control-allow-origin', origin); response.setHeader('vary', 'Origin'); response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS'); response.setHeader('access-control-allow-headers', 'authorization, content-type, x-orbit-association-code') }
async function authorizedJson(request: IncomingMessage, options: BrokerOptions, toolId: string): Promise<Record<string, unknown>> { const payload = await jsonBody(request); const decision = evaluatePolicyGuard({ origin: header(request, 'origin') ?? 'http://127.0.0.1', toolId, body: payload, untrustedContent: '', usage: ZERO_USAGE, requested: ZERO_USAGE }, { allowedExtensionOrigins: options.allowedExtensionOrigins ?? [], allowedToolIds: ['broker_create_mission', 'broker_upsert_research_point', 'broker_create_source', 'broker_checkpoint_mission', 'broker_set_mission_state'], maxBodyBytes: 65_536, maxBodyDepth: 8, maxObjectKeys: 32, maxArrayItems: 100, maxStringBytes: 16_384, maxUntrustedContentBytes: 0, quota: EXACT_BUDGETS.approvedExternalAction }); if (!decision.allowed) throw new Error(`${decision.code}: ${decision.detail}`); return payload }
async function jsonBody(request: IncomingMessage): Promise<Record<string, unknown>> { const parts: Buffer[] = []; let size = 0; for await (const part of request) { const buffer = Buffer.isBuffer(part) ? part : Buffer.from(part); size += buffer.length; if (size > 65_536) throw new Error('Request body exceeds 64 KiB.'); parts.push(buffer) }; const parsed: unknown = JSON.parse(Buffer.concat(parts).toString('utf8')); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object.'); return parsed as Record<string, unknown> }
function page(url: URL): Readonly<{ offset: number; limit: number }> { return { offset: integer(url.searchParams.get('offset'), 0, 0, 10_000), limit: integer(url.searchParams.get('limit'), 10, 1, 25) } }
function integer(value: string | null, fallback: number, minimum: number, maximum: number): number { if (value === null) return fallback; const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`Expected an integer from ${minimum} to ${maximum}.`); return parsed }
function requiredString(value: unknown, field: string): string { if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string.`); return value.trim() }
function optionalString(value: unknown, field: string): string | undefined { return value === undefined || value === null || value === '' ? undefined : requiredString(value, field) }
function requiredHttpUrl(value: unknown, field: string): string { const text = requiredString(value, field); const url = new URL(text); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(`${field} must be a public HTTP(S) URL without credentials.`); return url.toString() }
function requiredMissionId(value: unknown): MissionId { const id = requiredString(value, 'id'); if (!/^mission_[a-zA-Z0-9_-]+$/.test(id)) throw new Error('id must use the mission_<identifier> format.'); return id as MissionId }
function requiredStatus(value: unknown): ResearchPointStatus { if (!['planned', 'active', 'complete', 'blocked'].includes(String(value))) throw new Error('Invalid research point status.'); return value as ResearchPointStatus }
function requiredMissionStatus(value: unknown): 'draft' | 'active' | 'blocked' | 'completed' { if (!['draft', 'active', 'blocked', 'completed'].includes(String(value))) throw new Error('Invalid mission status.'); return value as 'draft' | 'active' | 'blocked' | 'completed' }
function requiredSnapshot(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Checkpoint snapshot must be a JSON object.'); return value as Record<string, unknown> }
function header(request: IncomingMessage, name: string): string | undefined { const value = request.headers[name]; return Array.isArray(value) ? value[0] : value }
function isLoopbackHost(value: string | undefined): boolean { if (!value) return false; const host = value.toLowerCase(); return host === 'localhost' || host.startsWith('localhost:') || host === '127.0.0.1' || host.startsWith('127.0.0.1:') || host === '[::1]' || host.startsWith('[::1]:') }
