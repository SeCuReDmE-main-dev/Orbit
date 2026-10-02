# Orbit Formation: implementation and learning contract

> Final checkpoint, October 1 Toronto: authenticated synthetic publication/readback, native logout and temporary runtime cleanup are now verified. Earlier preview-only statements below are historical. Immutable replay, workspace change, distinct read-only identity and model campaigns remain incomplete. See [delivery evidence](../../receipts/formation/FINAL_DELIVERY_2026-10-01.md).


Version: `orbit-course-1.0.0` / `orbit-learning-v1`. Prepared on October 1, 2026.

This document describes the implemented contract and the remaining runtime qualification. It is a technical reference, not a claim that every learner notebook, public route or teaching outcome has been validated. The source of truth is the [course catalogue](../../../packages/learning/src/catalog.ts), [session types](../../../packages/learning/src/contracts.ts) and [store](../../../packages/learning/src/store.ts).

## Course duration and sequence

| Part | Teacher accompaniment | Learner work | Total |
|---|---:|---:|---:|
| Eight modules | 8 × 1 hour | 8 × 3 hours | 32 hours |
| Personal final project | 2 hours | 6 hours | 8 hours |
| Complete course | **10 hours** | **30 hours** | **40 hours** |

Each module spans two days. The learner prepares the work before the one-hour webinar. The three solo hours are already included in the module total:

| Time | Activity | Selected evidence |
|---|---|---|
| 120 minutes | Guided reading and learning with the personal assistant | Notes, an explanation and open questions |
| 30 minutes | Colab prediction, one controlled change and observation | Notebook export, parameters, result and frontend brick |
| 30 minutes | Reflection and preparation for teacher review | Personal explanation, assistance received, limits and chosen handoff |

The webinar uses 10 minutes to examine the work, 15 to clarify a difficulty, 25 to build or connect something concrete, and 10 to verify and transfer the concept.

The final project has an ordered sequence: **one hour with the teacher for setting and scope → six autonomous hours with the personal assistant → one hour with the teacher for closure**. There is no additional intermediate teacher review. The schedule may place the setting session alongside Module 5 and the closure alongside Module 8, but the closing session follows all six autonomous project hours. Module and project time are counted separately.

The catalogue retains a sixteen-day schedule: Modules 1–4 on days 1–8, Modules 5–8 on days 9–16. Project solo time is distributed as 1 + 2 + 2 + 1 hours across the last four modules. This is scheduling metadata; it does not prove attendance or completion.

## Learning method and authority

The course cycle is:

**Read → question → explain with the assistant → predict → experiment → observe → reflect → build with the teacher → transfer.**

The assistant may give a complete solution. The learner then checks it against the code or sources, explains what was retained or rejected, and tries the concept in a different situation. Withholding every answer is not the teaching contract. Producing an answer is not proof of understanding either.

Responsibilities remain separate:

- The learner chooses the intention, assistance level, experiment, files to share and personal project.
- The personal assistant explains, suggests, compares and preserves conditions, objections and provenance. It must identify assumptions and offer verification or transfer after a complete answer.
- The teacher sets the mission and progression, examines selected work and reformulation, discusses transfer, and records actual human reviews.
- Orbit supplies prepared resources, deterministic calculations, bounded tools, session state and export controls. It does not invoke a new server LLM service.

The eight modes are `brainstorm`, `exploration`, `teaching`, `guidance`, `debugging`, `critique`, `transfer` and `revision`. Assistance levels are `conceptual-hint`, `technical-hint`, `pseudocode`, `partial-example`, `full-solution` and `explanation`.

## Eight modules and reusable outputs

| Module | Main concept | Exported brick | Review and transfer |
|---|---|---|---|
| 1 — Gesture, state and rendering | Pointer events, capture, cancellation and keyboard | `interaction-state.js` | Explain event → state → rendering; adapt to a draggable card |
| 2 — Astro organisation | Content, presentation and behaviour | `ExplorationCard.astro`, `exploration-card.js` | Locate each file responsibility; reuse the card with personal content |
| 3 — Three.js scene and coordinates | Camera, projection, stable identity and selection | `scene-controller.js` | Connect the scene to its HTML description and demonstrate the fallback |
| 4 — Velocity and inertia | Position, velocity, explicit `dt`, damping and rebound | `inertia.js` | Compare damping under the same conditions; transfer to a card or camera |
| 5 — Interpolation and elasticity | Target transition, spring, damping and stability | `transitions.js` | Distinguish mechanisms and provide a static alternative |
| 6 — Particles and resources | Bounded population, lifetime, buffers and cleanup | `particle-layer.js` | Record the target device and observed measure; keep the effect optional |
| 7 — Journey, state and memory | Views, bounded history, interruption and restoration | `interaction-flow.js` | Restore the same selection and freeze elapsed time in static mode |
| 8 — Assistant, evidence and capabilities | Permissions, exact passages, scope and revisions | `register-capabilities.js` | Distinguish a prepared trace from an actual tool call; assemble the real exports |

