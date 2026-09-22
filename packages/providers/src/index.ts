import type { Mission } from '@orbit/core'
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

export function createCcpHandoff(mission: Mission): CcpHandoff {
  const createdAt = new Date().toISOString()
  const packageId = `ccp_${mission.id}_${Date.now()}` as CCPPackage['packageId']
  const payload = {
    kind: CCP_PACKAGE_KIND,
    protocol: CCP_PROTOCOL_NAME,
    schemaVersion: CCP_SCHEMA_VERSION,
    packageId,
    missionId: mission.id,
    createdAt,
    producer: { name: 'orbit-companion', version: '0.1.0' },
    context: {
      objective: mission.title,
      constraints: [`budget: ${JSON.stringify(mission.budget)}`, 'read-only handoff'],
      decisions: [],
      openQuestions: [],
    },
    actionCards: [], ledgerTail: [], gates: [], evidence: [],
    externalDependencies: [{ id: 'providers', description: 'Live providers are not configured.', owner: 'human' as const, state: 'BLOCKED_EXTERNAL' as const, unblockEvidence: 'Approved credentials and query scope.' }],
  }
  const contentDigest = `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}` as CCPPackage['integrity']['contentDigest']
  return Object.freeze({ ...payload, integrity: { contentDigest, previousPackageDigest: null }, retention: { class: 'PROJECT' as const, deleteAfter: null } })
}
