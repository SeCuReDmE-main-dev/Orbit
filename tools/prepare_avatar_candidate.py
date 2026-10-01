"""Blender-only preparation of a STATIC generated candidate for visual review.

Preserves the downloaded original. Does not invent a facial rig or promote a model.
blender --background --python tools/prepare_avatar_candidate.py -- --input RAW.glb --output DIR
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path
import bpy

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--input', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = args.input.resolve()
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=True)
if source.parent == out:
    raise ValueError('Raw downloads and prepared outputs must remain separate')

raw_sha = hashlib.sha256(source.read_bytes()).hexdigest()
results = []
for quality, limit in [('high', 79000), ('low', 29000)]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        raise ValueError('No geometry imported')
    if any(o.data.shape_keys or o.find_armature() for o in meshes):
        raise ValueError('Rigged inputs require a deformation-preserving workflow')
    counts = {}
    for obj in meshes:
        obj.data.calc_loop_triangles()
        counts[obj.name] = len(obj.data.loop_triangles)
    total = sum(counts.values())
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        if total > limit:
            modifier = obj.modifiers.new('Bounded web simplification', 'DECIMATE')
            modifier.ratio = limit / total
            modifier.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
    # Keep imported PBR maps. Resize only if an actual map exceeds the agreed limit.
    for image in bpy.data.images:
        w, h = image.size
        if max(w, h) > 2048:
            factor = 2048 / max(w, h)
            image.scale(round(w * factor), round(h * factor))
        if image.has_data:
            image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(out / f'orbit-candidate-{quality}.blend'))
    target = out / f'orbit-candidate-{quality}.glb'
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', export_animations=False,
                              export_materials='EXPORT', export_image_format='AUTO', export_yup=True)
    results.append({'quality': quality, 'file': target.name, 'targetTriangles': limit,
                    'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})

(out / 'preparation.json').write_text(json.dumps({
    'schemaVersion': 1, 'sourceSHA256': raw_sha, 'blender': bpy.app.version_string,
    'status': 'static-shape-review', 'rigged': False, 'approvedForApplication': False,
    'operations': ['glTF import', 'bounded decimation', 'retain imported PBR materials', 'embed textures'],
    'outputs': results,
}, indent=2), encoding='utf8')
