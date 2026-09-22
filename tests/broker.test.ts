import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SqliteMissionStore } from '@orbit/broker'

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