The files share stable IDs, accessible HTML, positions where needed, selection events, a motion preference, explicit elapsed time and cleanup. The provided assembly layer is attributed separately from learner changes. It imports the actual eight exported directories; missing student files are not silently replaced by instructor solutions.

The first seven modules describe outputs as conservable and reusable. The complete assembly demonstration belongs to the end of Module 8. The [assembly instructions](assembly/README.md) identify the scaffold and its integration boundary.

## Application surfaces

| Route | Views | Purpose |
|---|---|---|
| `/formation/lab/` | `mission`, `experiment`, `evidence`, `reflection` | Read a mission, run a prepared demonstration, inspect evidence and prepare review |
| `/formation/projets/` | `files`, `versions`, `journal`, `sharing` | Import, preserve, examine and selectively share personal work |

The routes are directly addressable and carry `noindex,nofollow`. Search-index exclusion is not access control. An ordinary web page cannot become private merely by being absent from a sitemap.

The two formation pages share one in-memory learning store within their Astro navigation context. The URL records the module, view and optional artifact. Browser history restores the selection. A full reload starts a fresh memory session unless the learner explicitly restores a saved copy or imports an export.

The application reuses the canonical Orbit FR / EN / ES preferences, static or reduced motion behaviour, contrast and enlarged text. `Orbit.` keeps its name in all languages. Learner code, files and observations are not translated automatically. A language change may rebuild a translated demonstration; static motion preserves the current frame and avoids catching up time while paused.

The learning demonstrations use their own controllers and scene instances. They cannot change the approved landing scene. This documentation adds no announcement to the landing or existing guide.

## Colab activity and export contract

The eight learner notebooks are in [notebooks/](notebooks/README.md). Instructor notebooks are kept separately in `notebooks/instructor/`; an instructor solution is not a learner execution trace.

Required exercises are designed for a free Google account, a CPU runtime, no GPU or TPU, no paid API and no dependence on Colab's integrated AI. Python builds the display and files; the frontend mechanisms remain JavaScript or Astro. Module 3 loads the pinned Three.js browser dependency from a CDN and keeps an HTML alternative if network access or WebGL is unavailable. No public server or tunnel is required by the course.

The same `student_files` content feeds the preview and export. A prepared HTML preview does not compile Astro. A prepared tool trace does not execute native WebMCP. Notebook outputs report work; they do not independently certify that a student ran or understood it.

The JSON result format is `orbit-learning-colab-v1`:

```json
{
  "schemaVersion": "orbit-learning-colab-v1",
  "missionId": "module-4",
  "moduleId": 4,
  "attemptId": "attempt-unique-id",
  "parameters": { "damping": 0.65 },
  "prediction": "My prediction before changing the parameter.",
  "observations": ["My selected observation."],
  "explanation": "How I connect the code and the observation.",
  "assistance": ["Assistance I chose to disclose."],
  "limitations": ["What this experiment cannot establish."],
  "openQuestion": "What I still want to check.",
  "status": "external-declared",
  "artifacts": [
    {
      "path": "src/learning/module-4/inertia.js",
      "content": "// The actual selected frontend source.",
      "mediaType": "text/javascript"
    }
  ]
}
```

`moduleId` must identify the same module as `missionId`. The attempt ID identifies content: identical imports are idempotent; reusing an ID for different content is refused. The export includes selected results, frontend files, replay material, integration instructions and a manifest of versions and SHA-256 digests.

The [serialization implementation](../../../packages/learning/src/serialization.ts) checks safe relative paths, duplicate references, sizes, formats and bounded JSON. `parseArtifactBundle` can check the actual supplied text files against manifest hashes. A matching hash proves content identity, not execution, authorship, scientific validity or understanding. The UI displays imported code; it does not execute it automatically.

