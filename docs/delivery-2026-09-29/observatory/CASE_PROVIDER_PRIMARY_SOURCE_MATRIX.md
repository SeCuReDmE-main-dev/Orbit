# Provider case — primary-source matrix

**Status:** prepared evidence for an Orbit proposal; no human decision or compliance conclusion has been recorded.

**Question:** Under which documented conditions can background deep research coexist with zero-data-retention requirements across named OpenAI and Google product surfaces?

**Why this is an Orbit case:** a keyword-only answer can merge rules that belong to different products, APIs, execution modes, account controls, or dates. Orbit must retain those conditions beside every claim before it presents a conclusion.

## Context paths actually read

The reproducible Context-agent plan read these Knowledge Base entries on 2026-09-29. Each entry digest is kept in `CASE_PROVIDER_PLAN_PENDING.json`.

| Knowledge Base path | Role in the plan | Agent status |
| --- | --- | --- |
| `data_retention_and_privacy` | Retention, account controls, and scope distinctions | Read from Context; source links still require primary verification |
| `deep_research/models_and_apis` | Deep-research execution and product boundaries | Read from Context; source links still require primary verification |
| `search_apis/google_grounding` | Tool-specific retention conditions | Read from Context; source links still require primary verification |
| `multi_agent_systems/operations` | Long-running task and handoff conditions | Read from Context; source links still require primary verification |
| `research_methodology/question_disambiguation` | Question decomposition and scope checks | Read from Context; source links still require primary verification |

## Primary-source findings

| Surface | Primary source checked on 2026-09-29 | Observed condition | Scope that Orbit must retain | Safe proposal state |
| --- | --- | --- | --- | --- |
| OpenAI Responses API, background mode | [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) | Background mode keeps response data on disk for roughly ten minutes so polling can work. The same page says that, where ZDR is enabled, `store` is treated as `false`, and distinguishes this from account-specific MAM behavior. | `/v1/responses`; `background`; polling; organization-level data-control eligibility; `store`; any third-party MCP or hosted-tool retention. | **Supported for this surface**, not a universal OpenAI statement. |
| Gemini Developer API, ordinary Interactions API | [Gemini Developer API ZDR](https://ai.google.dev/gemini-api/docs/zdr) | Interactions are stateful by default. The page says that a zero-data footprint requires `store=false`. It separately identifies Google Search grounding retention and says that storage cannot be disabled while that tool is used. | Gemini Developer API; generic Interactions API; paid-service and abuse-monitoring terms; enabled tools; explicit/implicit cache; no claim about Deep Research yet. | **Supported for this surface**, conditional on the named controls and tools. |
| Gemini Deep Research agent | [Gemini Deep Research](https://ai.google.dev/gemini-api/docs/deep-research) | Deep Research is documented as a long-running agent that requires `background=true`; its limitations state that agent execution with `background=true` requires `store=true`. | Deep Research preview agent; Interactions API; background task; current page version; no extrapolation to generic interactions or Vertex/Gemini Enterprise. | **Supported for this agent-specific surface**; it conflicts in scope with a generic `store=false` recommendation, not necessarily in fact. |
| Google Search grounding inside Gemini Developer API | [Gemini Developer API ZDR](https://ai.google.dev/gemini-api/docs/zdr) | The page describes a thirty-day retention condition for Google Search grounding and states that it cannot be disabled when the feature is used. | Gemini Developer API; Google Search grounding; not Google Maps, Vertex AI, or a different enterprise product. | **Supported for this tool-specific condition.** |

## What Orbit may and may not say

Orbit may propose this narrow conclusion for human review:

> The documented answer depends on the exact surface. The generic Gemini Interactions API describes a `store=false` path for a zero-data footprint, while the Gemini Deep Research agent documents a `background=true` plus `store=true` requirement. Those statements therefore cannot be merged into one provider-wide rule. OpenAI Responses background mode also has a temporary polling-retention condition; eligibility and any account-specific controls remain separate checks.

Orbit must **not** say any of the following without further evidence:

- “Google has a contradiction.” The current evidence identifies different scopes and modes.
- “Neither provider can ever meet ZDR.” Account eligibility, product surface, tools, and contractual controls change the answer.
- “This is a compliance decision.” The cited documentation is not a substitute for the account’s terms, security review, or legal advice.
- “The baseline was worse.” The current baseline is an unreviewed candidate, deliberately restricted to the same five Context entries.

## Reproducible comparison setup

The two artifacts use the same question and the same five frozen Context entries:

- structured proposal: `CASE_PROVIDER_PLAN_PENDING.json`
- flat-text control: `CASE_PROVIDER_KEYWORD_BASELINE.json`

The structured path keeps an entry path, digest, product surface, mode, tool condition, and review state next to a future claim. The flat control ranks text matches only. This establishes a test design; it does **not** establish a performance advantage until a reviewer approves claims and records the results of both runs.

## Required human decision before a final report

1. Review the product/mode matrix above and confirm that it answers the intended question.
2. Approve or revise the pending research plan in Orbit.
3. Add exact source passages to claims, then mark each claim `supported`, `contested`, or `indeterminate`.
4. Review the final response and its affected-entry audit before export.
