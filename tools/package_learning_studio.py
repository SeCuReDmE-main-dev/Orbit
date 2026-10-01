"""Cloud-only archive preparation; never publish to npm or mutate a Studio."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--environment', choices=['e2b', 'kaggle'], required=True)
    arguments = parser.parse_args()
    if os.name == 'nt':
        raise SystemExit('Construction is reserved for the E2B/Kaggle Linux workspace, not the Windows workstation.')
    repository = arguments.repo.resolve()
    directory = repository / 'packages' / 'learning-studio'
    output = arguments.out.resolve()
    output.mkdir(parents=True, exist_ok=True)
    subprocess.run(['node', str(directory / 'build.mjs')], cwd=repository, check=True)
    packed = subprocess.run(['npm', 'pack', '--ignore-scripts', '--workspaces=false', '--json', '--pack-destination', str(output)], cwd=directory, check=True, text=True, capture_output=True)
    metadata = json.loads(packed.stdout)[0]
    archive = output / metadata['filename']
    with tarfile.open(archive, 'r:gz') as stream:
        members = [item.name for item in stream.getmembers()]
        if not {'package/dist/index.js', 'package/dist/index.d.ts', 'package/README.md'}.issubset(members):
            raise RuntimeError('The archive is missing its self-contained entry or installation instructions.')
        if any('/.env' in name or 'node_modules/' in name for name in members):
            raise RuntimeError('Unexpected credential or dependency directory in the distributable archive.')
        script = stream.extractfile('package/dist/index.js')
        assert script is not None
        javascript = script.read().decode('utf-8')
        if 'from "../../../packages/' in javascript or "from '../../../packages/" in javascript:
            raise RuntimeError('An unresolved monorepo dependency remains in the archive.')
    report = {
        'package': '@orbit/learning-studio', 'version': metadata['version'],
        'archive': archive.name, 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
        'environmentDeclaredByOrchestrator': arguments.environment,
        'bundled': True, 'installedInSecondStudio': False,
        'runtimeValidated': False, 'publishedToNpm': False,
        'members': members,
    }
    (output / 'package-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: value for key, value in report.items() if key != 'members'}, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
