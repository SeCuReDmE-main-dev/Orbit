import type { ActionBudget } from "./action-card.js";

export interface PolicyGuardLimits {
  readonly allowedExtensionOrigins: readonly string[];
  readonly allowedToolIds: readonly string[];
  readonly maxBodyBytes: number;
  readonly maxBodyDepth: number;
  readonly maxObjectKeys: number;
  readonly maxArrayItems: number;
  readonly maxStringBytes: number;
  readonly maxUntrustedContentBytes: number;
  readonly quota: ActionBudget;
}

export interface PolicyGuardRequest {
  readonly origin: string | null;
  readonly toolId: string;
  readonly body: unknown;
  readonly untrustedContent: string;
  readonly usage: ActionBudget;
  readonly requested: ActionBudget;
}

export type PolicyGuardDenialCode =
  | "ORIGIN_MISSING"
  | "ORIGIN_DENIED"
  | "TOOL_DENIED"
  | "BODY_INVALID"
  | "BODY_LIMIT_EXCEEDED"
  | "QUOTA_EXCEEDED"
  | "UNTRUSTED_CONTENT_TOO_LARGE";

export type PolicyGuardDecision =
  | Readonly<{ allowed: true }>
  | Readonly<{
      allowed: false;
      code: PolicyGuardDenialCode;
      detail: string;
    }>;

const BUDGET_KEYS: readonly (keyof ActionBudget)[] = [
  "wallClockMs",
  "providerCalls",
  "inputTokens",
  "outputTokens",
  "knowledgeReads",
  "bytesStored",
  "retries",
  "spendUsdCents",
];

const PROHIBITED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function evaluatePolicyGuard(
  request: PolicyGuardRequest,
  limits: PolicyGuardLimits,
): PolicyGuardDecision {
  const limitError = validateLimits(limits);
  if (limitError) return deny("BODY_INVALID", limitError);

  if (request.origin === null || request.origin.trim() === "") {
    return deny("ORIGIN_MISSING", "A concrete request origin is required.");
  }
  if (!isAllowedOrigin(request.origin, limits.allowedExtensionOrigins)) {
    return deny("ORIGIN_DENIED", "The request origin is neither loopback nor an explicitly allowed extension origin.");
  }
  if (!limits.allowedToolIds.includes(request.toolId)) {
    return deny("TOOL_DENIED", `Tool is not allowlisted: ${request.toolId}`);
  }

  const bodyDecision = validateBody(request.body, limits);
  if (!bodyDecision.allowed) return bodyDecision;

  if (utf8Bytes(request.untrustedContent) > limits.maxUntrustedContentBytes) {
    return deny(
      "UNTRUSTED_CONTENT_TOO_LARGE",
      `Untrusted content exceeds ${limits.maxUntrustedContentBytes} UTF-8 bytes.`,
    );
  }

  for (const key of BUDGET_KEYS) {
    const used = request.usage[key];
    const requested = request.requested[key];
    const quota = limits.quota[key];
    if (![used, requested, quota].every(isNonNegativeFiniteNumber)) {
      return deny("QUOTA_EXCEEDED", `Budget dimension ${key} is invalid.`);
    }
    if (used + requested > quota) {
      return deny("QUOTA_EXCEEDED", `Budget dimension ${key} would exceed its quota.`);
    }
  }

  return Object.freeze({ allowed: true });
}

export function isAllowedOrigin(
  origin: string,
  allowedExtensionOrigins: readonly string[],
): boolean {
  const parsed = parseOrigin(origin);
  if (!parsed) return false;

  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
    return isLoopbackHost(parsed.hostname);
  }

  if (parsed.protocol !== "chrome-extension:" && parsed.protocol !== "moz-extension:") {
    return false;
  }

  const normalized = normalizeExtensionOrigin(origin);
  return (
    normalized !== null &&
    allowedExtensionOrigins.some((allowed) => normalizeExtensionOrigin(allowed) === normalized)
  );
}

