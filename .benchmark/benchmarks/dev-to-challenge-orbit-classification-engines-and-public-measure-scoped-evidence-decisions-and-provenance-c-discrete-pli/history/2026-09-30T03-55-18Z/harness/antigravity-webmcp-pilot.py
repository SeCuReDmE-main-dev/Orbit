"""One bounded agent discovery mission through the live page, preserving permissions."""
import argparse
import importlib.util
import json
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('orbit_account_pilot', ROOT/'tools/antigravity-pilot.py')
account = importlib.util.module_from_spec(spec)
spec.loader.exec_module(account)
parser = argparse.ArgumentParser()
parser.add_argument('--model', choices=account.MODELS, required=True)
parser.add_argument('--attempt', choices=(1,2), type=int, default=1)
args = parser.parse_args()
binary = ROOT/'.orbit/antigravity-tooling/bin/agy.exe'
out = ROOT/'.orbit/benchmark-results'/('w01-'+args.model+(('-attempt-'+str(args.attempt)) if args.attempt>1 else ''))
out.mkdir(parents=True, exist_ok=True)
if (out/'result.json').exists():
    raise RuntimeError('Existing mission output preserved. Use a new experiment ID to repeat.')
settings = Path.home()/'.gemini/antigravity-cli/settings.json'
if settings.exists() and json.loads(settings.read_text(encoding='utf-8')).get('modelProvider') == 'gemini':
    raise RuntimeError('API-key model provider refused by zero-spend constraint.')
prompt = '''You are completing a live Orbit discovery mission W01. Use only the Orbit MCP tools made available in this session. Do not read local files, run shell commands, browse other sites, or delegate. Discover what this public page actually offers, identify the effective permissions, and establish whether a private research question is readable without its owner sharing it. Do not request or manufacture permission, submit a proposal, launch research, or read Knowledge Base entries for this discovery mission. Choose your own minimal calls. A consent refusal is an expected observation, not permission to bypass it. Return a short JSON object with observed tool count, permission state, the private-question outcome, tools actually used and limitations. Do not infer success from descriptions alone. If a tool approval prevents execution, report that specific blocker and stop. Maximum twenty calls and two minutes; never use non-Orbit tools.'''
with tempfile.TemporaryDirectory(prefix='orbit-public-webmcp-agent-') as workdir:
    workspace = Path(workdir).resolve()
    if workspace.parent != Path(tempfile.gettempdir()).resolve() or not workspace.name.startswith('orbit-public-webmcp-agent-'):
        raise RuntimeError('Temporary cleanup path is outside the verified test scope.')
    before = account.quota(binary, workdir)
    config = workspace/'.agents/mcp_config.json'
    config.parent.mkdir()
    config.write_text(json.dumps({'mcpServers': {'orbit': {'command': shutil.which('node'), 'args': [str(ROOT/'node_modules/tsx/dist/cli.mjs'),str(ROOT/'tools/webmcp-stdio.ts')], 'env': {'ORBIT_BENCHMARK_TRACE': str(out/'native-page-trace.jsonl')}}}}, indent=2))
    started = datetime.now(timezone.utc).isoformat()
    completed = subprocess.run([str(binary), '-p', prompt, '--model',args.model,'--effort','high','--mode','plan','--disable-slash-commands','--output-format','json','--print-timeout','120s'],cwd=workspace,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=150)
    envelopes=[]
    for line in completed.stdout.splitlines():
        try:
            row=json.loads(line)
            if isinstance(row,dict) and 'status' in row:
                envelopes.append(row)
        except ValueError:
            pass
    record={'mission':'W01','attempt':args.attempt,'host':'Antigravity CLI 1.2.13 -> MCP adapter -> native public-page WebMCP','model':args.model,'startedAt':started,'observedCompletedAt':datetime.now(timezone.utc).isoformat(),'exitCode':completed.returncode,'quotaBefore':before,'permissionPolicy':'Unchanged: no auto-approval bypass or global allow rule','transportTest':'Already passed separately; this record must contain real agent calls to count as an autonomous trajectory.'}
    if len(envelopes)==1:
        record.update({key:envelopes[0].get(key) for key in ('status','response','usage','duration_seconds')})
    else:
        record.update({'status':'NO_FINAL_ENVELOPE','response':None,'usage':None})
    trace = out/'native-page-trace.jsonl'
    native=[json.loads(x) for x in trace.read_text().splitlines()] if trace.exists() else []
    record['observedNativeCalls']=[x['name'] for x in native if x.get('type')=='call']
    record['autonomousNativeExecutionObserved']=bool(record['observedNativeCalls'])
    record['transportMethods']=[x['method'] for x in native if x.get('type')=='transport']
    if not record['autonomousNativeExecutionObserved']:
        record['missionStatus']='NOT_EXECUTED'
    else:
        record['missionStatus']='NATIVE_CALLS_OBSERVED_REVIEW_REQUIRED'
    (out/'result.json').write_text(json.dumps(record,indent=2)+'\n')
    # Remove only the temporary connection definition before the usage command.
    config.unlink()
    record['quotaAfter']=account.quota(binary,workdir)
    (out/'result.json').write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps({key:record[key] for key in ('status','model','observedNativeCalls','autonomousNativeExecutionObserved','quotaAfter')}))
