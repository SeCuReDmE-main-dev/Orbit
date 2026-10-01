"""One-time, allowlisted settings import; never emits credential values."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
KEYS = ('CPANEL_BASE_URL', 'CPANEL_USERNAME', 'CPANEL_API_TOKEN',
        'CPANEL_SSH_HOST', 'CPANEL_SSH_USER', 'CPANEL_SSH_PORT', 'CPANEL_SSH_PASSWORD')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-env', type=Path, required=True)
    parser.add_argument('--operator-root', type=Path, required=True)
    args = parser.parse_args()
    target = ROOT / '.env'
    if target.exists():
        raise SystemExit('Local .env already exists; refusing overwrite.')
    before = args.source_env.read_bytes()
    values = {}
    for line in before.decode('utf-8-sig').splitlines():
        match = re.match(r'^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$', line)
        if match and match[1] in KEYS:
            if match[1] in values:
                raise SystemExit('Duplicate required setting; resolve before importing.')
            values[match[1]] = match[2]
    missing = [key for key in KEYS if not values.get(key, '').strip().strip('\"\'')]
    if missing:
        raise SystemExit('Missing required settings: ' + ', '.join(missing))
    body = '# Private Orbit configuration. Never publish.\n'
    body += '\n'.join(f'{key}={values[key]}' for key in KEYS)
    body += '\nSECUREDME_ALLOW_LIVE_CPANEL_MUTATION=true\nORBIT_BROKER_PORT=47831\n'
    body += 'ORBIT_ALLOWED_EXTENSION_ORIGINS=\nSANITY_PROJECT_ID=pzscx4w8\nSANITY_DATASET=production\n'
    body += 'SANITY_API_TOKEN=\nEXA_API_KEY=\n'
    with target.open('x', encoding='utf-8', newline='\n') as handle:
        handle.write(body)
    vendor = ROOT / '.orbit' / 'vendor'
    manifest = []
    for name in ('securedme-settings-operator', 'securedme-cpanel-operator'):
        source = args.operator_root / name
        dest = vendor / name
        if dest.exists():
            raise SystemExit('Private operator snapshot already exists; refusing overwrite.')
        dest.mkdir(parents=True)
        shutil.copy2(source / 'pyproject.toml', dest / 'pyproject.toml')
        module = name.replace('-', '_')
        shutil.copytree(source / module, dest / module, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        for path in sorted(dest.rglob('*')):
            if path.is_file():
                manifest.append({'path': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    unchanged = hashlib.sha256(before).digest() == hashlib.sha256(args.source_env.read_bytes()).digest()
    assert unchanged, 'Source changed during import'
    receipt = {'imported_keys': list(KEYS), 'source_unchanged': unchanged, 'operator_files': manifest}
    (ROOT / '.orbit' / 'environment-import.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps({'imported_key_count': len(KEYS), 'source_unchanged': unchanged, 'private_operator_files':len(manifest)}))

if __name__ == '__main__':
    main()
