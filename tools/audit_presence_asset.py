"""Inspect a self-contained presence GLB without loading textures or executing code.

Usage: python tools/audit_presence_asset.py PATH [--quality high|low] [--receipt PATH]
An asset can pass technical budgets while still failing artistic or expression review.
"""
import argparse
import hashlib
import json
import struct
from pathlib import Path


def inspect(path: Path, quality: str) -> dict:
    raw = path.read_bytes()
    if len(raw) < 20:
        raise ValueError('Truncated GLB')
    magic, version, size, length, chunk = struct.unpack_from('<IIIII', raw)
    if magic != 0x46546C67 or version != 2 or size != len(raw) or chunk != 0x4E4F534A or 20 + length > size:
        raise ValueError('Invalid GLB header')
    doc = json.loads(raw[20:20 + length])
    if doc.get('asset', {}).get('version') != '2.0':
        raise ValueError('Unsupported glTF version')
    primitives = [p for mesh in doc.get('meshes', []) for p in mesh['primitives']]
    accessors = doc.get('accessors', [])
    triangles = 0
    for p in primitives:
        count = accessors[p.get('indices', p['attributes']['POSITION'])]['count']
        mode = p.get('mode', 4)
        triangles += count // 3 if mode == 4 else max(0, count - 2) if mode in (5, 6) else 0
    external = any('uri' in asset for key in ('buffers', 'images') for asset in doc.get(key, []))
    budget = 80000 if quality == 'high' else 30000
    checks = {'triangles': triangles <= budget, 'primitives': len(primitives) <= 20,
              'bytes': size <= 8 * 1024 * 1024, 'embeddedAssets': not external}
    return {
        'schemaVersion': 1, 'file': path.name, 'sha256': hashlib.sha256(raw).hexdigest(),
        'quality': quality, 'bytes': size, 'triangles': triangles, 'primitives': len(primitives),
        'materials': len(doc.get('materials', [])), 'textures': len(doc.get('textures', [])),
        'skins': len(doc.get('skins', [])),
        'animations': [a.get('name', '') for a in doc.get('animations', [])],
        'morphTargets': sorted({name for m in doc.get('meshes', []) for name in m.get('extras', {}).get('targetNames', [])}),
        'checks': checks, 'technicalBudgetsPass': all(checks.values()),
        'notChecked': ['texture dimensions', 'facial fidelity', 'deformations', 'frame time', 'license'],
        'approvedForApplication': False,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('asset', type=Path)
    parser.add_argument('--quality', choices=['high', 'low'], default='high')
    parser.add_argument('--receipt', type=Path)
    args = parser.parse_args()
    result = inspect(args.asset, args.quality)
    output = json.dumps(result, indent=2, ensure_ascii=False)
    if args.receipt:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(output + '\n', encoding='utf8')
    print(output)
