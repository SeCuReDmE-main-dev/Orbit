# Threat model

Scope: intent ingestion, mission planning, knowledge retrieval, ActionCard ledger, provider invocation, CCP checkpoints and audit. Production infrastructure is not selected.

## Assets

- user intent and private context;
- provider credentials and approval receipts;
- ActionCard authority and budgets;
- evidence provenance and ledger integrity;
- CCPPackage continuity state;
- external systems reachable through provider capabilities.

## Adversaries and failure sources

- a malicious or compromised external source containing prompt injection;
- a provider returning incorrect, stale or adversarial content;
- a user or process replaying approval against another action;
- an implementation bug escalating authority or exceeding a budget;
- a storage reader obtaining context beyond its retention or data class;
- an operator mistaking simulated output for externally observed state.

## STRIDE controls

| Threat | Example | Preventive control | Detection/evidence | Residual handling |
|---|---|---|---|---|
| Spoofing | forged approval receipt | bind receipt to card ID, content digest, actor and expiry | G3 receipt verification log | deny and create a new card |
| Tampering | edited ledger history | monotonic sequence and SHA-256 hash chain | G6 integrity verification | quarantine package, fail closed |
| Repudiation | provider write denied later | idempotency key, target, request digest and readback receipt | ledger evidence ref | mark unverified unless readback exists |
| Information disclosure | secret copied into CCP | schema/data-class checks; credential references only | secret scan in G7/G9 | delete prohibited payload and rotate exposed secret |
| Denial of service | unbounded agent loop | exact wall time, call, token, retry and storage budgets | usage counters at each boundary | abort and record `BUDGET_EXCEEDED` |
| Elevation of privilege | READ adapter used to write | capability mode and required authority checked independently | G3 capability/authority matrix | deny even with valid credentials |

## Specific abuse cases

### Prompt injection through knowledge

Retrieved text cannot set authority, change gates, choose tools or instruct secret access. The knowledge port labels source, trust, capture time and digest. The planner may cite the content; only local policy controls execution.

### Approval replay

An approval is valid for one immutable ActionCard, target, capability, request digest and expiry. Any field change invalidates it. Approval is never inherited by a retry that changes the request.

### Confused deputy

Provider adapters receive the minimum named capability. Mission context does not imply account scope. A provider must reject targets outside its configured allowlist.

### Context poisoning

CCPPackage validation checks kind, major version, mission ID, timestamps and digest chain. Imported decisions remain evidence until accepted by the active gate evaluation; they cannot silently change current authority.

### Cost exhaustion

All current spend budgets are exactly zero cents. Calls, tokens, wall clock, retries, reads and stored bytes are checked before and after each boundary. Exceeding any dimension aborts the card.

## Security acceptance

G7 passes only when the implementation demonstrates schema rejection, authority denial, approval anti-replay, budget abort, prompt-injection isolation, secret exclusion and CCP integrity failure. Until executable implementations exist, these controls are specified but not runtime-verified.
