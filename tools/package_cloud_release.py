"""Package verified E2B outputs without overwriting local builds or secrets."""
from pathlib import Path
import hashlib
import json
import tarfile
import zipfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / '.orbit/cloud-lab/orbit-kaggle-20260930-v1'

def main():
    build = json.loads((LAB / 'cloud-build-status.json').read_text())
    if build['exitCode'] != 0: raise RuntimeError('Cloud build is not successful')
    release = 'orbit-cloud-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    stage = ROOT / '.orbit/releases' / release
    stage.mkdir(parents=True)
    with tarfile.open(LAB / 'orbit-built.tar.gz') as archive:
        for member in archive.getmembers():
            if not member.isfile(): continue
            name = member.name
            if name.startswith('web/dist/'): relative = name[len('web/dist/'):]
            elif name == 'studio/dist/index.html': relative = 'studio/index.html'
            elif name.startswith('studio/dist/static/'): relative = name[len('studio/dist/'):]
            else: continue
            destination = (stage / relative).resolve()
            if not destination.is_relative_to(stage.resolve()): raise RuntimeError('Invalid artifact path')
            if '.env' in destination.parts: raise RuntimeError('Environment file in artifact')
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(archive.extractfile(member).read())
    expected = ['index.html','app/index.html','guide/index.html','studio/index.html','api/index.php','.htaccess']
    for name in expected:
        if not (stage / name).is_file(): raise RuntimeError('Required artifact missing: '+name)
    manifest = {'releaseId':release,'generatedAt':datetime.now(timezone.utc).isoformat(),
      'build':build,'validation':{'host':'Kaggle','runId':'354209018','passed':59,'failed':0,
        'sourceSha256':'6fffe43efaaffbbae23c39962bb27db1381526c841292cb4169803fe46a0ed58'},
      'routes':['/','/app/','/guide/','/studio/'],'backendBundled':False,'secrets':False,
      'campaignStatus':'Kaggle campaigns partial; native browser preflight passed; semantic review pending'}
    (stage / 'orbit-release.json').write_text(json.dumps(manifest,indent=2))
    hashes = []
    for path in sorted(stage.rglob('*')):
        if not path.is_file(): continue
        data = path.read_bytes()
        if any(marker in data for marker in [b'SANITY_API_TOKEN=',b'E2B_API_KEY=',b'EMAIL_ORBIT_PASSWORD=']):
            raise RuntimeError('Credential marker in release')
        hashes.append(hashlib.sha256(data).hexdigest()+'  '+path.relative_to(stage).as_posix())
    (stage / 'SHA256SUMS.txt').write_text('\n'.join(hashes)+'\n')
    target = stage.with_suffix('.zip')
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in stage.rglob('*'):
            if path.is_file(): archive.write(path,path.relative_to(stage).as_posix())
    result = {'packagePath':str(target),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
      'files':len(hashes)+1,'expectedPaths':expected}
    (LAB / 'release-package.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result))

if __name__ == '__main__': main()
