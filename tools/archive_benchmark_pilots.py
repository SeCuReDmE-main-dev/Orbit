"""Archive observed pilot artifacts and refresh the existing indexed dossier."""
import csv
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
registry_path = ROOT / '.benchmark/index/benchmarks.json'
registry = json.loads(registry_path.read_text(encoding='utf-8-sig'))
entry = next(x for x in registry['benchmarks'] if x['title'] == 'Orbit Evidence and Agent Benchmark')
base = ROOT / '.benchmark/benchmarks' / entry['slug']
now = datetime.now(timezone.utc)
stamp = now.strftime('%Y-%m-%dT%H-%M-%SZ')
history = base / 'history' / stamp
history.mkdir(parents=True, exist_ok=False)
current = base / 'current'
summary = json.loads((ROOT / 'web/public/benchmark/gemini-development-pilots.json').read_text())
suite_a = json.loads((ROOT / 'web/public/benchmark/suite-a-development.json').read_text())
manifest = json.loads((ROOT / '.orbit/kaggle-pilot-v2/manifest.json').read_text())
files = [
    'web/public/benchmark/suite-a-development.json',
    'web/public/benchmark/gemini-development-pilots.json',
    '.orbit/kaggle-pilot-v2/observed-runs.json',
    '.orbit/kaggle-pilot-v2/manifest.json',
    '.orbit/kaggle-pilot-v2/orbit-kaggle-pilot.ipynb',
    '.orbit/benchmark-results/webmcp-transport-test.json',
    '.orbit/benchmark-results/webmcp-transport-test-trace.jsonl',
    '.orbit/benchmark-results/public-context-cases.json',
    '.orbit/benchmark-results/live-gemini-pilots.json',
    '.orbit/benchmark-results/live-gemini-report.json',
    '.orbit/benchmark-results/live-context-provenance.json',
    '.orbit/benchmark-results/deployment-context-provenance.json',
    '.orbit/benchmark-results/live-real-corpus-agents.json',
    '.orbit/benchmark-results/deployment-real-corpus-agents.json',
    '.orbit/benchmark-results/kb-live-budget-provenance.json',
    '.orbit/benchmark-results/webmcp-startup-regression.json',
    '.orbit/benchmark-results/webmcp-startup-regression-trace.jsonl',
    '.orbit/benchmark-results/public-context-provenance.json',
    '.orbit/benchmark-results/live-context-provenance-ui.json',
    '.orbit/benchmark-results/live-context-provenance-ui.jpg',
    'docs/delivery-2026-09-29/benchmark-pilot/real-corpus-review/review-worksheet.md',
    'docs/delivery-2026-09-29/benchmark-pilot/real-corpus-review/annotation-template.csv',
    'docs/delivery-2026-09-29/benchmark-pilot/publication_qa.json',
    '.orbit/benchmark-corpus-real-v1/manifest.json',
    '.orbit/benchmark-corpus-real-v1/documents.json',
    '.orbit/benchmark-corpus-real-v1/questions.json',
    'web/public/benchmark/real-corpus-candidates.json',
    'web/public/benchmark/agent-mission-observations.json',
    'docs/delivery-2026-09-29/benchmark-pilot/orbit-scoped-evidence-pilot-report.pdf',
]
files += [str(p.relative_to(ROOT)) for p in (ROOT/'.orbit/gemini-pilot-v1').glob('*answer*.json')]
files += [str(p.relative_to(ROOT)) for p in (ROOT/'.orbit/benchmark-results').glob('w01-*/result.json')]
files += [str(p.relative_to(ROOT)) for p in (ROOT/'.orbit/benchmark-results').glob('w02-*/result.json')]
files += [str(p.relative_to(ROOT)) for p in (ROOT/'.orbit/benchmark-results').glob('w0*/native-page-trace.jsonl')]
files += [str(p.relative_to(ROOT)) for p in (ROOT/'.orbit/antigravity-missions').glob('*/**/*trace.jsonl')]
files += [str(p.relative_to(ROOT)) for p in (ROOT/'.orbit/antigravity-missions').glob('*/**/*result.json')]
artifacts = []
for relative in dict.fromkeys(files):
    source = ROOT / relative
    if not source.is_file():
        continue
    name = relative.replace('\\','/').replace('/','__')
    for folder in (current/'results', history/'results'):
        folder.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, folder/name)
    artifacts.append({'source':relative,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'archivedAs':name})

harnesses = ['benchmark_suite_a.py','benchmark-corpus.ts','engine-jsonl.ts','prepare_gemini_pilot.py',
             'score_gemini_pilot.py','prepare_kaggle_pilot.py','antigravity-pilot.py',
             'antigravity-webmcp-pilot.py','webmcp-stdio.ts','webmcp-browser.ts',
             'test_webmcp_transport.py','summarize_benchmark.py','prepare_real_corpus.py',
             'test_real_corpus_intake.py','gemini-webmcp-loop.py','test_gemini_planner_protocol.py',
             'summarize_agent_missions.py','test_webmcp_startup.py','check_context_provenance.ts']
for name in harnesses:
    for folder in (current/'harness', history/'harness'):
        folder.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT/'tools'/name, folder/name)

