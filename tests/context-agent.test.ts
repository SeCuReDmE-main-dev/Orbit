import { describe, expect, it } from 'vitest'
import { acceptProposal, createDossier } from '../packages/evidence-review/src/index'
import { proposeContextPlan, proposeContextReport, type ContextReader } from '../tools/context-agent'
import { runKeywordBaseline } from '../tools/context-baseline'
import type { CompanionService } from '../services/broker/src/companion'

const entry = '# Privacy scopes\n\nBackground execution differs between providers.\n\n## Sources\nOfficial policy — https://example.org/policy'
const reader: ContextReader = {
  outline: async () => ({ state: 'READY', content: [{ type: 'text', text: 'data_retention_and_privacy [core]\n  Provider-specific conditions.' }] }),
  entries: async () => ({ state: 'READY', retrievedAt: '2026-09-28T00:00:00Z', content: [{ type: 'text', text: entry }] }),
}
function companion(outputs: string[]): CompanionService {
  return { status: async () => ({ provider: 'fake', model: 'test', connected: true }),
    run: async () => ({ text: outputs.shift() ?? '', model: 'test' }) }
}
describe('Sanity Context agent proposals', () => {
  it('selects only outline paths and keeps the plan pending human approval', async () => {
    const d = createDossier(); d.question = 'How do retention rules differ?'
    const result = await proposeContextPlan(d, reader, companion([
      JSON.stringify({ paths: ['data_retention_and_privacy'] }),
      JSON.stringify({ axes: ['Provider scopes'], screeningCriteria: ['Official policies'], report: 'Verify each provider scope.' }),
    ]), new AbortController().signal)
    expect(result.proposal.stage).toBe('plan')
    expect(result.proposal.status).toBe('pending')
    expect(result.proposal.knowledgeReads).toHaveLength(1)
    expect(result.trace.calls.map((call) => call.tool)).toEqual(['initial_context', 'knowledge_base_read'])
    expect(d.approvedPlan).toBeUndefined()
  })
  it('allows an unclassified path that Context lists in the real outline', async () => {
    const unclassifiedReader: ContextReader = {
      ...reader,
      outline: async () => ({ state: 'READY', content: [{ type: 'text', text: 'research_methodology/question_disambiguation\n\ndata_retention_and_privacy [core]' }] }),
    }
    const d = createDossier(); d.question = 'What should be clarified first?'
    const result = await proposeContextPlan(d, unclassifiedReader, companion([
      JSON.stringify({ paths: ['research_methodology/question_disambiguation'] }),
      JSON.stringify({ axes: ['Clarify scope'], screeningCriteria: ['Use original sources'], report: 'Ask a bounded question.' }),
    ]), new AbortController().signal)
    expect(result.proposal.knowledgeReads[0].path).toBe('research_methodology/question_disambiguation')
  })
  it('requires approval, checks exact quotes, and refuses changed Context content', async () => {
    const d = createDossier(); d.question = 'How do retention rules differ?'
    await expect(proposeContextReport(d, reader, companion([]), new AbortController().signal)).rejects.toThrow('HUMAN_PLAN_APPROVAL_REQUIRED')
    const plan = await proposeContextPlan(d, reader, companion([
      JSON.stringify({ paths: ['data_retention_and_privacy'] }),
      JSON.stringify({ axes: ['Provider scopes'], screeningCriteria: ['Official policies'], report: 'Check scopes.' }),
    ]), new AbortController().signal)
    d.proposals.push(plan.proposal)
    const approved = acceptProposal(d, plan.proposal.id)
    approved.approvedPlan = approved.revision
    const draft = { answer: 'The available Context entry establishes a difference, not a provider-wide rule.', claims: [{ id: 'claim_1', statement: 'Rules differ.', kind: 'reported', disposition: 'supported',
      scope: 'Only the provider and execution surfaces described in this Context entry.', conditions: ['Check the original provider policy before extending the claim.'], effectiveAt: 'unknown', axisIds: ['axis_0'],
      evidence: [{ sourceId: 'source_context_0', quote: 'Background execution differs between providers.', relation: 'supports' }] }],
      extractions: [], report: 'Scope differs [[source:source_context_0]].' }
    const result = await proposeContextReport(approved, reader, companion([JSON.stringify(draft)]), new AbortController().signal)
    expect(result.proposal.stage).toBe('report')
    expect(result.proposal.status).toBe('pending')
    expect(result.proposal.answer).toContain('difference')
    expect(result.proposal.claims[0].contextReads).toEqual([{ path: 'data_retention_and_privacy', digest: result.proposal.knowledgeReads[0].digest }])
    await expect(proposeContextReport(approved, reader, companion([JSON.stringify({ ...draft, claims: [{ ...draft.claims[0], evidence: [{ ...draft.claims[0].evidence[0], quote: 'Invented quote' }] }] })]), new AbortController().signal)).rejects.toThrow('REPORT_QUOTE_UNVERIFIED')
    const changedReader: ContextReader = { ...reader, entries: async () => ({ state: 'READY', content: [{ type: 'text', text: entry + ' changed' }] }) }
    await expect(proposeContextReport(approved, changedReader, companion([JSON.stringify(draft)]), new AbortController().signal)).rejects.toThrow('CONTEXT_CHANGED')
  })
  it('rejects invented entry paths before reading them', async () => {
    const d = createDossier(); d.question = 'Question'
    await expect(proposeContextPlan(d, reader, companion([JSON.stringify({ paths: ['invented/path'] })]), new AbortController().signal)).rejects.toThrow('AGENT_INVALID_CONTEXT_PATHS')
  })
  it('runs a flat keyword control without turning it into an approved report', async () => {
    const d = createDossier(); d.question = 'How do provider scopes differ?'; d.objective = 'Compare scope.'
    const plan = await proposeContextPlan(d, reader, companion([
      JSON.stringify({ paths: ['data_retention_and_privacy'] }),
      JSON.stringify({ axes: ['Provider scope'], screeningCriteria: ['Use original sources'], report: 'Check scope.' }),
    ]), new AbortController().signal)
    d.proposals.push(plan.proposal)
    const result = await runKeywordBaseline(d, reader, companion([
      JSON.stringify({ answer: 'The flat text suggests a difference, but it cannot establish a provider-wide rule.', limitations: ['Original pages were not read.'] }),
    ]), new AbortController().signal)
    expect(result.status).toBe('candidate')
    expect(result.entriesRead).toBe(1)
    expect(result.selectedEntries).toHaveLength(1)
    expect(result.candidateAnswer).toContain('difference')
    expect(result.corpusMode).toBe('frozen-context-plan')
    expect(d.proposals).toHaveLength(1)
  })
})
