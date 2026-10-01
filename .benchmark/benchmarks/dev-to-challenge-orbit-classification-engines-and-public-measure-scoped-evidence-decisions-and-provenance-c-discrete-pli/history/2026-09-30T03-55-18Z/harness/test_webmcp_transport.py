"""Exercise the real stdio -> live native WebMCP adapter, without approving a dossier."""
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.orbit' / 'benchmark-results'
OUT.mkdir(parents=True, exist_ok=True)
requests = [
    {'jsonrpc': '2.0', 'id': 1, 'method': 'initialize', 'params': {'protocolVersion': '2025-03-26', 'capabilities': {}, 'clientInfo': {'name': 'orbit-transport-test', 'version': '1'}}},
    {'jsonrpc': '2.0', 'method': 'notifications/initialized'},
    {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list', 'params': {}},
    {'jsonrpc': '2.0', 'id': 3, 'method': 'tools/call', 'params': {'name': 'orbit_get_capabilities', 'arguments': {}}},
    {'jsonrpc': '2.0', 'id': 4, 'method': 'tools/call', 'params': {'name': 'orbit_get_research_request', 'arguments': {}}},
]
env = {**os.environ, 'ORBIT_BENCHMARK_TRACE': str(OUT / 'webmcp-transport-test-trace.jsonl')}
completed = subprocess.run(['node', str(ROOT/'node_modules/tsx/dist/cli.mjs'), str(ROOT/'tools/webmcp-stdio.ts')], cwd=ROOT, env=env, input=''.join(json.dumps(x)+'\n' for x in requests), capture_output=True, text=True, timeout=100)
if completed.returncode:
    raise RuntimeError('Native WebMCP adapter failed: '+completed.stderr[-1000:])
messages = [json.loads(x) for x in completed.stdout.splitlines() if x.strip()]
results = {x['id']: x['result'] for x in messages}
assert results[1]['protocolVersion'] == '2025-03-26'
assert len(results[2]['tools']) == 15
capabilities = json.loads(results[3]['content'][0]['text'])
refused = json.loads(results[4]['content'][0]['text'])
assert capabilities['state'] == 'READY'
assert not capabilities['workspace']['readable']
assert refused['state'] == 'CONSENT_REQUIRED'
report = {'host': 'scripted MCP transport test over native public-page WebMCP', 'autonomousAgent': False, 'tools': 15, 'protocol': results[1]['protocolVersion'], 'privateDossierRead': refused['state'], 'capabilities': capabilities, 'passed': True}
(OUT/'webmcp-transport-test.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k != 'capabilities'}))
