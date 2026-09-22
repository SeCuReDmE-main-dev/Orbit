import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerReadOnlyOrbitTools } from '../web/src/lib/webmcp'

describe('WebMCP read-only tool surface', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('registers the five bounded tools with read-only annotations', async () => {
    const registered: Array<Record<string, any>> = []
    vi.stubGlobal('document', { modelContext: { registerTool: async (tool: Record<string, any>) => { registered.push(tool) } } })
    vi.stubGlobal('window', { addEventListener: vi.fn() })
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => ({ requested: url }) }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(registerReadOnlyOrbitTools()).resolves.toBe('registered')
    expect(registered.map((tool) => tool.name)).toEqual([
      'orbit_get_mission_summary',
      'orbit_list_research_points',
      'orbit_search_sources',
      'orbit_read_source_record',
      'orbit_get_physics_snapshot',
    ])
    expect(registered.every((tool) => tool.annotations.readOnlyHint === true && tool.annotations.consequentialHint === false)).toBe(true)
    expect(registered.every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true)

    const physics = registered.find((tool) => tool.name === 'orbit_get_physics_snapshot')!
    await expect(physics.execute({}, { signal: new AbortController().signal })).resolves.toMatchObject({
      state: 'READY', scientificQualification: false, newtonianGravity: true, remoteCalls: 0,
    })
    const list = registered.find((tool) => tool.name === 'orbit_list_research_points')!
    await list.execute({ offset: 0, limit: 5 }, { signal: new AbortController().signal })
    const search = registered.find((tool) => tool.name === 'orbit_search_sources')!
    await search.execute({ query: 'orbit', limit: 3 }, { signal: new AbortController().signal })
    const read = registered.find((tool) => tool.name === 'orbit_read_source_record')!
    await read.execute({ sourceId: 'source_nasa' }, { signal: new AbortController().signal })
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'http://127.0.0.1:47831/research-points?offset=0&limit=5',
      'http://127.0.0.1:47831/sources?query=orbit&limit=3',
      'http://127.0.0.1:47831/sources/source_nasa',
    ])
  })
})
