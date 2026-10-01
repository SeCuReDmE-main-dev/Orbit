"""Refine the real Orbit mesh with canonical face projection and manufactured detail.
Keeps the Synthia source collection read-only. Front projection is a texture technique,
not a reconstruction claim; profile and texture seams need human visual review.
"""
import argparse, json, math, hashlib, sys
from pathlib import Path
import bpy
from mathutils import Vector
parser=argparse.ArgumentParser();parser.add_argument('--source',required=True);parser.add_argument('--output',required=True)
a=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=a.source)
root=Path(__file__).resolve().parents[1]
body=next(o for o in bpy.data.objects if o.name.startswith('Synthia sculpt'))
# A curved jaw edge replaces the straight mechanical cut beneath the cheeks.
# Apply the same displacement to every shape key so articulation stays coherent.
def jaw_delta(v):
 return .085*min(1,(abs(v.x)/.31)**2)*(1-smooth_jaw(v.z)) if 1.019<v.z<1.13 else 0
def smooth_jaw(z):
 t=max(0,min(1,(z-1.02)/.11));return t*t*(3-2*t)
if body.data.shape_keys:
 for key in body.data.shape_keys.key_blocks:
  for vertex in key.data:vertex.co.z+=jaw_delta(vertex.co)
else:
 for vertex in body.data.vertices:vertex.co.z+=jaw_delta(vertex.co)
