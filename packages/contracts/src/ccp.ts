import type { ActionCard, ActionCardLedgerEntry } from "./action-card.js";
import type { GateResult } from "./mission.js";
import type {
  EvidenceRef,
  ExternalDependency,
  ISO8601,
  MissionId,
  Sha256,
} from "./primitives.js";

export const CCP_PROTOCOL_NAME = "Context Continuity Protocol" as const;
export const CCP_PACKAGE_KIND = "CCPPackage" as const;
export const CCP_SCHEMA_VERSION = "1.0.0" as const;

export interface CCPPackage {
  readonly kind: typeof CCP_PACKAGE_KIND;
  readonly protocol: typeof CCP_PROTOCOL_NAME;
  readonly schemaVersion: typeof CCP_SCHEMA_VERSION;
  readonly packageId: `ccp_${string}`;
  readonly missionId: MissionId;
  readonly createdAt: ISO8601;
  readonly producer: {
    readonly name: string;
    readonly version: string;
  };
  readonly context: {
    readonly objective: string;
    readonly constraints: readonly string[];
    readonly decisions: readonly string[];
    readonly openQuestions: readonly string[];
  };
  readonly actionCards: readonly ActionCard[];
  readonly ledgerTail: readonly ActionCardLedgerEntry[];
  readonly gates: readonly GateResult[];
  readonly evidence: readonly EvidenceRef[];
  readonly externalDependencies: readonly ExternalDependency[];
  readonly integrity: {
    readonly contentDigest: Sha256;
    readonly previousPackageDigest: Sha256 | null;
  };
  readonly retention: {
    readonly class: "EPHEMERAL" | "SESSION" | "PROJECT" | "AUDIT";
    readonly deleteAfter: ISO8601 | null;
  };
}

export interface CCPMigration<TFrom, TTo> {
  readonly from: string;
  readonly to: string;
  migrate(value: TFrom): TTo;
}

export function isCCPPackage(value: unknown): value is CCPPackage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.kind === CCP_PACKAGE_KIND &&
    candidate.protocol === CCP_PROTOCOL_NAME &&
    candidate.schemaVersion === CCP_SCHEMA_VERSION &&
    typeof candidate.packageId === "string" &&
    typeof candidate.missionId === "string" &&
    typeof candidate.createdAt === "string"
  );
}
