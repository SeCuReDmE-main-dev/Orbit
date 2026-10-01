"""Owned E2B browser workers for Kaggle; no software tests or model calls."""
from pathlib import Path
import json
import secrets
from datetime import datetime, timezone
from e2b import Sandbox
from orbit_cloud_lab import ROOT, DIRECTORY, CAMPAIGN, credentials, write_ledger

def main():
    key=credentials(Path(r'Z:\SecuredMe Education suite\.env'))
    active=Sandbox.list(limit=100,api_key=key).next_items()
    owned=[s for s in active if s.metadata.get('app')=='orbit' and s.metadata.get('campaign')==CAMPAIGN]
    ledger=json.loads((DIRECTORY/'resources.json').read_text())
    control=next(s for s in owned if s.metadata.get('role')=='control')
    builder=Sandbox.connect(control.sandbox_id,api_key=key)
    for name in ['webmcp-browser.ts','e2b-webmcp-bridge.ts']:
        builder.files.write('/home/user/orbit/tools/'+name,(ROOT/'tools'/name).read_bytes())
    builder.commands.run('npx esbuild tools/e2b-webmcp-bridge.ts --bundle --platform=node --format=esm --outfile=/home/user/bridge.mjs',cwd='/home/user/orbit',timeout=60)
    bundle=bytes(builder.files.read('/home/user/bridge.mjs',format='bytes'))
    workers=[s for s in owned if s.metadata.get('role')=='browser']
    private=[]
    for index in range(8):
        if index<len(workers): worker=Sandbox.connect(workers[index].sandbox_id,api_key=key)
        else:
            worker=Sandbox.create(ledger['templates']['browser']['templateId'],timeout=86400,secure=True,api_key=key,
                metadata={'app':'orbit','campaign':CAMPAIGN,'role':'browser','worker':str(index)})
            ledger['sandboxes'].append({'id':worker.sandbox_id,'role':'browser','state':'running','createdAt':datetime.now(timezone.utc).isoformat(),
                'killPlan':'Collect Kaggle results; kill only owned campaign worker; auto expires within 24 hours.'})
            write_ledger(ledger)
        worker.set_timeout(86400)
        for process in worker.commands.list():
            if process.cmd=='/bin/bash' and process.args==['-l','-c','node /home/user/bridge.mjs']: worker.commands.kill(process.pid)
        worker.files.write('/home/user/bridge.mjs',bundle)
        token=secrets.token_urlsafe(48)
        worker.commands.run('node /home/user/bridge.mjs',background=True,envs={'ORBIT_BRIDGE_TOKEN':token},timeout=86400)
        private.append({'url':'https://'+worker.get_host(8000),'token':token,'sandboxId':worker.sandbox_id})
        print(json.dumps({'worker':index,'state':'prepared-not-tested','sandboxId':worker.sandbox_id}))
    (DIRECTORY/'browser-pool.private.json').write_text(json.dumps(private))

if __name__=='__main__':
    try: main()
    except Exception as error:
        print(json.dumps({'state':'failed','errorType':type(error).__name__,'message':'Credentials and server response omitted'})); raise SystemExit(1)