The current browser ZIP reader accepts the prepared uncompressed notebook archives and reads their result JSON. General ZIP extraction and arbitrary compressed archives are not promised.

## State, storage and privacy

| Destination | Content and authority |
|---|---|
| Orbit memory | Fresh personal session; no persistent storage or sharing permission by default |
| Browser local storage | Explicitly permitted copy in the same browser profile; not an encrypted vault |
| Personal Colab / Drive | Google cloud notebook and outputs the learner chooses to retain or share |
| Teacher handoff | Explicitly selected artifacts and journal entries in an exported package; no automatic transmission |
| Sanity Content Lake | Only selected content knowingly accepted as publishable through the Studio publication flow |

Colab and Drive are cloud destinations. Sharing a notebook can expose its code, text and saved outputs. Orbit does not require a private conversation transcript for review.

Permissions are independent:

| Permission | Effect |
|---|---|
| `localSave` | Permit reading/writing the browser copy after explicit choice |
| `agentRead` | Permit the assistant to read the selected shared session and references |
| `agentPropose` | Permit a proposal deposit in addition to reading consent |
| `engineSelection` | Permit the assistant to choose an engine or pair; no implicit calculation |
| `teacherShare` | Prepare a selected teacher export |
| `sanityPublish` | Permit the separate human Studio publication action after preview and acknowledgement |

Store construction does not read old browser storage. If a previous copy exists when local saving is enabled, Orbit waits for an explicit restore or choice to overwrite it. Storage failure leaves the work in memory and reports that export is required before closure. Turning saving off attempts to remove the saved copy; a failed removal is reported rather than treated as success.

The portable Studio namespaces its local session by project, dataset and signed-in user. The public course has a browser-profile namespace and is not an account-isolated vault. Multiple people using the same browser profile must not be promised separate private accounts. Imported sessions are rebound to the current namespace; imported permissions, shares and active engine selection are reset.

PostHog is not a required learning dependency. The formation core introduces no analytics or provider calls. Any later telemetry must be separately disclosed and must not collect journals, source code, private conversations or replay by default.

## Revisions, proposals and review

Session mutation advances the revision and invalidates earlier operation tokens. Tokens include the session ID, namespace, revision and access epoch. Module changes revoke assistant read, proposal and engine-selection permission, clear shared references and remove active engine choices. Replacing an evidence dossier revokes its prior sharing. Revocation preserves personal work while blocking private results arriving afterward.

A proposal carries an ID, expected revision, module, kind and payload. A new proposal must match the current revision and authorized references. An identical retry returns its previous result; the same ID with different content is refused. A proposal from another module cannot be retrieved as the current module's work.

Agent proposals have `agent-declared` attribution and begin `pending`. Human UI review is a separate record with the decision, justification, date and revision examined. An imported review remains `imported-declared`; importing JSON cannot recreate verified human authority. Accepting a proposal does not publish it or certify comprehension.

The result states are `READY`, `CONSENT_REQUIRED`, `STALE_REVISION`, `NOT_FOUND`, `UNAVAILABLE` and `PRESENTED`. Invalid schemas and malformed input are validation failures, not evidence that a claim is false.

Artifact origin, artifact status and hash status are separate fields. In particular, `external-declared`, `executed-reported`, `verified-technical` and `human-reviewed` must not be treated as interchangeable. A human learning judgement requires actual examination and transfer, not an automatic score.

## Three explicit engines

| Choice | Engine | Result representation |
|---|---|---|
| 1 | `baseline` | Classical support, opposition and insufficient-information states |
| 2 | `n` | Independent T, I and F evidence sets |
| 3 | `p` | Discrete relations using declared attributes and versioned domain rules |

A fresh learning session selects no engine. The learner chooses one or a pair: `baseline+n`, `baseline+p` or `n+p`. Three simultaneous engines are outside this selection contract. A human can clear the selection. An assistant needs explicit engine-selection permission to change it.

The store calls the same [TypeScript evidence implementation](../../../packages/evidence-review/src/classification.ts) used elsewhere in Orbit. It does not reimplement a Python variant. Each result keeps its engine, version, input references and reasons. Pair comparisons use the same claims and passages, with no average, vote or automatically selected winner.

