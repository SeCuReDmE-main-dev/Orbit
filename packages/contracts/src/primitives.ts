export type ISO8601 = string;
export type URI = string;
export type Sha256 = `sha256:${string}`;
export type MissionId = `mission_${string}`;
export type ActionCardId = `action_${string}`;
export type CorrelationId = `corr_${string}`;

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue =
  | JSONPrimitive
  | readonly JSONValue[]
  | { readonly [key: string]: JSONValue };

export interface EvidenceRef {
  readonly id: string;
  readonly kind: "source" | "receipt" | "test" | "decision" | "user-input";
  readonly uri?: URI;
  readonly digest?: Sha256;
  readonly observedAt: ISO8601;
  readonly note: string;
}

export type ExternalDependencyState =
  | "READY"
  | "BLOCKED_EXTERNAL"
  | "NOT_APPLICABLE";

export interface ExternalDependency {
  readonly id: string;
  readonly description: string;
  readonly owner: "human" | "provider" | "platform" | "maintainer";
  readonly state: ExternalDependencyState;
  readonly unblockEvidence: string;
}
