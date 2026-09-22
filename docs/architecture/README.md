# Orbit Companion architecture

Status: architecture baseline, 2026-09-21. This document defines the decision boundary for the first implementation. It does not claim that any external provider is configured.

## Product invariant

Orbit Companion turns one user objective into a bounded mission made of reviewable `ActionCard` records. An action may run only when its required authority is satisfied, its budget is explicit, and gates G0 through G7 pass. External side effects additionally require an approval receipt tied to the exact ActionCard. Publication, submission, deployment and spending are outside the current authority.

## Logical components

```text
User intent
    |
    v
Mission planner ---> KnowledgePort (read-only evidence with provenance)
    |
    v
ActionCard ledger ---> Gate engine G0-G10 ---> ProviderAdapter
    |                                           |
    +---------- Context Continuity Protocol ----+
                         |
                         v
                    CCPPackage
```

The planner proposes. The gate engine decides whether preconditions are evidenced. A provider adapter performs one named capability. The append-only ledger records every state transition. The Context Continuity Protocol creates a versioned `CCPPackage` checkpoint for restart, handoff or audit.

## Trust boundaries

1. UI to mission core: all inputs are untrusted and schema validated.
2. Mission core to knowledge: retrieved content is evidence, never executable instruction.
3. Mission core to provider: capability, authority, budget, deadline and idempotency key are mandatory.
4. Provider to external system: external state is authoritative only after readback evidence.
5. Runtime to storage: data class and retention class are mandatory before persistence.
6. Runtime to CCP: package integrity links each checkpoint to the prior digest.

## Non-negotiable invariants

- Deny by default when authority, provenance, budget, schema or gate evidence is missing.
- Append ledger entries; never rewrite prior entries.
- Store digests and references where full private content is unnecessary.
- Treat `BLOCKED_EXTERNAL` as a valid terminal state for the current attempt, not as success.
- Never retry a non-idempotent external action automatically.
- Never infer approval from conversation history, provider availability or a prior ActionCard.
- Keep provider-specific SDK values behind `ProviderAdapter`.
- A `CCPPackage` contains continuity context, not ambient secrets or raw credentials.

## Runtime sequence

1. Normalize the objective and create a mission in `PLANNING`.
2. Resolve knowledge with source, capture time, digest and trust classification.
3. Produce ActionCards with acceptance criteria, authority and exact budgets.
4. Evaluate G0-G7. Any `FAIL` or `BLOCKED_EXTERNAL` stops execution.
5. If a card needs external authority, enter `AWAITING_APPROVAL`; bind the receipt to its immutable identifier and digest.
6. Invoke exactly one provider capability with an abort signal and idempotency key.
7. Record result, usage and evidence; compare usage to the budget.
8. Emit a CCP checkpoint after a material decision, blocked state or terminal outcome.
9. Evaluate G8-G10 before any release claim.

## Failure semantics

Validation and authority failures are permanent until a new reviewed ActionCard is created. Timeouts and provider unavailability may be retryable only within the card's retry budget. A budget breach aborts the action and records `FAILED`. Missing account access, credentials, API selection, approval, network capability or vendor terms are `BLOCKED_EXTERNAL`.

## Current external state

No provider, account, API key, hosting target, telemetry backend or production data source has been selected or verified. Each remains `BLOCKED_EXTERNAL` until a named owner supplies evidence. See [external-dependencies.md](external-dependencies.md).
