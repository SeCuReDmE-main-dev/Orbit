import type {
  EvidenceRef,
  ISO8601,
  JSONValue,
  Sha256,
  URI,
} from "./primitives.js";

export type KnowledgeTrust = "PRIMARY" | "SECONDARY" | "USER_SUPPLIED" | "INFERRED";

export interface KnowledgeRecord {
  readonly id: string;
  readonly schemaVersion: "1.0.0";
  readonly title: string;
  readonly sourceUri: URI;
  readonly contentDigest: Sha256;
  readonly trust: KnowledgeTrust;
  readonly capturedAt: ISO8601;
  readonly validUntil?: ISO8601;
  readonly dataClass: "PUBLIC" | "INTERNAL" | "PRIVATE" | "SECRET";
  readonly retentionClass: "EPHEMERAL" | "SESSION" | "PROJECT" | "AUDIT";
  readonly payload: JSONValue;
}

export interface KnowledgeQuery {
  readonly text: string;
  readonly limit: number;
  readonly asOf: ISO8601;
  readonly minimumTrust: KnowledgeTrust;
  readonly allowedDataClasses: readonly KnowledgeRecord["dataClass"][];
}

export interface KnowledgeHit {
  readonly record: KnowledgeRecord;
  readonly score: number;
  readonly explanation: string;
  readonly evidence: readonly EvidenceRef[];
}

export interface KnowledgePort {
  query(request: KnowledgeQuery, signal: AbortSignal): Promise<readonly KnowledgeHit[]>;
  get(id: string, signal: AbortSignal): Promise<KnowledgeRecord | null>;
}
