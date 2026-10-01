import { describe, expect, it } from 'vitest'
import { researchTurn } from '../services/broker/src/research-turn.js'
import type { CompanionService } from '../services/broker/src/companion.js'

const axes = Array.from({ length: 9 }, (_, index) => `axis-${index + 1}`)
const result = (url: string) => ({ url, title: `Title ${url}`, status: 'discovered' as const, trust: 'untrusted' as const, text: `excerpt ${url}` })
function companion(plan: unknown, report = 'Report from discovered metadata.') : CompanionService { let calls = 0; return { status: async () => ({ provider: 'fixture', model: 'fixture', connected: true }), run: async () => ({ text: calls++ === 0 ? JSON.stringify(plan) : report, model: 'fixture' }) } }

describe('researchTurn', () => {
  it('validates nine axes, caps queries at six, searches sequentially, and deduplicates up to thirty URLs', async () => {
    const calls: string[] = []
    const output = await researchTurn({ companion: companion({ axes, queries: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] }), context: { untrusted: true }, question: 'NASA orbit', signal: new AbortController().signal, search: async (query) => { calls.push(query); return [result('https://nasa.gov/a'), ...Array.from({ length: 5 }, (_, index) => result(`https://nasa.gov/${query}-${index}`))] } })
    expect(calls).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6']); expect(output.axes).toHaveLength(9); expect(output.queries).toHaveLength(6); expect(output.sources).toHaveLength(30); expect(output.report).toContain('discovered')
  })
  it('rejects a plan that does not contain exactly nine axes', async () => {
    await expect(researchTurn({ companion: companion({ axes: ['one'], queries: ['q'] }), context: {}, question: 'q', signal: new AbortController().signal, search: async () => [] })).rejects.toThrow('RESEARCH_PLAN_REQUIRES_9_AXES')
  })
  it('propagates abort before any provider search', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(researchTurn({ companion: companion({ axes, queries: ['q'] }), context: {}, question: 'q', signal: controller.signal, search: async () => [] })).rejects.toMatchObject({ name: 'AbortError' })
  })
})
