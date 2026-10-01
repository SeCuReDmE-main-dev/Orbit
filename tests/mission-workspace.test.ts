import { describe, expect, it } from 'vitest'
import { buildLocalHandoff, createPlan } from '../web/src/lib/mission-workspace'

describe('mission workspace plan and continuity preview', () => {
  it('creates the fixed 39-point plan and records only supplied local evidence', () => {
    const plan = createPlan('Which source supports the observation?')
    expect(plan).toHaveLength(39)
    expect(plan.filter((point) => point.kind === 'topic')).toHaveLength(9)
    expect(plan.filter((point) => point.kind === 'angle')).toHaveLength(30)
    expect(new Set(plan.map((point) => point.id)).size).toBe(39)
    const handoff = buildLocalHandoff({ question: 'Which source supports the observation?', paused: true, checkpoints: ['2026-09-25T00:00:00.000Z paused-checkpoint'], sources: [{ title: 'User source', uri: 'https://example.test/source', observedAt: '2026-09-25T00:00:00.000Z' }] })
    expect(handoff).toMatchObject({ kind: 'CCPPackage-preview', scope: expect.stringContaining('no external provider'), plan: { pointCount: 39 } })
  })
})
