# Authority and retention matrix

## Authority levels

Authority is monotonic only inside policy evaluation; it is never inferred from role names or credentials.

| Level | Permitted behavior | Example | Approval |
|---|---|---|---|
| OBSERVE | Read configured local or external state | inspect repository status | task scope and access policy |
| PROPOSE | Produce options and ActionCards | recommend a provider | none beyond OBSERVE |
| DRAFT | Create reversible local draft artifacts | write an unpublished document | mission scope |
| EXECUTE_REVERSIBLE | Change in-scope state with a tested rollback | update a local index | explicit card policy |
| EXECUTE_EXTERNAL | Write or transact in an external system | send, upload, mutate account data | action-time receipt bound to card |
| RELEASE | Publish, submit, deploy or make an artifact public | challenge submission | final human acceptance at G10 |

An ActionCard is executable only when `grantedAuthority` equals or exceeds `requiredAuthority`, the capability mode agrees, and every applicable gate passes. `EXECUTE_EXTERNAL` does not imply `RELEASE`.

## Data and retention

| Class | Maximum retention | Intended content | Allowed data classes | Deletion rule |
|---|---:|---|---|---|
| EPHEMERAL | 0 hours after response | transient provider payload | PUBLIC, INTERNAL, PRIVATE | discard before checkpoint |
| SESSION | 24 hours | bounded working context | PUBLIC, INTERNAL, PRIVATE | automatic expiry |
| PROJECT | 30 days | decisions, source metadata, non-secret drafts | PUBLIC, INTERNAL, PRIVATE | expiry or owner renewal |
| AUDIT | 365 days | digests, approvals, ledger and gate receipts | PUBLIC, INTERNAL; PRIVATE only when required | scheduled deletion with deletion receipt |

`SECRET` values are permitted only transiently inside an approved secret manager integration. They have no CCPPackage retention path. Tokens, passwords, raw authentication headers, MFA values and private keys must never enter logs, ActionCards, evidence notes or checkpoint payloads.

## Purpose and access matrix

| Artifact | Purpose | Writer | Reader | Retention |
|---|---|---|---|---|
| ActionCard | pre-execution review | planner | gate engine, human | PROJECT |
| Ledger entry | immutable transition evidence | mission core | auditor, human | AUDIT |
| KnowledgeRecord | grounded context | approved ingestor | planner | source-specific, capped at PROJECT |
| Approval receipt | prove exact authority | approval service/human workflow | gate engine, auditor | AUDIT |
| CCPPackage | resume/handoff | CCP implementation | mission core, authorized operator | SESSION by default; PROJECT when selected |
| Provider payload | produce one card result | provider adapter | mission core | EPHEMERAL unless minimized into evidence |

## Deletion and legal holds

Deletion creates a receipt containing artifact identifier, digest, reason, timestamp and actor; it must not retain deleted content. A legal or contractual hold is an external policy dependency and must be recorded as `BLOCKED_EXTERNAL` until its owner, scope and expiry are explicit.