# Project a canonical frontal identity onto actual anatomical geometry.
texture=bpy.data.images.load(str(root/'assets/synthia/direction/canonical-face.png'));texture.pack()
material=bpy.data.materials.new('Orbit • canonical porcelain');material.use_nodes=True
p=material.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.48;p.inputs['Metallic'].default_value=.10
p.inputs['Coat Weight'].default_value=.12;p.inputs['Coat Roughness'].default_value=.3
image=material.node_tree.nodes.new('ShaderNodeTexImage');image.image=texture;image.extension='EXTEND'
identity_uv=material.node_tree.nodes.new('ShaderNodeUVMap');identity_uv.uv_map='Canonical portrait projection'
material.node_tree.links.new(identity_uv.outputs['UV'],image.inputs['Vector'])
weights=material.node_tree.nodes.new('ShaderNodeVertexColor');weights.layer_name='Identity blend'
mix=material.node_tree.nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.64,.64,.60,1)
material.node_tree.links.new(weights.outputs['Color'],mix.inputs[0]);material.node_tree.links.new(image.outputs['Color'],mix.inputs[2])
material.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
body.data.materials.append(material);mi=len(body.data.materials)-1
uv=body.data.uv_layers.new(name='Canonical portrait projection');body.data.uv_layers.active=uv
for poly in body.data.polygons:
 center=sum((body.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
 poly.material_index=mi
 for li in poly.loop_indices:
  v=body.data.vertices[body.data.loops[li].vertex_index].co
  # Canonical landmarks: eyes at row 548, mouth row 805, central nose at x 561.
  uv.data[li].uv=(.5+v.x*.862,1-(548+(1.497-v.z)*(790 if v.z<1.497 else 1060))/1402)
def smooth(a,b,t):
 x=max(0,min(1,(t-a)/(b-a)));return x*x*(3-2*x)
blend=body.data.color_attributes.new(name='Identity blend',type='FLOAT_COLOR',domain='POINT')
for vertex,color in zip(body.data.vertices,blend.data):
 v=vertex.co;w=smooth(1.02,1.10,v.z)*smooth(.30,.55,-v.y)*(1-smooth(.27,.35,abs(v.x)))
 color.color=(w,w,w,1)
# Bake the projected identity into a standard UV texture for portable glTF materials.
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
atlas=body.data.uv_layers.new(name='Orbit albedo UV');body.data.uv_layers.active=atlas;atlas.active_render=True
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
baked=bpy.data.images.new('Orbit albedo',width=2048,height=2048,alpha=False)
target=material.node_tree.nodes.new('ShaderNodeTexImage');target.image=baked;material.node_tree.nodes.active=target
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=1
# All body polygons use this material; no other mesh is involved in the bake.
bpy.ops.object.bake(type='DIFFUSE',pass_filter={'COLOR'},margin=8)
baked.filepath_raw=str(out/'orbit-albedo.png');baked.file_format='PNG';baked.save();baked.pack()
material.node_tree.links.new(target.outputs['Color'],p.inputs['Base Color'])
# Restrained cosmetic geometry lets the reference retain its eye/brow character.
for obj in list(bpy.data.objects):
 if obj.name.startswith(('Brow ','Brow strand','Individual eyelash','Ceramic precision seam','Teal inlay','Cheek articulated rim','Crown panel')):
  bpy.data.objects.remove(obj,do_unlink=True)
# Smaller, warmer optical pupils; no doll-like self illumination.
for m in bpy.data.materials:
 if not m.use_nodes:continue
 bs=m.node_tree.nodes.get('Principled BSDF')
 if not bs:continue
 if 'porcelain' in m.name and m!=material:
  bs.inputs['Base Color'].default_value=(.68,.67,.61,1);bs.inputs['Metallic'].default_value=.15;bs.inputs['Roughness'].default_value=.38
 if 'light' in m.name:
  bs.inputs['Base Color'].default_value=(.14,.60,.95,1);bs.inputs['Emission Color'].default_value=(.12,.5,1,1);bs.inputs['Emission Strength'].default_value=.65
 if 'platinum' in m.name:bs.inputs['Roughness'].default_value=.29
 if 'iris' in m.name:bs.inputs['Base Color'].default_value=(.19,.27,.14,1);bs.inputs['Roughness'].default_value=.36
# Replace the rigid neck cage by finer curved tendon bundles.
for obj in list(bpy.data.objects):
 if obj.name.startswith(('Cervical collar','Cervical tendon','Anterior neck actuator')):bpy.data.objects.remove(obj,do_unlink=True)
rig=bpy.data.objects.get('SynthiaRig');metal=next(m for m in bpy.data.materials if 'platinum' in m.name)
for j in range(28):
 angle=j*math.tau/28;curve=bpy.data.curves.new('Orbit neck tendon','CURVE');curve.dimensions='3D';curve.bevel_depth=.004;curve.bevel_resolution=2
 spline=curve.splines.new('BEZIER');spline.bezier_points.add(5)
 for k,point in enumerate(spline.bezier_points):
  t=k/5;r=.155+.09*(1-t)**3-.032*math.sin(t*math.pi)
  point.co=(r*math.sin(angle+.15*t),.005+r*math.cos(angle+.15*t),.72+.40*t);point.handle_left_type='AUTO';point.handle_right_type='AUTO'
 obj=bpy.data.objects.new('Orbit tendon',curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(metal)
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
 for name in ['spine','neck','head']:obj.vertex_groups.new(name=name)
 for vertex in obj.data.vertices:
  z=vertex.co.z;neck=max(0,min(1,(z-.67)/.18));head=max(0,min(1,(z-1.10)/.16))
  for name,w in [('spine',1-neck),('neck',neck*(1-head)),('head',head)]:
   if w>0:obj.vertex_groups[name].add([vertex.index],w,'REPLACE')
 mod=obj.modifiers.new('Articulation','ARMATURE');mod.object=rig;obj.parent=rig
# Manufactured chest shells follow the underlying surface, with open mechanical gaps.
from mathutils.bvhtree import BVHTree
surface=BVHTree.FromPolygons([v.co for v in body.data.vertices],[list(p.vertices) for p in body.data.polygons])
def front(x,z,offset=.014):
 hit=surface.ray_cast(Vector((x,-3,z)),Vector((0,1,0)))
 return (x,hit[0].y-offset,z) if hit[0] else (x,-.15,z)
ceramic=bpy.data.materials.new('Orbit • warm ceramic armor');ceramic.use_nodes=True
bs=ceramic.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.68,.68,.64,1);bs.inputs['Metallic'].default_value=.20;bs.inputs['Roughness'].default_value=.34;bs.inputs['Coat Weight'].default_value=.18
carbon=next(m for m in bpy.data.materials if 'graphite' in m.name);body.data.materials.append(carbon);carbon_index=len(body.data.materials)-1
for poly in body.data.polygons:
 center=sum((body.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
 if center.z<.80:poly.material_index=carbon_index
for obj in list(bpy.data.objects):
 if obj.name.startswith(('Thoracic panel seam','Thoracic fastener','Shoulder mechanism','Shoulder inset','Shoulder signal')):bpy.data.objects.remove(obj,do_unlink=True)
def attach(obj):
 for name in ['spine','neck','head']:obj.vertex_groups.new(name=name)
 for vertex in obj.data.vertices:obj.vertex_groups['spine'].add([vertex.index],1,'REPLACE')
 mod=obj.modifiers.new('Articulation','ARMATURE');mod.object=rig;obj.parent=rig
# Armor follows designed contours and the actual anatomy, with a central gap.
panels=[
 ('Pectoral',[(.07,.55),(.16,.61),(.35,.615),(.53,.56),(.585,.45),(.55,.29),(.43,.22),(.18,.245),(.09,.34)]),
 ('Shoulder',[(.61,.57),(.69,.565),(.775,.46),(.78,.30),(.73,.20),(.63,.25),(.595,.39)]),
 ('Clavicle',[(.06,.665),(.17,.715),(.38,.685),(.55,.605),(.39,.627),(.18,.653)]),
]
for side in [-1,1]:
 for name,contour in panels:
  cx=sum(p[0] for p in contour)/len(contour);cz=sum(p[1] for p in contour)/len(contour)
  vertices=[front(side*cx,cz,.030)];faces=[];rings=9;segments=len(contour)*8
  for row in range(1,rings+1):
   r=row/rings
   for k in range(segments):
    edge=k/8;ia=int(edge);f=edge-ia;pa=contour[ia];pb=contour[(ia+1)%len(contour)]
    bx=pa[0]*(1-f)+pb[0]*f;bz=pa[1]*(1-f)+pb[1]*f
    x=side*(cx+(bx-cx)*r);z=cz+(bz-cz)*r
    vertices.append(front(x,z,.018+.012*(1-r*r)))
  for k in range(segments):faces.append((0,1+k,1+(k+1)%segments))
  for row in range(rings-1):
   a=1+row*segments;b=a+segments
   for k in range(segments):faces.append((a+k,a+(k+1)%segments,b+(k+1)%segments,b+k))
  data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update();obj=bpy.data.objects.new('Orbit '+name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(ceramic)
  # Mirroring reverses winding: make both shells face the camera before thickening.
  import bmesh
  shell=bmesh.new();shell.from_mesh(data);shell.normal_update()
  for face in shell.faces:
   if face.normal.y>0:face.normal_flip()
  shell.to_mesh(data);shell.free();data.update()
  for face in data.polygons:face.use_smooth=True
  solid=obj.modifiers.new('Ceramic thickness','SOLIDIFY');solid.thickness=.010
  bevel=obj.modifiers.new('Polished edge','BEVEL');bevel.width=.003;bevel.segments=3
  bpy.context.view_layer.objects.active=obj
  for mod in list(obj.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
  attach(obj)
  for bx,bz in contour:
   pos=front(side*(cx+(bx-cx)*.87),cz+(bz-cz)*.87,.033)
   bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=1,location=pos);rivet=bpy.context.object;rivet.name='Orbit captive screw';rivet.scale=(.0035,.002,.0035);rivet.data.materials.append(metal)
   bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);attach(rivet)
# Rib conduits sit in the exposed center channel.
for side in [-1,1]:
 for j in range(6):
  z=.20+j*.064;pts=[front(side*x,z+.028*math.sin(x*5),.022) for x in [.018,.035,.052,.065]]
  curve=bpy.data.curves.new('Orbit sternum cable','CURVE');curve.dimensions='3D';curve.bevel_depth=.006;curve.bevel_resolution=2
  spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(pts)-1)
  for point,pos in zip(spline.bezier_points,pts):point.co=pos;point.handle_left_type='AUTO';point.handle_right_type='AUTO'
  obj=bpy.data.objects.new('Orbit sternum cable',curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(metal)
  bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');attach(obj)

# Reframe the real volume with broad neutral key light and cosmic edge accents.
for obj in list(bpy.data.objects):
 if obj.type in {'LIGHT','CAMERA'}:bpy.data.objects.remove(obj,do_unlink=True)
def area(name,location,power,size,color):
 bpy.ops.object.light_add(type='AREA',location=location);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,1.25))-o.location).to_track_quat('-Z','Y').to_euler()
area('Pearl key',(-2.4,-3.5,3.2),180,3,(1,.93,.83));area('Violet rim',(1.4,.5,2.5),145,2,(.60,.35,1));area('Cyan edge',(-1.8,.5,1.8),130,2,(.25,.70,1));area('Soft fill',(2,-3,1.5),35,2,(.85,.91,1))
bpy.ops.object.camera_add(location=(.35,-4.5,1.45));cam=bpy.context.object;cam.rotation_euler=(Vector((0,-.1,1.15))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.15
scene=bpy.context.scene;scene.camera=cam;scene.world.color=(.10,.10,.12);scene.render.film_transparent=True;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=840;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
# Only mesh and armature export; studio light rig is not embedded in the GLB.
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type in {'MESH','ARMATURE'}:o.select_set(True)
glb=out/'orbit.glb';bpy.ops.export_scene.gltf(filepath=str(glb),use_selection=True,export_format='GLB',export_animation_mode='NLA_TRACKS',export_animations=True,export_skins=True,export_morph=True)
scene.render.filepath=str(out/'portrait.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'orbit-source.blend'))
(out/'manifest.json').write_text(json.dumps({'version':'orbit-presence-v12-study','status':'visual-review-required','method':'real rigged anatomy with canonical frontal texture projection; not a completed multi-view reconstruction','bytes':glb.stat().st_size,'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'textureSha256':hashlib.sha256((root/'assets/synthia/direction/canonical-face.png').read_bytes()).hexdigest()},indent=2))
print('ORBIT_PRESENCE_RENDERED')
