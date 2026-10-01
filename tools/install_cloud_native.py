"""Install locked Linux build bindings omitted by npm's cross-platform lock handling."""
from pathlib import Path
import json
import os
import subprocess
import tarfile
import tempfile

if os.name == 'nt':
    raise SystemExit('Reserved for the Linux cloud build.')
root = Path.cwd()
packages = {
    '@bruits/satteri-linux-x64-gnu': '0.10.5',
    '@astrojs/compiler-binding-linux-x64-gnu': '0.4.1',
    '@rolldown/binding-linux-x64-gnu': '1.2.9',
}
with tempfile.TemporaryDirectory(prefix='orbit-native-') as work:
    for name, version in packages.items():
        destination = root / 'node_modules' / name
        if (destination / 'package.json').exists():
            continue
        packed = subprocess.run(['npm', 'pack', f'{name}@{version}', '--ignore-scripts', '--json'],
            cwd=work, capture_output=True, text=True, check=True)
        item = json.loads(packed.stdout)[0]
        if item['name'] != name or item['version'] != version:
            raise RuntimeError('Unexpected native package identity.')
        destination.mkdir(parents=True, exist_ok=True)
        with tarfile.open(Path(work) / item['filename']) as archive:
            for member in archive.getmembers():
                if not member.name.startswith('package/') or member.issym() or member.islnk():
                    raise RuntimeError('Unsafe package member.')
                relative = Path(member.name).relative_to('package')
                target = destination / relative
                if not target.resolve().is_relative_to(destination.resolve()):
                    raise RuntimeError('Unsafe package path.')
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                elif member.isfile():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(archive.extractfile(member).read())
        print(f'Installed {name}@{version} for the Linux build.')