T/I/F classifies evidence for a claim within a scope. It does not grade the learner and does not express percentages of truth. Passage presence and semantic relevance remain distinct. Unknown attributes remain unknown; two missing values do not establish identity; a date difference does not establish replacement. A HOLD states what is missing and the resumption condition, with at most two supplemental attempts in the bounded tool protocol.

The interaction prototypes are artistic or instructional demonstrations. Their parameters, seeded particles and traces do not establish a validated physical, quantum or astrophysical model. Notebook CPU time is not Three.js frame time. A successful software assertion is not a guarantee of smooth rendering on every device.

## Portable Studio and selective publication

The team `/studio/` belongs to the existing Orbit project. Signing into it does not provision a personal Sanity project. The [portable learning plugin](../../../packages/learning-studio/README.md) uses the installing Studio's project, dataset, client and authenticated session. It does not contain a global organization token or grant teacher access by default.

Publication is a human UI operation, not a WebMCP tool. Its preview identifies the destination, session, revision, selected IDs, exact payload and digest. Before writing, the plugin checks acknowledgement, `sanityPublish`, unchanged workspace/account, revision, selection and digest. The content-addressed `createIfNotExists` write is idempotent and does not overwrite an existing document. The publication payload contains the selected artifacts, not the private journal or permission object.

Dataset permissions and plan changes must not be the sole privacy safeguard for student work. Only content accepted as publishable should reach the Content Lake. Private learning remains in the selected local/cloud notebook destinations unless a separate handoff is chosen.

## Validation record and remaining qualification

### Current closure qualification — October 2, 2026 UTC

