"""Stamp the verified five-door release without rebuilding its unchanged runtime."""
from datetime import datetime, timezone
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import urllib.request
import zipfile

from package_formation_release import zip_entry

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.orbit/formation-20261001'
BASE = 'https://orbit.securedme.ca/'


def public_read(path):
    request = urllib.request.Request(BASE + path, headers={
        'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache',
    })
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise ValueError('Public readback did not return HTTP 200')
        data = response.read(2_000_001)
    if len(data) > 2_000_000:
        raise ValueError('Public readback exceeds the bounded size')
    return data


def main():
    before = public_read('')
    with zipfile.ZipFile(OUT / 'orbit-learning-navigation.zip') as archive:
        verified = archive.read('index.html')
    if before != verified:
        raise ValueError('Public root differs from the previously deployed five-door package')
    if before.count(b'data-atom-link=') != 5 or b'/formation/lab/' not in before:
        raise ValueError('Public root is missing the approved learning door')
    # Only the display stamp changes; scripts, styles, navigation and scene stay exact.
    if before.count(b'2.1.7') != 4:
        raise ValueError('Unexpected version-stamp occurrences; inspect before replacement')
    after = before.replace(b'2.1.7', b'V3')
    if after.replace(b'V3', b'2.1.7') != before:
        raise ValueError('Version-only round trip failed')
    manifest = json.loads(public_read('orbit-release.json'))
    manifest.update(
        version='3.0.0', displayVersion='V3', atomMechanismVersion='2.1.7',
        applicationRelease='orbit-v3-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'),
        applicationUpdatedAt=datetime.now(timezone.utc).isoformat(),
        landingRuntimeChanged=False, learningDoor='/formation/lab/',
        fullMissionComplete=False,
        qualification='Existing validated runtime; Context remains HOLD and portable Studio qualification is partial.',
    )
    if isinstance(manifest.get('files'), dict):
        manifest['files']['index.html'] = hashlib.sha256(after).hexdigest()
    entries = {
        'index.html': after,
        'orbit-release.json': (json.dumps(manifest, indent=2) + '\n').encode(),
    }
    package = OUT / 'orbit-v3-version-only.zip'
    with zipfile.ZipFile(package, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in entries.items():
            archive.writestr(zip_entry(name), data)
    report = {
        'state': 'PACKAGED_NOT_DEPLOYED', 'version': '3.0.0', 'displayVersion': 'V3',
        'files': list(entries), 'packageSha256': hashlib.sha256(package.read_bytes()).hexdigest(),
        'beforeIndexSha256': hashlib.sha256(before).hexdigest(),
        'afterIndexSha256': hashlib.sha256(after).hexdigest(),
        'runtimeBytesChanged': False, 'publicOriginReadWithoutQuery': True,
        'fullMissionComplete': False,
        'scope': 'Version-only release stamp on the already verified five-door landing; no software or model test executed.',
    }
    (OUT / 'v3-version-package.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report))


def readback():
    """Read public delivery bytes; no software or model tests are executed."""
    with zipfile.ZipFile(OUT / 'orbit-v3-version-only.zip') as archive:
        expected = {name: archive.read(name) for name in archive.namelist()}
    representations = []
    for path in expected:
        for encoding in ('identity', 'gzip'):
            request = urllib.request.Request(BASE + ('' if path == 'index.html' else path),
                headers={'Accept-Encoding': encoding, 'Cache-Control': 'no-cache'})
            with urllib.request.urlopen(request, timeout=30) as response:
                data = response.read(2_000_001)
                actual_encoding = response.headers.get('Content-Encoding', 'identity')
                if actual_encoding == 'gzip':
                    data = gzip.decompress(data)
                if data != expected[path]:
                    raise ValueError('Deployed representation differs from the packaged file')
                representations.append({'path': path, 'requestedEncoding': encoding,
                    'receivedEncoding': actual_encoding, 'httpStatus': response.status,
                    'sha256': hashlib.sha256(data).hexdigest()})
    routes = []
    for path in ('formation/lab/', 'formation/projets/', 'guide/'):
        data = public_read(path)
        routes.append({'path': '/' + path, 'httpStatus': 200,
            'sha256': hashlib.sha256(data).hexdigest()})
    report = {'state': 'V3_PUBLIC_BYTES_VERIFIED', 'displayVersion': 'V3',
        'version': '3.0.0', 'representations': representations, 'routes': routes,
        'runtimeBytesChanged': False, 'queryParameterUsed': False,
        'softwareTestsExecuted': False, 'modelCalls': 0, 'fullMissionComplete': False,
        'scope': 'Deployment readback. Existing runtime validation remains separately attributed to Kaggle/E2B.',
        'observedAt': datetime.now(timezone.utc).isoformat()}
    target = ROOT / 'docs/receipts/formation/v3-public-readback.json'
    target.write_bytes((json.dumps(report, indent=2) + '\n').encode())
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--readback', action='store_true')
    args = parser.parse_args()
    readback() if args.readback else main()
