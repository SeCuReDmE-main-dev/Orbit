# Orbit evidence and agent benchmark — development dossier

Observed on 2026-09-30T03:59:39.313976+00:00. Status: partial development measurement, not independent final validation.

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
Accepted only for development debugging and extraction-contract checks. Not accepted for independent scientific ranking: tiny synthetic sample, shared development cases, one repetition, host defaults not normalized, real corpus not adjudicated, and no fully audited autonomous research trajectory yet. A passing exact quote is not semantic support. Fifty-three assertions are repeated checks on six cases, not 53 independent observations.

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
Local: `python tools/benchmark_suite_a.py --corpus .orbit/benchmark-corpus-development --output .orbit/benchmark-results/suite-a-replay.json`; `python tools/summarize_benchmark.py`; `python tools/test_webmcp_transport.py`. New model calls require an observed quota check and a fresh experiment ID. Kaggle notebook generated by `python tools/prepare_kaggle_pilot.py --model google/gemini-3.8-flash --model google/gemini-3.1-pro-preview`. Archived harness copies are provenance snapshots; run canonical scripts from the repository root because they resolve paths relative to `tools/`.

## 14. Measured Results
Two actual notebook runs completed and are archived. The built private Kaggle task v1 initially shows a Flash result only; do not equate task-page history with the notebook pair. Antigravity desktop Flash and CLI Flash/Pro each produce six correct decisions and eight exact quotes; schema rejects one v1 contextual record. Native scripted transport discovers fifteen tools, returns READY for capabilities and CONSENT_REQUIRED for the unshared question. Public Context reads return READY for privacy/deep-research and Sanity/schema paths. These reads are scripted, not a complete research agent trace.

Native CLI W01 attempts: two headless runs expose no native calls; an interactive attempt uses prohibited fallback web tools and is stopped before a URL fetch; a reloaded interactive session issues two tool attempts but times out and then loses the expired browser; a fresh interactive Flash attempt is blocked by Gemini without any Orbit call. Pro with a new-project request receives no Orbit tools. Native CLI integration is unresolved; temporary registration is removed and existing approval rules/connectors are preserved.

An external JSON planner loop now executes the model's choices in the real native page. Flash performs capabilities and private-question calls and passes the core fields, but incorrectly generalizes the private refusal to public Context. This interpretation defect remains unresolved in the original output. Pro performs capabilities, then a page-generation guard refuses the next request. The navigation cause is unknown. A scripted delayed lifecycle check passes separately. The model-effort mismatch and earlier single-object protocol failures remain archived. These prototype versions are not pooled as identical repetitions. No full autonomous research trajectory, human decision or native Antigravity MCP repair is inferred.

W02 via the external planner now observes genuine Context reads. Flash makes four calls, with four individually bound exact quotes but only one of four claims retaining an original URL; its fourth quote needs semantic review. Pro makes two calls and reads two entries together despite the mission constraint, so individually bound quote attribution is refused; both cited URLs are absent. Three earlier W02 attempts stop before any model call and are transport failures, not model failures. A lost early readline event caused a startup race; attaching its iterator before awaited trace writing corrects the transport. The immediate-initialize regression passes against real native WebMCP.

Direct upstream RPC inspection has content/text only, with no hidden citation metadata or structuredContent. Several Deep Research Web references have titles but no original URLs. The additive public provenance contract records only returned references and explicitly leaves unknown URLs unresolved. The application shows that limitation. Sanity Dashboard inspection in read-only mode displays 30 imports, a sum of 82 source documents, 20 entries and zero pending issues; these are not a hidden index counter. No sources, instructions or issues were changed.

## 15. Measurement Plan
Final target: ten packets of twelve documents and six questions per packet, six synthetic and four real packets. Four real candidate packets now contain 48 retrieved originals and 24 question prompts; zero real gold questions are human-reviewed and zero documents are imported into Sanity. Only metadata and links are public pending license clearance. Retrieval errors and two off-topic identifiers are retained as exclusions. Earlier synthetic packets remain development material, separate from a future independent campaign. Freeze inputs, questions, rules and code hashes before final scoring. Use balanced Gemini Flash/Pro repetitions and common extraction. C: structured Context versus text retrieval over the same originals. D: bounded genuine agent missions, permission refusal, handoffs, HOLD, stale revisions and changes of source fingerprints. Campaign targets remain plans, not completed counts.

## 16. Priorities and Next Actions
1. Verify original sources and incomplete URL chains, then continue Context and dossier missions with the explicitly labeled external adapter; native CLI injection remains a distinct diagnostic. 2. Review the 48 real candidates, their exact passages, licenses and reference answers. 3. Freeze independent final cases. 4. Execute paired model runs, handoffs and actual tool-choice missions. 5. Conduct human review/export, Context comparison and packet-aware analysis. 6. Prepare separate English Sanity and Kaggle articles; publication and submission have not occurred.

## 17. Risks and Limits
Two identical decision algorithms cannot validate theoretical advantage. Duplicate source votes cannot increase independent evidence. Unknown attributes cannot silently become identical or incompatible. Financial cost is limited to existing free quotas; no top-up or subscription activated. The last observed Kaggle UI quota is $0.18/$10 daily and $0.18/$100 monthly; notebook run costs alone sum to $0.074435, so those values refer to different scopes. Antigravity Gemini usage last observed at approximately 5.72% of the five-hour limit, and 0.95% of the weekly limit, after W02 Pro v4 (2026-09-30 UTC). Codex account usage separately displays 18%; its one reset credit remains unused. New long lots stop at 85%, with the user hard stop at 89%. No quota reset was performed. The final 120-document corpus and final comparison are incomplete.

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

Artifact hashes are recorded in `results/artifact-manifest.json`. Earlier local validation: 32 Vitest files / 117 tests, five policy tests, web and Studio builds. Current validation executes all 33 Vitest files / 124 tests plus five policy tests, then 19 targeted checks after the final UI notice, four source-intake boundary tests, ten planner-protocol tests and a suite-A replay (each engine 36/36, 108/108 invariants, 18/18 relations). The web build succeeds, with its existing chunk-size warning retained. Five rendered pages of report edition 0.4 are visually inspected; author and scientific review remain pending. Live readback artifacts state exactly which release was verified. These code tests are not agent or scientific performance.
