import type { ActionBudget } from "./action-card.js";
import type {
  CorrelationId,
  EvidenceRef,
  ISO8601,
  JSONValue,
} from "./primitives.js";

export interface ProviderCapability {
  readonly id: string;
  readonly mode: "READ" | "WRITE" | "TRANSACT";
  readonly requiresHumanApproval: boolean;
  readonly dataClasses: readonly ("PUBLIC" | "INTERNAL" | "PRIVATE" | "SECRET")[];
}

export interface ProviderDescriptor {
  readonly id: string;
  readonly contractVersion: "1.0.0";
  readonly displayName: string;
  readonly capabilities: readonly ProviderCapability[];
  readonly dataResidency: readonly string[];
  readonly status: "AVAILABLE" | "DEGRADED" | "BLOCKED_EXTERNAL";
}

export interface ProviderRequest<TInput extends JSONValue = JSONValue> {
  readonly correlationId: CorrelationId;
  readonly capabilityId: string;
  readonly input: TInput;
  readonly budget: ActionBudget;
  readonly deadline: ISO8601;
  readonly idempotencyKey: string;
  readonly approvalReceiptId?: string;
}

export type ProviderResult<TOutput extends JSONValue = JSONValue> =
  | {
      readonly ok: true;
      readonly output: TOutput;
      readonly evidence: readonly EvidenceRef[];
      readonly usage: ProviderUsage;
    }
  | {
      readonly ok: false;
      readonly code:
        | "INVALID_REQUEST"
        | "AUTHORITY_DENIED"
        | "BUDGET_EXCEEDED"
        | "TIMEOUT"
        | "UNAVAILABLE"
        | "BLOCKED_EXTERNAL"
        | "PROVIDER_ERROR";
      readonly retryable: boolean;
      readonly message: string;
      readonly evidence: readonly EvidenceRef[];
      readonly usage: ProviderUsage;
    };

export interface ProviderUsage {
  readonly calls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly wallClockMs: number;
  readonly spendUsdCents: number;
}

export interface ProviderAdapter {
  describe(): Promise<ProviderDescriptor>;
  invoke<TInput extends JSONValue, TOutput extends JSONValue>(
    request: ProviderRequest<TInput>,
    signal: AbortSignal,
  ): Promise<ProviderResult<TOutput>>;
}
