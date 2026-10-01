"""Package a cloud-built documentation update over the approved landing release.

No model calls or software tests. The atom HTML and existing assets are preserved.
"""
from pathlib import Path
import hashlib, io, json, tarfile, zipfile
from datetime import datetime, timezone
from e2b import Sandbox
from orbit_cloud_lab import ROOT, CAMPAIGN, credentials

key = credentials(Path(r'Z:\SecuredMe Education suite\.env'))
active = Sandbox.list(limit=100, api_key=key).next_items()
control = next(s for s in active if s.metadata.get('campaign') == CAMPAIGN and s.metadata.get('role') == 'control')
builder = Sandbox.connect(control.sandbox_id, api_key=key)
builder.commands.run('tar -czf /home/user/guide-release.tar.gz -C /home/user/orbit web/dist studio/dist', timeout=120)
payload = bytes(builder.files.read('/home/user/guide-release.tar.gz', format='bytes'))
previous = ROOT / '.orbit/releases/orbit-atom-20261001T014003Z.zip'
with zipfile.ZipFile(previous) as archive:
    files = {name: archive.read(name) for name in archive.namelist() if not name.endswith('/')}
original_landing = files['index.html']
files['.htaccess'] = (ROOT / 'web/public/.htaccess').read_bytes()
with tarfile.open(fileobj=io.BytesIO(payload)) as archive:
    for member in archive.getmembers():
        if not member.isfile():
            continue
        name = member.name
        relative = None
        if name.startswith('web/dist/guide/') or name == 'web/dist/app/index.html' or name.startswith('web/dist/_astro/'):
            relative = name[len('web/dist/'):]
        elif name == 'studio/dist/index.html':
            relative = 'studio/index.html'
        elif name.startswith('studio/dist/static/'):
            relative = name[len('studio/dist/'):]
        if relative:
            if '..' in Path(relative).parts or Path(relative).is_absolute():
                raise RuntimeError('Unsafe archive path')
            files[relative] = archive.extractfile(member).read()
files['index.html'] = original_landing.replace(b'2.1.6', b'2.1.7')release = 'orbit-guide-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
manifest = json.loads(files['orbit-release.json'])
manifest.update(documentationRelease=release, documentationUpdatedAt=datetime.now(timezone.utc).isoformat(), documentationBuildHost='E2B', landingBehaviorUnchanged=True, version="2.1.7")
files['orbit-release.json'] = json.dumps(manifest, indent=2).encode()
# Only the explicitly requested footer version changes in the landing HTML.
if files['index.html'].replace(b'2.1.7',b'2.1.6') != original_landing:
    raise RuntimeError('Unrelated landing markup changed')
for name, data in files.items():
    if '.env' in Path(name).parts or any(marker in data for marker in [b'E2B_API_KEY=', b'SANITY_API_TOKEN=', b'EMAIL_ORBIT_PASSWORD=']):
        raise RuntimeError('Private credential marker')
target = ROOT / '.orbit/releases' / (release + '.zip')
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name, data in sorted(files.items()):
        entry = zipfile.ZipInfo(name, datetime.now(timezone.utc).timetuple()[:6])
        entry.create_system = 3
        entry.external_attr = 0o100644 << 16
        entry.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(entry, data)
record = {'packagePath': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'releaseId': release, 'files': len(files), 'landingSha256': hashlib.sha256(files['index.html']).hexdigest(), 'pdfSha256': hashlib.sha256(files['guide/orbit-atome-2.1.6-fr.pdf']).hexdigest(), 'buildHost': 'E2B'}
(ROOT / '.orbit/atom-live-20260930/guide-release.json').write_text(json.dumps(record, indent=2))
print(json.dumps(record))
