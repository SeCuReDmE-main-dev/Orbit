# Orbit evidence and agent benchmark — development dossier

Observed on 2026-09-30T01:46:51.818040+00:00. Status: partial development measurement, not independent final validation.

## 1. Objective
Compare scoped decisions, preservation of uncertainty and provenance, then measure whether agents actually use the public Orbit tools. The experiment may favor a simple baseline. No theoretical superiority is assumed.

## 2. Codebase Context
Repository: `dev.to-challenge`; branch `master`; HEAD `3c6806b9cb77b81b5bea2e3debb7146f5ee0b821`. Existing uncommitted changes were preserved. Windows/PowerShell, Node, Python, Astro 7.3.3, Three.js 0.181.2 and Vitest 4.1.11. No commit or push was created. The public release is backed up before switching.

## 3. Product / Tool Thesis
Orbit relates exact source passage, atomic claim, structured scope and affected answer. Independent T/I/F evidence sets retain both support and refutation; HOLD is an operational recommendation, separate from human review. This is an evidence workflow, not a calibrated truth detector.

## 4. Repo Evidence Map
`packages/evidence-review/src/classification.ts`: baseline/N/P evaluations. `relations.ts`: scope rules and temporal relations. `web/src/lib/webmcp.ts`: fifteen page tools and consent boundaries. `tools/webmcp-browser.ts`: actual native browser execution. `tools/prepare_kaggle_pilot.py`: official Kaggle task and the bundled same TypeScript engine. `web/src/pages/benchmark.astro`: observed public aggregates.

## 5. Research Questions
RQ1: Does P reduce false contradictions caused by different conditions? RQ2: Does explicit HOLD preserve uncertainty without excessive abstention? RQ3: Does Context structure improve the answer over text retrieval on the same original corpus? RQ4: Can actual agents preserve citations and scope during handoffs? RQ5: Do provenance, authorization and lifecycle boundaries survive real execution?

## 6. Benchmark Methodology
Suite A uses annotated development inputs with no LLM. Pilots use twelve synthetic documents and six questions, outside the final set. The model sees public inputs but not gold labels. Its common extraction is evaluated by baseline, N and P using the same TypeScript implementation. Exact passage occurrence and model decision are scored separately. Kaggle SDK 0.6.1 ran both selected models. Prompt v2 explicitly clarifies complete atomic scope versus scope-free contextual evidence. Versions are not pooled. Sessions, final answers, calls, metadata and hashes are retained; internal model reasoning is excluded from public traces.

## 7. Market Landscape
Sanity Context is the structured-source substrate, not a rival classifier. Kaggle Benchmarks is the hosted measurement environment. Antigravity is a model/agent host. Browser WebMCP is an interface to Orbit tools. This dossier does not compare unrelated product marketing claims.

## 8. Comparator Profiles
Baseline: classic three-way recommendation with the same integrity gates. N: independent evidence sets and explicit uncertainty reasons. P: those checks plus discrete, versioned attribute rules. Baseline and N currently share eligibility and decision logic; differences in output representation must not be presented as demonstrated performance gains. P is inspired by plithogenic relations, not a complete implementation of the mathematical theory.

## 9. Benchmark Validity Analysis
Accepted only for development debugging and extraction-contract checks. Not accepted for independent scientific ranking: tiny synthetic sample, shared development cases, one repetition, host defaults not normalized, real corpus not adjudicated, and no successful autonomous WebMCP mission yet. A passing exact quote is not semantic support. Fifty-three assertions are repeated checks on six cases, not 53 independent observations.

## 10. Comparative Benchmark Matrix
Suite A: every engine has 36/36 decisions, 108/108 metamorphic checks and 18/18 relation checks on development inputs. The observed result is equality.

| Model | Host | Prompt | Decisions | Exact quotes | N evaluated correct | Schema errors |
|---|---|---|---|---|---|---|
| Gemini 3.8 Flash High | Antigravity 2.18.1 desktop | v1 | 6/6 | 8/8 | 5/5 | 1 |
| gemini-3.1-pro-high | Antigravity official CLI 1.2.13 | v1 | 6/6 | 8/8 | 5/5 | 1 |
| gemini-3.8-flash-high | Antigravity official CLI 1.2.13 | v1 | 6/6 | 8/8 | 5/5 | 1 |
| google/gemini-3.8-flash | Kaggle Benchmarks 0.6.1 | v2 | 6/6 | 8/8 | 6/6 | 0 |
| google/gemini-3.1-pro-preview | Kaggle Benchmarks 0.6.1 | v2 | 6/6 | 8/8 | 6/6 | 0 |

Kaggle Flash and Pro each passed 53/53 assertions; all three engines returned six correct decisions and zero schema errors on each extraction. No superiority claim follows.

## 11. Benchmark Map
First priority: independent scope and HOLD cases, common extraction, semantic relevance and false contradiction rate. Second priority: Context versus original-document text retrieval, actual browser tool choice and handoff preservation. Later: independent repetitions, packet-aware uncertainty estimates, latency and resource cost. Never rank hosts by speed before normalizing their budgets.

