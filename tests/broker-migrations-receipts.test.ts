import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { SqliteMissionStore } from '@orbit/broker'

describe('broker migrations and receipts', () => {
  it('backs up before migration, persists typed receipts, and rolls back the latest schema change', () => {
    const directory = mkdtempSync(join(tmpdir(), 'orbit-migration-'))
    const databasePath = join(directory, 'broker.sqlite')
    try {
      const store = new SqliteMissionStore(databasePath)
      const mission = store.create({ id: 'mission_receipts', title: 'Receipt migration' })
      const source = store.receipts.sources.create({
        id: 'source_imerg', title: 'IMERG', uri: 'https://example.test/imerg?utm_source=fixture', normalizedUri: 'https://example.test/imerg', observedAt: '2026-09-21T00:00:00.000Z',
      })
      const proof = store.receipts.proofs.create({ id: 'proof_imerg', sourceId: source.id, statement: 'Fixture provides a product label.', recordedAt: '2026-09-21T00:01:00.000Z' })
      const decision = store.receipts.decisions.create({ id: 'decision_scope', title: 'Keep local scope', rationale: 'No approved external provider.', proofIds: [proof.id], decidedAt: '2026-09-21T00:02:00.000Z' })
      const point = store.upsertResearchPoint({ id: 'point_sources', missionId: mission.id, title: 'Review sources', status: 'active' })
      expect(store.receipts.sources.get(source.id)).toEqual(source)
      expect(store.receipts.proofs.list()).toEqual([proof])
      expect(store.receipts.decisions.get(decision.id)).toEqual(decision)

      expect(store.listResearchPoints()).toEqual([point])
      const rollback = store.rollbackLatestMigration()
      expect(rollback).toMatchObject({ version: 3, name: 'research-points' })
      expect(rollback?.backupPath).toBeDefined()
      expect(existsSync(rollback!.backupPath!)).toBe(true)
      const backup = new DatabaseSync(rollback!.backupPath!)
      expect(backup.prepare("SELECT id FROM source_receipts WHERE id = 'source_imerg'").get()).toEqual({ id: 'source_imerg' })
      expect(backup.prepare("SELECT id FROM research_points WHERE id = 'point_sources'").get()).toEqual({ id: 'point_sources' })
      backup.close()
      expect(store.rollbackLatestMigration()).toMatchObject({ version: 2, name: 'research-receipts' })
      store.close()
      const migrated = new DatabaseSync(databasePath)
      expect(migrated.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'source_receipts'").get()).toBeUndefined()
      migrated.close()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('adopts the legacy mission schema and migrates only the receipt addition', () => {
    const directory = mkdtempSync(join(tmpdir(), 'orbit-legacy-'))
    const databasePath = join(directory, 'legacy.sqlite')
    try {
      const legacy = new DatabaseSync(databasePath)
      legacy.exec('CREATE TABLE missions (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL, budget_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT; CREATE TABLE checkpoints (mission_id TEXT NOT NULL, sequence INTEGER NOT NULL, label TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL, PRIMARY KEY (mission_id, sequence)) STRICT;')
      legacy.close()
      const store = new SqliteMissionStore(databasePath)
      expect(store.migrations.rollbackLatest()).toMatchObject({ version: 3 })
      expect(store.migrations.rollbackLatest()).toMatchObject({ version: 2 })
      store.close()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
