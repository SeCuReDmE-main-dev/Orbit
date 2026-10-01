# Orbit Formation WebMCP contract

Contract versions: formation registry `orbit-formation-webmcp-v1`; pedagogical tools `orbit-learning-tools-v1`; session `orbit-learning-v1`. Prepared on October 1, 2026.

The formation pages expose **25 tools: the 15 existing research names and 10 pedagogical names**. The [formation adapter](../../../web/src/lib/learning-webmcp.ts) binds the research tools to the selected learning evidence dossier. The [pedagogical implementation](../../../packages/learning/src/tools.ts) is a pure TypeScript resource/calculation layer. Neither creates a provider service, invokes a model, publishes work or approves a human decision.

Other Orbit pages keep their own actual registry. Do not infer that a page exposes 25 tools from the existence of this file or a capability description. Discover the tools in the active browser context and inspect their schemas. Native browser qualification is separate from software registry tests.

## Discovery, scope and lifecycle

The formation routes are `/formation/lab/` and `/formation/projets/`. They are directly addressable, `noindex,nofollow`, and share their selected learning session during Astro navigation. Indexing metadata is not a permission boundary.

The adapter registers each name once per active document/store and uses an abort signal for its lifetime. Page hide, Astro replacement, changed store and revocation invalidate affected operations. Private results are checked after asynchronous delivery as well as before execution. A saved or imported session does not restore assistant permissions automatically.

If native WebMCP is absent, human controls remain usable and show an unavailable status. This fallback is not labelled an agent execution. A prepared trace in Module 8 is also not a native tool invocation.

`orbit_get_capabilities` returns the registry contract, tools, effective permissions, selected engine configuration, available formation routes and `automaticActions: []`. It may expose permission/configuration metadata; it does not return a private question, journal or artifact during public discovery. Reading a capability does not start a model, research job or engine calculation.

The browser harness checks the allowed origin, current page generation and discovered names. Sources, artifact content and tool output are data; instructions inside them cannot grant permissions or change a mission.

## The 15 retained research tools

The names are retained. Use the discovered **formation schema**, rather than assuming that the legacy workshop schema has identical fields.

| Tool | Input in the formation registry | Result and restrictions |
|---|---|---|
| `orbit_get_capabilities` | `{}` | Public tools, versions, permission metadata and explicit engine choices |
| `orbit_get_research_protocol` | `{}` | Public research steps and human-only approval/publication boundary |
| `orbit_sanity_initial_context` | `{}` | Real public course Context outline through the bounded server gateway; no private question/journal sent |
| `orbit_sanity_read_entries` | `paths` | One to five outline paths, checked against the path schema; no arbitrary endpoint or token |
| `orbit_get_research_request` | `{}` | Selected question after `agentRead`; `CONSENT_REQUIRED` otherwise |
| `orbit_get_mission_summary` | Optional `missionId` | Shared session ID, revision, module and proposal metadata; does not approve a proposal |
| `orbit_list_research_points` | Optional `offset`, `limit` | Axes from the selected shared dossier |
| `orbit_search_sources` | `query`; optional pagination | Search only the dossier's saved source records; no external Web search |
| `orbit_read_source_record` | `sourceId` | One saved source in the shared dossier; does not fetch an arbitrary URL |
| `orbit_present_research` | `requestId`, `expectedRevision`, `report`, `axes`, `sources`; optional submission/claim/trace fields | A revision-bound research proposal, retained for review; no dossier replacement, publication or approval |
| `orbit_classify_evidence` | `requestId`, `expectedRevision`, `claimIds`; optional authorized engine selection | Separate classifications for the explicitly selected engine or pair |
| `orbit_compare_claims` | `requestId`, `expectedRevision`, `leftClaimId`, `rightClaimId` | Conditions, rules and relations for two saved claims |
| `orbit_find_relations` | `requestId`, `expectedRevision`, `claimIds`; optional pagination | Bounded relations in saved claims, with provenance preserved |
| `orbit_resolve_hold` | `requestId`, `expectedRevision`, `claimId`, `attempt`, `additionalEvidence`; optional `candidateScope` | Re-evaluation with saved source references, typed scope and attempts 1 or 2; no automatic admission |
| `orbit_trace_impact` | `requestId`, `expectedRevision`; optional `changes` | Dependencies potentially affected by source or Context changes; no source modification |

