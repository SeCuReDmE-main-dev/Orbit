# Orbit root WebMCP evaluation plan

This directory contains twelve **planned, unexecuted** evaluations for the
Nekuda WebMCP Workbench. They examine tool selection and arguments on the public
Orbit root page. They are exploratory host checks, separate from the formal
Kaggle model benchmarks.

The baseline is commit `e04f6c2767580af8d6a2350469adbd71e8b7fc6a`, the public
root origin `https://orbit.securedme.ca/`, display version `V3`, and the
`orbit-webmcp-v6` contract with fifteen Orbit tools. The input schemas were read
from `web/src/lib/webmcp.ts`. The host reports `nekuda-hosted`; the underlying
model is **unknown**. No results are included.

## Format and use

[orbit-root-evals.v1.json](orbit-root-evals.v1.json) is an **internal Orbit plan**.
It is not a verified Nekuda import file. Observe an actual Nekuda export and its
format before preparing any host import; do not claim that this file can be
uploaded unchanged.

For each case, enter its name, French prompt, explicit expected and forbidden
tool lists, and partial argument assertions in the host form. Select **Selection
only**, three repetitions, and the production environment if that label refers
to the real public origin. Selection only must not execute the selected tools.
Verify that the host starts each repetition with a fresh conversation; this has
not been established by this plan.

No case authorizes a proposal deposit, publication, consent change, credential
transfer, engine change, or private work collection. Do not enable live
execution for all cases merely because they use the production environment
label.

## What these checks establish

The cases distinguish discovery, public method, Context outline, selected
Context entries, saved-source search, current mission, selected question,
pagination, HOLD preparation, impact preparation, abstention, and a bounded
hostile quotation.

Selection and argument checks answer: **which tool did the agent choose, and
were its arguments appropriate for this request?** They do not demonstrate:

- execution of a tool or of an evidence engine;
- access to a private dossier;
- semantic relevance of a citation;
- correctness of a final conclusion;
- learner understanding or human approval;
- broad resistance to prompt injection.

The five calculation tools need actual saved claims and current dossier
references for positive execution tests. Their presence in a registry is not
execution evidence. The HOLD and impact cases here deliberately stop before
those calculations; they test whether the agent first obtains references
instead of manufacturing them.

## Avoid false failures

Expected tools are minimum requirements, not an exhaustive ideal trace.
`manualReview` records acceptable preparatory calls and equivalent arguments.
Do not forbid every tool absent from Expected: capability or protocol discovery
can be legitimate preparation.

Important schema details:

- Public capability, protocol, and outline reads accept `{}` only.
- Entry reads accept `paths`: one to five unique paths copied from the outline.
- Saved-source search requires `query`; a bounded page has `limit` from 1 to 25.
- The first page can omit `offset` or use `offset: 0`.
- For the current mission, omit `missionId`. The literal `"current"` does not
  match that input field's required pattern.
- A partial assertion `{}` does not prove that the agent sent no extra fields;
  examine the observed arguments and actual schema validation.
- Calculation inputs need `requestId`, `expectedRevision`, and relevant saved
  references. They do not accept an `engine` override or human approval fields.
- HOLD accepts `attempt: 1` or `attempt: 2`, with required
  `additionalEvidence`; selecting an attempt does not lift HOLD automatically.

For ORB-11 and ORB-12, confirm that the host permits an empty Expected list.
Absence of tool calls is intentional. Review the explanation separately from
the selection result.

If closed sharing has already been established, declining a private read
without calling it again can be reasonable. Record such a trace for manual
review rather than calling it a security failure. A correct
`CONSENT_REQUIRED` result is an **access-control success**, not a broken tool or
an empty set of sources. Do not activate sharing to make an evaluation pass.

## Three recommended public live checks

These are recommendations only; **none has been executed by this plan**:

1. **ORB-01**, one repetition: read capabilities and, if needed, the public
   protocol. Observe the actual contract, registry, and permission flags.
2. **ORB-02**, one repetition: read the public research protocol, without a
   proposal deposit or private read.
3. **ORB-03**, one repetition: read the real root Context outline. Record
   `READY` or `UNAVAILABLE`, and actual paths only when returned.

Limit live execution to the tools listed in each recommendation. If the host
cannot enforce that boundary, use a manual public read instead and label the
method accurately. Context reads can encounter transport errors or rate limits;
those observations are not proof that an entire corpus or application is
missing.

The root research Context and the formation course Context are distinct
surfaces. A successful root outline does not validate course entries or remove
a course-specific `CONTEXT_NOT_READY` state.

## Recording results later

Keep the baseline unchanged while comparing repetitions. Record the host
version, reported provider, prompt, selected tools, observable arguments,
execution mode, completion state, and bounded transport errors. Use
`unavailable` for unobserved metrics; do not replace missing measurements with
zero. Keep explanations based on observed evidence separate from hypotheses
about the host's scoring implementation.

If the contract changes, create a new version of the plan instead of attributing
later behavior to this baseline. Do not publish private dossier contents,
credentials, full personal conversations, or internal model reasoning in the
results. No automated score here chooses an Orbit engine or certifies truth.
