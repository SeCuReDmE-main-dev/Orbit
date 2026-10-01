import { describe, expect, it } from 'vitest'
import { createDossier, parseDossier, type ClaimScope, type Dossier } from '../packages/evidence-review/src/index'
import { classifyEvidence, resolveHold, traceImpact, handoffFindings, independentSourceGroups } from '../packages/evidence-review/src/classification'

const scope: ClaimScope = { subject: 'retention', property: 'retention', value: 'yes', product: 'Research API', mode: 'foreground' }
function fixture(): Dossier {
  const d = createDossier(); d.question = 'Does this mode retain responses?'
  d.sources = [{ id: 'source-a', title: 'Policy', url: 'https://example.org/policy', status: 'read', text: 'Responses are retained. A second eligible passage.', contentHash: 'a'.repeat(64) }]
  d.claims = [{ id: 'claim-a', statement: 'Responses are retained.', kind: 'reported', disposition: 'indeterminate', scopeAttributes: scope,
    evidence: [{ sourceId: 'source-a', quote: 'Responses are retained.', relation: 'supports', scope }] }]
  return d
}
describe('deterministic classification and transmissions', () => {
  it('exposes distinct representations without inventing different decisions', () => {
    const d = fixture();
    expect(classifyEvidence(d, d.claims[0], 'baseline').representation.kind).toBe('three-state');
    expect(classifyEvidence(d, d.claims[0], 'n').representation.kind).toBe('independent-sets');
    expect(classifyEvidence(d, d.claims[0], 'p').representation.kind).toBe('attribute-relations');
  })
  it('preserves missing information alongside a same-scope conflict', () => {
    const d = fixture();
    d.sources[0].text += ' No retention.';
    d.claims[0].evidence.push({sourceId:'source-a',quote:'No retention.',relation:'contradicts',scope:{...scope,value:'no'}});
    d.claims[0].evidence.push({sourceId:'source-a',quote:'Absent passage.',relation:'supports',scope});
    const result = classifyEvidence(d, d.claims[0], 'n');
    expect(result.hold?.missing).toHaveLength(2);
    expect(result.representation).toMatchObject({kind:'independent-sets',T:['source-a'],F:['source-a'],I:['quote-unverified']});
  })
  it('gives all three engines the same verified supporting evidence', () => {
    const d = fixture()
    for (const engine of ['baseline', 'n', 'p'] as const) expect(classifyEvidence(d, d.claims[0], engine)).toMatchObject({ decision: 'ADMIT', semanticVerification: 'agent-asserted-relation', independentSources: 1 })
  })
  it('keeps simultaneous support and refutation in HOLD', () => {
    const d = fixture(); d.sources.push({ id: 'b', title: 'Contrary policy', url: 'https://example.org/other', status: 'read', text: 'No retention.' })
    d.claims[0].evidence.push({ sourceId: 'b', quote: 'No retention.', relation: 'contradicts', scope: { ...scope, value: 'no' } })
    const row = classifyEvidence(d, d.claims[0]); expect(row.truth).toHaveLength(1); expect(row.falsity).toHaveLength(1)
    expect(row.decision).toBe('HOLD'); expect(row.hold?.missing.length).toBeGreaterThan(0)
  })
  it('does not increase independent corroboration for copied sources or more passages', () => {
    const d = fixture(); d.claims[0].evidence.push({ ...d.claims[0].evidence[0], quote: 'A second eligible passage.' })
    expect(classifyEvidence(d, d.claims[0]).truth).toHaveLength(1)
    d.sources.push({ ...d.sources[0], id: 'copy', url: 'https://other.example/summary', originUrl: d.sources[0].url })
    d.claims[0].evidence.push({ ...d.claims[0].evidence[0], sourceId: 'copy' })
    expect(classifyEvidence(d, d.claims[0]).independentSources).toBe(1)
    expect(independentSourceGroups(d)).toHaveLength(1)
  })
  it('preserves results after shuffling evidence and unrelated additions', () => {
    const d = fixture(); const before = classifyEvidence(d, d.claims[0]); d.sources.push({ id: 'unrelated', title: 'Unrelated', url: 'https://example.org/unrelated', status: 'discovered' }); d.claims[0].evidence.reverse()
    expect(classifyEvidence(d, d.claims[0])).toEqual(before)
  })
  it('resolves a lack of evidence by recalculation without mutating the dossier', () => {
    const d = fixture(); const evidence = d.claims[0].evidence; d.claims[0].evidence = []
    const result = resolveHold(d, d.claims[0], evidence, 1)
    expect(result.before.decision).toBe('HOLD'); expect(result.after.decision).toBe('ADMIT'); expect(result.persisted).toBe(false)
    expect(d.claims[0].evidence).toHaveLength(0)
    expect(() => resolveHold(d, d.claims[0], evidence, 3)).toThrow('LIMIT')
  })
  it('retains HOLD for a nonmatching scope and changed Context content', () => {
    const d = fixture(); d.claims[0].contextReads = [{ path: 'policy/data', digest: 'a'.repeat(64) }]
    d.knowledgeReads = [{ path: 'policy/data', digest: 'b'.repeat(64), retrievedAt: '2026-09-29' }]
    expect(classifyEvidence(d, d.claims[0]).decision).toBe('HOLD')
    expect(traceImpact(d).affectedClaimIds).toEqual(['claim-a'])
    expect(traceImpact(d).affectedResponseRevisions).toEqual([0])
  })
  it('migrates old files without inventing T/I/F from confidence', () => {
    const old = { ...fixture(), confidence: 0.99 }; const restored = parseDossier(old)
    expect(restored).not.toHaveProperty('confidence'); expect(restored.classificationEngine).toBeUndefined()
    expect(classifyEvidence(restored, restored.claims[0]).decision).toBe('ADMIT')
  })
  it('rejects handoffs dropping a referenced source and flags lost uncertainty', () => {
    const d = fixture(); d.claims[0].evidence[0].quote = 'Unverified'
    d.handoffs = [{ id: 'h', fromAgent: 'extractor', toRole: 'reviewer', revision: d.revision, claimIds: ['claim-a'], sourceIds: ['source-a'], openQuestions: [], attribution: 'agent-declared' }]
    expect(handoffFindings(d).map((f) => f.code)).toContain('uncertainty-omitted')
    expect(parseDossier(d).handoffs?.[0].attribution).toBe('agent-declared')
    d.handoffs[0].sourceIds = []; expect(() => parseDossier(d)).toThrow('conserver')
  })
})
