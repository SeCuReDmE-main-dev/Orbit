"""Collect current cloud builds and package the explicit atom deployment."""
from pathlib import Path
import json, tarfile, io, zipfile, hashlib
from datetime import datetime, timezone
from e2b import Sandbox
from orbit_cloud_lab import ROOT,CAMPAIGN,credentials
key=credentials(Path(r'Z:\SecuredMe Education suite\.env'))
active=Sandbox.list(limit=100,api_key=key).next_items()
control=next(s for s in active if s.metadata.get('campaign')==CAMPAIGN and s.metadata.get('role')=='control')
builder=Sandbox.connect(control.sandbox_id,api_key=key)
result=builder.commands.run('tar -czf /home/user/atom-release.tar.gz -C /home/user/orbit web/dist studio/dist',timeout=120)
if result.exit_code:raise RuntimeError('Cloud archive failed')
payload=bytes(builder.files.read('/home/user/atom-release.tar.gz',format='bytes'))
release='orbit-atom-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
stage=ROOT/'.orbit/releases'/release;stage.mkdir(parents=True)
with tarfile.open(fileobj=io.BytesIO(payload)) as archive:
    for member in archive.getmembers():
        if not member.isfile():continue
        name=member.name
        if name.startswith('web/dist/'):relative=name[len('web/dist/'):]
        elif name=='studio/dist/index.html':relative='studio/index.html'
        elif name.startswith('studio/dist/static/'):relative=name[len('studio/dist/'):]
        else:continue
        path=(stage/relative).resolve()
        if not path.is_relative_to(stage.resolve()) or '.env' in path.parts:raise RuntimeError('Unsafe path')
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(archive.extractfile(member).read())
manifest={'releaseId':release,'generatedAt':datetime.now(timezone.utc).isoformat(),'feature':'Fifteen bounded atom games','buildHost':'E2B','validationHost':'Kaggle','modelCalls':0,'publicReadback':'pending','games':15,'version':'2.1.6','secrets':False}
(stage/'orbit-release.json').write_text(json.dumps(manifest,indent=2))
target=stage.with_suffix('.zip');hashes=[]
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(stage.rglob('*')):
        if not path.is_file():continue
        data=path.read_bytes()
        if any(s in data for s in [b'E2B_API_KEY=',b'SANITY_API_TOKEN=',b'EMAIL_ORBIT_PASSWORD=']):raise RuntimeError('Credential marker')
        archive.write(path,path.relative_to(stage).as_posix());hashes.append(hashlib.sha256(data).hexdigest()+'  '+path.relative_to(stage).as_posix())
(stage/'SHA256SUMS.txt').write_text('\n'.join(hashes)+'\n')
package={'packagePath':str(target),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'releaseId':release,'files':len(hashes)}
(ROOT/'.orbit/atom-live-20260930/release-package.json').write_text(json.dumps(package,indent=2))
print(json.dumps(package))
