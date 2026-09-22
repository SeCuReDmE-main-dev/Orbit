import type { ActionCard, ActionCardLedgerEntry } from "./action-card.js";
import type {
  EvidenceRef,
  ExternalDependency,
  ISO8601,
  MissionId,
} from "./primitives.js";

export type GateId =
  | "G0"
  | "G1"
  | "G2"
  | "G3"
  | "G4"
  | "G5"
  | "G6"
  | "G7"
  | "G8"
  | "G9"
  | "G10";

export interface GateResult {
  readonly gate: GateId;
  readonly verdict: "PASS" | "FAIL" | "BLOCKED_EXTERNAL" | "NOT_APPLICABLE";
  readonly checkedAt: ISO8601;
  readonly criteria: readonly string[];
  readonly evidence: readonly EvidenceRef[];
  readonly unresolved: readonly string[];
}

export interface Mission {
  readonly schemaVersion: "1.0.0";
  readonly id: MissionId;
  readonly objective: string;
  readonly successMetric: string;
  readonly nonGoals: readonly string[];
  readonly state:
    | "PLANNING"
    | "READY"
    | "RUNNING"
    | "BLOCKED_EXTERNAL"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED";
  readonly cards: readonly ActionCard[];
  readonly ledger: readonly ActionCardLedgerEntry[];
  readonly gates: readonly GateResult[];
  readonly externalDependencies: readonly ExternalDependency[];
  readonly createdAt: ISO8601;
  readonly updatedAt: ISO8601;
}

export function gatesPermitExecution(results: readonly GateResult[]): boolean {
  const required: readonly GateId[] = ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"];
  return required.every((gate) => {
    const latest = [...results].reverse().find((result) => result.gate === gate);
    return latest?.verdict === "PASS";
  });
}
