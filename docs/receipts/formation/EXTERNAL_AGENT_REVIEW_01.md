# External agent review 01 — October 1, 2026

## Provenance and scope

The user supplied this qualitative report during live V3 inspection. The reviewer had seen the earlier research interface and subsequently revisited `/formation/lab/`. The user then explained the educational intent of the atom before asking the same reviewer to reconsider its earlier landing critique.

This is **user-reported external-agent feedback**, not an independently recorded tool trajectory, a model benchmark, a learner assessment or a fresh unprimed first impression. The model, host, precise call inputs and raw tool responses were not supplied. Reported generation speeds are not used as performance measurements.

## Reported observations

| Topic | Reviewer report | Qualification |
|---|---|---|
| Product context | Research contract replaced by `orbit-formation-webmcp-v1` on the learning page | Different page contexts; the existing research tools remain available |
| Discovery | 25 tools: 15 research and 10 learning | Consistent with the delivered learning registry; not a newly executed tool-count assertion |
| Mission | Module 1, review criteria, resources, transfer and final-project `1 h → 6 h → 1 h` recognized | Consistent with the current page; does not demonstrate task completion |
| Permissions | Six permissions reported false | Private access and proposal/selection actions remain closed; public discovery is separate |
| Engines | Empty selection and no truth probability recognized | No engine runs implicitly; empty selection does not authorize agent selection |
| Context | `503 CONTEXT_NOT_READY` reported | Consistent with the retained course Context HOLD; visible course content is not proof of a working Context read |
| Teaching | Full explained answers allowed; no automatic grade, mastery certification or private-conversation collection recognized | Policy interpretation, not evidence of educational effectiveness |
| Landing | Earlier recommendation to add marketing introduction reconsidered after the educational purpose was explained | A primed reinterpretation by the same reviewer, not an independent design comparison |

## Clarifications grounded in the source contract

- `agentRead: false` prevents reading the private learning dossier. It is not read-only access to all workspace content. Public capabilities and protocols remain discoverable.
- `engineSelection: false` prevents the assistant from changing the selected engines. The learner can select them or explicitly authorize assistant selection. `selection: []` means no implicit engine, not compulsory free selection on every call.
- `orbit_present_research` and `orbit_present_learning_work` require the relevant sharing/proposal permissions and current revision. Their existence does not bypass the false permissions or create human approval.
- Course content in the page and prepared teaching support remain usable without the Context endpoint. They must not be presented as successful Sanity Context reads. Context-dependent missions are still incomplete.

These clarifications were checked by targeted source inspection of `web/src/lib/learning-webmcp.ts` and `packages/learning/src/`. No software/model test was executed for this feedback record.

## Retained usability questions

The reviewer retains friction around the first useful action, revision/identifier acquisition, English tool metadata alongside translated UI and the breadth of source-discovery instructions. These are observations to compare with the next reviewer, not established defects or authorization for a redesign.

The public learning page already presents criteria, resources and a **Prepare my experiment** action. Whether a new visitor notices and understands that action requires its own observation; the earlier outline alone cannot settle it.

The atom offers a concrete example of gesture, state and rendering. This is a coherent teaching use; interacting with it does not by itself prove understanding or transfer. The landing remains unchanged beyond the already authorized fifth learning door and V3 display stamp.

## Next comparison

The user plans a second review with an agent that has never seen Orbit. Retain its entry URL, prior explanation, visible page context, available tools, permission state and actual actions separately. Compare reported first-action discovery and access refusals without treating the two reviews as controlled quantitative runs. No new onboarding tutorial or visual redesign was created from this first report.
