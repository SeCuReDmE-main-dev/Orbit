# Orbit Companion — truthful coverage of A01-A88

Snapshot: 2026-09-21. Statuses describe evidence in this repository, not effort spent. `PASS_LOCAL` does not imply a live provider, deployed service, browser invocation or challenge submission.

| Phase | Action | Status | Evidence or missing condition |
|---|---:|---|---|
| Governance | A01 | PASS_LOCAL | one unborn Git root; sibling inventory recorded |
| Governance | A02 | PASS_LOCAL | root npm workspaces; no nested Git root |
| Governance | A03 | PARTIAL | dated official-source register exists; challenge eligibility still needs final human reread |
| Governance | A04 | PARTIAL | local reuse/licence register started, not exhaustive |
| Governance | A05 | PASS_LOCAL | NASA, Sanity, Exa and provider source register |
| Governance | A06 | PASS_LOCAL | singularity and exclusions in architecture docs |
| Stack | A07 | PASS_LOCAL | component boundaries documented |
| Stack | A08 | PASS_LOCAL | static Astro build; no inline or remote runtime script |
| Stack | A09 | BLOCKED_EXTERNAL | no live Codex app-server/model proof |
| Stack | A10 | BLOCKED_EXTERNAL | no live `agy`/model proof |
| Stack | A11 | PARTIAL / BLOCKED_EXTERNAL | WebMCP tools were discovered and two were invoked by a compatible localhost client; Knowledge Base, Context MCP, Exa OAuth and extension-hosted discovery remain unverified |
| Stack | A12 | PASS_LOCAL | Bake-In review and CCP questions documented |
| Stack | A13 | PASS_LOCAL | authority, retention and zero-spend boundaries |
| Stack | A14 | PARTIAL | major states specified; complete interactive wireframes absent |
| Stack | A15 | PARTIAL | G1 criteria exist; full dependent stack is not yet green |
| Sanity | A16 | BLOCKED_EXTERNAL | written exercise exists; authenticated manual publish/GROQ not executed |
| Sanity | A17 | PARTIAL | four-item public NASA fixture, not final corpus |
| Sanity | A18 | PASS_LOCAL | standalone Studio config/schema build and separate Astro build pass; remote readback remains blocked |
| Sanity | A19 | PASS_LOCAL | six schema types extract and build |
| Sanity | A20 | NOT_IMPLEMENTED | deterministic importer absent |
| Sanity | A21 | BLOCKED_EXTERNAL | Knowledge Base lifecycle not configured |
| Sanity | A22 | BLOCKED_EXTERNAL | Context MCP endpoint not verified |
| Sanity | A23 | PARTIAL | benchmark protocol exists; final paired questions/results absent |
| Sanity | A24 | NOT_PASSED | no measured structured-search value result |
| Core | A25 | PARTIAL | core mission/provider/CCP DTOs exist; full research DTO set incomplete |
| Core | A26 | PASS_LOCAL | 9/30/40/18/depth-2 budget contract |
| Core | A27 | PASS_LOCAL | contradiction and source-status fixtures |
| Core | A28 | PASS_LOCAL | loopback broker health and lifecycle tested |
| Core | A29 | PASS_LOCAL | two versioned SQLite migrations, backup and transactional down rollback are tested |
| Core | A30 | PASS_LOCAL | mission/checkpoint and typed source/proof/decision receipts round-trip locally |
| Core | A31 | PARTIAL | deterministic HTTP(S) normalization, tracking removal and deduplication pass; active-page capture remains absent |
| Core | A32 | PARTIAL | pure deterministic depth/call-bounded scheduler passes; persistent dispatch/restart remains absent |
| Core | A33 | BLOCKED_EXTERNAL | Exa adapter/OAuth/cache/retry behavior absent |
| Core | A34 | NOT_PASSED | deterministic reference incomplete |
| Providers | A35 | PASS_LOCAL | versioned provider/knowledge/store interfaces |
| Providers | A36 | NOT_IMPLEMENTED | Codex JSON-RPC bridge absent |
| Providers | A37 | BLOCKED_EXTERNAL | Codex auth/model/limits unverified |
| Providers | A38 | NOT_IMPLEMENTED | persistent `agy` process absent |
| Providers | A39 | BLOCKED_EXTERNAL | Antigravity auth/model/tools unverified |
| Providers | A40 | PARTIAL | stable fail-closed result codes exist; timeout/crash/soft-denial runtime incomplete |
| Providers | A41 | PARTIAL | setup guide exists; deterministic live traces absent |
| Providers | A42 | PASS_BY_CONTRACT | architecture requires broker passage; no live provider path exists to bypass it |
| Providers | A43 | PASS_BY_CONTRACT | versioned CCP package with explicit payload, integrity and retention |
| Providers | A44 | NOT_PASSED | two-provider evidence absent |
| Security | A45 | PASS_LOCAL | threat model covers named surfaces |
| Security | A46 | PASS_LOCAL | origin/capability/authority matrix documented |
| Security | A47 | PASS_LOCAL | retention/export/deletion scope documented |
| Security | A48 | PASS_LOCAL | dependency-free fail-closed origin/tool/body/quota/untrusted-content guard; transport wiring remains future work |
| Security | A49 | PASS_LOCAL | licence, NASA attribution, privacy and AI disclosure register |
| Security | A50 | NOT_PASSED | adversarial runtime suite absent |
| Frontend | A51 | PASS_LOCAL | Astro static shell builds |
| Frontend | A52 | PARTIAL | MV3 side-panel manifest and worker build; unpacked-load observation pending |
| Frontend | A53 | NOT_IMPLEMENTED | ephemeral-token loopback bridge absent |
| Frontend | A54 | NOT_IMPLEMENTED | clarification/plan workflow absent |
| Frontend | A55 | NOT_IMPLEMENTED | 39-point coverage UI absent |
| Frontend | A56 | PARTIAL | external block states visible; dynamic identity/limits absent |
| Frontend | A57 | PARTIAL | explicit unavailable state present; full pause/cancel/resume/offline UX absent |
| Frontend | A58 | PARTIAL | accessibility guidance and baseline semantics exist; full audit absent |
| Frontend | A59 | NOT_PASSED | browser/accessibility gate pending |
| Physics | A60 | NOT_IMPLEMENTED | scientific constants/units/tolerances not frozen |
| Physics | A61 | PASS_LOCAL | predict-observe-explain lesson and limitations |
| Physics | A62 | NOT_IMPLEMENTED | current visual is angular, not Newtonian gravity |
| Physics | A63 | PARTIAL | fixed-step determinism and stalled-frame cap tested; orbit/collision/escape tests absent |
| Physics | A64 | PASS_LOCAL | local Three.js scene builds with no remote runtime asset |
| Physics | A65 | NOT_IMPLEMENTED | controls and telemetry absent |
| Physics | A66 | PASS_LOCAL | page lifecycle cancels animation and disposes GPU resources |
| Physics | A67 | PARTIAL | canvas label and reduced hidden-page work; text/2D alternative absent |
| Physics | A68 | NOT_IMPLEMENTED | experiment serialization absent |
| Physics | A69 | NOT_PASSED | scientific gate pending |
| Continuity | A70 | PASS_BY_CONTRACT | versioned `CCPPackage` contract and offline constructor |
| Continuity | A71 | NOT_IMPLEMENTED | F5/crash checkpoint restoration absent |
| Continuity | A72 | NOT_IMPLEMENTED | idempotent pause/cancel/resume absent |
| Continuity | A73 | NOT_IMPLEMENTED | real provider-switch handoff absent |
| Continuity | A74 | PASS_LOCAL | compatible localhost client discovered all five tools and invoked two; research/source persistence remains incomplete |
| Continuity | A75 | PASS_LOCAL | complete synthetic handoff example and learner guidance |
| Continuity | A76 | PARTIAL | minimization rules documented; runtime package audit absent |
| Continuity | A77 | NOT_PASSED | continuity E2E pending |
| Delivery | A78 | PARTIAL | judge runbook and public fixtures exist; clean-machine replay absent |
| Delivery | A79 | NOT_IMPLEMENTED | complete bootstrap/launcher absent |
| Delivery | A80 | PARTIAL | unpacked MV3 directory, ZIP and SHA-256 exist; browser demo remains unobserved |
| Delivery | A81 | PARTIAL | broker persistence works; migration backup/restore package absent |
| Delivery | A82 | BLOCKED_EXTERNAL | no paired-provider/Sanity/Exa/WebMCP E2E benchmark |
| Delivery | A83 | NOT_PASSED | release candidate gate pending |
| Docs | A84 | PARTIAL | root README/HUMAN and architecture docs exist; full code/API reference incomplete |
| Docs | A85 | PARTIAL | video storyboard, judge runbook and evidence structure are drafts |
| Docs | A86 | PARTIAL | English DEV draft exists and is explicitly unverified/unpublished |
| Docs | A87 | PARTIAL | final-audit template and this coverage exist; release audit cannot pass yet |
| Scaffold | A88 | PASS_LOCAL | see `docs/receipts/A88-SCAFFOLD-RECEIPT.md` |

Counts are intentionally not converted into a completion percentage: a provider gate, security guard or continuity E2E carries more release risk than several documentation cards. The next critical path is A16/A20-A24, then A29-A34, not polishing the submission draft.