## 12. First Scenario
The development pilot covers direct support, direct refutation, simultaneous conflicting passages, different execution modes, unknown conditions, and contextual evidence. The fifth v1 output omits required property/value fields; the portable schema rejects that record. Original outputs remain unchanged. V2 clarifies the instruction and both Kaggle models satisfy it. This is a repair to the extraction contract, not a repaired old score.

## 13. Harness and Execution
Local: `python tools/benchmark_suite_a.py`; `python tools/summarize_benchmark.py`; `python tools/test_webmcp_transport.py`. New model calls require an observed quota check and a fresh experiment ID. Kaggle notebook generated by `python tools/prepare_kaggle_pilot.py --model google/gemini-3.8-flash --model google/gemini-3.1-pro-preview`. Archived harness copies are provenance snapshots; run canonical scripts from the repository root because they resolve paths relative to `tools/`.

## 14. Measured Results
Two actual notebook runs completed and are archived. The built private Kaggle task v1 initially shows a Flash result only; do not equate task-page history with the notebook pair. Antigravity desktop Flash and CLI Flash/Pro each produce six correct decisions and eight exact quotes; schema rejects one v1 contextual record. Native scripted transport discovers fifteen tools, returns READY for capabilities and CONSENT_REQUIRED for the unshared question. Public Context reads return READY for privacy/deep-research and Sanity/schema paths. These reads are scripted, not a complete research agent trace.

W01 attempts: two headless runs expose no native calls; an interactive attempt uses prohibited fallback web tools and is stopped before a URL fetch; a reloaded interactive session issues two tool attempts but times out and then loses the expired browser; a fresh interactive attempt is blocked by Gemini without any Orbit call. No successful autonomous trajectory is scored. Single-call operator approvals are distinguished from human decisions about research. Temporary global Orbit registration is removed; no persistent allow rule, paid API key or unrelated connector change is made.

## 15. Measurement Plan
Final target: ten packets of twelve documents and six questions per packet, six synthetic and four real packets. Gold must be independently specified and human-reviewed real cases kept separate until adjudicated. Freeze inputs, questions, rules and code hashes before the final campaign. Use balanced Gemini Flash/Pro repetitions and common extraction. C: structured Context versus text retrieval over the same originals. D: bounded genuine agent missions, permission refusal, handoffs, HOLD, stale revisions and changes of source fingerprints. Campaign targets remain plans, not completed counts.

## 16. Priorities and Next Actions
1. Resolve the CLI discovery/reload and browser lifetime issue without weakening permissions. 2. Admit and snapshot real primary-source passages, record licenses and unresolved labels. 3. Freeze independent final cases. 4. Execute paired model runs and actual tool-choice missions. 5. Conduct human review/export, Context comparison and packet-aware analysis. 6. Prepare separate English Sanity and Kaggle articles; publication and submission have not occurred.

## 17. Risks and Limits
Two identical decision algorithms cannot validate theoretical advantage. Duplicate source votes cannot increase independent evidence. Unknown attributes cannot silently become identical or incompatible. Financial cost is limited to existing free quotas; no top-up or subscription activated. The last observed Kaggle UI quota is $0.18/$10 daily and $0.18/$100 monthly; notebook run costs alone sum to $0.074435, so those values refer to different scopes. Antigravity Gemini usage last observed at approximately 2.12% of the five-hour limit. New long lots stop at 85%, with the user hard stop at 89%. No quota reset was performed. The final 120-document corpus and final comparison are incomplete.

## 18. Sources and Artifacts
Primary runtime evidence: archived safe notebook runs, final model answers, schema results, public transport trace and live readback. Original user-provided metadata JSON contains usage only; the pasted full safe export matches the decisions and assertions but has accent corruption in one rationale. The browser-captured UTF-8 export is retained as canonical. Gold stays outside model prompts.

- Live: https://orbit.securedme.ca/benchmark/
- Private owner task: https://www.kaggle.com/benchmarks/tasks/celebrum/orbit-scoped-evidence-pilot-v2/1
- Private notebook: https://www.kaggle.com/code/celebrum/orbit-scoped-evidence-development-pilot
- Kaggle SDK: https://github.com/Kaggle/kaggle-benchmarks
- Antigravity MCP: https://antigravity.google/docs/mcp?tab=cli
- Native WebMCP: https://developer.chrome.com/docs/ai/webmcp/imperative-api
- Sanity Context: https://www.sanity.io/docs/ai/sanity-context
- Engine bundle SHA-256: `886f7cf3fbfcb445f4c1af7ebf1d3f8cb581964fe20d3bce706e8b4f4b880bd9`
- Prompt v2 SHA-256: `785070d61245c64226ad070dff0196b3473edde8644fc333c501342d807e9c5f`

Artifact hashes are recorded in `results/artifact-manifest.json`. Local validation completed previously: 32 Vitest files / 117 tests, five policy tests, web and Studio builds. The updated benchmark page web build completed and its live aggregate matches byte-for-byte. This dossier does not present those code tests as agent or scientific performance.
