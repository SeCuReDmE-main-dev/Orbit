"""Publish aggregates from observed artifacts; never substitute missing measurements."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'web/public/benchmark'
PUBLIC.mkdir(parents=True,exist_ok=True)
pilot=[]
for path in sorted((ROOT/'.orbit/gemini-pilot-v1').glob('*-scored.json')):
    scored=json.loads(path.read_text())
    answer_path=path.with_name(path.name.replace('-scored.json','.json'))
    answer=json.loads(answer_path.read_text())
    pilot.append({k:scored[k] for k in ('model','host','questions','modelDecisionsCorrect','quotesExact','quoteChecks','engines')} | {
        'promptVersion':1,'repetitions':1,'durationSeconds':answer.get('durationSeconds'),
        'usage':answer.get('usage'),'answerSha256':scored['answerSha256']})
observed_path=ROOT/'.orbit/kaggle-pilot-v2/observed-runs.json'
kaggle=[]
if observed_path.exists():
    runs=json.loads(observed_path.read_text())
    gold=json.loads((ROOT/'.orbit/gemini-pilot-v1/private-gold.json').read_text())
    public=json.loads((ROOT/'.orbit/gemini-pilot-v1/public-input.json').read_text())
    docs={d['id']:d for d in public['documents']}
    manifest=json.loads((ROOT/'.orbit/kaggle-pilot-v2/manifest.json').read_text())
    for run in runs:
        assert run['state']=='BENCHMARK_TASK_RUN_STATE_COMPLETED'
        assert len(run['results'])==1 and run['results'][0]['type']=='AGGREGATED' and isinstance(run['results'][0].get('dictResult'),dict)
        result=run['results'][0]['dictResult']
        assert result['engineSha256']==manifest['engineSha256']
        assert result['promptSha256']==manifest['promptSha256']
        rows=result['answer']['results']
        assert len(rows)==6 and {r['questionId'] for r in rows}==set(gold)
        evidence=[e for r in rows for e in r['evidence']]
        engines=result['engineEvaluations']
        assert len(engines)==18
        kaggle.append({'model':run['modelVersion']['slug'],'host':'Kaggle Benchmarks 0.6.1','promptVersion':2,'repetitions':1,
            'questions':6,'modelDecisionsCorrect':sum(r['decision']==gold[r['questionId']] for r in rows),
            'quotesExact':sum(e['sourceId'] in docs and bool(e['quote']) and e['quote'] in docs[e['sourceId']]['text'] for e in evidence),
            'quoteChecks':len(evidence),'assertionsPassed':sum(a['status']=='BENCHMARK_TASK_RUN_ASSERTION_STATUS_PASSED' for a in run['assertions']),
            'assertionsTotal':len(run['assertions']), 'engines':{engine:{'evaluated':sum(e['ok'] for e in engines if e['engine']==engine),'correctEvaluated':sum(e['ok'] and e['result'][0]['decision']==gold[e['questionId']] for e in engines if e['engine']==engine),'schemaErrors':sum(not e['ok'] for e in engines if e['engine']==engine)} for engine in ('baseline','n','p')},
            'usage':run['observedUsage']['agent_result'],'startedAt':run['startTime'],'completedAt':run['endTime'],
            'promptSha256':result['promptSha256'],'engineSha256':result['engineSha256']})
summary={'status':'development-pilots-not-final-benchmark','updatedAt':datetime.now(timezone.utc).isoformat(),
    'antigravity':pilot,'kaggle':kaggle,'kaggleNotebook':'https://www.kaggle.com/code/celebrum/orbit-scoped-evidence-development-pilot',
    'kaggleTask':'https://www.kaggle.com/benchmarks/tasks/celebrum/orbit-scoped-evidence-pilot-v2/1',
    'kaggleVisibility':'Notebook and built task v1 are private. The task page initially displays one Flash result; the notebook export contains both model runs. No challenge submission published.',
    'limitations':['One development repetition per model and host, six synthetic questions. No independent final validation.',
        'Version 2 clarifies the evidence scope schema after a version 1 failure; results are not pooled.',
        'Exact quotation is checked separately from semantic relevance.',
        'Baseline and N use the same eligibility and decision rules here; this is not evidence for different theoretical performance.',
        'Host defaults and reasoning budgets are not normalized; no cross-host speed or intelligence ranking.',
        'Kaggle reported model cost consumes free AI quota; no purchase or paid top-up made.',
        'No successful autonomous native WebMCP trajectory has been observed yet. Scripted transport and public Context reads succeeded.']}
(PUBLIC/'gemini-development-pilots.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'antigravityRuns':len(pilot),'kaggleRuns':len(kaggle),'kaggle':[{'model':r['model'],'correct':r['modelDecisionsCorrect'],'assertionsPassed':r['assertionsPassed'],'assertionsTotal':r['assertionsTotal'],'engines':r['engines']} for r in kaggle]}))
