# Orbit V3: From a Research Companion to Learning With a Personal AI Assistant

*This is a submission for the [Sanity Challenge, Path One: Ship an Agent That Queries Real Content](https://dev.to/challenges/sanity-2026-09-16)*

By Jean-Sébastien Beaulieu · Author review copy · October 3, 2026

> I used Codex to its fullest potential as a research partner—for code mapping, source comparison, evidence organization, consistency checks, editorial control, and deliverable preparation. I formulated the intent, defined the scope, interpreted the results, arbitrated the conclusions, and preserved every public decision. This collaboration expands my investigative capacity; judgment, responsibility, authorship, and final signature remain under my authority.

I started with a research companion. I wanted to ask a focused question, examine its sources and understand how an assistant reached a conclusion. Over the following days, that question became a teaching problem too: how do I help a learner turn an assistant's answer into something they can explain, test and use elsewhere?

Orbit V3 connects those two intentions. Its research tools preserve evidence; its course gives that evidence a practical use. The learner builds a frontend with a personal assistant, and I teach from the work they choose to bring back.

## What I Built

Orbit is a research and learning workspace built with Astro, Three.js and Sanity. It combines a manipulable atom, a versioned research dossier, a learning laboratory, a projects space, eight Colab activities and a portable Sanity Studio plugin. A browser assistant can discover and use bounded WebMCP tools. The learner controls access to personal work, and consequential decisions remain examinable by a human.

### The first plan, and the direction I changed

The first implementation concentrated on bounded missions: an objective, proposed actions, budgets, permissions, a record of the result and a checkpoint for continuation. The preserved local Git history begins on September 22. Its early prototype included a side panel and a small orbital laboratory. I wanted something I could inspect while learning, rather than a response that disappeared into a chat history.

On September 28, I had a concrete Sanity Context demonstration: an agent read a research-method corpus and deposited a plan for review. That established a useful foundation. I also felt the product was drifting toward a familiar deep-research interface. On September 29, I changed direction. I kept the work and gave it a more concrete purpose.

That distinction matters to this story. Orbit already existed when the Kaggle challenge announcement inspired its subsequent benchmark work on September 23. The two September 22 commits were preserved when I published the GitHub repository on October 1. The dates of development, public GitHub availability and individual test executions each have their own [provenance record](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/CHALLENGE_WORK_TIMELINE.md).

![Three stages of Orbit: a bounded research companion in the preserved September 22 history, an evidence dossier and actual Context reading on September 28–29, then eight learning modules and a separate course corpus at the October 1 V3 delivery checkpoint.](https://raw.githubusercontent.com/SeCuReDmE-main-dev/Orbit/master/docs/submission/orbit-v3-path-one/assets/evolution/diagram.svg)

*I kept the research foundation and gave it a teaching use. The arrows trace product decisions; the dates identify retained development records.*

### Why the first thing you see is an atom

I wanted an arrival that felt curious: a dark background, a few doors and an object you could pick up. I kept the landing sparse because almost every visible element already gives you something to do.

The atom was also an exercise in patience. At first, releasing it could lose momentum. Passing the pointer through its path could interrupt the throw. An ambient echo effect kept extra history and animation work running. Those corrections forced me to make the airborne state explicit and separate a fresh grab from pointer proximity.

The approved interaction now has a small sequence of discoveries. Hold the nucleus for two seconds and the vortex begins drawing the scene inward. At four seconds, the decorative wordmark becomes ASCII and joins the effect. At six seconds, collapse starts an autonomous explosion and reconstruction. Releasing the pointer after that trigger lets the sequence finish. Static mode freezes the current image and its timeline. These are artistic interactions, with their own [bounded browser-validation receipt](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/atom-five-navigation-live.json), rather than a physical model of a neutron star.

I explicitly kept this as one of the article's angles: why practise beautiful, simple, clickable and manipulable arrivals when the game itself is different from the application's work? Astro and Three.js gave me a useful place to practise. Next.js belongs to my wider interests; Orbit's inspected frontend uses Astro and Three.js.

The landing became a concrete introduction to the first lesson: a gesture changes data, and rendering shows the resulting state. It offers a human experience while an assistant can work through the tools of the relevant page. Tool use still requires the person's choices and the page's permissions.

The public landing now displays **VERSION V3**, and the application release is **3.0.0**. Its approved atom mechanism retains **2.1.7**. The fifth door, **Apprendre / Learn / Aprender**, connects that initial curiosity to the course. These [version identities](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/v3-public-readback.json) are deliberately separate.

### A course where answers become work the learner can explain

The second angle I reserved was Sanity's usefulness for education. I wanted to teach a learner accompanied by their own assistant. A complete answer can help; the next step is to check it, explain what was retained and try the idea in a different setting.

The course is **40 hours**:

| Part | With me | Learner work | Total |
|---|---:|---:|---:|
| Eight modules | 8 × 1 hour | 8 × 3 hours | 32 hours |
| Personal final project | 1 setup hour + 1 closure hour | 6 hours | 8 hours |
| Complete course | **10 hours** | **30 hours** | **40 hours** |

Each module's solo period contains two hours of guided reading with the assistant, a thirty-minute Colab activity and thirty minutes to prepare a selected explanation and handoff. During the webinar, I examine that work, clarify a difficulty, build something concrete with the learner and ask for a transfer. The final project follows **one hour with me to set the project → six solo hours → one hour with me to close it**.

The eight modules produce compatible pieces:

| Module | What the learner practises | Reusable production |
|---|---|---|
| 1 | Gesture, state and rendering | Pointer and keyboard interaction |
| 2 | Astro organisation | An accessible exploration card |
| 3 | Three.js coordinates and selection | A scene linked to HTML information |
| 4 | Velocity and inertia | Motion after release |
| 5 | Interpolation and elasticity | Controlled transitions |
| 6 | Particles and resource use | A bounded, optional particle layer |
| 7 | Navigation, interruption and memory | A restorable interaction flow |
| 8 | Assistant capabilities and evidence | A bounded WebMCP capability and assembly |

The required notebooks are designed for a free Google account and a CPU runtime. The frontend mechanisms remain JavaScript or Astro; Python prepares the display and exports. Each activity starts from a prepared model so a learner can make one meaningful change within thirty minutes.

I tell learners that their work is reusable. The complete assembly is revealed at the end of Module 8: their eight exports already form a frontend foundation. The provided integration layer imports their actual files, with attribution for the scaffold. A missing or incompatible export produces an explicit result for review. The instructor's solution remains separate.

## Demo

Start at [orbit.securedme.ca](https://orbit.securedme.ca/). Pick up the atom, move it and release it. Open **Apprendre**, or go directly to the [learning laboratory](https://orbit.securedme.ca/formation/lab/).

For a short walkthrough:

1. Read Module 1's mission, resources and review criteria in the laboratory.
2. Prepare an experiment: state a prediction, change one parameter and record an observation.
3. Open [Projects](https://orbit.securedme.ca/formation/projets/) to inspect a selected export, its files and its provenance.
4. Explore language, enlarged text, contrast and static-mode preferences. Orbit retains its name across FR, EN and ES; learner files retain their original content.
5. With a compatible browser assistant, begin with `orbit_get_capabilities`. Public discovery is available before sharing personal work. Grant only the permissions relevant to your chosen activity.

The [public guide](https://orbit.securedme.ca/guide/) connects the atom, research workspace and formation paths. The [Module 1 Canva support](https://orbit-formation-module-1.my.canva.site/) introduces the teaching activity; the [maintained index](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/learning/orbit-formation/publication/CANVA_DELIVERY.md) links all eight modules and the final project. Their buttons lead to the actual missions and notebooks.

The [team learning Studio](https://orbit.securedme.ca/formation/studio/orbit-learning-lab) uses a Sanity session and that account's rights. The portable plugin is intended for installation in a learner's own Studio. Those are distinct destinations, with distinct authority.

## Code

[Public repository: SeCuReDmE-main-dev/Orbit](https://github.com/SeCuReDmE-main-dev/Orbit)

The repository contains the course sources, learner and instructor notebooks, frontend bricks, assembly instructions, Studio plugin, tool contracts and validation receipts. The [formation contract](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/learning/orbit-formation/FORMATION_CONTRACT.md) explains the interfaces and the [Studio installation guide](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/learning/orbit-formation/STUDIO_INSTALLATION.md) describes the portable package.

The [September 22 baseline](https://github.com/SeCuReDmE-main-dev/Orbit/commit/e3326986451d366bc25ddc01220a288c1e9fc14a) and [October 1 delivery checkpoint](https://github.com/SeCuReDmE-main-dev/Orbit/commit/f2313b27a586bbe98e53869d6753315935b91b52) preserve the actual development history. Later changes keep their own dates and evidence. The [French learning and teaching manual](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/learning/orbit-formation/publication/outputs/book.pdf) accompanies the maintained Markdown sources and editable DOCX.

## How I Used Sanity

### Sources, claims and a real agent reading Context

My starting concern was a polished research answer with weak support. I separated sources from claims so I could examine scope, versions, exact passages and unresolved contradictions. Sanity Context supplied navigable research-method material, including distinctions that a research plan had to preserve.

The recorded September 28 demonstration asked:

> Under which documented conditions can background deep research coexist with zero-data-retention requirements across OpenAI and Google API surfaces?

The agent used the official local Codex route and the research Knowledge Base. This is an abridged extract of its [actual recorded tool trace](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/delivery-2026-09-28/workshop/CONTEXT_DEMO_PLAN_PENDING.json.trace.json):

```json
[
  {"tool": "initial_context", "state": "READY"},
  {"tool": "knowledge_base_read", "paths": ["data_retention_and_privacy"], "state": "READY"},
  {"tool": "knowledge_base_read", "paths": ["deep_research/models_and_apis"], "state": "READY"},
  {"tool": "knowledge_base_read", "paths": ["search_apis/google_grounding"], "state": "READY"}
]
```

It produced a plan with nine research axes, nine screening criteria and three entry digests. The result was a proposal awaiting human review. The retrieved entries provided method and provider-policy context; the next research stage required reading the primary documents and checking the material claims. The [handoff](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/delivery-2026-09-28/workshop/CONTEXT_AGENT_STATUS.md) preserves that boundary.

Reading that trace, I can see how the retrieved content changed the work: the agent preserved the conditions of my question in a plan I could examine. I could then check its entries, revisit a quotation and decide which research axis deserved further reading. That reviewable plan became the bridge to the later learning workflow.

### A dedicated teaching corpus

As Orbit became educational, I kept the research corpus and created **Orbit Formation — Frontend course** separately. Its canonical sources are the eight module files and `PROJECT.md`. They describe the goals, resources, exercise, selected trace and final-project protocol.

That separation became useful during construction. Context surfaced an ambiguity between Module 8's three solo hours and the project's final solo hour on the same two calendar days. I clarified the source wording so module time and project time remain separately counted. Course admission then required the actual nine-source coverage, reviewed provenance and a known revision. Earlier mixed or incomplete candidates remained archived as refused admissions.

The deployed course transport serves an audited projection of the generated Context content. Its fixed profiles separate research and course access; credentials stay server-side. The [public readback](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/course-context-live-transport.json) records `READY` outline and entry reads against the admitted course revision, while the [ingestion receipt](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/course-context-ingestion.json) preserves source URLs and hashes.

This gives the assistant prepared course material it can navigate. The teaching use is to connect an explanation to the right mission, resource, criterion and transfer activity. The private learner journal belongs to the learner's selected workspace, outside that public corpus.

### The assistant can propose; the person decides

The landing retains fifteen research tools. Pedagogical contexts expose those fifteen plus ten learning tools. For example, `orbit_get_learning_mission` retrieves the shared mission, `orbit_prepare_experiment` prepares a bounded protocol, and `orbit_present_learning_work` deposits a proposal for review.

The tool contract explains where to obtain identifiers and the current revision. `expectedRevision` binds a proposal to the work the assistant actually examined. Revocation or a changed revision closes that access. This matters when someone has edited a project since the assistant began answering.

The same distinction applies to storage. A learner can keep work in memory, explicitly authorise local saving, export a selected package or share an artifact. Colab and Drive are Google cloud destinations. Sending something to Sanity requires an exact preview, a destination and explicit acceptance that the selected content is publishable. The portable plugin uses the host Studio's own rights.

![The person chooses selected work and permissions. A personal assistant calls pedagogical WebMCP tools, which check consent and revision, read public research or course Context, and present selected work in a versioned dossier for human review. Publication has its own acceptance step.](https://raw.githubusercontent.com/SeCuReDmE-main-dev/Orbit/master/docs/submission/orbit-v3-path-one/assets/authority-flow/diagram.svg)

*I wanted this path to remain visible: the person chooses, the assistant reads and proposes, and a human examines the result. Personal journals remain in the learner's selected workspace.*

An earlier second-origin Studio test exercised a selected synthetic publication and an authenticated readback of the stored document. It also checked native logout and tool removal. The first anonymous readback failed for the dotted document ID; the recovery used the native authenticated session to read the already-written document. Both attempts remain in the [delivery record](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/FINAL_DELIVERY_2026-10-01.md). That is a technical fixture, separate from a teacher approving an actual learner's work. The portable plugin is now version **1.0.1**: its new publication and resource boundaries passed targeted software checks, while a fresh authenticated native Studio run for those exact bytes remains to be qualified.

### What the evidence supports today

I retained three deterministic engines: `baseline`, `n` and `p`. They examine evidence under different representations, with explicit selection and separate outputs. They do not choose a winning engine automatically. T/I/F describes evidence for a claim; it is not a learner's grade or a probability of truth.

Software and browser checks run in Kaggle with isolated E2B browsers; the learner notebooks are also checked in their Colab target. A notebook preview, an Astro compilation, a native tool call and a person's understanding each keep their own status.

The delivered evidence includes 141 Vitest assertions and separate Node, Python and PHP suites, 72 formation-browser checks, and 77 atom/navigation checks on their recorded payloads. The actual manual eight-export assembly has its own successful static build. Those numbers describe exercised scenarios, rather than a universal promise across devices. The [maintained evidence matrix](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/FORMATION_DELIVERY_STATUS.md) links the original inputs, results and incidents.

On October 3, I recovered the private archive from C's resumption. Its [public receipt](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/c-resumption-20261003.json) records **60/60 extractions, 236/240 productions and 59/60 complete packets**. The four missing productions share one packet: a heavy-load HTTP 429 in the first condition was classified as a technical error, interrupting the three following conditions.

I then ran a [separately identified complement](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/c4-complement-20261003.json) in Kaggle using the exact existing extraction. It produced **four additional comparative responses**, in the fixed order `baseline → n → p → none`, with zero new extractions. I verified its downloaded archive against Kaggle's reported fingerprint. Production coverage reaches **236 historical + 4 complementary = 240 observed productions across two execution identities**. The original overload remains in the record. Structured outputs and coverage still require their own interpretation before I draw comparative conclusions.

The [D Provider lot](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/d-provider-20261003.json) has now produced **12 of the mission's 24 planned trajectories**. Both conditions offered the same twelve original sources. **Nine of the twelve trajectories met the reading criterion**; all three Pro runs assigned to the Context condition answered without reading Context. I retained that nonadherence as an observed result. The isolated QA corpus and semantic conclusions still need review, and I have selected no winning model or engine. E remains **0/144 model trajectories**. The real cases also await human arbitration. These records tell me which mechanisms were exercised and which questions remain before comparing engines or examining the course's educational value.

The October 3 deployment, **`orbit-v3-final-20261003T142300Z`**, serves the updated guide, laboratory, projects space and Studio shell. Its [public HTTP readback](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/receipts/formation/final-public-readback-20261003.json) records successful route responses and separate `READY` research and course outlines. The release package comparison preserves the approved landing markup and scene code after accounting for asset references changed by WebMCP metadata. Browser interactions, native tool execution and authenticated publication each keep their own validation record.

## Sanity Project Details

| Item | Detail |
|---|---|
| Sanity project ID | `pzscx4w8` |
| Team dataset | `production` |
| Research Context Knowledge Base | `kb5CHIYGXCMJ` |
| Dedicated course Context Knowledge Base | `kbbBvrClyweF` |
| Audited course revision | `d2c6279c-4ded-44de-a45e-f5e8e63bdf94` |

The [Studio configuration](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/studio/sanity.config.ts) and [schema index](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/studio/schemaTypes/index.ts) show the Content Lake project model. Context Knowledge Bases are a distinct surface used for navigable source-derived knowledge. A learner installs the portable plugin with their own project, dataset and session; the team project above remains the team's destination.

These settings give the team a public teaching corpus and a defined destination for selected artifacts. Learner-owned workspaces keep their own project, session and access choices.

## Agent Session

The [curated session excerpts](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/submission/orbit-v3-path-one/agent-session-excerpts.md) connect the author's two reserved angles, the September 29 pivot and the recorded Context tool trace. The [original public trace](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/delivery-2026-09-28/workshop/CONTEXT_DEMO_PLAN_PENDING.json.trace.json) and [pending dossier](https://github.com/SeCuReDmE-main-dev/Orbit/blob/master/docs/delivery-2026-09-28/workshop/CONTEXT_DEMO_PLAN_PENDING.json) preserve the agent's actual output. They are curated evidence, rather than a DEV Agent Session embed.

I began by wanting a research assistant I could examine. The same habit now shapes the course: the learner can inspect what changed, explain a choice, replay an experiment and carry the idea into a personal project. The teaching material is delivered; its educational value will be examined with real learners and their selected work. That is the continuation I want for Orbit.
