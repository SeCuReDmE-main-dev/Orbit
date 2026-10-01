# Orbit Formation: implementation and learning contract

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

The coordinator observed a successful Kaggle software validation version on October 1, 2026:

- Saved run: [Orbit formation software validation — version 354372770](https://www.kaggle.com/code/celebrum/orbit-formation-software-validation?scriptVersionId=354372770).
- Test payload SHA-256: `0c2dd93d1378bbfb41fa62dd811d76d17a74cd4124c037e7c1095ec78f77931f`.
- **117 passing Vitest assertions across 13 suites**: 21 learning-contract, 14 formation-registry, 6 Studio-publication, 4 Studio-registry, 13 frontend-brick, and 59 existing classification/evidence/relations/WebMCP/workshop/provenance checks.
- Seven separate Python notebook-validation tests completed with exit code 0. They are not included in the 117 Vitest assertions.
- Provenance: observed by the coordinator; writing this document did not independently rerun the tests. The [timeline receipt](../../receipts/CHALLENGE_WORK_TIMELINE.md) records the execution and scope.

This result covers that test payload. Later modifications require their own result. It does not establish a complete model benchmark, free-Colab runtime execution, a human teaching review, native browser tool missions, installation in a second Studio, or successful public deployment.

At this documentation checkpoint, the native formation browser campaign and fresh free-Colab learner journeys were **not yet performed**. The [browser worker](../../../tools/formation-browser-check.ts) is implemented for Kaggle dispatch into an isolated E2B Chrome worker; source presence is not its execution proof. Candidate checks, live route checks and plugin installation must each have a versioned receipt before their status is upgraded.

Required qualification retains distinct steps:

1. Run the targeted software validations in Kaggle against the delivered payload.
2. Compile an assembly made from the actual eight notebook exports, retaining the generated lockfile.
3. Dispatch native browser checks from Kaggle to E2B: discovery, permissions, eight experiments, cancellation, history, imported statuses, comparisons, keyboard, static mode, small screen and resource cleanup.
4. Run each notebook from a fresh free Colab copy: prediction, change, observation, export, restart and replay. Observe the browser outputs and time assumptions in their target environment.
5. Install the portable package in a second authorized Studio and verify workspace/logout revocation and selected publication without private journal leakage.
6. Verify the deployed URLs, dependencies and public permissions. Preserve the approved landing and secrets.
7. Examine learning through an actual teacher session, reformulation and transfer; software checks cannot perform this review.

No local Codex or Antigravity model benchmark is used to fill these gaps. Failures, partial runs and unavailable metrics remain explicit. Temporary test access is retired after its required runs; removing a secret from a notebook is not revocation of that secret.
