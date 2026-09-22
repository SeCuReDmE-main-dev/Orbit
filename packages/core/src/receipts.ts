export type SourceReceipt = Readonly<{
  id: `source_${string}`
  title: string
  uri: string
  normalizedUri: string
  observedAt: string
}>

export type ProofReceipt = Readonly<{
  id: `proof_${string}`
  sourceId: SourceReceipt['id']
  statement: string
  evidenceDigest?: `sha256:${string}`
  recordedAt: string
}>

export type DecisionReceipt = Readonly<{
  id: `decision_${string}`
  title: string
  rationale: string
  proofIds: readonly ProofReceipt['id'][]
  decidedAt: string
}>

export interface ReceiptRepository<TReceipt extends { readonly id: string }> {
  create(receipt: TReceipt): TReceipt
  get(id: TReceipt['id']): TReceipt | undefined
  list(): readonly TReceipt[]
}