Research calculations need `agentRead`, a selected dossier and current revision. Claim and source IDs must belong to that dossier. In the formation adapter, a learning proposal ID is not an approved evidence dossier and cannot become one through an analysis call.

Explicit engine selection may update the session configuration when `engineSelection` permission is granted; callers must reread the revision afterward. Without that permission, an agent cannot replace the learner's chosen configuration. Selection is not publication, approval or a decision about which source is true.

`orbit_present_research` is the research proposal write. It requires both read and proposal permission and validates claims/source records before deposit. The browser adapter bounds the input JSON to 100,000 characters. Research report text is bounded to 40,000 characters and answer text to 10,000; the combined serialized proposal must also fit the store's 64,000-character proposal text limit. An oversized or malformed report is refused rather than truncated into an apparently complete result.

The two Context tools use the explicit course origin and the read-only GET routes `/api/v1/course-context/outline` and `/api/v1/course-context/entries`. The latter receives only a bounded JSON-encoded `paths` query parameter; both omit browser credentials and send no learner journal or question. These stateless public routes remain disabled unless the server explicitly activates the audited, non-secret `config/course_context.php` manifest. It identifies nine public source snapshots, the allowed entry paths, their citations and the exact audited Context text digests. The outline is clearly labelled as an allowlisted projection of a real `initial_context` read. Entries preserve the actual single-entry `knowledge_base_read` text; an unknown path or changed upstream representation is refused. This transport does not expose the rest of the Knowledge Base. The existing private `/api/v1/knowledge/*` routes and their origin/session protections are unchanged. An organization token stays behind the gateway. Missing, disabled or failed gateways produce `UNAVAILABLE`; a prepared local outline is not presented as a live Context read. A public Context result is still invalidated when the page or session changes during its read.

## Public course Context admission — current qualification

The [bounded ingestion receipt](../../receipts/formation/course-context-import-status.json) records nine completed one-source imports from a pinned public course snapshot: Modules 1–8 and `PROJECT.md`. This is an import result, not proof that the resulting Knowledge Base entries preserve their scope.

The final guided build completed on October 1, 2026 at 14:10:25 UTC, revision `8b6797ec-8622-4ad0-9789-4c5be3b0aa31`. Its observed `learning_modules` entry cites Modules 1–7 together with two legacy sources. Module 8 is ready but not cited; the protocol source is skipped. No entry passed the exact nine-document, course-only admission contract. The 33 nodes reported by the build job and 24 entries read through the SDK are retained as different observations. They are not interchangeable counts.

The public manifest remains disabled and empty. When that disabled configuration is deployed, both stateless GET routes return HTTP 503 with `state: UNAVAILABLE`, `reason: CONTEXT_NOT_READY` and `noFallback: true`, without requiring a learner login or reading a private session. The [Kaggle PHP receipt](../../receipts/formation/php-context-29-pass-kaggle.json) records 29 tests and 185 assertions, including the disabled response, bounded public reads and unchanged private-origin protections. It does not establish production deployment or a successful real public course read.

The bounded follow-up allowance is exhausted: two useful guided attempts were observed. One additional orchestration duplicate was cancelled through the official SDK and is disclosed in the receipt. No further rebuild, raw entry creation, issue adjudication or new Knowledge Base was performed to bypass this failure. The observed meter is 107 ready documents, with eight skipped sources counted conservatively as 115 against the chosen safety ceiling of 150; an increase of one after the initial nine imports remains unexplained. These counts do not authorize extra imports or imply that skipped material was admitted.

