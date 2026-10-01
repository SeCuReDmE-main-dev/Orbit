import type { Mission, MissionCheckpoint, SourceReceipt } from '@orbit/core'
import { createHash } from 'node:crypto'
import {
  CCP_PACKAGE_KIND,
  CCP_PROTOCOL_NAME,
  CCP_SCHEMA_VERSION,
  type CCPPackage,
  type ProviderAdapter,
  type ProviderDescriptor,
  type ProviderRequest,
  type ProviderResult as ContractProviderResult,
  type JSONValue,
} from '@orbit/contracts'

export type ProviderState = 'READY' | 'BLOCKED_EXTERNAL'
export type ProviderResult<T> =
  | Readonly<{ state: 'READY'; data: T }>
  | Readonly<{ state: 'BLOCKED_EXTERNAL'; provider: string; reason: string }>

export interface OrbitProvider<TRequest, TResponse> {
  readonly name: string
  execute(request: TRequest, mission: Mission): Promise<ProviderResult<TResponse>>
}

/**
 * A deliberate offline adapter. It cannot be mistaken for a scientific or live-data integration.
 */
export class BlockedExternalProvider<TRequest, TResponse> implements OrbitProvider<TRequest, TResponse> {
  readonly name: string
  readonly reason: string

  constructor(name: string, reason: string) {
    this.name = name
    this.reason = reason
  }

  async execute(_request: TRequest, _mission: Mission): Promise<ProviderResult<TResponse>> {
    return Object.freeze({ state: 'BLOCKED_EXTERNAL', provider: this.name, reason: this.reason })
  }
}

/** Adapter form used by the shared provider contract until an approved live integration is configured. */
export class ContractBlockedExternalProvider implements ProviderAdapter {
  constructor(private readonly descriptor: ProviderDescriptor, private readonly reason: string) {}

  async describe(): Promise<ProviderDescriptor> { return this.descriptor }

  async invoke<TInput extends JSONValue, TOutput extends JSONValue>(
    _request: ProviderRequest<TInput>,
    _signal: AbortSignal,
  ): Promise<ContractProviderResult<TOutput>> {
    return {
      ok: false,
      code: 'BLOCKED_EXTERNAL',
      retryable: false,
      message: this.reason,
      evidence: [],
      usage: { calls: 0, inputTokens: 0, outputTokens: 0, wallClockMs: 0, spendUsdCents: 0 },
    }
  }
}

export type CcpHandoff = CCPPackage

export type CcpMissionContext = Readonly<{
  question?: string
  plan?: readonly Readonly<{ id: string; title: string; status: string; detail?: string }>[]
  sources?: readonly SourceReceipt[]
  decisions?: readonly Readonly<{ title: string; rationale: string; decidedAt?: string }>[]
  checkpoints?: readonly MissionCheckpoint[]
}>

/**
 * Creates a portable, read-only continuity package from locally observed state.
 * Callers must only pass source receipts and decisions they actually persisted or
 * collected; this helper never represents a provider as having been contacted.
 */
export function createCcpHandoff(mission: Mission, context: CcpMissionContext = {}): CcpHandoff {
  const createdAt = new Date().toISOString()
  const packageId = `ccp_${mission.id}_${Date.now()}` as CCPPackage['packageId']
  const sources = context.sources ?? []
  const decisions = context.decisions ?? []
  const checkpoints = context.checkpoints ?? []
  const plan = context.plan ?? []
  const evidence = [
    ...sources.map((source) => ({ id: source.id, kind: 'source' as const, uri: source.normalizedUri, observedAt: source.observedAt, note: source.title })),
    ...decisions.map((decision, index) => ({ id: `decision_local_${index + 1}`, kind: 'decision' as const, observedAt: decision.decidedAt ?? createdAt, note: `${decision.title}: ${decision.rationale}` })),
    ...checkpoints.map((checkpoint) => ({ id: `checkpoint_${checkpoint.sequence}`, kind: 'receipt' as const, observedAt: checkpoint.createdAt, note: `${checkpoint.label}${checkpoint.detail ? `: ${checkpoint.detail}` : ''}` })),
  ]
  const payload = {
    kind: CCP_PACKAGE_KIND,
    protocol: CCP_PROTOCOL_NAME,
    schemaVersion: CCP_SCHEMA_VERSION,
    packageId,
    missionId: mission.id,
    createdAt,
    producer: { name: 'orbit-companion', version: '0.1.0' },
    context: {
      objective: context.question?.trim() || mission.title,
      constraints: [
        `budget: ${JSON.stringify(mission.budget)}`,
        `plan-points: ${plan.length}`,
        `local-source-receipts: ${sources.length}`,
        'read-only handoff',
      ],
      decisions: decisions.map((decision) => `${decision.title}: ${decision.rationale}`),
      openQuestions: plan.filter((point) => point.status !== 'complete').map((point) => point.title),
    },
    actionCards: [], ledgerTail: [], gates: [], evidence,
    externalDependencies: [{ id: 'providers', description: 'Live providers are not configured.', owner: 'human' as const, state: 'BLOCKED_EXTERNAL' as const, unblockEvidence: 'Approved credentials and query scope.' }],
  }
  const contentDigest = `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}` as CCPPackage['integrity']['contentDigest']
  return Object.freeze({ ...payload, integrity: { contentDigest, previousPackageDigest: null }, retention: { class: 'PROJECT' as const, deleteAfter: null } })
}

export { CodexConnection, ProviderConnectionError } from "./codex-connection.js"
export { SanityKnowledge } from "./sanity-knowledge.js"
export { ExaSearch, ExaSearchError, type ExaSearchResult } from "./exa-search.js"