function validateBody(body: unknown, limits: PolicyGuardLimits): PolicyGuardDecision {
  const structuralError = inspectJsonValue(body, limits, 0, new Set<object>());
  if (structuralError) return deny(structuralError.code, structuralError.detail);

  let serialized: string;
  try {
    serialized = JSON.stringify(body);
  } catch {
    return deny("BODY_INVALID", "Request body is not JSON serializable.");
  }

  if (serialized === undefined) {
    return deny("BODY_INVALID", "Request body must be a JSON value.");
  }
  if (utf8Bytes(serialized) > limits.maxBodyBytes) {
    return deny("BODY_LIMIT_EXCEEDED", `Serialized request body exceeds ${limits.maxBodyBytes} UTF-8 bytes.`);
  }
  return Object.freeze({ allowed: true });
}

function inspectJsonValue(
  value: unknown,
  limits: PolicyGuardLimits,
  depth: number,
  ancestors: Set<object>,
): { code: "BODY_INVALID" | "BODY_LIMIT_EXCEEDED"; detail: string } | null {
  if (depth > limits.maxBodyDepth) {
    return { code: "BODY_LIMIT_EXCEEDED", detail: `Request body exceeds depth ${limits.maxBodyDepth}.` };
  }
  if (value === null || typeof value === "boolean") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? null : { code: "BODY_INVALID", detail: "Request body contains a non-finite number." };
  }
  if (typeof value === "string") {
    return utf8Bytes(value) <= limits.maxStringBytes
      ? null
      : { code: "BODY_LIMIT_EXCEEDED", detail: `A string exceeds ${limits.maxStringBytes} UTF-8 bytes.` };
  }
  if (typeof value !== "object") {
    return { code: "BODY_INVALID", detail: "Request body contains a non-JSON value." };
  }

  if (ancestors.has(value)) {
    return { code: "BODY_INVALID", detail: "Request body contains a cycle." };
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length > limits.maxArrayItems) {
        return { code: "BODY_LIMIT_EXCEEDED", detail: `An array exceeds ${limits.maxArrayItems} items.` };
      }
      for (const item of value) {
        const error = inspectJsonValue(item, limits, depth + 1, ancestors);
        if (error) return error;
      }
      return null;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return { code: "BODY_INVALID", detail: "Request body contains a non-plain object." };
    }
    const keys = Object.keys(value);
    if (keys.length > limits.maxObjectKeys) {
      return { code: "BODY_LIMIT_EXCEEDED", detail: `An object exceeds ${limits.maxObjectKeys} keys.` };
    }
    for (const key of keys) {
      if (PROHIBITED_KEYS.has(key)) {
        return { code: "BODY_INVALID", detail: `Request body contains a prohibited key: ${key}.` };
      }
      const error = inspectJsonValue((value as Record<string, unknown>)[key], limits, depth + 1, ancestors);
      if (error) return error;
    }
    return null;
  } finally {
    ancestors.delete(value);
  }
}

function parseOrigin(origin: string): URL | null {
  try {
    const parsed = new URL(origin);
    const isOriginPath = parsed.pathname === "/" || parsed.pathname === "";
    if (parsed.username || parsed.password || parsed.search || parsed.hash || !isOriginPath) return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeExtensionOrigin(origin: string): string | null {
  const parsed = parseOrigin(origin);
  if (!parsed || (parsed.protocol !== "chrome-extension:" && parsed.protocol !== "moz-extension:")) return null;
  return `${parsed.protocol}//${parsed.host}`;
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]";
}

function validateLimits(limits: PolicyGuardLimits): string | null {
  const scalarLimits = [
    limits.maxBodyBytes,
    limits.maxBodyDepth,
    limits.maxObjectKeys,
    limits.maxArrayItems,
    limits.maxStringBytes,
    limits.maxUntrustedContentBytes,
  ];
  return scalarLimits.every(isNonNegativeFiniteNumber) ? null : "Policy limits must be finite non-negative numbers.";
}

function isNonNegativeFiniteNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function deny(code: PolicyGuardDenialCode, detail: string): PolicyGuardDecision {
  return Object.freeze({ allowed: false, code, detail });
}
