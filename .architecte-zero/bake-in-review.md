---
schema_version: architecte-zero.bake-in/v1
project: Orbit Companion
singularity: scientific question to sourced and resumable research
stack_reference: package.json; studio; web; services/broker; packages
reviewed_at: 2026-09-25
review_owner: coordinator
review_scope: architecture requirements, not release certification
overall_verdict: ready
lanes:
  security: {applicability: required, verdict: ready}
  webmcp: {applicability: required, verdict: ready}
  memory: {applicability: required, verdict: ready}
release_verdict: hold
---
# Bake-In — implementation contract

## Approved redesign amendment — 27 September 2026

Architecture requirements are settled by `docs/delivery-2026-09-27/IMPLEMENTATION.md`; release remains hold. A same-origin public identity/sync service is separate from the loopback broker. Google/GitHub/email-code login creates an Orbit account, not provider authorization. Private cloud records are session-owner scoped. Device research persistence requires a separate opt-in and account-scoped IndexedDB; anonymous legacy data requires an explicit import. Essential auth cookies are separate from research storage consent. Sync uses revisions, idempotency and preserved conflicts. Synthia appearance is an independent renderer with no conversation, credential or backend authority. Education is read-only. Revoke WebMCP/page/voice grants at logout and identity changes. Verify server-side access, CSRF, expiry, isolation, no unauthorized persistence and no provider credential transfer before release. Q5 is amended from local-only SQLite authority to private cloud workspace revisions plus opt-in device cache; broker SQLite remains local execution storage. Q6 and Q9 include user identity, consent and synchronization lifecycle.

The approved master plan supplies the goal and stack. Ready means the requirements below are settled so implementation may proceed. It does not certify implementation or authorize bypassing a failed test. Release remains hold until its acceptance tests are observed passing. The previous architecture-only review is preserved in the private backup.

## Security
Owner: coordinator and Terra. Evidence status: inferred from inspected broker/UI and approved plan; tests to_test.
Local broker binds loopback only. Validate Host and exact allowed extension Origin. Root write credential remains server-side and must never appear in logs, DOM, public bundle or localStorage. Human pairing uses a separate cryptographically random, single-use five-minute code; a revocable one-hour opaque session grants only mission/source/checkpoint capabilities. Bind session to extension origin and explicit mission scope; a newly created mission belongs to that session. Reads of private mission data also require authority. Reject unknown routes, excess bodies, invalid schemas, expired/replayed credentials and cross-mission access. No automatic external tool approval, no paid fallback. Web content cannot grant permissions. Public site contains no credentials. Settings/cPanel execute from Orbit's own environment. Deployment authority is limited to orbit.securedme.ca, with backup and rollback.
Expected tests: origin/Host, pairing replay/expiry, revocation, mission isolation, bounds, secret absence, restart/reassociation and persisted data. Re-review: a new provider, origin, write tool, public-data flow or credential mechanism.

## WebMCP
Owner: Terra; evidence: existing browser registration reported, client/agent invocation still to_test. Required because a companion reads an explicitly selected mission. Five read-only tools expose mission summary, research points, source records and simulation snapshot. Strict bounded schemas, pagination, provenance and AbortSignal; session-scoped references invalidated on mission switch/reconstruction. Explicit consent and revocation. Saved sources are not fetched content. No global mission enumeration. Feature absence has a visible unavailable state; no fake client success.
Expected tests: unauthorized mission/reference, pagination boundaries, cancellation, revoke; separate registration, callback, client discovery and agent invocation receipts. Re-review: writes, iframe/client or browser support changes.

## Memory and CCP — nine canonical answers
| ID | Answer | Evidence / status | Owner | Expected test | Review trigger |
|---|---|---|---|---|---|
| Q1 | Preserve goal, scope, 9 topics and 30 angles, source provenance, decisions, unknowns, counters, permissions, physics state and next action for the same learner's interrupted mission. | approved plan; inferred | coordinator | pause/F5/crash roundtrip | new actor |
| Q2 | Deterministic capture in broker on accepted operation; checkpoint at pause, provider switch and user request. Model extraction is optional and never implicit. IngestEvents/GenerateMemories describe patterns, not implemented Google endpoints. | broker/store inspection; observed, extension binding to_test | Terra | idempotent event and checkpoint | extraction added |
| Q3 | Record provenance, observation time and verification status. Unknown source content stays hold for factual assertions; reject malformed/out-of-scope input. Preserve audit entries outside operational factual package. Never fabricate T/I/F probabilities; optional triplets are independent [0,1] with documented scoring evidence. | approved memory contract; inferred | coordinator | no held assertion promoted to fact | scorer changes |
| Q4 | One source receipt, decision, research point or physics snapshot is sufficient. Binary validation plus explicit unknown status is baseline; no claim that a 1x3 or Nx3/NxN mathematical engine exists in Orbit. If projections are later introduced, retain original scores, relations, rule and evidence receipt. | core/contracts; inferred | coordinator | schema/unknown retention | multimodal scoring |
| Q5 | SQLite is authoritative mission/event/checkpoint memory; browser localStorage is untrusted draft cache only. Public Sanity corpus is shared reference material, not personal conversation memory. Portable CCP is an export artifact. | existing store and approved plan; observed/inferred | Terra | restore SQLite to fresh session | storage change |
| Q6 | Temporary pairing and session capabilities; user-owned local mission scope. No implicit promotion to application/public corpus. Provider transfer requires selected destination and preview. Secrets are never memory. | approved plan; inferred | coordinator | isolation and denied promotion | sharing feature |
| Q7 | Assign mission, event, source and checkpoint IDs, normalized URI, timestamps, sequence, content hash, scope and verification state at ingestion. Retrieve deterministically by mission and ID before invoking model. | store/core; implementation partial observed | Terra | dedupe and ordered restore | index changes |
| Q8 | Assemble bounded explicit task state with references, counters and unknowns. No raw conversation or provider credential transfer. Protocol is Context Continuity Protocol; CCPPackage is versioned artifact. Validate recipient capabilities/version; exact model or explicit unavailable. | provider helper inspected; partial observed | coordinator | six directed transfers, no silent fallback | provider version |
| Q9 | Expire/revoke auth; invalidate stale references; preserve conflicting evidence; checkpoint before interruption. Compare same-input baseline on bytes, latency, calls and recovery fidelity. No token/billing claim without actual measurement. Offline fixtures do not prove live interoperability. | approved plan; to_test | coordinator | crash/restart/corrupt package/version checks | data/model change |

## Holds and next action
No unresolved architecture choice blocks implementation of these controls. External cPanel 403, missing provider integration and Sanity Knowledge Base evidence block their release claims. Overall release remains hold. Any failed safety test blocks the affected integration. Authorized next stage: implement and validate this contract, then review evidence before deployment.

## Holographic companion amendment — 25 September
User authorized voice, explicit page capture and a research companion. New browser workspace sharing is off by default and revocable; presentation requires the current request ID. `orbit_present_research` mutates only the local display/draft; `orbit_search_web` requires separate Exa-consumption consent. No external page may grant its own permissions. Active-tab capture is user-triggered, bounded to 12000 visible characters, excluding form values. Voice requires explicit browser controls; speech providers may process audio/text. Local research remains loopback authenticated, maximum six Exa calls per pass under the persisted mission limit of eighteen. Exa excerpts are not verified full-page readings. No public model credentials or server-side execution added. Release verification of the real extension, microphone and full research run remains pending.
