"""Bounded official-account CLI pilot; does not use an API key or publish anything."""
import argparse
import json
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODELS = ('gemini-3.8-flash-high', 'gemini-3.1-pro-high')

def invoke(binary, cwd, arguments, timeout):
    process = subprocess.run([str(binary), *arguments], cwd=cwd, capture_output=True,
                             text=True, encoding='utf-8', errors='replace', timeout=timeout)
    envelopes = []
    for line in process.stdout.splitlines():
        try:
            candidate = json.loads(line)
            if isinstance(candidate, dict) and 'status' in candidate:
                envelopes.append(candidate)
        except ValueError:
            pass
    if process.returncode or len(envelopes) != 1 or envelopes[0]['status'] != 'SUCCESS':
        raise RuntimeError('Official CLI did not return exactly one successful final envelope. '
                           'No partial response will be scored. Exit='+str(process.returncode))
    return envelopes[0]

def quota(binary, cwd):
    result = invoke(binary, cwd, ['-p', '/usage', '--output-format', 'json', '--print-timeout', '30s'], 60)
    groups = result.get('command', {}).get('data', {}).get('groups', [])
    group = next((row for row in groups if row['name']=='Gemini Models'), None)
    if not group or not group.get('buckets'):
        raise RuntimeError('Quota unavailable: do not launch another model run.')
    buckets = [{key: b[key] for key in ('id','window','remaining_fraction','reset_time') if key in b} for b in group['buckets']]
    used = max(100*(1-b['remaining_fraction']) for b in buckets)
    if used >= 85:
        raise RuntimeError('No new lot at 85% used; hard stop is 89%.')
    return buckets

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--binary', type=Path, default=ROOT / '.orbit/antigravity-tooling/bin/agy.exe')
    parser.add_argument('--model', choices=MODELS, required=True)
    args = parser.parse_args()
    config = Path.home() / '.gemini/antigravity-cli/settings.json'
    if config.exists() and json.loads(config.read_text(encoding='utf-8')).get('modelProvider') == 'gemini':
        raise RuntimeError('API-key provider configured; account-only zero-spend pilot refused.')
    folder = ROOT / '.orbit/gemini-pilot-v1'
    prompt = (folder / 'prompt.txt').read_text(encoding='utf-8')
    output = folder / (args.model+'-cli-answer.json')
    if output.exists():
        raise RuntimeError('Existing result preserved; use a new experiment identifier to rerun.')
    # The agent workspace contains neither gold nor private project files.
    with tempfile.TemporaryDirectory(prefix='orbit-public-model-pilot-') as workdir:
        workspace = Path(workdir).resolve()
        temp_root = Path(tempfile.gettempdir()).resolve()
        if workspace.parent != temp_root or not workspace.name.startswith('orbit-public-model-pilot-'):
            raise RuntimeError('Unexpected temporary workspace: recursive cleanup target is not verified.')
        before = quota(args.binary, workdir)
        started = datetime.now(timezone.utc).isoformat()
        result = invoke(args.binary, workdir, ['-p', prompt, '--model', args.model, '--effort', 'high',
                                               '--mode', 'plan', '--disable-slash-commands',
                                               '--output-format', 'json', '--print-timeout', '150s'], 180)
        text = result['response'].strip()
        if text.startswith('```'):
            text = '\n'.join(text.splitlines()[1:-1])
        answer = json.loads(text)
        if not isinstance(answer.get('results'), list):
            raise RuntimeError('Invalid final JSON; no score recorded.')
        observed = {'model': args.model, 'host': 'Antigravity official CLI 1.2.13',
                    'startedAt': started, 'observedCompletedAt': datetime.now(timezone.utc).isoformat(),
                    'durationSeconds': result.get('duration_seconds'), 'usage': result.get('usage'),
                    'quotaBefore': before, 'context': 'fresh conversation, temporary empty workspace, plan mode',
                    'capture': 'Final response and usage only; no thinking trace saved.', **answer}
        output.write_text(json.dumps(observed, indent=2)+'\n', encoding='utf-8')
        after = quota(args.binary, workdir)
        observed['quotaAfter'] = after
        output.write_text(json.dumps(observed, indent=2)+'\n', encoding='utf-8')
        print(json.dumps({'output': str(output), 'model': args.model, 'questions': len(answer['results']),
                          'durationSeconds': observed['durationSeconds'], 'usage': observed['usage'],
                          'quotaAfter': after}), flush=True)

if __name__ == '__main__':
    main()
