"""Prepare owned E2B workers for Kaggle; no models or software tests here.

No v1 ledger or token is read. Templates may be reused by explicit identifier;
each resource generation has new sandboxes and distinct mission/control tokens.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import secrets
import subprocess
import uuid
import zipfile

from prepare_kaggle_campaign_v2 import ENTRY, OUT, ROOT, mapping_digest, source_identity

CAMPAIGN = 'orbit-kaggle-20261001-v2'
LEDGER = OUT / 'resources-v2.json'
POOL = OUT / 'browser-pool.private.json'
SECRET_FILE = OUT / 'worker-secret.private.txt'


def now():
    return datetime.now(timezone.utc).isoformat()


def credential(path):
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        name, separator, value = line.partition('=')
        if separator and name.strip().removeprefix('export ') == 'E2B_API_KEY':
            value = value.strip().strip('\"\'')
            if value:
                return value
    raise RuntimeError('E2B_API_KEY_UNAVAILABLE')


def protect_private_file(path):
    if os.name == 'nt':
        lookup = subprocess.run(['whoami', '/user', '/fo', 'csv', '/nh'], capture_output=True, text=True, check=True)
        sid = next(csv.reader(io.StringIO(lookup.stdout)))[1]
        grant = subprocess.run(['icacls', str(path), '/inheritance:r', '/grant:r', '*' + sid + ':(F)'],
                               capture_output=True, text=True)
        if grant.returncode:
            raise RuntimeError('PRIVATE_FILE_ACCESS_CONTROL_FAILED')
    else:
        path.chmod(0o600)


def write_json(path, value, private=False):
    OUT.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2), encoding='utf-8')
    if private:
        protect_private_file(temporary)
    temporary.replace(path)


def save_ledger(ledger):
    write_json(LEDGER, ledger)


def list_all(Sandbox, key):
    paginator = Sandbox.list(limit=100, api_key=key)
    rows = []
    while paginator.has_next:
        rows.extend(paginator.next_items())
        if len(rows) > 1000:
            raise RuntimeError('RESOURCE_INVENTORY_BOUND_EXCEEDED')
    return rows


def selected_owned(active, ledger):
    generation = ledger.get('currentGeneration')
    registered = {row['id'] for row in ledger.get('sandboxes', []) if row['generation'] == generation}
    return [row for row in active if row.sandbox_id in registered
            and (row.metadata or {}).get('app') == 'orbit'
            and (row.metadata or {}).get('campaign') == CAMPAIGN
            and (row.metadata or {}).get('generation') == generation]


def current_manifest(path):
    config = json.loads(path.read_text(encoding='utf-8'))
    supported={CAMPAIGN, CAMPAIGN+'-sdkparams2', CAMPAIGN+'-nativebounds1'}
    if config.get('campaignId') not in supported or not config.get('frozen') or not config.get('releaseId'):
        raise RuntimeError('FROZEN_PUBLIC_RELEASE_MANIFEST_REQUIRED')
    engine, harness, rules = source_identity()
    if (config['engineSourceSha256'], config['harnessSha256'], config['rulesSha256']) != (
            mapping_digest(engine), mapping_digest(harness), mapping_digest(rules)):
        raise RuntimeError('SOURCE_CHANGED_AFTER_MANIFEST_FREEZE')
    return config


def bridge_source_archive():
    files = {path.relative_to(ROOT).as_posix(): path.read_bytes()
             for path in sorted((ROOT / 'packages/evidence-review/src').glob('*.ts'))}
    for name in ['tools/e2b-webmcp-bridge.ts', 'tools/webmcp-browser.ts']:
        files[name] = (ROOT / name).read_bytes()
    files['package.json'] = json.dumps({'name': 'orbit-browser-v2-build', 'private': True, 'type': 'module',
                                      'dependencies': {'esbuild': '0.25.12'}}).encode()
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            archive.writestr(name, data)
    return buffer.getvalue()


def publish_secret_file(pool):
    write_json(POOL, pool, private=True)
    SECRET_FILE.write_text(json.dumps(pool, separators=(',', ':')), encoding='utf-8')
    protect_private_file(SECRET_FILE)


def prepare(Sandbox, key, active, ledger, args):
    config = current_manifest(args.manifest)
    if not args.browser_template or not args.control_template:
        raise RuntimeError('EXPLICIT_REUSABLE_TEMPLATE_IDS_REQUIRED')
    if selected_owned(active, ledger) or ledger.get('state') in ['preparing', 'prepared-not-tested', 'running']:
        raise RuntimeError('EXISTING_V2_GENERATION_REQUIRES_COLLECTION_AND_CLEANUP_FIRST')
    if POOL.exists() or SECRET_FILE.exists():
        raise RuntimeError('PREVIOUS_PRIVATE_POOL_REQUIRES_VERIFIED_CLEANUP_FIRST')
    generation = str(uuid.uuid4())
    ledger.update({'campaign': CAMPAIGN, 'project': 'Secured_Me', 'currentGeneration': generation,
        'state': 'preparing', 'createdAt': now(), 'releaseId': config['releaseId'],
        'harnessSha256': config['harnessSha256'], 'modelExecution': 'Kaggle only',
        'softwareTests': 'Kaggle only', 'secretName': config['workerSecretName']})
    ledger.setdefault('sandboxes', [])
    save_ledger(ledger)

    def create(role, template, index=None):
        metadata = {'app': 'orbit', 'campaign': CAMPAIGN, 'generation': generation, 'role': role,
                    'release': config['releaseId'], 'harness': config['harnessSha256']}
        if index is not None:
            metadata['worker'] = str(index)
        sandbox = Sandbox.create(template, timeout=86400, secure=True, api_key=key, metadata=metadata)
        ledger['sandboxes'].append({'id': sandbox.sandbox_id, 'generation': generation, 'role': role,
            'state': 'running', 'createdAt': now(), 'killPlan': 'Collect Kaggle results, revoke mission access, kill this owned generation; 24h automatic timeout.'})
        save_ledger(ledger)
        return sandbox

    control = create('control', args.control_template)
    payload = bridge_source_archive()
    control.files.write('/home/user/orbit-v2-source.zip', payload)
    unpack = "import pathlib,zipfile; r=pathlib.Path('/home/user/orbit-v2');r.mkdir(exist_ok=True);z=zipfile.ZipFile('/home/user/orbit-v2-source.zip');assert all((r/n).resolve().is_relative_to(r.resolve()) for n in z.namelist());z.extractall(r)"
    import shlex
    command = ('python -c ' + shlex.quote(unpack) + ' && cd /home/user/orbit-v2 && '
               'npm install --ignore-scripts --no-audit --no-fund && '
               'npx esbuild tools/e2b-webmcp-bridge.ts --bundle --platform=node --format=esm --outfile=/home/user/bridge-v2.mjs')
    result = control.commands.run(command, timeout=600)
    # Build output is credential-free; account/mission credentials are never shell text.
    (OUT / 'bridge-build-v2.log').write_text(result.stdout + result.stderr, encoding='utf-8')
    if result.exit_code:
        raise RuntimeError('CLOUD_BRIDGE_BUILD_FAILED')
    bundle = bytes(control.files.read('/home/user/bridge-v2.mjs', format='bytes'))
    pool = []
    for index in range(args.workers):
        worker = create('browser', args.browser_template, index)
        worker.files.write('/home/user/bridge-v2.mjs', bundle)
        mission_token, control_token = secrets.token_urlsafe(48), secrets.token_urlsafe(48)
        record = {'url': 'https://' + worker.get_host(8000), 'token': mission_token,
                  'controlToken': control_token, 'sandboxId': worker.sandbox_id}
        # Save before startup so an interrupted provisioning retains ownership and access for cleanup.
        pool.append(record)
        publish_secret_file(pool)
        worker.commands.run('node /home/user/bridge-v2.mjs', background=True,
            envs={'ORBIT_BRIDGE_TOKEN': mission_token, 'ORBIT_BRIDGE_CONTROL_TOKEN': control_token}, timeout=86400)
        print(json.dumps({'worker': index, 'sandboxId': worker.sandbox_id, 'state': 'prepared-not-tested'}))
    ledger.update({'state': 'prepared-not-tested', 'workers': len(pool), 'bundleSha256': hashlib.sha256(bundle).hexdigest(),
                   'sourceArchiveSha256': hashlib.sha256(payload).hexdigest(), 'preparedAt': now()})
    save_ledger(ledger)
    receipt = {'campaign': CAMPAIGN, 'generation': generation, 'state': 'prepared-not-tested',
               'workers': len(pool), 'bundleSha256': ledger['bundleSha256'], 'modelCalls': 0, 'softwareTests': False,
               'privatePoolPath': str(POOL), 'secretImportPath': str(SECRET_FILE), 'secretName': config['workerSecretName']}
    write_json(OUT / 'pool-preparation-v2.json', receipt)
    print(json.dumps(receipt))


def cleanup(Sandbox, key, active, ledger, args):
    if not args.results_collected:
        raise RuntimeError('RESULTS_COLLECTION_RECEIPT_REQUIRED_BEFORE_CLEANUP')
    owned = selected_owned(active, ledger)
    generation = ledger.get('currentGeneration')
    for sandbox in owned:
        Sandbox.kill(sandbox.sandbox_id, api_key=key)
        for row in ledger['sandboxes']:
            if row['id'] == sandbox.sandbox_id:
                row.update({'state': 'stopped', 'stoppedAt': now()})
        save_ledger(ledger)
    # Fresh inventory is required before removing the dedicated mission credentials.
    remaining = selected_owned(list_all(Sandbox, key), ledger)
    if remaining:
        raise RuntimeError('OWNED_RESOURCES_STILL_ACTIVE_PRIVATE_TOKENS_RETAINED')
    for row in ledger.get('sandboxes', []):
        if row['generation'] == generation and row['state'] != 'stopped':
            row.update({'state': 'expired-or-already-stopped', 'confirmedAbsentAt': now()})
    for path in (POOL, SECRET_FILE):
        if path.exists():
            path.unlink()
    ledger.update({'state': 'closed', 'closedAt': now(), 'accountCredentialRevoked': False,
                   'ownedGenerationConfirmedAbsent': True, 'localMissionCredentialFilesRemoved': True})
    save_ledger(ledger)
    print(json.dumps({'campaign': CAMPAIGN, 'generation': generation, 'state': 'closed',
                     'ownedGenerationConfirmedAbsent': True, 'localMissionCredentialFilesRemoved': True,
                     'kaggleSecretDeletion': 'separate authenticated UI action still required'}))


def refresh(Sandbox, key, active, ledger, args):
    """Refresh only a not-yet-tested owned pool after an observed transport fix.

    Credentials stay in private files/envs. No browser checks or model calls
    are executed here; the replacement bundle is tested from Kaggle.
    """
    config=current_manifest(args.manifest)
    if ledger.get('state')!='prepared-not-tested':
        raise RuntimeError('ONLY_UNTESTED_POOL_CAN_BE_REFRESHED')
    owned={row.sandbox_id:row for row in selected_owned(active,ledger)}
    generation=ledger['currentGeneration']
    records=[row for row in ledger['sandboxes'] if row['generation']==generation]
    controls=[row for row in records if row['role']=='control']
    pool=json.loads(POOL.read_text(encoding='utf-8'))
    if len(controls)!=1 or controls[0]['id'] not in owned or any(row['sandboxId'] not in owned for row in pool):
        raise RuntimeError('OWNED_UNTESTED_POOL_INVENTORY_MISMATCH')
    control=Sandbox.connect(controls[0]['id'],api_key=key)
    payload=bridge_source_archive()
    control.files.write('/home/user/orbit-v2-source.zip',payload)
    import shlex
    unpack="import pathlib,zipfile;r=pathlib.Path('/home/user/orbit-v2');z=zipfile.ZipFile('/home/user/orbit-v2-source.zip');assert all((r/n).resolve().is_relative_to(r.resolve()) for n in z.namelist());z.extractall(r)"
    result=control.commands.run('python -c '+shlex.quote(unpack)+' && cd /home/user/orbit-v2 && npx esbuild tools/e2b-webmcp-bridge.ts --bundle --platform=node --format=esm --outfile=/home/user/bridge-v2.mjs',timeout=120)
    (OUT/'bridge-refresh-v2.log').write_text(result.stdout+result.stderr,encoding='utf-8')
    if result.exit_code:raise RuntimeError('CLOUD_BRIDGE_REFRESH_BUILD_FAILED')
    bundle=bytes(control.files.read('/home/user/bridge-v2.mjs',format='bytes'))
    for index,row in enumerate(pool):
        worker=Sandbox.connect(row['sandboxId'],api_key=key)
        worker.commands.run("pkill -f '^node /home/user/bridge-v2.mjs$' || true",timeout=20)
        worker.files.write('/home/user/bridge-v2.mjs',bundle)
        worker.commands.run('node /home/user/bridge-v2.mjs',background=True,
            envs={'ORBIT_BRIDGE_TOKEN':row['token'],'ORBIT_BRIDGE_CONTROL_TOKEN':row['controlToken']},timeout=86400)
        print(json.dumps({'worker':index,'state':'refreshed-not-tested'}))
    ledger.setdefault('bundleHistory',[]).append({'sha256':ledger['bundleSha256'],'supersededAt':now(),
        'reason':'native-browser manifest transport correction before tests'})
    ledger.update({'bundleSha256':hashlib.sha256(bundle).hexdigest(),'sourceArchiveSha256':hashlib.sha256(payload).hexdigest(),
        'harnessSha256':config['harnessSha256'],'refreshedAt':now()})
    save_ledger(ledger)
    print(json.dumps({'campaign':CAMPAIGN,'state':'refreshed-not-tested','workers':len(pool),
        'bundleSha256':ledger['bundleSha256'],'modelsCalled':0,'testsExecuted':False}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['list', 'prepare', 'refresh', 'cleanup'])
    parser.add_argument('--env', type=Path, default=Path(r'Z:\SecuredMe Education suite\.env'))
    parser.add_argument('--manifest', type=Path, default=ENTRY / 'manifest.json')
    parser.add_argument('--browser-template')
    parser.add_argument('--control-template')
    parser.add_argument('--workers', type=int, choices=range(1, 9), default=8)
    parser.add_argument('--results-collected', action='store_true')
    args = parser.parse_args()
    from e2b import Sandbox
    key = credential(args.env)
    # Required precondition for every creation and cleanup, including partial preparation.
    active = list_all(Sandbox, key)
    ledger = json.loads(LEDGER.read_text(encoding='utf-8')) if LEDGER.exists() else {}
    print(json.dumps({'campaign': CAMPAIGN, 'activeSandboxes': len(active),
                     'registeredOwnedSandboxes': len(selected_owned(active, ledger))}))
    if args.action == 'list':
        return
    if args.action == 'prepare':
        prepare(Sandbox, key, active, ledger, args)
    elif args.action == 'cleanup':
        cleanup(Sandbox, key, active, ledger, args)
    elif args.action == 'refresh':
        refresh(Sandbox,key,active,ledger,args)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'state': 'failed', 'errorType': type(error).__name__,
                          'message': 'Provisioning failed; credentials and raw server response omitted.'}))
        raise SystemExit(1)
