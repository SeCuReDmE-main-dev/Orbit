import { describe, expect, it } from 'vitest'
import { DEFAULT_BUDGET, InMemoryMissionStore, exceededBudgetKeys, withinBudget } from '@orbit/core'
import { BlockedExternalProvider, createCcpHandoff } from '@orbit/providers'

describe('mission checkpoints and budgets', () => {
  it('persists ordered checkpoints without changing the configured budget', () => {
    const store = new InMemoryMissionStore()
    const mission = store.create({ id: 'mission_storm_01', title: 'Trace a storm product' })
    store.checkpoint({ missionId: mission.id, label: 'source-selected' })
    store.checkpoint({ missionId: mission.id, label: 'claim-bounded', detail: 'No predictive claim.' })

    expect(mission.budget).toEqual(DEFAULT_BUDGET)
    expect(store.checkpoints(mission.id).map(({ sequence, label }) => ({ sequence, label }))).toEqual([
      { sequence: 1, label: 'source-selected' }, { sequence: 2, label: 'claim-bounded' },
    ])
    expect(withinBudget({ modelCalls: 9, maxDepth: 2 })).toBe(true)
    expect(exceededBudgetKeys({ claims: 19 })).toEqual(['claims'])
  })
})

describe('provider boundary and CCP handoff', () => {
  it('marks unavailable integrations explicitly and creates a read-only handoff', async () => {
    const mission = new InMemoryMissionStore().create({ id: 'mission_local_1', title: 'Local mission' })
    const provider = new BlockedExternalProvider('NASA-archive', 'Credentials and an approved query are required.')
    await expect(provider.execute({}, mission)).resolves.toMatchObject({ state: 'BLOCKED_EXTERNAL', provider: 'NASA-archive' })
    expect(createCcpHandoff(mission)).toMatchObject({ kind: 'CCPPackage', missionId: 'mission_local_1', protocol: 'Context Continuity Protocol' })
  })
})
