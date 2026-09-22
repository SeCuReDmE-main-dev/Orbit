import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DEFAULT_BUDGET, type BudgetLimits, type Mission, type MissionCheckpoint, type MissionStore } from '@orbit/core'
import type { MissionId } from '@orbit/contracts'
import { BROKER_MIGRATIONS, SqliteMigrationRunner, type MigrationResult } from './migrations.js'
import { createBrokerReceiptRepositories, type BrokerReceiptRepositories } from './receipts.js'

type MissionRow = {
  id: string
  title: string
  status: Mission['status']
  budget_json: string
  created_at: string
  updated_at: string
}

type CheckpointRow = {
  mission_id: string
  sequence: number
  label: string
  detail: string | null
  created_at: string
}

export class SqliteMissionStore implements MissionStore {
  private readonly db: DatabaseSync
  readonly migrations: SqliteMigrationRunner
  readonly receipts: BrokerReceiptRepositories

  constructor(filename = '.orbit/broker.sqlite') {
    mkdirSync(dirname(filename), { recursive: true })
    this.db = new DatabaseSync(filename)
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
    this.migrations = new SqliteMigrationRunner(this.db, filename, BROKER_MIGRATIONS)
    this.migrations.applyAll()
    this.receipts = createBrokerReceiptRepositories(this.db)
  }

  rollbackLatestMigration(): MigrationResult | undefined { return this.migrations.rollbackLatest() }

  create(input: Pick<Mission, 'id' | 'title'> & Partial<Pick<Mission, 'status' | 'budget'>>): Mission {
    if (!input.id.trim() || !input.title.trim()) throw new Error('A mission needs a non-empty id and title.')
    if (this.get(input.id)) throw new Error(`Mission already exists: ${input.id}`)
    const now = new Date().toISOString()
    const mission: Mission = {
      id: input.id,
      title: input.title,
      status: input.status ?? 'draft',
      budget: input.budget ?? DEFAULT_BUDGET,
      createdAt: now,
      updatedAt: now,
    }
    this.db.prepare('INSERT INTO missions VALUES (?, ?, ?, ?, ?, ?)').run(
      mission.id, mission.title, mission.status, JSON.stringify(mission.budget), mission.createdAt, mission.updatedAt,
    )
    return Object.freeze(mission)
  }

  get(id: string): Mission | undefined {
    const row = this.db.prepare('SELECT * FROM missions WHERE id = ?').get(id) as MissionRow | undefined
    return row ? toMission(row) : undefined
  }

  list(): Mission[] {
    return (this.db.prepare('SELECT * FROM missions ORDER BY created_at DESC').all() as MissionRow[]).map(toMission)
  }

  checkpoint(input: Omit<MissionCheckpoint, 'sequence' | 'createdAt'>): MissionCheckpoint {
    if (!this.get(input.missionId)) throw new Error(`Unknown mission: ${input.missionId}`)
    if (!input.label.trim()) throw new Error('A checkpoint needs a label.')
    const row = this.db.prepare('SELECT COALESCE(MAX(sequence), 0) AS value FROM checkpoints WHERE mission_id = ?').get(input.missionId) as { value: number }
    const checkpoint: MissionCheckpoint = {
      ...input,
      sequence: row.value + 1,
      createdAt: new Date().toISOString(),
    }
    this.db.prepare('INSERT INTO checkpoints VALUES (?, ?, ?, ?, ?)').run(
      checkpoint.missionId, checkpoint.sequence, checkpoint.label, checkpoint.detail ?? null, checkpoint.createdAt,
    )
    return Object.freeze(checkpoint)
  }

  checkpoints(missionId: string): MissionCheckpoint[] {
    return (this.db.prepare('SELECT * FROM checkpoints WHERE mission_id = ? ORDER BY sequence').all(missionId) as CheckpointRow[])
      .map((row) => Object.freeze({ missionId: row.mission_id as MissionId, sequence: row.sequence, label: row.label, detail: row.detail ?? undefined, createdAt: row.created_at }))
  }

  close(): void { this.db.close() }
}

function toMission(row: MissionRow): Mission {
  return Object.freeze({
    id: row.id as MissionId,
    title: row.title,
    status: row.status,
    budget: JSON.parse(row.budget_json) as BudgetLimits,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}