table = '\n'.join(f"| {r['model']} | {r['host']} | v{r['promptVersion']} | {r['modelDecisionsCorrect']}/{r['questions']} | {r['quotesExact']}/{r['quoteChecks']} | {r['engines']['n']['correctEvaluated']}/{r['engines']['n']['evaluated']} | {r['engines']['n']['schemaErrors']} |" for r in summary['antigravity']+summary['kaggle'])
report = f'''# Orbit evidence and agent benchmark — development dossier

Observed on {now.isoformat()}. Status: partial development measurement, not independent final validation.

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
{table}

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
- Private owner task: {summary['kaggleTask']}
- Private notebook: {summary['kaggleNotebook']}
- Kaggle SDK: https://github.com/Kaggle/kaggle-benchmarks
- Antigravity MCP: https://antigravity.google/docs/mcp?tab=cli
- Native WebMCP: https://developer.chrome.com/docs/ai/webmcp/imperative-api
- Sanity Context: https://www.sanity.io/docs/ai/sanity-context
- Engine bundle SHA-256: `{manifest['engineSha256']}`
- Prompt v2 SHA-256: `{manifest['promptSha256']}`

Artifact hashes are recorded in `results/artifact-manifest.json`. Earlier local validation: 32 Vitest files / 117 tests, five policy tests, web and Studio builds. Current validation executes all 33 Vitest files / 124 tests plus five policy tests, then 19 targeted checks after the final UI notice, four source-intake boundary tests, ten planner-protocol tests and a suite-A replay (each engine 36/36, 108/108 invariants, 18/18 relations). The web build succeeds, with its existing chunk-size warning retained. Five rendered pages of report edition 0.4 are visually inspected; author and scientific review remain pending. Live readback artifacts state exactly which release was verified. These code tests are not agent or scientific performance.
'''
validity = '''# Benchmark validity — partial development only
Valid dimensions: input-contract failures, exact quote occurrence, deterministic invariants, native registration and refusals. Comparators share the same inputs and implementation. Baseline and N have the same decision rules. Invalid current claims: scientific superiority, independent generalization, normalized host ranking, successful end-to-end agent mission, fully adjudicated 120-document corpus. Final gold, real source review, packet-aware repetitions and human end-to-end audit remain required.
'''
benchmark_map = '''# Benchmark map
| Target | User outcome | Dimension | Comparator | Priority |
|---|---|---|---|---|
| classifyEvidence | Preserve support, counterproof and HOLD | Unjustified decisions, useful abstention | Baseline/N/P | First |
| compareClaimRelation | Distinguish scope and replacement | False contradictions, rule explanations | Same common extraction | First |
| Context reads | Inspect how source structure changes answer | Correct distinctions, source coverage | Original text retrieval | Second |
| native WebMCP tools | Actual agent tool choice | Completion, consent, revision boundaries | Ten vs fifteen tools | Second |
| handoff records | Preserve provenance across sub-agents | Lost scope, invented certainty | Coordinated roles | Second |
'''
for folder in (current, history):
    (folder/'report.md').write_text(report, encoding='utf-8')
    (folder/'benchmark-validity.md').write_text(validity, encoding='utf-8')
    (folder/'benchmark-map.md').write_text(benchmark_map, encoding='utf-8')
    (folder/'results/artifact-manifest.json').write_text(json.dumps(artifacts, indent=2)+'\n')
    with (folder/'results/pilot-results.csv').open('w',newline='',encoding='utf-8') as f:
        writer=csv.writer(f)
        writer.writerow(['model','host','promptVersion','correct','questions','exactQuotes','quoteChecks','schemaErrors'])
        for row in summary['antigravity']+summary['kaggle']:
            writer.writerow([row['model'],row['host'],row['promptVersion'],row['modelDecisionsCorrect'],row['questions'],row['quotesExact'],row['quoteChecks'],row['engines']['n']['schemaErrors']])

state = json.loads((base/'benchmark.json').read_text())
state.update(updated_at=now.isoformat(), validity_status='partial-development', execution_status='development-pilots-executed-final-campaign-incomplete',
    research_questions=['Scope/contradiction accuracy','Useful HOLD versus coverage','Context versus original text','Actual WebMCP and provenance handoffs'],
    next_steps=['Audit original-source URL gaps and semantic support','Review real primary-source packets','Freeze independent cases','Run paired final campaigns'],
    result_artifact_paths=[str((current/'results'/x['archivedAs']).relative_to(ROOT)) for x in artifacts], latest_history_path=str(history.relative_to(ROOT)))
task={'timestamp':now.isoformat(),'status':'partial-development','objective':'Archive observed Gemini pilots and failed agent attempts','report_path':str((history/'report.md').relative_to(ROOT))}
(history/'task.json').write_text(json.dumps(task,indent=2)+'\n')
state['history'].append({'timestamp':now.isoformat(),'history_path':str(history.relative_to(ROOT)),'task_path':str((history/'task.json').relative_to(ROOT))})
(base/'benchmark.json').write_text(json.dumps(state,indent=2)+'\n')
entry.update(updated_at=now.isoformat(),validity_status=state['validity_status'],execution_status=state['execution_status'],latest_history_path=state['latest_history_path'])
registry['updated_at']=now.isoformat()
registry_path.write_text(json.dumps(registry,indent=2)+'\n')
pointer={'codebase_root':str(ROOT),'active_benchmark_slug':entry['slug'],'active_benchmark_path':str(base.relative_to(ROOT)),
         'latest_task_path':str((history/'task.json').relative_to(ROOT)),'latest_report_path':str((current/'report.md').relative_to(ROOT)),
         'latest_benchmark_map_path':str((current/'benchmark-map.md').relative_to(ROOT)),'updated_at':now.isoformat()}
(ROOT/'.benchmark/last-task.json').write_text(json.dumps(pointer,indent=2)+'\n')
print(json.dumps({'report':str(current/'report.md'),'history':str(history),'artifacts':len(artifacts),'status':state['validity_status']}))
