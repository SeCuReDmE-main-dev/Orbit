import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerReadOnlyOrbitTools } from '../web/src/lib/webmcp'

describe('WebMCP read-only tool surface', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('registers the five bounded tools with read-only annotations', async () => {
    const registered: Array<Record<string, any>> = []
    vi.stubGlobal('document', { modelContext: { registerTool: async (tool: Record<string, any>) => { registered.push(tool) } } })
    vi.stubGlobal('window', { addEventListener: vi.fn() })
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
      state: 'READY', scientificQualification: false, remoteCalls: 0,
    })
  })
})
