import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => { vi.resetModules(); vi.stubGlobal('document', new EventTarget()); vi.stubGlobal('localStorage', { getItem: () => null }); vi.stubGlobal('fetch', vi.fn()); })
afterEach(() => vi.unstubAllGlobals())
async function setup() {
  const state = await import('../web/src/lib/workshop-state'); await state.activateWorkshop();
  const d = state.dossier();
  const scope = { subject: 'feature', property: 'supported', value: 'yes', product: 'Orbit', mode: 'local' };
  d.sources = [{ id: 'a', title: 'Specification', url: 'https://example.org/spec', status: 'read', text: 'The feature is supported.' }];
  d.claims = [{ id: 'c', statement: 'The feature is supported.', kind: 'reported', disposition: 'indeterminate', scopeAttributes: scope, evidence: [{ sourceId: 'a', quote: 'The feature is supported.', relation: 'supports', scope }] }];
  state.setDossier(d);
  const { orbitTools } = await import('../web/src/lib/webmcp');
  return { state, d, tool: (name: string) => orbitTools().find(t => t.name === name)! };
}
describe('classification tools on the shared workshop contract', () => {
  it('requires sharing and current dossier/revision, refuses foreign claims and engine override', async () => {
    const { state, d, tool } = await setup(); const input = { requestId: d.id, expectedRevision: d.revision, claimIds: ['c'] };
    expect(await tool('orbit_classify_evidence').execute(input)).toMatchObject({ state: 'CONSENT_REQUIRED' });
    state.setPermissions(true, false);
    expect(await tool('orbit_classify_evidence').execute(input)).toMatchObject({ state: 'READY', assessments: [{ decision: 'ADMIT', engine: 'n' }], persisted: false });
    expect(await tool('orbit_classify_evidence').execute({ ...input, expectedRevision: 99 })).toMatchObject({ state: 'STALE_REVISION' });
    expect(await tool('orbit_classify_evidence').execute({ ...input, requestId: 'other' })).toMatchObject({ state: 'NOT_FOUND' });
    await expect(tool('orbit_classify_evidence').execute({ ...input, claimIds: ['outside'] })).rejects.toThrow();
    await expect(tool('orbit_classify_evidence').execute({ ...input, engine: 'p' })).rejects.toThrow('not allowed');
    expect(state.dossier().reviews).toHaveLength(0); expect(fetch).not.toHaveBeenCalled();
  });
  it('calculates against a pending proposal without silently accepting it; deposition is idempotent', async () => {
    const { state, d, tool } = await setup(); state.setPermissions(true, true);
    const input = { requestId: d.id, expectedRevision: 0, submissionId: 'run-1', stage: 'review', report: 'Candidate', axes: [], sources: d.sources, claims: d.claims };
    const first: any = await tool('orbit_present_research').execute(input);
    expect(await tool('orbit_present_research').execute(input)).toMatchObject({ proposalId: first.proposalId, duplicate: true });
    expect(state.dossier().proposals).toHaveLength(1); expect(state.dossier().report).toBe('');
    expect(await tool('orbit_classify_evidence').execute({ requestId: d.id, expectedRevision: 0, proposalId: first.proposalId, claimIds: ['c'] })).toMatchObject({ state: 'READY', assessments: [{ decision: 'ADMIT' }] });
    await expect(tool('orbit_present_research').execute({ ...input, report: 'Changed payload' })).rejects.toThrow('SUBMISSION_CONFLICT');
    state.setPermissions(false, false);
    expect(await tool('orbit_classify_evidence').execute({ requestId: d.id, expectedRevision: 0, claimIds: ['c'] })).toMatchObject({ state: 'CONSENT_REQUIRED' });
  });
  it('clarifies a missing condition without mutation or replacing the claim', async () => {
    const { state, d, tool } = await setup(); const complete = d.claims[0].scopeAttributes!;
    d.claims[0].scopeAttributes = { subject: complete.subject, property: complete.property, value: complete.value };
    state.setDossier(d); state.setPermissions(true, false);
    const input = { requestId: d.id, expectedRevision: 0, claimId: 'c', attempt: 1, additionalEvidence: [], candidateScope: complete };
    expect(await tool('orbit_resolve_hold').execute(input)).toMatchObject({ resolution: { before: { decision: 'HOLD' }, after: { decision: 'ADMIT' }, persisted: false } });
    expect(state.dossier().claims[0].scopeAttributes).not.toHaveProperty('product');
    await expect(tool('orbit_resolve_hold').execute({ ...input, candidateScope: { ...complete, value: 'no' } })).rejects.toThrow('cannot replace');
  });
});
