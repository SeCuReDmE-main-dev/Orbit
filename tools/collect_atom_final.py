"""Collect cloud observations; assertions are executed by Kaggle, never here."""
from pathlib import Path
import json
from e2b import Sandbox
from orbit_cloud_lab import ROOT, credentials

key = credentials(Path(r'Z:\SecuredMe Education suite\.env'))
private = json.loads((ROOT/'.orbit/atom-live-20260930/worker-private.json').read_text())
worker = Sandbox.connect(private['sandboxId'], api_key=key)
value = json.loads(worker.files.read('/home/user/atom-check-results/status.json'))
print(json.dumps({'target':value['targetUrl'], 'checks':len(value['rows']),
                  'success':value['success'], 'errors':value['errors'],
                  'failed':[r['name'] for r in value['rows'] if not r['passed']]}))
if value['success'] and any(r['name']=='publication-lab-and-version-2.1.6' for r in value['rows']):
    directory = ROOT/'.orbit/atom-live-20260930'
    target = 'live-validation.json' if value['targetUrl'].startswith('https://orbit.securedme.ca') else 'stage-validation.json'
    (directory/target).write_text(json.dumps(value,indent=2),encoding='utf-8')
    if target=='live-validation.json':
        for entry in worker.files.list('/home/user/atom-check-results'):
            if entry.name.endswith('.png'):
                (directory/entry.name).write_bytes(bytes(worker.files.read('/home/user/atom-check-results/'+entry.name,format='bytes')))