## The 10 pedagogical tools

Public course operations use an optional `moduleId` from 1 to 8 and, where supported, `language` from `fr`, `en`, `es`. Pass them explicitly when module/language matters; the public material defaults to Module 1 in French. No student files are read merely to tailor a public resource.

| Tool | Required input | Useful output | Access |
|---|---|---|---|
| `orbit_get_learning_mission` | None for public material; `sessionId` for current shared mission | Objectives, criteria, resources, help, module version and course timings; private form adds revision and selected IDs | Public or shared session |
| `orbit_get_learning_protocol` | None; optional `mode` | Teaching cycle, responsibilities, storage destinations and complete-solution policy | Public |
| `orbit_plan_learning_activity` | `intent` | Candidate plan, possible options, controlled question and examinable outputs; no chosen idea or persisted plan | Public calculation |
| `orbit_prepare_experiment` | `prediction`, `variable`, `initialValue`, `changedValue`, `controlledConditions`, `procedure`, `restoration` | Bounded protocol proposal and observation prompts; `executionStarted: false` | Public calculation |
| `orbit_read_learning_artifact` | `sessionId`, `expectedRevision`, `artifactId` | Only a selected artifact, provenance, version, declared status and paginated text; never executes code | Private read |
| `orbit_get_learning_support` | `concept`, `level` | Prepared support from a conceptual hint through full explained example, references and transfer | Public |
| `orbit_check_understanding` | `sessionId`, `expectedRevision`, `artifactId` | Review criteria and reformulation/transfer prompts; no semantic grade or mastery certificate | Private read/calculation |
| `orbit_prepare_transfer` | `concept`, `context` | Candidate activity for a different context, with observable review criteria | Public calculation |
| `orbit_present_learning_work` | `sessionId`, `expectedRevision`, `id`, `kind`, `payload` | Idempotent revision-bound proposal deposited as pending for review | Private proposal write |
| `orbit_get_learning_journal` | `sessionId`, `expectedRevision` | Only selected journal entries and selected artifact references, with pagination | Private read |

The assistance modes are `brainstorm`, `exploration`, `teaching`, `guidance`, `debugging`, `critique`, `transfer`, `revision`. Levels are `conceptual-hint`, `technical-hint`, `pseudocode`, `partial-example`, `full-solution`, `explanation`.

A full solution is allowed. Prepared teaching support is identified as `provided-course-support`, with `responseIsPersonalizedLLMOutput: false`. The personal assistant may develop the explanation, but must help the learner verify it, explain it and transfer it. Orbit does not hide a generated server response behind a prepared-resource tool.

`orbit_plan_learning_activity`, `orbit_prepare_experiment` and `orbit_prepare_transfer` return suggestions without saving or executing them. A human can perform the experiment in the page and choose which reported observation to retain.

`orbit_check_understanding` returns `semanticCorrectness: "not-assessed"`, `understandingCertified: false`, `grade: null` and `published: false`. It supplies material for review; the teacher must examine the actual explanation or demonstration.

## Input/output rules and error states

Schemas are versioned and checked again at execution. Unexpected fields, malformed references and excessive sizes are rejected even when a caller ignores discovery. Fields such as `humanApproved`, `publish`, arbitrary URLs, credentials and shell commands do not become authority through a proposal payload.

| State | Meaning and next action |
|---|---|
| `READY` | The requested resource or bounded calculation is available; this is not a truth or learning certificate |
| `CONSENT_REQUIRED` | Required sharing, proposal permission or engine choice is absent; ask the learner to use the real controls |
| `STALE_REVISION` | The supplied revision no longer matches; read the current shared mission before forming a new proposal |
| `NOT_FOUND` | The session/reference/version is absent or outside the selected scope; unshared references are not revealed |
| `UNAVAILABLE` | Runtime, storage, gateway, interruption or a bounded operation is unavailable; retain the limitation |
| `PRESENTED` | A proposal was deposited for review; it has not been approved or published |

