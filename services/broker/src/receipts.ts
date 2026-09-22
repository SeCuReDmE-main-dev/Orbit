import type { DatabaseSync } from 'node:sqlite'
import type { DecisionReceipt, ProofReceipt, ReceiptRepository, SourceReceipt } from '@orbit/core'

type SourceRow = { id: string; title: string; uri: string; normalized_uri: string; observed_at: string }
type ProofRow = { id: string; source_id: string; statement: string; evidence_digest: string | null; recorded_at: string }
type DecisionRow = { id: string; title: string; rationale: string; proof_ids_json: string; decided_at: string }

export class SqliteSourceReceiptRepository implements ReceiptRepository<SourceReceipt> {
  constructor(private readonly database: DatabaseSync) {}

  create(receipt: SourceReceipt): SourceReceipt {
    requirePrefix(receipt.id, 'source_'); requireText(receipt.title, 'title'); requireText(receipt.uri, 'uri'); requireText(receipt.normalizedUri, 'normalizedUri')
    this.database.prepare('INSERT INTO source_receipts VALUES (?, ?, ?, ?, ?)').run(receipt.id, receipt.title, receipt.uri, receipt.normalizedUri, receipt.observedAt)
    return Object.freeze({ ...receipt })
  }

  get(id: SourceReceipt['id']): SourceReceipt | undefined {
    const row = this.database.prepare('SELECT * FROM source_receipts WHERE id = ?').get(id) as SourceRow | undefined
    return row && toSource(row)
  }

  list(): readonly SourceReceipt[] { return (this.database.prepare('SELECT * FROM source_receipts ORDER BY observed_at, id').all() as SourceRow[]).map(toSource) }
}

export class SqliteProofReceiptRepository implements ReceiptRepository<ProofReceipt> {
  constructor(private readonly database: DatabaseSync) {}

  create(receipt: ProofReceipt): ProofReceipt {
    requirePrefix(receipt.id, 'proof_'); requireText(receipt.statement, 'statement')
    this.database.prepare('INSERT INTO proof_receipts VALUES (?, ?, ?, ?, ?)').run(receipt.id, receipt.sourceId, receipt.statement, receipt.evidenceDigest ?? null, receipt.recordedAt)
    return Object.freeze({ ...receipt })
  }

  get(id: ProofReceipt['id']): ProofReceipt | undefined {
    const row = this.database.prepare('SELECT * FROM proof_receipts WHERE id = ?').get(id) as ProofRow | undefined
    return row && toProof(row)
  }

  list(): readonly ProofReceipt[] { return (this.database.prepare('SELECT * FROM proof_receipts ORDER BY recorded_at, id').all() as ProofRow[]).map(toProof) }
}

export class SqliteDecisionReceiptRepository implements ReceiptRepository<DecisionReceipt> {
  constructor(private readonly database: DatabaseSync) {}

  create(receipt: DecisionReceipt): DecisionReceipt {
    requirePrefix(receipt.id, 'decision_'); requireText(receipt.title, 'title'); requireText(receipt.rationale, 'rationale')
    this.database.prepare('INSERT INTO decision_receipts VALUES (?, ?, ?, ?, ?)').run(receipt.id, receipt.title, receipt.rationale, JSON.stringify(receipt.proofIds), receipt.decidedAt)
    return Object.freeze({ ...receipt, proofIds: [...receipt.proofIds] })
  }

  get(id: DecisionReceipt['id']): DecisionReceipt | undefined {
    const row = this.database.prepare('SELECT * FROM decision_receipts WHERE id = ?').get(id) as DecisionRow | undefined
    return row && toDecision(row)
  }

  list(): readonly DecisionReceipt[] { return (this.database.prepare('SELECT * FROM decision_receipts ORDER BY decided_at, id').all() as DecisionRow[]).map(toDecision) }
}

export type BrokerReceiptRepositories = Readonly<{
  sources: SqliteSourceReceiptRepository
  proofs: SqliteProofReceiptRepository
  decisions: SqliteDecisionReceiptRepository
}>

export function createBrokerReceiptRepositories(database: DatabaseSync): BrokerReceiptRepositories {
  return Object.freeze({
    sources: new SqliteSourceReceiptRepository(database),
    proofs: new SqliteProofReceiptRepository(database),
    decisions: new SqliteDecisionReceiptRepository(database),
  })
}

function toSource(row: SourceRow): SourceReceipt { return Object.freeze({ id: row.id as SourceReceipt['id'], title: row.title, uri: row.uri, normalizedUri: row.normalized_uri, observedAt: row.observed_at }) }
function toProof(row: ProofRow): ProofReceipt { return Object.freeze({ id: row.id as ProofReceipt['id'], sourceId: row.source_id as ProofReceipt['sourceId'], statement: row.statement, evidenceDigest: row.evidence_digest === null ? undefined : row.evidence_digest as ProofReceipt['evidenceDigest'], recordedAt: row.recorded_at }) }
function toDecision(row: DecisionRow): DecisionReceipt { return Object.freeze({ id: row.id as DecisionReceipt['id'], title: row.title, rationale: row.rationale, proofIds: JSON.parse(row.proof_ids_json) as DecisionReceipt['proofIds'], decidedAt: row.decided_at }) }
function requirePrefix(value: string, prefix: string): void { if (!value.startsWith(prefix)) throw new Error(`Receipt id must start with ${prefix}`) }
function requireText(value: string, field: string): void { if (!value.trim()) throw new Error(`${field} must be non-empty.`) }
