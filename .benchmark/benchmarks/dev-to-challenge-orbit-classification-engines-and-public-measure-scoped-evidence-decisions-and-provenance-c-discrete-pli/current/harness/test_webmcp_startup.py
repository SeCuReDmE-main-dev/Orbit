"""Regression: send initialize immediately, before the live adapter is ready.

The client waits for that single response before sending anything else. Unlike
a bulk input followed by EOF, this detects a lost first readline event.
No model, API key, dossier consent or human approval is involved.
"""
import importlib.util
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('orbit_planner', ROOT/'tools/gemini-webmcp-loop.py')
planner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(planner)
out = ROOT/'.orbit/benchmark-results'
trace = out/'webmcp-startup-regression-trace.jsonl'
out.mkdir(parents=True, exist_ok=True)
started = time.monotonic()
page = planner.NativePage(trace)
try:
    assert len(page.tools) == 15
    capabilities = page.execute('orbit_get_capabilities', {})
    refusal = page.execute('orbit_get_research_request', {})
    assert capabilities['state'] == 'READY'
    assert capabilities['workspace']['readable'] is False
    assert refusal['state'] == 'CONSENT_REQUIRED'
finally:
    page.close()
report = {'passed': True, 'host': 'scripted early-initialize regression over real native WebMCP',
          'autonomousAgent': False, 'modelCalls': 0, 'nativeTools': 15,
          'privateQuestionState': refusal['state'],
          'durationSeconds': round(time.monotonic()-started, 3)}
(out/'webmcp-startup-regression.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report))
