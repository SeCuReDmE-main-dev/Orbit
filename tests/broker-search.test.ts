import { describe, it, expect, vi } from 'vitest'
import { startBroker } from '../services/broker/src/server.js'
describe('mission-scoped Exa search', () => {
  it('persists the attempt ceiling and caches only within the authorized mission', async () => {
    const search = vi.fn(async () => [{ url: 'https://nasa.gov/example', title: 'Fixture', status: 'discovered' as const, trust: 'untrusted' as const }])
    const server = await startBroker({ port: 0, databasePath: ':memory:', writeToken: 'fixture', search })
    const address = server.address() as { port: number }
    const base = `http://127.0.0.1:${address.port}`
    const post = (path: string, body: unknown, token = 'fixture') => fetch(base + path, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    try {
      for (const id of ['mission_a', 'mission_b']) expect((await post('/missions', { id, title: id })).status).toBe(201)
      expect((await post('/missions/mission_a/search', { query: 'earth' }, 'bad')).status).toBe(400)
      expect(search).not.toHaveBeenCalled()
      expect((await (await post('/missions/mission_a/search', { query: 'earth' })).json()).cached).toBe(false)
      expect((await (await post('/missions/mission_a/search', { query: 'earth' })).json()).cached).toBe(true)
      expect(search).toHaveBeenCalledTimes(1)
      expect((await (await post('/missions/mission_b/search', { query: 'earth' })).json()).cached).toBe(false)
      for (let i = 1; i < 18; i++) expect((await post('/missions/mission_a/search', { query: `earth ${i}` })).status).toBe(200)
      expect((await post('/missions/mission_a/search', { query: 'over budget' })).status).toBe(400)
      expect(search).toHaveBeenCalledTimes(19)
      expect((await (await post('/missions/mission_a/search', { query: 'earth' })).json()).cached).toBe(true)
      expect((await post('/missions/mission_b/search', { query: 'earth', domains: ['outside.example'] })).status).toBe(400)
    } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())) }
  })
})
