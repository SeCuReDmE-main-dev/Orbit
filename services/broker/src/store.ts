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
    try {
      this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
      this.migrations = new SqliteMigrationRunner(this.db, filename, BROKER_MIGRATIONS)
      this.migrations.applyAll()
      this.receipts = createBrokerReceiptRepositories(this.db)
    } catch (error) { this.db.close(); throw error }
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

  setStatus(id: MissionId, status: Mission['status']): Mission {
    const current = this.get(id)
    if (!current) throw new Error(`Unknown mission: ${id}`)
    if (!['draft', 'active', 'blocked', 'completed'].includes(status)) throw new Error('Invalid mission status.')
    const updatedAt = new Date().toISOString()
    this.db.prepare('UPDATE missions SET status = ?, updated_at = ? WHERE id = ?').run(status, updatedAt, id)
    return Object.freeze({ ...current, status, updatedAt })
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

  saveCheckpointSnapshot(missionId: MissionId, sequence: number, payload: Record<string, unknown>): void {
    if (!this.get(missionId)) throw new Error(`Unknown mission: ${missionId}`)
    const serialized = JSON.stringify(payload)
    if (Buffer.byteLength(serialized, 'utf8') > 65_536) throw new Error('Checkpoint snapshot exceeds 64 KiB.')
    this.db.prepare('INSERT INTO checkpoint_snapshots VALUES (?, ?, ?)').run(missionId, sequence, serialized)
  }

  latestCheckpointSnapshot(missionId: MissionId): Record<string, unknown> | undefined {
    const row = this.db.prepare('SELECT payload_json FROM checkpoint_snapshots WHERE mission_id = ? ORDER BY sequence DESC LIMIT 1').get(missionId) as { payload_json: string } | undefined
    return row ? JSON.parse(row.payload_json) as Record<string, unknown> : undefined
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

  listMissionResearchPoints(missionId: MissionId, offset: number, limit: number): readonly ResearchPointRecord[] { requirePage(offset, limit); return (this.db.prepare('SELECT * FROM research_points WHERE mission_id = ? ORDER BY id LIMIT ? OFFSET ?').all(missionId, limit, offset) as ResearchPointRow[]).map(toResearchPoint) }
  countMissionResearchPoints(missionId: MissionId): number { return (this.db.prepare('SELECT COUNT(*) AS count FROM research_points WHERE mission_id = ?').get(missionId) as { count: number }).count }

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

  linkSource(missionId: MissionId, sourceId: `source_${string}`): void { this.db.prepare('INSERT OR IGNORE INTO mission_sources VALUES (?, ?)').run(missionId, sourceId) }
  searchMissionSources(missionId: MissionId, query: string, offset: number, limit: number): readonly SourceReceipt[] {
    requirePage(offset, limit); const pattern = `%${query.replace(/[\\%_]/g, (value) => `\\${value}`)}%`
    const rows = this.db.prepare(`SELECT source_id FROM mission_sources JOIN source_receipts ON source_id = id WHERE mission_id = ? AND (title LIKE ? ESCAPE '\\' OR uri LIKE ? ESCAPE '\\') ORDER BY observed_at, source_id LIMIT ? OFFSET ?`).all(missionId, pattern, pattern, limit, offset) as Array<{ source_id: string }>
    return rows.map(({ source_id }) => this.receipts.sources.get(source_id as `source_${string}`)).filter((source): source is SourceReceipt => source !== undefined)
  }
  countMissionSources(missionId: MissionId, query: string): number { const pattern = `%${query.replace(/[\\%_]/g, (value) => `\\${value}`)}%`; return (this.db.prepare(`SELECT COUNT(*) AS count FROM mission_sources JOIN source_receipts ON source_id = id WHERE mission_id = ? AND (title LIKE ? ESCAPE '\\' OR uri LIKE ? ESCAPE '\\')`).get(missionId, pattern, pattern) as { count: number }).count }
  missionOwnsSource(missionId: MissionId, sourceId: `source_${string}`): boolean { return !!this.db.prepare('SELECT 1 FROM mission_sources WHERE mission_id = ? AND source_id = ?').get(missionId, sourceId) }
  reserveSearchAttempt(missionId: MissionId): number { const current = (this.db.prepare('SELECT attempts FROM mission_search_attempts WHERE mission_id = ?').get(missionId) as { attempts: number } | undefined)?.attempts ?? 0; if (current >= 18) throw new Error('Mission search limit of 18 attempts reached.'); this.db.prepare('INSERT INTO mission_search_attempts VALUES (?, ?) ON CONFLICT(mission_id) DO UPDATE SET attempts = excluded.attempts').run(missionId, current + 1); return current + 1 }
  getSearchCache(missionId: MissionId, key: string): unknown[] | undefined { const row = this.db.prepare('SELECT result_json FROM mission_search_cache WHERE mission_id = ? AND cache_key = ?').get(missionId, key) as { result_json: string } | undefined; return row ? JSON.parse(row.result_json) as unknown[] : undefined }
  saveSearchCache(missionId: MissionId, key: string, results: unknown[]): void { this.db.prepare('INSERT INTO mission_search_cache VALUES (?, ?, ?) ON CONFLICT(mission_id, cache_key) DO UPDATE SET result_json=excluded.result_json').run(missionId, key, JSON.stringify(results)) }

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
