import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePolicyGuard, isAllowedOrigin } from "./policy-guard.ts";

const zero = Object.freeze({
  wallClockMs: 0,
  providerCalls: 0,
  inputTokens: 0,
  outputTokens: 0,
  knowledgeReads: 0,
  bytesStored: 0,
  retries: 0,
  spendUsdCents: 0,
});

const quota = Object.freeze({
  wallClockMs: 1_000,
  providerCalls: 1,
  inputTokens: 100,
  outputTokens: 100,
  knowledgeReads: 2,
  bytesStored: 1_024,
  retries: 0,
  spendUsdCents: 0,
});

const limits = Object.freeze({
  allowedExtensionOrigins: ["chrome-extension://abcdefghijklmnop"],
  allowedToolIds: ["orbit.read"],
  maxBodyBytes: 128,
  maxBodyDepth: 3,
  maxObjectKeys: 4,
  maxArrayItems: 3,
  maxStringBytes: 32,
  maxUntrustedContentBytes: 16,
  quota,
});

const valid = Object.freeze({
  origin: "http://127.0.0.1:4321",
  toolId: "orbit.read",
  body: { query: "storm" },
  untrustedContent: "source text",
  usage: zero,
  requested: { ...zero, providerCalls: 1 },
});

test("allows loopback and an explicitly listed extension origin", () => {
  assert.equal(evaluatePolicyGuard(valid, limits).allowed, true);
  assert.equal(
    evaluatePolicyGuard({ ...valid, origin: "chrome-extension://abcdefghijklmnop" }, limits).allowed,
    true,
  );
  assert.equal(isAllowedOrigin("https://localhost:8443", []), true);
  assert.equal(isAllowedOrigin("http://[::1]:4321", []), true);
});

test("denies missing, remote, path-bearing and unlisted extension origins", () => {
  assert.equal(evaluatePolicyGuard({ ...valid, origin: null }, limits).code, "ORIGIN_MISSING");
  assert.equal(evaluatePolicyGuard({ ...valid, origin: "https://example.com" }, limits).code, "ORIGIN_DENIED");
  assert.equal(evaluatePolicyGuard({ ...valid, origin: "http://localhost:4321/path" }, limits).code, "ORIGIN_DENIED");
  assert.equal(
    evaluatePolicyGuard({ ...valid, origin: "chrome-extension://not-allowed" }, limits).code,
    "ORIGIN_DENIED",
  );
});

test("denies tools outside the explicit allowlist", () => {
  assert.equal(evaluatePolicyGuard({ ...valid, toolId: "orbit.write" }, limits).code, "TOOL_DENIED");
});

test("enforces JSON shape, depth, string and serialized-body bounds", () => {
  assert.equal(
    evaluatePolicyGuard({ ...valid, body: { nested: { too: { deep: { value: true } } } } }, limits).code,
    "BODY_LIMIT_EXCEEDED",
  );
  assert.equal(
    evaluatePolicyGuard({ ...valid, body: { query: "x".repeat(33) } }, limits).code,
    "BODY_LIMIT_EXCEEDED",
  );
  assert.equal(
    evaluatePolicyGuard(
      { ...valid, body: { first: "12345678", second: "12345678" } },
      { ...limits, maxBodyBytes: 20 },
    ).code,
    "BODY_LIMIT_EXCEEDED",
  );
  assert.equal(
    evaluatePolicyGuard({ ...valid, body: JSON.parse('{"__proto__":{"polluted":true}}') }, limits).code,
    "BODY_INVALID",
  );
});

test("rejects projected quota breaches and oversized untrusted content", () => {
  assert.equal(
    evaluatePolicyGuard({ ...valid, requested: { ...zero, providerCalls: 2 } }, limits).code,
    "QUOTA_EXCEEDED",
  );
  assert.equal(
    evaluatePolicyGuard({ ...valid, untrustedContent: "x".repeat(17) }, limits).code,
    "UNTRUSTED_CONTENT_TOO_LARGE",
  );
});