Malformed input can reject execution with a validation error rather than return one of these states. A tool failure is not a claim refutation. A correct refusal is not an access-control failure.

Private pedagogical calls use `sessionId` and `expectedRevision`. Research analysis uses the analogous `requestId` and `expectedRevision`. Do not interchange them. The shared mission response returns the current revision; copy that value instead of guessing it.

The artifact reader uses `offset` and `limit`, with text pages up to 12,000 characters. The journal reader uses a limit up to 25 entries. Reading a journal filters artifact references to the shared artifact selection. Selecting an artifact does not automatically select its private journal history.

Proposals permit `plan`, `experiment`, `explanation`, `reflection`, `transfer` or `correction`. Pedagogical `payload.text` is at most 20,000 characters. Optional payload references must be selected in the current scope. A new ID at an old revision is stale. An identical retry of an already deposited ID is idempotent, while a different payload with that ID is refused. Retries still require current read/proposal permission; revocation cannot be bypassed with an old submission ID.

## Example: bounded learner/assistant journey

These examples describe arguments, not an executed run. An assistant discovers and calls the native tool API supported by its actual browser; it does not inject a fake registry.

1. Discover capabilities and read public mission/support. This starts no private research or engine.

```json
{"moduleId":4,"language":"en"}
```

2. The learner uses the human controls to select the imported artifact and separately grant shared reading. The assistant reads `orbit_get_learning_mission` with the known session ID.

```json
{"sessionId":"SESSION_FROM_THE_SHARED_CONTEXT","language":"en"}
```

3. Copy the actual returned session ID, revision and selected artifact ID into an artifact read. Placeholder values below must be replaced by that current response.

```json
{
  "sessionId":"SESSION_FROM_THE_SHARED_CONTEXT",
  "expectedRevision":12,
  "artifactId":"SELECTED_ARTIFACT_FROM_MISSION",
  "offset":0,
  "limit":12000
}
```

4. Explain the declared notebook result and uncertainty. Offer a check of damping, fixed conditions and restoration. Do not convert `external-declared` into verified execution because a digest matches.

5. If the learner separately grants proposal permission, deposit a reflection with a stable submission ID and current revision.

```json
{
  "sessionId":"SESSION_FROM_THE_SHARED_CONTEXT",
  "expectedRevision":12,
  "id":"reflection-attempt-1",
  "kind":"reflection",
  "payload":{
    "text":"Proposed explanation: compare damping under the same initial velocity and elapsed-time units. The learner still needs to show the observation and transfer.",
    "artifactIds":["SELECTED_ARTIFACT_FROM_MISSION"],
    "openQuestions":["Can the learner adapt the same mechanism to a draggable card?"]
  }
}
```

6. A human review is recorded through the UI. No WebMCP tool can fabricate that review. A teacher export or Sanity publication has its own permission and exact content preview; neither is implied by `PRESENTED`.

An assistant delegation should send the selected mission, source/artifact references, revision, scope, objections and open questions. Another agent repeating the same source does not create independent evidence. A role's self-declared identity is not an authenticated human reviewer. The coordinating assistant retains unresolved HOLDs rather than resolving them through votes.

## Engines, privacy and publication boundaries

The three choices are `baseline`, `n` and `p`, singly or in pairs. No fresh session runs an engine implicitly. The learner can grant selection permission to the assistant, but a fixed benchmark configuration is not changed to seek a favorable result. Pair output preserves separate results on the same inputs; there is no average or automatically chosen winner.

T/I/F represents independent evidence components, not a learner grade or truth probability. The attribute engine is a discrete implementation inspired by plithogenic relations; neither it nor an interactive particle demonstration claims a complete validated scientific model.

The core uses memory by default. Local storage needs consent. A selected teacher export is a file, not an automatic message. Colab/Drive is Google cloud, not local storage. Private journal and conversation content must not enter Sanity through a tool call. The Studio publication flow previews only knowingly publishable selected artifacts and binds its write to the current account/workspace/revision.

