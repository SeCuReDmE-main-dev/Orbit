# Architecture decisions

## ADR-001: ActionCard is the unit of work

- Status: accepted
- Decision: every proposed or executed operation is represented by an immutable `ActionCard`; changes create a new card or ledger transition.
- Reason: authority, budget, evidence and expected output become reviewable before execution.
- Consequence: ad hoc provider calls are contract violations.

## ADR-002: Context Continuity Protocol and CCPPackage

- Status: accepted
- Decision: the continuity mechanism is named **Context Continuity Protocol**. Its serialized checkpoint artifact is named **CCPPackage** and begins at schema version `1.0.0`.
- Reason: the protocol and artifact need distinct names so implementations can evolve without renaming persisted evidence.
- Consequence: older packages require an explicit migration; unknown major versions fail closed.

## ADR-003: capability-based providers

- Status: accepted
- Decision: integrations implement `ProviderAdapter` and advertise capability mode (`READ`, `WRITE`, `TRANSACT`) and approval requirements.
- Reason: provider identity alone says nothing about permitted side effects.
- Consequence: unavailable providers are `BLOCKED_EXTERNAL`; no mock result may be presented as observed external state.

## ADR-004: append-only evidence ledger

- Status: accepted
- Decision: ActionCard transitions form a monotonically sequenced, hash-linked ledger.
- Reason: auditability and resumability require an observable history.
- Consequence: corrections append a superseding entry; they do not mutate history.

## ADR-005: exact zero-spend defaults

- Status: accepted
- Decision: the mission ceilings are exactly 9 model calls, 30 minutes, 40 candidate records, 18 claims and depth 2. Every supplied action budget has `spendUsdCents: 0`. External spending needs a separately reviewed budget and human authority.
- Reason: provider costs and accounts are not verified.
- Consequence: a paid call is rejected even if technically available.

## ADR-006: data minimization by retention class

- Status: accepted
- Decision: each record is classified as `EPHEMERAL`, `SESSION`, `PROJECT` or `AUDIT`, with the retention periods in `authority-retention.md`.
- Reason: continuity must not turn into indefinite collection.
- Consequence: SECRET data is never embedded in CCPPackage; use a credential reference managed outside the package.

## ADR-007: gates are fail-closed

- Status: accepted
- Decision: G0-G7 are execution gates, G8-G9 are verification and release-readiness gates, and G10 is human final acceptance.
- Reason: a checklist without blocking semantics cannot enforce authority.
- Consequence: missing evidence is `FAIL` or `BLOCKED_EXTERNAL`, never implicit `PASS`.

## ADR-008: dependency-free contracts

- Status: accepted
- Decision: `@orbit/contracts` contains TypeScript types and small pure predicates only.
- Reason: all runtimes can share the boundary without importing a provider SDK or service implementation.
- Consequence: runtime schema validators may mirror these contracts but must prove compatibility in G2.
