"""Prepare an isolated E2B browser and Kaggle notebook; tests run only from Kaggle."""
from pathlib import Path
import json, secrets
from datetime import datetime, timezone
from e2b import Sandbox
from orbit_cloud_lab import ROOT,DIRECTORY,CAMPAIGN,credentials,write_ledger

OUT=ROOT/'.orbit/atom-live-20260930'
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    key=credentials(Path(r'Z:\SecuredMe Education suite\.env'))
    active=Sandbox.list(limit=100,api_key=key).next_items()
    control=next(s for s in active if s.metadata.get('campaign')==CAMPAIGN and s.metadata.get('role')=='control')
    builder=Sandbox.connect(control.sandbox_id,api_key=key)
    for name in ['atom-cloud-check.ts','webmcp-browser.ts']:
        builder.files.write('/home/user/orbit/tools/'+name,(ROOT/'tools'/name).read_bytes())
    built=builder.commands.run('npx esbuild tools/atom-cloud-check.ts --bundle --platform=node --format=esm --outfile=/home/user/atom-check.mjs',cwd='/home/user/orbit',timeout=60)
    if built.exit_code: raise RuntimeError('Bundle failed')
    types=builder.commands.run('npx tsc --noEmit --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler web/src/lib/atom-playground.ts web/src/lib/atom-scene.ts',cwd='/home/user/orbit',timeout=60)
    (OUT/'typecheck.log').write_text(types.stdout+types.stderr)
    if types.exit_code: raise RuntimeError('Typecheck failed; see log')
    bundle=bytes(builder.files.read('/home/user/atom-check.mjs',format='bytes'))
    builder.commands.run('tar -czf /home/user/atom-web.tar.gz -C /home/user/orbit/web dist',timeout=60)
    artifact=bytes(builder.files.read('/home/user/atom-web.tar.gz',format='bytes'))
    ledger=json.loads((DIRECTORY/'resources.json').read_text())
    worker=Sandbox.create(ledger['templates']['browser']['templateId'],timeout=3600,secure=True,api_key=key,metadata={'app':'orbit','campaign':CAMPAIGN,'role':'atom-browser'})
    ledger['sandboxes'].append({'id':worker.sandbox_id,'role':'atom-browser','state':'running','createdAt':datetime.now(timezone.utc).isoformat(),'killPlan':'Collect atom tests; retire token and stop owned worker.'});write_ledger(ledger)
    worker.files.write('/home/user/atom-check.mjs',bundle);worker.files.write('/home/user/atom-web.tar.gz',artifact)
    worker.commands.run('mkdir -p /home/user/atom-stage && tar -xzf /home/user/atom-web.tar.gz -C /home/user/atom-stage',timeout=60)
    worker.commands.run('python -m http.server 4321 --bind 127.0.0.1 --directory /home/user/atom-stage/dist',background=True,timeout=3600)
    token=secrets.token_urlsafe(48)
    worker.commands.run('node /home/user/atom-check.mjs',envs={'ORBIT_ATOM_CHECK_TOKEN':token},background=True,timeout=3600)
    config={'url':'https://'+worker.get_host(8000),'token':token,'sandboxId':worker.sandbox_id,'state':'prepared-not-tested'}
    (OUT/'worker-private.json').write_text(json.dumps(config))
    code='''import json, urllib.request
from pathlib import Path
URL=__URL__
TOKEN=__TOKEN__
def run(live=False):
    request=urllib.request.Request(URL+'/run',data=json.dumps({'live':live}).encode(),headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'})
    with urllib.request.urlopen(request,timeout=240) as response: result=json.load(response)
    Path('/kaggle/working/atom-validation.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))
    assert result['success'], 'Browser validation failed; inspect retained results.'
run(live=False)
'''.replace('__URL__',repr(config['url'])).replace('__TOKEN__',repr(token))
    cells=[{'cell_type':'markdown','metadata':{},'source':['# Orbit — Fifteen atom games: cloud validation\nPrivate disposable browser token. No account API key. Tests are orchestrated in Kaggle and execute in an isolated E2B browser. No model calls. Retire the token before public release.']},{'cell_type':'code','metadata':{},'source':code.splitlines(True),'outputs':[],'execution_count':None}]
    notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},'cells':cells}
    (OUT/'atom-validation.ipynb').write_text(json.dumps(notebook))
    print(json.dumps({'state':'prepared-not-tested','typecheck':types.exit_code,'sandboxId':worker.sandbox_id,'notebook':str(OUT/'atom-validation.ipynb')}))
if __name__=='__main__':
    try:main()
    except Exception as e:print(json.dumps({'errorType':type(e).__name__,'state':'failed','details':'Private response omitted'}));raise SystemExit(1)
