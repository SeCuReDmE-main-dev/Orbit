import { copyFileSync, existsSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'

export type SqliteMigration = Readonly<{
  version: number
  name: string
  up(database: DatabaseSync): void
  down(database: DatabaseSync): void
}>

export type MigrationResult = Readonly<{ version: number; name: string; backupPath?: string }>

export class SqliteMigrationRunner {
  constructor(
    private readonly database: DatabaseSync,
    private readonly databasePath: string,
    private readonly migrations: readonly SqliteMigration[],
  ) {
    const versions = migrations.map(({ version }) => version)
    if (new Set(versions).size !== versions.length || versions.some((version) => !Number.isInteger(version) || version < 1)) {
      throw new Error('Migration versions must be unique positive integers.')
    }
    this.database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT')
    const hasLegacyMissionTables = ['missions', 'checkpoints'].every((name) =>
      this.database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name),
    )
    const hasVersionOne = this.database.prepare('SELECT 1 FROM schema_migrations WHERE version = 1').get()
    if (hasLegacyMissionTables && !hasVersionOne) {
      this.database.prepare('INSERT INTO schema_migrations VALUES (1, ?, ?)').run('mission-store-legacy-adopted', new Date().toISOString())
    }
  }

  applyAll(): readonly MigrationResult[] {
    const applied = new Set((this.database.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>).map(({ version }) => version))
    const unknown = [...applied].filter((version) => !this.migrations.some((migration) => migration.version === version))
    if (unknown.length) throw new Error(`Database has unknown migration versions: ${unknown.join(', ')}`)
    const results: MigrationResult[] = []
    for (const migration of [...this.migrations].sort((left, right) => left.version - right.version)) {
      if (applied.has(migration.version)) continue
      const backupPath = this.backup(migration.version)
      this.transaction(() => {
        migration.up(this.database)
        this.database.prepare('INSERT INTO schema_migrations VALUES (?, ?, ?)').run(migration.version, migration.name, new Date().toISOString())
      })
      results.push({ version: migration.version, name: migration.name, backupPath })
    }
    return results
  }

  rollbackLatest(): MigrationResult | undefined {
    const latest = this.database.prepare('SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1').get() as { version: number; name: string } | undefined
    if (!latest) return undefined
    const migration = this.migrations.find(({ version }) => version === latest.version)
    if (!migration) throw new Error(`Cannot roll back unknown migration version ${latest.version}.`)
    const backupPath = this.backup(migration.version)
    this.transaction(() => {
      migration.down(this.database)
      this.database.prepare('DELETE FROM schema_migrations WHERE version = ?').run(migration.version)
    })
    return { version: migration.version, name: migration.name, backupPath }
  }

  private backup(version: number): string | undefined {
    if (this.databasePath === ':memory:' || !existsSync(this.databasePath)) return undefined
    this.database.exec('PRAGMA wal_checkpoint(FULL)')
    const basePath = `${this.databasePath}.before-v${String(version).padStart(3, '0')}`
    let backupPath = `${basePath}.sqlite`
    let attempt = 1
    while (existsSync(backupPath)) backupPath = `${basePath}-${attempt++}.sqlite`
    copyFileSync(this.databasePath, backupPath)
    return backupPath
  }

  private transaction(work: () => void): void {
    this.database.exec('BEGIN IMMEDIATE')
    try { work(); this.database.exec('COMMIT') } catch (error) { this.database.exec('ROLLBACK'); throw error }
  }
}

export const BROKER_MIGRATIONS: readonly SqliteMigration[] = [
  {
    version: 1,
    name: 'mission-store',
    up(database) {
      database.exec(`
        CREATE TABLE missions (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL, budget_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL) STRICT;
        CREATE TABLE checkpoints (mission_id TEXT NOT NULL REFERENCES missions(id), sequence INTEGER NOT NULL, label TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL, PRIMARY KEY (mission_id, sequence)) STRICT;
      `)
    },
    down(database) { database.exec('DROP TABLE checkpoints; DROP TABLE missions;') },
  },
  {
    version: 2,
    name: 'research-receipts',
    up(database) {
      database.exec(`
        CREATE TABLE source_receipts (id TEXT PRIMARY KEY, title TEXT NOT NULL, uri TEXT NOT NULL, normalized_uri TEXT NOT NULL UNIQUE, observed_at TEXT NOT NULL) STRICT;
        CREATE TABLE proof_receipts (id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES source_receipts(id), statement TEXT NOT NULL, evidence_digest TEXT, recorded_at TEXT NOT NULL) STRICT;
        CREATE TABLE decision_receipts (id TEXT PRIMARY KEY, title TEXT NOT NULL, rationale TEXT NOT NULL, proof_ids_json TEXT NOT NULL, decided_at TEXT NOT NULL) STRICT;
      `)
    },
    down(database) { database.exec('DROP TABLE decision_receipts; DROP TABLE proof_receipts; DROP TABLE source_receipts;') },
  },
]
