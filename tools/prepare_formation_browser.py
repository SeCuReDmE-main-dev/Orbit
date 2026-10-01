"""Prepare an owned E2B worker; only Kaggle dispatches its checks."""
from pathlib import Path
import json, secrets
from datetime import datetime, timezone
from e2b import Sandbox
from orbit_cloud_lab import ROOT, credentials

OUT=ROOT/'.orbit/formation-20261001'
CAMPAIGN='orbit-formation-20261001'

def main():
    key=credentials(Path(r'Z:\SecuredMe Education suite\.env'))
    active=Sandbox.list(limit=100,api_key=key).next_items()
    builder=Sandbox.connect(next(s.sandbox_id for s in active if s.metadata.get('campaign')==CAMPAIGN and s.metadata.get('role')=='formation-build'),api_key=key)
    builder.set_timeout(3600)
    for name in ['formation-browser-check.ts','webmcp-browser.ts']:
        builder.files.write('/home/user/orbit/tools/'+name,(ROOT/'tools'/name).read_bytes())
    builder.commands.run('npx esbuild tools/formation-browser-check.ts --bundle --platform=node --format=esm --outfile=/home/user/formation-check.mjs',cwd='/home/user/orbit',timeout=60)
    builder.commands.run('tar -czf /home/user/formation-web.tar.gz -C /home/user/orbit/web dist',timeout=60)
    template=json.loads((ROOT/'.orbit/cloud-lab/orbit-kaggle-20260930-v1/resources.json').read_text())['templates']['browser']['templateId']
    previous=next((s for s in active if s.metadata.get('campaign')==CAMPAIGN and s.metadata.get('role')=='formation-browser'),None)
    if previous: raise RuntimeError('Owned worker already exists; collect or retire before creating another.')
    worker=Sandbox.create(template,timeout=3600,secure=True,api_key=key,metadata={'app':'orbit','campaign':CAMPAIGN,'role':'formation-browser'})
    ledger=json.loads((OUT/'resources.json').read_text())
    ledger['sandboxes'].append({'id':worker.sandbox_id,'role':'formation-browser','state':'running','createdAt':datetime.now(timezone.utc).isoformat(),'killPlan':'Collect results, retire disposable bridge token, kill only this campaign; one-hour expiry.'})
    (OUT/'resources.json').write_text(json.dumps(ledger,indent=2))
    worker.files.write('/home/user/formation-check.mjs',bytes(builder.files.read('/home/user/formation-check.mjs',format='bytes')))
    worker.files.write('/home/user/formation-web.tar.gz',bytes(builder.files.read('/home/user/formation-web.tar.gz',format='bytes')))
    worker.commands.run('mkdir -p /home/user/formation-stage && tar -xzf /home/user/formation-web.tar.gz -C /home/user/formation-stage',timeout=60)
    worker.commands.run('python -m http.server 4321 --bind 127.0.0.1 --directory /home/user/formation-stage/dist',background=True,timeout=3600)
    token=secrets.token_urlsafe(48)
    worker.commands.run('node /home/user/formation-check.mjs',background=True,envs={'ORBIT_FORMATION_CHECK_TOKEN':token},timeout=3600)
    config={'url':'https://'+worker.get_host(8001),'token':token,'sandboxId':worker.sandbox_id}
    (OUT/'browser-private.json').write_text(json.dumps(config))
    code='''import json, time, urllib.request
from pathlib import Path
URL=__URL__; TOKEN=__TOKEN__
def request(path,data=None):
    req=urllib.request.Request(URL+path,data=None if data is None else json.dumps(data).encode(),headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
accepted=request('/run',{'live':False})
print(json.dumps(accepted))
result={}
for attempt in range(35):
    time.sleep(3);result=request('/status')
    if result.get('state')=='complete':break
if result.get('state')!='complete':raise RuntimeError('Bounded worker did not complete; inspect its status before rerun.')
Path('/kaggle/working/formation-browser-results.json').write_text(json.dumps(result,indent=2))
for name in result.get('screenshots',[]):
    req=urllib.request.Request(URL+'/artifact/'+name,headers={'Authorization':'Bearer '+TOKEN})
    with urllib.request.urlopen(req,timeout=30) as response:Path('/kaggle/working',name).write_bytes(response.read())
print(json.dumps(result,indent=2))
assert result['success'], 'Retained browser checks contain a failure.'
'''.replace('__URL__',repr(config['url'])).replace('__TOKEN__',repr(token))
    notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'}},'cells':[
      {'cell_type':'markdown','metadata':{},'source':['# Orbit Formation — browser validation\nKaggle orchestrates an isolated E2B Linux browser. Real WebMCP registry; scripted synthetic fixtures, no human approval or model calls. Disposable mission token must be retired before publishing this notebook.']},
      {'cell_type':'code','metadata':{},'source':code.splitlines(True),'execution_count':None,'outputs':[]}]}
    (OUT/'orbit-formation-browser.ipynb').write_text(json.dumps(notebook),encoding='utf-8')
    print(json.dumps({'state':'prepared-not-tested','sandboxId':worker.sandbox_id,'notebook':str(OUT/'orbit-formation-browser.ipynb')}))

if __name__=='__main__':
    try:main()
    except Exception as error:print(json.dumps({'state':'failed','errorType':type(error).__name__}));raise SystemExit(1)
