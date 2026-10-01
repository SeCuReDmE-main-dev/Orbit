import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseAllowedExtensionOrigins, SqliteMissionStore, startBroker } from '@orbit/broker'

const EXTENSION_ORIGIN = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop'

describe('broker extension-origin configuration', () => {
  it('accepts only explicit Chrome extension origins and removes duplicates', () => {
    expect(parseAllowedExtensionOrigins(undefined)).toEqual([])
    expect(parseAllowedExtensionOrigins(`${EXTENSION_ORIGIN}, ${EXTENSION_ORIGIN}`)).toEqual([EXTENSION_ORIGIN])
    expect(() => parseAllowedExtensionOrigins('chrome-extension://not-an-extension-id')).toThrow('ORBIT_ALLOWED_EXTENSION_ORIGINS')
    expect(() => parseAllowedExtensionOrigins('https://example.com')).toThrow('ORBIT_ALLOWED_EXTENSION_ORIGINS')
  })
})

describe('SQLite mission store', () => {
  it('persists a mission and its checkpoint locally', () => {
    const directory = mkdtempSync(join(tmpdir(), 'orbit-broker-'))
    try {
      const store = new SqliteMissionStore(join(directory, 'broker.sqlite'))
      const mission = store.create({ id: 'mission_local_1', title: 'Loopback only' })
      const checkpoint = store.checkpoint({ missionId: mission.id, label: 'created' })
      expect(store.get(mission.id)?.title).toBe('Loopback only')
      expect(store.checkpoints(mission.id)).toEqual([checkpoint])
      store.close()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})

describe('loopback broker HTTP boundary', () => {
  it('protects mutations and exposes bounded read-only research routes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'orbit-http-'))
    const server = await startBroker({
      port: 0,
      databasePath: join(directory, 'broker.sqlite'),
      writeToken: 'test-token',
      associationCode: 'pairing-code',
      allowedExtensionOrigins: [EXTENSION_ORIGIN],
    })
    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Expected a TCP address.')
      const base = `http://127.0.0.1:${address.port}`
      const association = await fetch(`${base}/associations`, { method: 'POST', headers: { origin: EXTENSION_ORIGIN, 'content-type': 'application/json', 'x-orbit-association-code': 'pairing-code' }, body: JSON.stringify({ consent: true }) })
      expect(association.status).toBe(201)
      const { session } = await association.json() as { session: string }
      const headers = { authorization: `Bearer ${session}`, 'content-type': 'application/json', origin: EXTENSION_ORIGIN }
      expect((await fetch(`${base}/health`)).status).toBe(200)
      expect(await (await fetch(`${base}/capabilities`)).json()).toMatchObject({ externalProviders: 'BLOCKED_EXTERNAL' })
      const extensionHealth = await fetch(`${base}/health`, { headers: { origin: EXTENSION_ORIGIN } })
      expect(extensionHealth.status).toBe(200)
      expect(extensionHealth.headers.get('access-control-allow-origin')).toBe(EXTENSION_ORIGIN)
      expect((await fetch(`${base}/missions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status).toBe(400)
      const mission = await fetch(`${base}/missions`, { method: 'POST', headers, body: JSON.stringify({ id: 'mission_http', title: 'HTTP mission' }) })
      expect(mission.status).toBe(201)
      expect((await (await fetch(`${base}/missions`, { headers })).json() as { missions: unknown[] }).missions).toHaveLength(1)
      expect((await fetch(`${base}/missions/mission_http`, { headers })).status).toBe(200)
      const checkpoint = await fetch(`${base}/missions/mission_http/checkpoints`, { method: 'POST', headers, body: JSON.stringify({ label: 'paused', detail: 'Local review break.', snapshot: { question: 'Persist me', paused: true, sources: [{ title: 'User source', uri: 'https://example.test/source' }], checkpoints: ['created'] } }) })
      expect(checkpoint.status).toBe(201)
      expect(await (await fetch(`${base}/missions/mission_http`, { headers })).json()).toMatchObject({ snapshot: { question: 'Persist me', paused: true } })
      const resumed = await fetch(`${base}/missions/mission_http/state`, { method: 'POST', headers, body: JSON.stringify({ status: 'active', detail: 'Local review resumed.' }) })
      expect(resumed.status).toBe(200)
      const source = await fetch(`${base}/sources`, { method: 'POST', headers, body: JSON.stringify({ id: 'source_nasa', missionId: 'mission_http', title: 'NASA orbit source', uri: 'https://www.nasa.gov/orbit', normalizedUri: 'https://www.nasa.gov/orbit' }) })
      expect(source.status).toBe(201)
      const point = await fetch(`${base}/research-points`, { method: 'POST', headers, body: JSON.stringify({ id: 'point_orbit', missionId: 'mission_http', title: 'Check orbit', status: 'active' }) })
      expect(point.status).toBe(201)
      for (let index = 1; index < 26; index += 1) {
        expect((await fetch(`${base}/research-points`, { method: 'POST', headers, body: JSON.stringify({ id: `point_page_${index}`, missionId: 'mission_http', title: `Paged ${index}`, status: 'planned' }) })).status).toBe(201)
      }
      const points = await (await fetch(`${base}/research-points?missionId=mission_http&limit=1`, { headers })).json() as { items: unknown[]; total: number }
      expect(points.items).toHaveLength(1)
      expect(points.total).toBe(26)
      expect((await (await fetch(`${base}/research-points?missionId=mission_http&offset=25&limit=1`, { headers })).json() as { nextOffset: number | null }).nextOffset).toBeNull()
      const sources = await (await fetch(`${base}/sources?missionId=mission_http&query=orbit&limit=10`, { headers })).json() as { items: Array<{ id: string }>; total: number }
      expect(sources.items[0]?.id).toBe('source_nasa')
      expect(sources.total).toBe(1)
      expect((await fetch(`${base}/sources/source_nasa?missionId=mission_http`, { headers })).status).toBe(200)
      expect((await fetch(`${base}/health`, { headers: { origin: 'https://evil.example' } })).status).toBe(403)
      expect((await fetch(`${base}/missions`)).status).toBe(400)
      expect((await fetch(`${base}/associations`, { method: 'POST', headers: { origin: EXTENSION_ORIGIN, 'content-type': 'application/json', 'x-orbit-association-code': 'pairing-code' }, body: JSON.stringify({ consent: true }) })).status).toBe(400)
      expect((await fetch(`${base}/association/revoke`, { method: 'POST', headers })).status).toBe(200)
      expect((await fetch(`${base}/missions`, { headers })).status).toBe(400)
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