The [current delivery matrix](../../receipts/FORMATION_DELIVERY_STATUS.md#definitive-closure-pass--current-evidence-october-2-2026-utc) supersedes the earlier checkpoint below. The current portable archive is `184358d01d9866ef7da0b5ac67f5d8020545656a31b66e39fece0c0e8e17ff64`; its [actual E2B host construction](../../receipts/formation/current-portable-studio-cloud-build.json) produces 316 files and is explicitly build evidence, not a runtime test. Course outline and nine admitted entry paths are `READY`; [audited transport](../../receipts/formation/course-context-live-transport.json) and [provenance](../../receipts/formation/course-context-ingestion.json) identify their scope. Nine [Canva course documents](publication/CANVA_DELIVERY.md) are published and read back. The new explicit manual Colab import and assembly are retained in their [own receipt](../../receipts/formation/free-colab-module-8-manual-import-assembled.json); their compilation does not inherit an older archive's browser results.

The [16-check public run](../../receipts/formation/cross-origin-public-validation.json) discovers the 25-tool native registry and executes selected calls on the real Orbit course page, observes the foreign portable Studio's signed-out screen and reads course Context from the foreign origin without credentials. It does not prove authenticated Studio execution. That evidence is now supplied separately by the [18-check owner-authenticated preview](../../receipts/formation/native-studio-preview-20261002.json): native 25-tool registry, initial six permissions off and no selected engine, private refusal before sharing, actual course reads, explicit save/reload/restore/export and the exact selected synthetic payload. No Content Lake write is executed in that receipt.

At this checkpoint, publication/readback, immutable publication replay, workspace change, server rejection for a separate read-only identity and actual native logout remain `NOT_RUN`. Historical OAuth refusals, login preparations and cleanup keep their original outcomes; an authenticated preview is not publication or human pedagogical approval. The eight source modules, three engines and forty-hour course contract are unchanged.

The [new quota readback](../../receipts/formation/kaggle-quota-readback-20261002.json) still observes $8.53/$10 daily and $18.29/$100 monthly, without renewal or a provider refill time. The [C/D/E prerequisite review](../../receipts/formation/campaign-resumption-prerequisites-20261002.json) preserves frozen identities, three missing C extractions and nineteen productions, the local 85% gate and terminal heavy-load case, D's two-KB capacity limit and E's missing qualified frozen harness/worker generation. It dispatches no work. `fullMissionComplete` remains false; native Studio preview and software qualification do not complete model campaigns or learner assessment.

### Historical consolidated checkpoint — October 1, 2026, superseded

This earlier checkpoint is retained with its own release, archive and limitations. Its claims of current status, disabled Context and pending Canva are historical and superseded by the closure qualification above. No software test was rerun on the workstation to update this chronology. A passing fixture, a compiled export, an authenticated page and an examined learning outcome remain separate qualifications.

| Checkpoint | Current evidence | Qualification and limit |
|---|---|---|
| Software contracts and regressions | [Successful immutable v5 receipt](../../receipts/formation/software-version5-kaggle.json), version [354436854](https://www.kaggle.com/code/celebrum/orbit-formation-software-validation?scriptVersionId=354436854): 141/141 assertions across 15 suites, plus seven separate Python tests, exit 0; source `689494986b4b6a9b02b5a22a8beb81e8de7cb7388a55ad20a122743d3de7966e` | Actual Kaggle readback, 120.7 s, zero model calls. Corrected actual assembly, Studio installation and PHP statuses are retained in this version; earlier v4 remains historical |
| Current public laboratory and projects | [72/72 native browser checks](../../receipts/formation/live-browser-pointer-target-final.json), run `formation-de718cf4-ef62-4333-a2ac-aadf1f49a267`, 5,093 ms | Kaggle dispatch into an isolated E2B browser, zero model calls and explicit synthetic fixtures; twenty-five native names and selected actual calls, not every possible agent trajectory |
| Atom and current navigation | [77/77 public checks](../../receipts/formation/atom-five-navigation-live.json) | Five destinations, including the explicitly authorized Apprendre link to `/formation/lab/`; exercised atom interactions and preference paths. No all-device frame-rate or scientific claim |
| Eight independent notebook copies | [Eight-export manifest](../../receipts/fixtures/free-colab-eight-export-manifest.json), [corrected fresh M3](../../receipts/formation/free-colab-module-3-pointer-target-independent.json) and [corrected fresh M8](../../receipts/formation/free-colab-module-8-pointer-target-independent.json) | CPU selection observed on the user's reported free account, bounded edits, previews and downloads. Latest M3 export `b202088c…`, M8 `8d80562e…`; six other original exports preserved. Codex-operated QA fixtures, not student work or a mastery assessment |
| Actual independent export assembly | [Corrected free-CPU Colab assembly](../../receipts/formation/free-colab-module-8-pointer-target-assembly.json), archive `141466603afaca979af3e8ee011391c9516de2a723c52809bdca86f0dbb0b1ba`; nine frontend bricks, 46 manifest files | Eight exact public synthetic exports imported through bounded HTTPS with size/SHA checks; supplied host uses `pointerTarget: stage`. No instructor replacement; manual multiple-file upload remains unvalidated |
| Independent assembly compilation | [Corrected locked Kaggle build](../../receipts/formation/actual-pointer-target-assembly-static-kaggle.json), all eight modules and nine bricks linked, exit 0 | Node 22.20.0, Astro 7.3.3, Three.js 0.181.2; supplied lock preserved. Compilation qualifies exact archive `14146660…`, not learner understanding or the Colab account plan |
| Actual assembled browser | [35/35 native checks](../../receipts/formation/actual-pointer-target-assembly-browser-kaggle.json), run `assembly-038e527c-85d9-44d8-bc93-0997ccb771e7`, 4,917 ms | Kaggle-dispatched E2B run on the actual compiled exports: raycast, trusted keyboard, inertia after pointer release, static frame, particles, native bounded capability, HTML alternative and cleanup. Zero model calls or recorded runtime errors; no human approval or comprehension claim |
| Portable Studio installation | [Blank-host install/import/build](../../receipts/formation/portable-studio-v2-install-kaggle.json), archive `f2b0dc6897fae7b56e36836e4019eff06e098bf14d35668fa1df84ec6ff9e973`, 315 build files | Static installation qualified in Kaggle. The separate [authenticated fresh-session readback](../../receipts/formation/authenticated-second-studio.json) observes eight modules, FR/EN/ES, memory storage, all permissions off and a registered UI status. It executes no native agent call, private-user mutation or Content Lake write; cross-origin Context and publication remain separate |
| Course transport software | [29 PHP tests / 185 assertions](../../receipts/formation/php-context-29-pass-kaggle.json), exit 0 | Kaggle runtime and fixtures verify bounded reads, disabled response and unchanged private-route protections; this is not a successful real public course Context read |
| Deployed transport refusal | [Actual Kaggle HTTPS probe](../../receipts/formation/course-context-production-disabled.json) after the [eight-file backend overlay](../../receipts/formation/course-backend-deployment.json) | Both public course routes return 503 `UNAVAILABLE / CONTEXT_NOT_READY`, without credentials, with no-store and non-credentialed CORS. The private gateway still refuses a foreign origin with 403. This verifies a refusal, not course availability |
| Actual course Context admission | [Nine completed imports and bounded final build](../../receipts/formation/course-context-import-status.json) | **HOLD**: the generated candidate cites M1–M7 plus two legacy sources, omits M8 and skips `PROJECT.md`. The imported documents remain available as sources; zero entries qualify for the strict public subset, and its activation manifest remains disabled |

The [current formation-only deployment](../../receipts/formation/pointer-target-deployment.json) records package `4f58a1efbd32510e3c7561cfee527b7eebb17f3e5e9b9f7733468f30ab7c0e2c`, a retained remote backup and cleaned staging. Its browser receipt verifies a **358-entry formation-only manifest**, laboratory/projects HTML digests `993d933c…` and `bbdc991b…`, JavaScript, CSS and the unchanged `f2b0dc68…` portable archive. The older four-door landing and earlier release below are historical. Adding the fifth navigation door does not authorize a course promotion block or a change to the atom's existing mechanisms.

Earlier v4 version 354422952, source `98a0c659…` and assembly `96acc0dd…` remain preserved as earlier checkpoints. The [first checker failure](../../receipts/formation/actual-assembly-browser-first-failure.json), [keyboard-activation failure](../../receipts/formation/actual-assembly-browser-keyboard-failure.json), [raycast failure](../../receipts/formation/actual-assembly-browser-raycast-failure.json) and [snapshot-controller revision race](../../receipts/formation/actual-assembly-browser-snapshot-controller-failure.json) retain their failed outcomes. The corrected controller polls for a native READY result at the current revision; its 35-check pass qualifies that later run only.

The separate authenticated Studio observation was read-only, in a fresh session on the deployed formation Studio. Seeing an authenticated user or the word `registered` is not a native tool execution, a check of foreign-origin transport or a human approval. Personal work remains in memory until storage consent is explicitly given; publication still requires selected content, rights, destination and the separate human action.

The coordinator also inspected the real [Context Dashboard](https://www.sanity.io/@oatv1mmu8/context) at 14:39 UTC. The [retained UI receipt](../../receipts/formation/context-ui-correction-inspection.json) reads `learning_modules`, titled “Orbit Learning Modules & Assessment”, and observes History, Rewrite page and Rebuild. Rewrite page provides an optional instruction, a rule and Save & rebuild; it does not expose a direct content/citation editor. The dialog was cancelled without saving, source mutation or another build. This observation keeps course admission on HOLD and does not establish a manual way to repair the missing M8/protocol coverage.

Remaining qualification:

1. Preserve the corrected 35-check browser receipt for actual assembly `14146660…` and all preceding failures separately. Any broader device, performance or autonomous model campaign requires its own evidence.
2. Keep public course Context on HOLD until the exact nine-source set is admitted with real citations and a qualifying outline/readback. Source import completeness is not entry-generation correctness; no further automatic rebuild or invented entry fills this gap.
3. Examine authorized workspace/logout transitions, native tools and selective-publication controls in the portable Studio. The authenticated fresh-session receipt is an additional bounded observation, not full validation of all these actions.
4. Retire each new disposable diagnostic or mission credential after its own checks and verify rejection. The [earlier retirement](../../receipts/formation/mission-token-retirement.json) covers only its original bounded credential.
5. Review Canva web documents and final DOCX/PDF outputs after the technical gate, and examine reformulation and transfer in actual teacher sessions. These documents, the visual tutorial, autonomous Gemini campaigns and learner outcomes are not declared completed here.

### Historical checkpoint — preserved without retroactive changes

The following record describes its own earlier payload, grouped Colab run, four-door landing and pending gates. References to “final” below belong to that historical checkpoint and do not supersede the current evidence above.

The coordinator observed the following separate checkpoints on October 1, 2026. This document was prepared from retained reports and readbacks; no tests were rerun on the workstation.

| Checkpoint | Scope and retained evidence |
|---|---|
| Initial saved Kaggle software run | [Version 354372770](https://www.kaggle.com/code/celebrum/orbit-formation-software-validation?scriptVersionId=354372770), source `0c2dd93d1378bbfb41fa62dd811d76d17a74cd4124c037e7c1095ec78f77931f`: 117 passing assertions across 13 suites; seven separate Python tests, exit 0 |
| Final software payload | [133/133 in Kaggle](../../receipts/formation/software-133-final.json), source `cae9a0f4d7c842be6ebeac68ff1721beee9cb8f4fe57be46cc794e08775551c8`, exit 0; immutable final saved-version readback pending |
| Final public formation browser | [72/72 native checks](../../receipts/formation/live-browser-72.json), dispatched from Kaggle into E2B; no model calls, synthetic fixtures explicitly labelled |
| Colab grouped exports and probes | [Eight Python export/replay namespaces and eight browser reports](../../receipts/formation/colab-eight-grouped.json), one CPU session; original state `PARTIAL_VALIDATION` |
| Real Colab recovery | [One observed runtime restart and eight captured-source replays](../../receipts/formation/colab-recovery.json); earlier browser reports imported, not rerun |
| Actual notebook-export assembly | [`PASS_ACTUAL_EXPORT_ASSEMBLY_STATIC_BUILD`](../../receipts/formation/actual-export-assembly.json) in Kaggle, 46 manifest files and nine actual exported brick files linked across modules 1–8 |
| Second blank Studio | [`PASS_STATIC_INSTALL_BUILD`](../../receipts/formation/second-studio-static.json) in Kaggle; archive installed, imported and compiled without a real account |

The initial 117-assertion payload contains 21 learning-contract, 14 formation-registry, six Studio-publication, four Studio-registry, 13 frontend-brick and 59 existing classification/evidence/relations/WebMCP/workshop/provenance assertions. The later 133-assertion payload covers added persistence, atomic artifact-version and archive-integrity cases. Its notebook-software step exited 0 but keeps `colabRuntimeVerified: false`; it is not the runtime Colab result.

The [delivery receipt](../../receipts/FORMATION_DELIVERY_STATUS.md) preserves the initial 44-check browser run, failed first deployment attempt, permission repair, final package, HTTP/digest readback and later 72-check result. Only `formation/**` was packaged. The live landing kept its four existing destinations and zero formation links; the guide remained reachable. The final native run checks the corrected storage/version/ZIP flows and small-screen layout. Native tool discovery is not execution of every tool or an autonomous model mission.

The Colab report does not establish eight independent cold starts, trusted pointer work or learner understanding. The coordinator's free-CPU UI observation is kept separate from `accountPlanObserved: "not-observed"` in the grouped JSON. The later recovery proves one actual restart through a pinned public synthetic checkpoint, not eight cold learner copies or a tested upload widget.

The actual-export build used Node 22.20.0, Astro 7.3.3 and Three.js 0.181.2. No corrected instructor brick replaced an actual export. Its assembled-browser, native-tool and learner-understanding flags remain false. Static compilation cannot establish those outcomes.

The separate Studio installation used the verified archive in a blank host with Node 22.20.0, Sanity 6.16.0, React/react-dom 19.3.0 and styled-components 6.5.3. Authentication, cross-origin Context, native WebMCP runtime and Sanity writes remain unexamined. This result does not create a personal student project or grant authority to publish.

Remaining qualification is explicit:

1. Archive final software and integration saved-version readbacks with their fingerprints.
2. Open selected learner notebooks as independent cold copies; complete trusted pointer/cancellation/keyboard checks and the Module 3 pixel/raycast and import-widget paths.
3. Exercise the actual assembled frontend in its browser target.
4. Examine the second Studio with an authorized user: account/workspace/logout boundaries, cross-origin Context, native tool lifecycle and selected publication controls. Static build success does not authorize a real write.
5. Retain the [dedicated mission-token retirement receipt](../../receipts/formation/mission-token-retirement.json): `RETIRED_AND_REFUSED`, HTTP 401. The value and bridge URL were removed from the notebook draft before saving. The account E2B key was not the embedded mission credential. Any new test access needs its own retirement.
6. Examine learning through an actual teacher session, reformulation and transfer, then produce the complete teaching documents.

No local Codex or Antigravity model benchmark fills these gaps. No full Gemini campaign, human review, scientific validation or teaching outcome is claimed. The [timeline](../../receipts/CHALLENGE_WORK_TIMELINE.md) and delivery receipt keep failures, partial runs and earlier versions distinct.