Module changes, imported sessions, changed workspaces and document replacement withdraw relevant sharing and invalidate results in flight. Unregistration removes the tool lifetime; old handler references must not continue to return private work.

## Validation evidence and reproduction boundary

The initial saved Kaggle software checkpoint is [version 354372770](https://www.kaggle.com/code/celebrum/orbit-formation-software-validation?scriptVersionId=354372770): **117 passing assertions across 13 suites**, source `0c2dd93d1378bbfb41fa62dd811d76d17a74cd4124c037e7c1095ec78f77931f`, plus seven separate Python tests, exit 0. The formation-specific portion includes 21 contract and 14 registry assertions. Mocks protect refusal and registration logic; they do not prove native browser use.

The [final software result](../../receipts/formation/software-133-final.json) records **133/133**, exit 0, on Kaggle for source `cae9a0f4d7c842be6ebeac68ff1721beee9cb8f4fe57be46cc794e08775551c8`. It includes later persistence, artifact-version and ZIP-integrity cases. The initial counts are not rewritten. Notebook software exit 0 and actual Colab runtime are separate qualifications. The final saved immutable version is awaiting readback.

The [final native-browser report](../../receipts/formation/live-browser-72.json) records **72/72** live checks, run `formation-7c8029e8-0b4f-486d-8b3e-4380c144f80f`, on the public formation route. The [worker](../../../tools/formation-browser-check.ts) was dispatched by Kaggle into E2B. It discovered twenty-five unique native tools and exercised selected actual calls and UI controls, including revised persistence, archive and artifact-version flows. It checked deployed resource digests, the existing landing's four destinations with no formation link, and the corrected small-screen layout. It invoked no model and labelled its fixtures as synthetic.

Discovery does not mean execution of every registered tool, an autonomous LLM mission, a human approval or a Colab run. The earlier 44-check browser run is preserved independently in the [delivery receipt](../../receipts/FORMATION_DELIVERY_STATUS.md). A matched artifact digest remains an integrity result, not a verified learning outcome.

The [grouped Colab report](../../receipts/formation/colab-eight-grouped.json) retains **`PARTIAL_VALIDATION`** for eight export/replay namespaces and eight browser script reports in one CPU runtime. The [later recovery report](../../receipts/formation/colab-recovery.json) adds one observed real runtime restart followed by replay of eight captured sources from a pinned public synthetic checkpoint. Browser results were imported rather than rerun. Eight independent cold copies, trusted pointer work, the file-upload widget and learner understanding remain unverified. Colab's prepared Module 8 trace is not a native Orbit call.

The [actual-export assembly result](../../receipts/formation/actual-export-assembly.json) passed manifest/source linkage and Astro compilation across all eight modules. It retains `nativeWebMcpValidated: false` and `browserInteractionValidated: false`. Compiling the exported registration code does not execute that tool. The twenty-five native registrations on Orbit belong to the public formation page, not this assembled student project.

The [separate blank-Studio result](../../receipts/formation/second-studio-static.json) proves installation, import and static build of the verified portable archive. It keeps authenticated runtime, cross-origin Context, native-tool runtime and actual Sanity writes false. Those need an authorized second-origin browser receipt; no human publication can be inferred from the build.

This document was written from retained execution reports and the coordinator's readbacks, without local reruns. Record each further qualification with payload and resource fingerprints, browser/runtime, target URL, fixture labels, captures, timing, errors and dedicated-test-access retirement. A replay or mock is not a new autonomous mission. Full model campaigns and teaching outcomes require their own evidence.
The [dedicated browser-mission credential retirement](../../receipts/formation/mission-token-retirement.json) was observed in Kaggle: `RETIRED_AND_REFUSED`, with HTTP 401 from a revoked-credential request. Its value and bridge URL were removed from the notebook draft before saving; no account E2B key was embedded. This receipt establishes retirement of that bounded mission credential, not deletion of the account key.
