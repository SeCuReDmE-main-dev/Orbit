import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DEFAULT_BUDGET, type BudgetLimits, type Mission, type MissionCheckpoint, type MissionStore, type SourceReceipt } from '@orbit/core'
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

export type ResearchPointStatus = 'planned' | 'active' | 'complete' | 'blocked'
export type ResearchPointRecord = Readonly<{
  id: string
  missionId: MissionId
  title: string
  status: ResearchPointStatus
  detail?: string
  updatedAt: string
}>

type ResearchPointRow = { id: string; mission_id: string; title: string; status: ResearchPointStatus; detail: string | null; updated_at: string }

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

  upsertResearchPoint(input: Omit<ResearchPointRecord, 'updatedAt'>): ResearchPointRecord {
    if (!this.get(input.missionId)) throw new Error(`Unknown mission: ${input.missionId}`)
    if (!/^point_[A-Za-z0-9_-]+$/.test(input.id)) throw new Error('Research point id must use point_<identifier>.')
    if (!input.title.trim()) throw new Error('A research point needs a title.')
    if (!['planned', 'active', 'complete', 'blocked'].includes(input.status)) throw new Error('Invalid research point status.')
    const point: ResearchPointRecord = Object.freeze({ ...input, title: input.title.trim(), detail: input.detail?.trim() || undefined, updatedAt: new Date().toISOString() })
    this.db.prepare(`INSERT INTO research_points VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET mission_id=excluded.mission_id, title=excluded.title, status=excluded.status, detail=excluded.detail, updated_at=excluded.updated_at`)
      .run(point.id, point.missionId, point.title, point.status, point.detail ?? null, point.updatedAt)
    return point
  }

  listResearchPoints(offset = 0, limit = 25): readonly ResearchPointRecord[] {
    requirePage(offset, limit)
    return (this.db.prepare('SELECT * FROM research_points ORDER BY id LIMIT ? OFFSET ?').all(limit, offset) as ResearchPointRow[]).map(toResearchPoint)
  }

  countResearchPoints(): number {
    return (this.db.prepare('SELECT COUNT(*) AS count FROM research_points').get() as { count: number }).count
  }

  searchSources(query: string, offset = 0, limit = 25): readonly SourceReceipt[] {
    requirePage(offset, limit)
    const pattern = `%${query.replace(/[\\%_]/g, (value) => `\\${value}`)}%`
    const rows = this.db.prepare(`SELECT * FROM source_receipts WHERE title LIKE ? ESCAPE '\\' OR uri LIKE ? ESCAPE '\\' ORDER BY observed_at, id LIMIT ? OFFSET ?`).all(pattern, pattern, limit, offset) as Array<{ id: string }>
    return rows.map(({ id }) => this.receipts.sources.get(id as `source_${string}`)).filter((record): record is SourceReceipt => record !== undefined)
  }

  countSources(query = ''): number {
    if (!query) return (this.db.prepare('SELECT COUNT(*) AS count FROM source_receipts').get() as { count: number }).count
    const pattern = `%${query.replace(/[\\%_]/g, (value) => `\\${value}`)}%`
    return (this.db.prepare(`SELECT COUNT(*) AS count FROM source_receipts WHERE title LIKE ? ESCAPE '\\' OR uri LIKE ? ESCAPE '\\'`).get(pattern, pattern) as { count: number }).count
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

function toResearchPoint(row: ResearchPointRow): ResearchPointRecord {
  return Object.freeze({ id: row.id, missionId: row.mission_id as MissionId, title: row.title, status: row.status, detail: row.detail ?? undefined, updatedAt: row.updated_at })
}

function requirePage(offset: number, limit: number): void {
  if (!Number.isInteger(offset) || offset < 0) throw new Error('offset must be a non-negative integer.')
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new Error('limit must be an integer from 1 to 25.')
}
