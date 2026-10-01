"""Prepare a private Kaggle development task using the same bundled TS engine.

No credentials, model calls or publication occur while preparing this artifact.
The first cell is a free environment/catalog preflight. Model IDs are set only
after the account's actual catalog and free quota have been inspected.
"""
import argparse
import base64
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--model', action='append', default=[])
args = parser.parse_args()
allowed = {'google/gemini-3.8-flash', 'google/gemini-3.1-pro-preview'}
if any(model not in allowed for model in args.model):
    raise ValueError('Only the two Gemini IDs observed in the Kaggle account are permitted.')
OUT = ROOT / '.orbit/kaggle-pilot-v2'
OUT.mkdir(parents=True, exist_ok=True)
bundle = OUT / 'engine.mjs'
subprocess.run(['node', str(ROOT / 'node_modules/esbuild/bin/esbuild'),
                str(ROOT / 'tools/engine-jsonl.ts'), '--bundle', '--platform=node',
                '--format=esm', '--target=node20', '--outfile='+str(bundle)],
               check=True, cwd=ROOT)
public = json.loads((ROOT / '.orbit/gemini-pilot-v1/public-input.json').read_text())
gold = json.loads((ROOT / '.orbit/gemini-pilot-v1/private-gold.json').read_text())
prompt = (ROOT / '.orbit/gemini-pilot-v1/prompt.txt').read_text()
prompt = prompt.replace('Orbit development pilot.', 'Orbit development pilot version 2.')
prompt += '\nContract clarification added before this new experiment: a scope object requires subject, property and value. If a contextual passage asserts no atomic property/value, omit its entire scope object. Never manufacture those fields. Optional mode/provider/product/version attributes must remain absent when unknown. Do not return null scope. This clarification changes the prompt; results must not be pooled with version 1.\n'
preflight = '''import sys, shutil, json, importlib.metadata
import kaggle_benchmarks as kbench
print(json.dumps({"python": sys.version, "sdk": importlib.metadata.version("kaggle-benchmarks"), "node": shutil.which("node"), "models": sorted(kbench.llms.keys()), "defaultModel": getattr(kbench.llm, "name", None)}, indent=2))
'''
definition = f'''import base64, hashlib, io, json, subprocess, tarfile, urllib.request
from pathlib import Path
NODE = shutil.which('node')
if not NODE:
    # Official free runtime, fixed version and verified against vendor SHASUMS256.
    node_url = 'https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz'
    with urllib.request.urlopen(node_url, timeout=45) as response:
        archive = response.read(64*1024*1024+1)
    if len(archive)>64*1024*1024 or hashlib.sha256(archive).hexdigest() != '00bbd05e306ea68b6e13e17360d0e2f680b493ef95f2fea1c4296ff7437530bc':
        raise RuntimeError('Official Node archive integrity check failed.')
    destination=Path('/kaggle/working/orbit-node-runtime').resolve()
    destination.mkdir(exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:xz') as package:
        # Extract only the executable, not arbitrary archive members or links.
        member=package.getmember('node-v22.20.0-linux-x64/bin/node')
        if not member.isfile() or member.size>150*1024*1024:
            raise RuntimeError('Unexpected Node executable in verified archive.')
        executable=destination/'node'
        executable.write_bytes(package.extractfile(member).read())
        executable.chmod(0o700)
        NODE=str(executable)
node_version=subprocess.run([NODE,'--version'], capture_output=True,text=True,check=True,timeout=10).stdout.strip()
if int(node_version.lstrip('v').split('.')[0])<20:
    raise RuntimeError('Node >=20 is required by the shared engine.')
print('Verified shared-engine runtime:',node_version)
PUBLIC = json.loads({json.dumps(json.dumps(public))})
GOLD = json.loads({json.dumps(json.dumps(gold))})  # Scorer only. Never included in any model prompt.
PROMPT = {json.dumps(prompt)}
ENGINE_BYTES = base64.b64decode({json.dumps(base64.b64encode(bundle.read_bytes()).decode())})
ENGINE_SHA256 = {json.dumps(hashlib.sha256(bundle.read_bytes()).hexdigest())}
assert hashlib.sha256(ENGINE_BYTES).hexdigest() == ENGINE_SHA256
ENGINE_PATH = Path('/kaggle/working/orbit-engine.mjs')
ENGINE_PATH.write_bytes(ENGINE_BYTES)

@kbench.task(name="Orbit scoped evidence pilot v2", description="Development only: scoped decisions, exact passages and a shared TypeScript engine; no calibrated truth score.")
def orbit_pilot(llm) -> dict:
    if not NODE:
        raise RuntimeError('Shared TypeScript engine requires Node >=20; no divergent Python engine is substituted.')
    raw = llm.prompt(PROMPT)
    if raw.strip().startswith('```'):
        raw = '\\n'.join(raw.strip().splitlines()[1:-1])
    answer = json.loads(raw)
    rows = answer['results']
    kbench.assertions.assert_equal(set(GOLD), {{r['questionId'] for r in rows}}, expectation='Every question appears exactly once.')
    kbench.assertions.assert_equal(6, len(rows), expectation='Six distinct questions, without duplicate output.')
    docs = {{d['id']: d for d in PUBLIC['documents']}}
    qs = {{q['id']: q for q in PUBLIC['questions']}}
    requests, metadata = [], []
    for row in rows:
        q = qs[row['questionId']]
        kbench.assertions.assert_equal(GOLD[q['id']], row['decision'], expectation='Decision respects the exact question scope: '+q['id'])
        for e in row['evidence']:
            kbench.assertions.assert_true(e['sourceId'] in docs and bool(e['quote']) and e['quote'] in docs[e['sourceId']]['text'], expectation='Quotation occurs verbatim in the named source. This is not semantic verification.')
        d = {{'format':'orbit-evidence-v1','id':q['id'],'title':'Synthetic pilot v2','question':q['statement'],'objective':'','context':'','revision':0,'createdAt':'2026-09-29T00:00:00.000Z','updatedAt':'2026-09-29T00:00:00.000Z','axes':[], 'sources':[{{'id':x['id'],'title':x['id'],'url':'https://example.org/orbit-pilot/'+x['id'],'status':'read','text':x['text'],'contentHash':hashlib.sha256(x['text'].encode()).hexdigest()}} for x in docs.values()], 'claims':[{{'id':q['id'],'statement':q['statement'],'kind':'reported','disposition':'indeterminate','scopeAttributes':q['scope'],'evidence':row['evidence']}}],'screeningCriteria':[],'sourceDecisions':[],'extractions':[],'knowledgeReads':[],'answer':'','report':'','proposals':[],'reviews':[],'history':[],'example':True}}
        for engine in ('baseline','n','p'):
            requests.append({{'dossier':d,'engine':engine}})
            metadata.append((q['id'],engine))
    process = subprocess.run([NODE,str(ENGINE_PATH)], input=''.join(json.dumps(x)+'\\n' for x in requests), capture_output=True, text=True, timeout=60)
    if process.returncode:
        raise RuntimeError('Shared engine process failed, without scoring a partial output.')
    calculated = [json.loads(x) for x in process.stdout.splitlines() if x.strip()]
    kbench.assertions.assert_equal(len(metadata),len(calculated), expectation='Engine returned every evaluation.')
    evaluations=[]
    for (qid,engine),result in zip(metadata,calculated):
        kbench.assertions.assert_true(result['ok'], expectation='Evidence satisfies the portable schema: '+qid)
        if result['ok']:
            kbench.assertions.assert_equal(GOLD[qid], result['result'][0]['decision'], expectation='Shared engine decision is correct: '+engine+'/'+qid)
        evaluations.append({{'questionId':qid,'engine':engine,**result}})
    return {{'status':'development-only','promptSha256':hashlib.sha256(PROMPT.encode()).hexdigest(),'engineSha256':ENGINE_SHA256,'model':getattr(llm,'name',None),'answer':answer,'engineEvaluations':evaluations,'limitations':['Six synthetic development cases; not independent final validation.','Exact quotations do not establish semantic relevance.','Baseline and N share integrity rules; equality is possible.','Host and reasoning budgets differ from Antigravity.']}}
'''
run = '''# IDs pinned after account catalog and free quota inspection; no silent fallback.
SELECTED_MODELS = MODELS_PLACEHOLDER
if not SELECTED_MODELS:
    raise RuntimeError('Preflight only. Pin two available Gemini IDs before launching the pilot.')
for model_id in SELECTED_MODELS:
    if model_id not in kbench.llms:
        raise RuntimeError('Pinned model unavailable: '+model_id)
    orbit_pilot.run(kbench.llms[model_id])
'''
run = run.replace('MODELS_PLACEHOLDER', repr(args.model))
intro = '# Orbit — scoped evidence development pilot\n\nPrivate preparation. Six synthetic cases, twelve documents. This is a development pilot, not the sixty-question final benchmark. Gold is used by the scorer and excluded from PROMPT. Original failed outputs remain archived separately. No paid API or LLM judge is introduced.\n'
cells = [{'cell_type':'markdown','metadata':{},'source':intro.splitlines(keepends=True)}]
for code in (preflight, definition, run):
    compile(code, '<generated-cell>', 'exec')
    cells.append({'cell_type':'code','metadata':{},'execution_count':None,'outputs':[],'source':code.splitlines(keepends=True)})
notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'}},'cells':cells}
(OUT/'orbit-kaggle-pilot.ipynb').write_text(json.dumps(notebook,indent=2)+'\n')
(OUT/'task.py').write_text('# %%\n'+preflight+'\n# %%\n'+definition+'\n# %%\n'+run)
(OUT/'manifest.json').write_text(json.dumps({'status':'prepared-not-run','documents':12,'questions':6,'promptSha256':hashlib.sha256(prompt.encode()).hexdigest(),'engineSha256':hashlib.sha256(bundle.read_bytes()).hexdigest(),'originalV1Preserved':True,'selectedModels':args.model},indent=2)+'\n')
print(json.dumps({'notebook':str(OUT/'orbit-kaggle-pilot.ipynb'),'engineBytes':bundle.stat().st_size,'status':'prepared-not-run'}))
