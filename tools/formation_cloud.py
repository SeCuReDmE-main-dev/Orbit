"""Own isolated formation build resources; tests are dispatched from Kaggle only."""
from pathlib import Path
import argparse, hashlib, io, json, tarfile, zipfile
from datetime import datetime, timezone
from e2b import Sandbox
from orbit_cloud_lab import ROOT, credentials

OUT = ROOT / '.orbit' / 'formation-20261001'
CAMPAIGN = 'orbit-formation-20261001'

def main():
    p = argparse.ArgumentParser(); p.add_argument('action', choices=['create','sync','build','collect','cleanup']); args=p.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    key=credentials(Path(r'Z:\SecuredMe Education suite\.env'))
    active=Sandbox.list(limit=100,api_key=key).next_items()
    own=[s for s in active if s.metadata.get('campaign')==CAMPAIGN]
    ledger=json.loads((OUT/'resources.json').read_text()) if (OUT/'resources.json').exists() else {'campaign':CAMPAIGN,'sandboxes':[]}
    if args.action=='create':
        if own: print(json.dumps({'state':'reused','ids':[s.sandbox_id for s in own]})); return
        templates=json.loads((ROOT/'.orbit/cloud-lab/orbit-kaggle-20260930-v1/resources.json').read_text())['templates']
        sandbox=Sandbox.create(templates['control']['templateId'],timeout=3600,secure=True,api_key=key,metadata={'app':'orbit','campaign':CAMPAIGN,'role':'formation-build'})
        ledger['sandboxes'].append({'id':sandbox.sandbox_id,'role':'formation-build','state':'running','createdAt':datetime.now(timezone.utc).isoformat(),'killPlan':'Collect artifacts and Kaggle results, then kill only this campaign; expires after one hour.'})
        (OUT/'resources.json').write_text(json.dumps(ledger,indent=2))
        print(json.dumps({'state':'created','sandboxId':sandbox.sandbox_id})); return
    if args.action=='cleanup':
        for s in own: Sandbox.kill(s.sandbox_id,api_key=key)
        for s in ledger['sandboxes']: s['state']='stopped'
        (OUT/'resources.json').write_text(json.dumps(ledger,indent=2));print(json.dumps({'state':'stopped','count':len(own)}));return
    control=next(s for s in own if s.metadata.get('role')=='formation-build')
    sandbox=Sandbox.connect(control.sandbox_id,api_key=key);sandbox.set_timeout(3600)
    if args.action=='sync':
        files=[]
        for name in ['package.json','package-lock.json','tsconfig.base.json','vitest.config.ts']: files.append(ROOT/name)
        for folder in ['web','studio','packages','tests','docs/learning/orbit-formation','tools']:
            files.extend((ROOT/folder).rglob('*'))
        buffer=io.BytesIO();hashes={}
        with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as z:
            for file in sorted(set(files)):
                if not file.is_file():continue
                rel=file.relative_to(ROOT)
                if any(x in ['node_modules','dist','.git','.venv','.astro','.sanity','__pycache__','.runtime','.build-home','.npm-cache'] for x in rel.parts) or file.name.startswith('.env') or file.name in ['.build.npmrc','host-build-status.json'] or file.suffix in ['.db','.log','.sqlite']:continue
                data=file.read_bytes();z.writestr(rel.as_posix(),data);hashes[rel.as_posix()]=hashlib.sha256(data).hexdigest()
            z.writestr('formation-source-manifest.json',json.dumps(hashes))
        sandbox.files.write('/home/user/formation-source.zip',buffer.getvalue())
        (OUT/'source-manifest.json').write_text(json.dumps(hashes,indent=2))
        result=sandbox.commands.run("python -c \"import zipfile,pathlib; p=pathlib.Path('/home/user/orbit');p.mkdir(exist_ok=True);z=zipfile.ZipFile('/home/user/formation-source.zip');assert all((p/n).resolve().is_relative_to(p.resolve()) for n in z.namelist());z.extractall(p)\"",timeout=60)
        print(json.dumps({'state':'synced','files':len(hashes),'exitCode':result.exit_code}));return
    if args.action=='build':
        # Lock updates apply only in the isolated checkout for new workspace links.
        command='cd /home/user/orbit && export ASTRO_TELEMETRY_DISABLED=1 SANITY_STUDIO_TELEMETRY_DISABLED=1 && npm install --no-audit --no-fund && python tools/install_cloud_native.py && npm run build -w web && npm run build -w studio && python tools/package_learning_studio.py --environment e2b --repo /home/user/orbit --out /home/user/orbit/artifacts/learning-studio && python tools/learning-studio-host/build_host.py --environment e2b'
        from e2b.sandbox.commands.command_handle import CommandExitException
        try:r=sandbox.commands.run(command,timeout=1800)
        except CommandExitException as e:r=e
        (OUT/'build.log').write_text(r.stdout+r.stderr,encoding='utf-8')
        (OUT/'build-status.json').write_text(json.dumps({'host':'E2B','kind':'build-not-test','exitCode':r.exit_code},indent=2))
        print(json.dumps({'host':'E2B','kind':'build-not-test','exitCode':r.exit_code,'tail':(r.stdout+r.stderr)[-3200:]}));return
    if args.action=='collect':
        sandbox.commands.run('tar -czf /home/user/formation-built.tar.gz -C /home/user/orbit web/dist studio/dist artifacts/learning-studio package-lock.json tools/learning-studio-host/dist tools/learning-studio-host/host-build-status.json tools/learning-studio-host/package-lock.json',timeout=120)
        (OUT/'formation-built.tar.gz').write_bytes(bytes(sandbox.files.read('/home/user/formation-built.tar.gz',format='bytes')))
        with tarfile.open(OUT/'formation-built.tar.gz') as built:
            for name in ['artifacts/learning-studio/orbit-learning-studio-1.0.0.tgz','artifacts/learning-studio/package-report.json']:
                member=built.getmember(name)
                if not member.isfile() or not 0<member.size<32_000_000:raise ValueError('Unexpected built plugin artifact')
                destination=ROOT/name;destination.parent.mkdir(parents=True,exist_ok=True)
                destination.write_bytes(built.extractfile(member).read())
            receipt=built.getmember('tools/learning-studio-host/host-build-status.json')
            if not receipt.isfile() or not 0<receipt.size<100_000:raise ValueError('Unexpected second Studio build receipt')
            (OUT/'second-studio-build.json').write_bytes(built.extractfile(receipt).read())
        print(json.dumps({'state':'collected'}))

if __name__=='__main__':
    try:main()
    except Exception as error:print(json.dumps({'state':'failed','errorType':type(error).__name__}));raise SystemExit(1)
