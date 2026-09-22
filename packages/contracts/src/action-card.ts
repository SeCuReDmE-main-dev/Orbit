import type {
  ActionCardId,
  CorrelationId,
  EvidenceRef,
  ISO8601,
  JSONValue,
  MissionId,
  Sha256,
} from "./primitives.js";

export type ActionCardStatus =
  | "DRAFT"
  | "READY"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "BLOCKED_EXTERNAL"
  | "CANCELLED";

export type AuthorityLevel =
  | "OBSERVE"
  | "PROPOSE"
  | "DRAFT"
  | "EXECUTE_REVERSIBLE"
  | "EXECUTE_EXTERNAL"
  | "RELEASE";

export const ACTION_CARD_TRANSITIONS = {
  DRAFT: ["READY", "CANCELLED"],
  READY: ["AWAITING_APPROVAL", "RUNNING", "BLOCKED_EXTERNAL", "CANCELLED"],
  AWAITING_APPROVAL: ["APPROVED", "CANCELLED", "BLOCKED_EXTERNAL"],
  APPROVED: ["RUNNING", "CANCELLED", "BLOCKED_EXTERNAL"],
  RUNNING: ["SUCCEEDED", "FAILED", "BLOCKED_EXTERNAL", "CANCELLED"],
  SUCCEEDED: [],
  FAILED: [],
  BLOCKED_EXTERNAL: ["READY", "CANCELLED"],
  CANCELLED: [],
} as const satisfies Record<ActionCardStatus, readonly ActionCardStatus[]>;

export interface ActionBudget {
  readonly wallClockMs: number;
  readonly providerCalls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly knowledgeReads: number;
  readonly bytesStored: number;
  readonly retries: number;
  readonly spendUsdCents: number;
}

export interface ActionCard {
  readonly schemaVersion: "1.0.0";
  readonly id: ActionCardId;
  readonly missionId: MissionId;
  readonly correlationId: CorrelationId;
  readonly title: string;
  readonly intent: string;
  readonly input: JSONValue;
  readonly expectedOutput: string;
  readonly acceptanceCriteria: readonly string[];
  readonly requiredAuthority: AuthorityLevel;
  readonly grantedAuthority: AuthorityLevel;
  readonly risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly reversible: boolean;
  readonly status: ActionCardStatus;
  readonly budget: ActionBudget;
  readonly createdAt: ISO8601;
  readonly expiresAt: ISO8601;
  readonly evidence: readonly EvidenceRef[];
  readonly dependsOn: readonly ActionCardId[];
}

export interface ActionCardLedgerEntry {
  readonly sequence: number;
  readonly cardId: ActionCardId;
  readonly missionId: MissionId;
  readonly from: ActionCardStatus | "NONE";
  readonly to: ActionCardStatus;
  readonly reason: string;
  readonly actor: "human" | "orbit" | "provider" | "system";
  readonly at: ISO8601;
  readonly evidence: readonly EvidenceRef[];
  readonly previousHash: Sha256 | null;
  readonly hash: Sha256;
}

export function canTransition(
  from: ActionCardStatus,
  to: ActionCardStatus,
): boolean {
  return (ACTION_CARD_TRANSITIONS[from] as readonly ActionCardStatus[]).includes(to);
}

export function authoritySatisfies(
  granted: AuthorityLevel,
  required: AuthorityLevel,
): boolean {
  const order: readonly AuthorityLevel[] = [
    "OBSERVE",
    "PROPOSE",
    "DRAFT",
    "EXECUTE_REVERSIBLE",
    "EXECUTE_EXTERNAL",
    "RELEASE",
  ];
  return order.indexOf(granted) >= order.indexOf(required);
}
