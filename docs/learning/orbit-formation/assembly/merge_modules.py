"""Merge the student's eight real exports into the provided Astro scaffold.

No tests or dependency installation are executed by this script.
"""
from pathlib import Path, PurePosixPath
import hashlib
import io
import json
import zipfile

MAX_ARCHIVE_BYTES = 12_000_000
MAX_FILE_BYTES = 2_000_000
REQUIRED = {
    1: ['interaction-state.js'], 2: ['ExplorationCard.astro', 'exploration-card.js'],
    3: ['scene-controller.js'], 4: ['inertia.js'], 5: ['transitions.js'],
    6: ['particle-layer.js'], 7: ['interaction-flow.js'], 8: ['register-capabilities.js'],
}


def load_module(data):
    if len(data) > MAX_ARCHIVE_BYTES:
        raise ValueError('Archive too large.')
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if len(archive.infolist()) > 80:
            raise ValueError('Too many files.')
        content = {}
        total_bytes = 0
        for info in archive.infolist():
            path = PurePosixPath(info.filename)
            if path.is_absolute() or '..' in path.parts or '\\' in info.filename or info.file_size > MAX_FILE_BYTES:
                raise ValueError('Unsafe path or oversized file.')
            if info.is_dir():
                continue
            total_bytes += info.file_size
            if total_bytes > MAX_ARCHIVE_BYTES:
                raise ValueError('Expanded archive too large.')
            if info.filename in content:
                raise ValueError('Duplicate archive member.')
            content[info.filename] = archive.read(info)
        result = json.loads(content['orbit-learning-result.json'])
        if result.get('schemaVersion') != 'orbit-learning-colab-v1':
            raise ValueError('Unexpected result format.')
        number = result['moduleId']
        if isinstance(number, bool) or number not in REQUIRED:
            raise ValueError('Unknown module.')
        manifest = json.loads(content['manifest.json'])
        expected = {}
        for item in manifest['files']:
            if item['path'] in expected:
                raise ValueError('Duplicate manifest member.')
            expected[item['path']] = item['sha256']
        if set(expected) != set(content) - {'manifest.json'}:
            raise ValueError('Manifest must describe every exported file.')
        for path, digest in expected.items():
            if hashlib.sha256(content[path]).hexdigest() != digest:
                raise ValueError('Content changed after export: ' + path)
        for name in REQUIRED[number]:
            if 'frontend/' + name not in content:
                raise ValueError('Missing student file: ' + name)
        return number, content, result


def assemble(module_archives, scaffold_files):
    """Return ZIP bytes; never replace a student brick by an instructor version."""
    output = {}
    for name, data in scaffold_files.items():
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or '\\' in name or name.startswith('src/learning/'):
            raise ValueError('Unsafe scaffold or hidden replacement brick.')
        output[name] = data if isinstance(data, bytes) else data.encode('utf-8')
    found = set()
    for data in module_archives:
        number, content, result = load_module(data)
        if number in found:
            raise ValueError('More than one export for a module. Choose the intended version.')
        found.add(number)
        for name, raw in content.items():
            if name.startswith('frontend/'):
                target = f'src/learning/module-{number}/' + name.removeprefix('frontend/')
            else:
                target = f'evidence/module-{number}/' + name
            if target in output:
                raise ValueError('Conflicting file: ' + target)
            output[target] = raw
    if found != set(REQUIRED):
        raise ValueError('All eight modules are required. Missing: ' + ', '.join(map(str, sorted(set(REQUIRED) - found))))
    manifest = {'schemaVersion': 'orbit-student-assembly-v1', 'authority': 'provided assembly of externally declared student artifacts',
                'files': [{'path': name, 'sha256': hashlib.sha256(raw).hexdigest()} for name, raw in sorted(output.items())]}
    output['assembly-manifest.json'] = json.dumps(manifest, indent=2, ensure_ascii=False).encode('utf-8')
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, raw in sorted(output.items()):
            archive.writestr(name, raw)
    return buffer.getvalue()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archives', nargs=8, type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    source = Path(__file__).resolve().parent
    scaffold = {path.relative_to(source).as_posix(): path.read_bytes() for path in source.rglob('*')
                if path.is_file() and path.name != 'merge_modules.py' and '__pycache__' not in path.parts}
    args.output.write_bytes(assemble([path.read_bytes() for path in args.archives], scaffold))
    print(json.dumps({'state': 'assembled-not-built', 'path': str(args.output), 'modules': 8}))
