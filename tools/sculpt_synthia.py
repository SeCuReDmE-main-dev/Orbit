"""Author the Synthia bust from CC0 anatomy and original mechanical details.

Run with Blender 4.5: --background --python tools/sculpt_synthia.py -- --output PATH
The MakeHuman mesh/targets are CC0; this script is original Orbit source.
"""
import argparse, gzip, hashlib, json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

parser=argparse.ArgumentParser(); parser.add_argument('--output',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]); out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[1]; anatomy=root/'assets/synthia/anatomy'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def mat(name,color,metal=0,rough=.4,glow=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
 p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=glow
 return m
ivory=mat('Synthia • porcelain',(.76,.78,.73),0,.32)
ivory.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.22
ivory.node_tree.nodes.get('Principled BSDF').inputs['Coat Roughness'].default_value=.22
silver=mat('Synthia • platinum',(.52,.56,.55),1,.24)
dark=mat('Synthia • graphite',(.028,.038,.038),.55,.36)
sage=mat('Synthia • iris sage',(.24,.40,.29),.15,.24)
teal=mat('Synthia • light',(.18,.61,.52),.3,.26,1.1)
sclera=mat('Synthia • sclera',(.74,.77,.70),.02,.22)
black=mat('Synthia • pupil',(.004,.009,.008),.08,.14)
lip=mat('Synthia • lip porcelain',(.47,.50,.46),.14,.42)
objects=[]
def mesh(name,verts,faces,material):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.data.materials.append(material)
 for f in d.polygons:f.use_smooth=True
 objects.append(o);return o
def ball(name,location,scale,material):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=location);o=bpy.context.object;o.name=name;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 for f in o.data.polygons:f.use_smooth=True
 objects.append(o);return o
def line(name,pts,radius,material):
 d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.resolution_u=3;d.bevel_depth=radius;d.bevel_resolution=1
 spline=d.splines.new('BEZIER');spline.bezier_points.add(len(pts)-1)
 for b,p in zip(spline.bezier_points,pts):b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.data.materials.append(material)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);objects.append(o);return o
def ring(name,c,r,thick,material,axis='x'):
 pts=[]
 for i in range(65):
  a=i*math.tau/64
  pts.append((c[0],c[1]+r*math.cos(a),c[2]+r*math.sin(a)) if axis=='x' else (c[0]+r*math.cos(a),c[1]+r*math.sin(a),c[2]))
 return line(name,pts,thick,material)

# Read only the anatomical body, excluding all MakeHuman helper geometry.
v=[];groups={};group=''
for raw in (anatomy/'base.obj').read_text().splitlines():
 if raw.startswith('v '):v.append(Vector(map(float,raw.split()[1:])))
 elif raw.startswith('g '):group=raw[2:];groups[group]=[]
 elif raw.startswith('f '):groups[group].append([int(n.split('/')[0])-1 for n in raw.split()[1:]])
for path in sorted(anatomy.glob('*.target.gz')):
 for raw in gzip.decompress(path.read_bytes()).decode().splitlines():
  if raw and not raw.startswith('#'):
   fields=raw.split();v[int(fields[0])]+=Vector(map(float,fields[1:]))
def convert(p):
 z=(p.y-3.8)*.5
 # A shorter cranial dome and a graceful, narrower shoulder silhouette.
 if z>1.61:z=1.61+(z-1.61)*.90
 x=p.x*.5*(.86 if z<.65 else 1)
 # Refine the oval silhouette before the mechanical detailing.
 x*=1-.14*math.exp(-((z-1.23)/.15)**2)
 y=-p.z*.5
 if y<-.40:y-=.012*math.exp(-(x/.10)**4-((z-1.257)/.035)**4)
 return (x,y,z)
faces=groups['body']
ids=sorted(set(i for f in faces for i in f));idx={n:i for i,n in enumerate(ids)}
body=mesh('Synthia sculpt • continuous anatomy',[convert(v[i]) for i in ids],[[idx[i] for i in f] for f in faces],ivory)
bm=bmesh.new();bm.from_mesh(body.data)
for point,normal in [((0,0,.02),(0,0,-1)),((.92,0,0),(1,0,0)),((-.92,0,0),(-1,0,0))]:
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=point,plane_no=normal,clear_outer=True,clear_inner=False)
bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary and (max(v.co.z for v in e.verts)<.08 or min(abs(v.co.x) for v in e.verts)>.90)],sides=0)
bm.to_mesh(body.data);bm.free();body.data.update()
body.data.materials.append(dark);body.data.materials.append(lip)
for poly in body.data.polygons:
 c=sum((body.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
 # Keep the face's material continuous; no polygon threshold across lips/chin.
sub=body.modifiers.new('Porcelain surface','SUBSURF');sub.levels=1
bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=sub.name)

# Trim after subdivision: this keeps the base and shoulder openings clean.
bm=bmesh.new();bm.from_mesh(body.data)
for point,normal in [((0,0,.16),(0,0,-1)),((.84,0,0),(1,0,0)),((-.84,0,0),(-1,0,0))]:
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=point,plane_no=normal,clear_outer=True,clear_inner=False)
# The neck is mechanical, rather than a solid human neck with cables painted on it.
for z in [.76,1.02]:
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,z),plane_no=(0,0,1),clear_outer=False,clear_inner=False)
neck_vertices=[v for v in bm.verts if .76001 < v.co.z < 1.01999]
bmesh.ops.delete(bm,geom=neck_vertices,context='VERTS')
bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary and (max(v.co.z for v in e.verts)<.18 or min(abs(v.co.x) for v in e.verts)>.83)],sides=0)
bm.to_mesh(body.data);bm.free();body.data.update()

# Soft vertex-colour lip detail exports as COLOR_0, without a custom runtime shader.
colours=body.data.color_attributes.new(name='Ceramic tint',type='FLOAT_COLOR',domain='POINT')
for vertex,colour in zip(body.data.vertices,colours.data):
 p=vertex.co
 lip_weight=.72*math.exp(-(p.x/.105)**6-((p.z-1.257)/.025)**4) if p.y<-.50 else 0
 shade=Vector((.76,.78,.73)).lerp(Vector((.40,.28,.25)),lip_weight)
 colour.color=(*shade,1)
colour_node=ivory.node_tree.nodes.new('ShaderNodeVertexColor');colour_node.layer_name='Ceramic tint'
# A distinct face material avoids vertex colours on the original mechanical meshes.
face_material=ivory.copy();face_material.name='Synthia porcelain with subtle lip tint';body.data.materials[0]=face_material
face_colour=face_material.node_tree.nodes.get(colour_node.name)
face_material.node_tree.links.new(face_colour.outputs['Color'],face_material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
tree=BVHTree.FromPolygons([x.co for x in body.data.vertices],[list(x.vertices) for x in body.data.polygons])
def front(x,z,offset=.008):
 hit=tree.ray_cast(Vector((x,-3,z)),Vector((0,1,0)))
 return (x,hit[0].y-offset,z) if hit[0] else None

def surface_line(name,anchors,radius,material):
 points=[]
 for a,b in zip(anchors,anchors[1:]):
  for j in range(16):
   t=j/16;p=front(a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t,.008)
   if p:points.append(p)
 if len(points)>1:return line(name,points,radius,material)

# Anatomically located eyes, with iris geometry rather than flat painted disks.
for side,label in [(1,'L'),(-1,'R')]:
 ids_eye=set(i for f in groups['helper-'+label.lower()+'-eye'] for i in f)
 center=sum((v[i] for i in ids_eye),Vector())/len(ids_eye);c=Vector(convert(center));r=.073
 ball('Eye '+label,c,(r,r,r),sclera)
 ball('Iris '+label,(c.x,c.y-r*.96,c.z),(.033,.009,.033),sage)
 ball('Pupil '+label,(c.x,c.y-r*1.066,c.z),(.014,.004,.014),black)
 for j in range(32):
  a=math.tau*j/32;line('Iris radial '+label,[(c.x+rr*math.sin(a),c.y-r*1.034,c.z+rr*math.cos(a)) for rr in [.018,.030]],.00065,silver)
 # The source helper follows the eyelid topology; use it for controlled upper lashes.
 lash_faces=groups['helper-'+label.lower()+'-eyelashes-2']
 lash_ids=sorted(set(i for f in lash_faces for i in f));lash_map={n:i for i,n in enumerate(lash_ids)}
 mesh('Upper eyelid '+label,[convert(v[i]) for i in lash_ids],[[lash_map[i] for i in f] for f in lash_faces],dark)
 for j in range(15):
  t=j/14;x=side*(.082+.144*t);z=1.493+.028*math.sin(t*math.pi)
  p=front(x,z,.007)
  if p:line('Individual eyelash '+label,[p,(x+side*.004,p[1]-.012,z+.006),(x+side*.007,p[1]-.018,z+.018)],.00075,dark)
 # Eyebrow follows the sculpt, tapered and gently lifted toward the temple.
 points=[p for t in [j/20 for j in range(21)] if (p:=front(c.x+side*(-.072+.158*t),c.z+.082+.025*math.sin(t*math.pi)-.009*t,.004))]
 line('Brow '+label,points,.006,dark)
 for j in range(28):
  t=j/27;x=c.x+side*(-.070+.151*t);z=c.z+.083+.025*math.sin(t*math.pi)-.009*t
  p=front(x,z,.009);q=front(x+side*.006,z+.009,.009)
  if p and q:line('Brow strand '+label,[p,q],.0008,dark)
 # Discreet precision housings set into the temples.
 cx=side*.34;cy=-.20;cz=c.z-.015
 ball('Temple core '+label,(cx,cy,cz),(.052,.14,.16),silver)
 ball('Temple cap '+label,(cx+side*.030,cy,cz),(.034,.127,.145),ivory)
 for radius in [.113,.146]:ring('Temple platinum '+label,(cx+side*.060,cy,cz),radius,.004,silver)
 for j in range(8):
  a=j*math.tau/8;ball('Temple fastener',(cx+side*.066,cy+.13*math.cos(a),cz+.13*math.sin(a)),(.004,.008,.008),silver)
 for strand in [-1,1]:
  pts=[(cx+side*.072,cy+strand*.034*math.sin(t*math.tau),cz-.085+.17*t) for t in [j/24 for j in range(25)]]
  line('DNA helix',pts,.002,teal)
 for j in range(7):
  t=j/6;dy=.034*math.sin(t*math.tau);line('DNA rung',[(cx+side*.072,cy-dy,cz-.085+.17*t),(cx+side*.072,cy+dy,cz-.085+.17*t)],.0015,silver)

# Original ceramic seam layout: follows the face and leaves its expression clear.
for side in [-1,1]:
 for n,points in enumerate([
  [(.27,1.45),(.285,1.38),(.245,1.29),(.19,1.21)],
  [(.22,1.38),(.235,1.31),(.18,1.24),(.12,1.20)],
  [(.27,1.65),(.26,1.73),(.21,1.85),(.10,1.915)],
 ]):
  anchors=[(side*x,z) for x,z in points];surface_line('Ceramic precision seam',anchors,.0018,silver)
  surface_line('Teal inlay',anchors[:2],.0012,teal)
  for x,z in [anchors[0],anchors[-1]]:
   p=front(x,z,.004)
   if p:ball('Micro fastener',p,(.0038,.003,.0038),silver)
 # Crown arcs extend to the back in true volume.
 for angle in [.45,1.1]:
  pts=[]
  for j in range(25):
   t=j/24;z=1.67+.245*math.sin(t*math.pi/2);x=side*(.32*(1-t)+.025)*math.sin(angle)
   p=front(x,z,.003)
   if p:pts.append(p)
  if pts:line('Crown panel',pts,.0015,silver)

# Curved cranial shells: actual thickness and bevels, not painted seams.
def cranium_point(theta,phi,offset=0):
 center=Vector((0,-.08,1.62))
 direction=Vector((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta))).normalized()
 hit=tree.ray_cast(center+direction*2,-direction)
 if hit[0]:
  normal=hit[1] if hit[1].dot(direction)>0 else -hit[1]
  return tuple(hit[0]+normal*offset)
 return tuple(center+direction*.33)
for row in range(4):
 for col in range(10):
  phi0=-math.pi+col*math.tau/10+.045;phi1=phi0+math.tau/10-.09
  theta0=.18+row*.29;theta1=theta0+.255
  if row>1 and math.sin((phi0+phi1)/2)<-.42:continue
  verts=[];faces=[];n=7
  for j in range(n+1):
   for k in range(n+1):verts.append(cranium_point(theta0+(theta1-theta0)*j/n,phi0+(phi1-phi0)*k/n,.011))
  for j in range(n):
   for k in range(n):a=j*(n+1)+k;faces.append([a,a+1,a+n+2,a+n+1])
  panel=mesh('Cranial ceramic shell',verts,faces,ivory)
  solid=panel.modifiers.new('Shell thickness','SOLIDIFY');solid.thickness=.008;solid.offset=-1
  bevel=panel.modifiers.new('Manufactured edge','BEVEL');bevel.width=.003;bevel.segments=2
  bpy.context.view_layer.objects.active=panel
  for modifier in list(panel.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
  for theta,phi in [(theta0+.035,phi0+.065),(theta1-.035,phi1-.065)]:
   pos=Vector(cranium_point(theta,phi,.017));ball('Panel screw',pos,(.004,.004,.004),dark)
for col in range(10):
 phi=-math.pi+col*math.tau/10
 if math.sin(phi)<-.45:continue
 for delta in [-.014,.014]:
  pts=[cranium_point(.15+j*.048,phi+delta,.004) for j in range(28)]
  line('Cranial articulated rail',pts,.006,silver)
for side in [-1,1]:
 anchors=[(side*.265,1.445),(side*.286,1.375),(side*.232,1.281),(side*.166,1.214)]
 for shift in [0,.012]:surface_line('Cheek articulated rim',[(x+side*shift,z) for x,z in anchors],.0035,silver)

# Neck machinery is recessed under the jaw; no detached ball shoulders.
for j in range(14):
 a=j*math.tau/14;pts=[]
 for k in range(15):
  t=k/14;r=.175-.042*math.sin(t*math.pi)
  pts.append((r*math.sin(a),.035+r*math.cos(a),.73+.43*t))
 line('Cervical tendon',pts,.008 if j%3 else .011,silver if j%3 else ivory)
for j in range(6):ring('Cervical collar',(0,.035,.76+j*.061),.15,.006,silver,axis='z')
ball('Cervical spine',(0,.055,.915),(.064,.075,.205),dark)
for side in [-1,1]:
 for j in range(4):
  x=side*(.035+j*.034)
  line('Anterior neck actuator',[(x,-.11,1.09),(x*1.08,-.125,.94),(x*1.45,-.10,.77)],.006,silver)
 # Interlocking paths frame a central ceramic sternum instead of isolated shoulder balls.
 for shift in [0,.065,.125]:
  anchors=[(side*x,z-shift) for x,z in [(.04,.68),(.18,.66),(.31,.61),(.45,.51),(.58,.36),(.58,.20)]]
  surface_line('Thoracic panel seam',anchors,.0026,silver)
  for x,z in anchors[1:4]:
   p=front(x,z,.006)
   if p:ball('Thoracic fastener',p,(.008,.004,.008),silver)
 for j in range(4):
  anchors=[(side*(.61+j*.038),.46),(side*(.67+j*.032),.35),(side*(.69+j*.030),.20)]
  surface_line('Shoulder mechanism',anchors,.009,silver)
for side in [-1,1]:
 anchors=[(side*x,z) for x,z in [(.13,.63),(.29,.61),(.49,.56),(.70,.47),(.83,.33)]]
 surface_line('Shoulder inset',anchors,.003,silver);surface_line('Shoulder signal',anchors[:3],.002,teal)

# A portable head/neck/spine rig and restrained expressions.
bpy.ops.object.armature_add(enter_editmode=True);rig=bpy.context.object;rig.name='SynthiaRig'
b=rig.data.edit_bones[0];b.name='spine';b.head=(0,0,0);b.tail=(0,0,.72)
for name,h,t,parent in [('neck',(0,0,.72),(0,0,1.17),'spine'),('head',(0,0,1.17),(0,0,1.8),'neck')]:
 b=rig.data.edit_bones.new(name);b.head=h;b.tail=t;b.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for obj in objects:
 for name in ['spine','neck','head']:obj.vertex_groups.new(name=name)
 for vertex in obj.data.vertices:
  z=(obj.matrix_world@vertex.co).z
  neck=max(0,min(1,(z-.67)/.18));head=max(0,min(1,(z-1.10)/.16))
  for name,weight in [('spine',1-neck),('neck',neck*(1-head)),('head',head)]:
   if weight>0:obj.vertex_groups[name].add([vertex.index],weight,'REPLACE')
 mod=obj.modifiers.new('Synthia articulation','ARMATURE');mod.object=rig;obj.parent=rig
body.shape_key_add(name='Basis')
for name in ['warmth','curiosity','jawOpen','blink']:
 key=body.shape_key_add(name=name)
 for vert in key.data:
  p=vert.co
  if name=='warmth' and p.y<-.5:p.z+=.009*math.exp(-((abs(p.x)-.10)/.035)**2-((p.z-1.25)/.035)**2)
  if name=='curiosity' and p.y<-.4:p.z+=.009*math.exp(-((abs(p.x)-.17)/.12)**2-((p.z-1.61)/.06)**2)
  if name=='jawOpen' and p.y<-.25:p.z-=.015*math.exp(-(p.x/.20)**2-((p.z-1.17)/.10)**2)
  if name=='blink' and p.y<-.5:
   w=math.exp(-((abs(p.x)-.144)/.076)**4-((p.z-1.52)/.07)**4);p.z+=(1.499-p.z)*.82*w
for name,amp in [('Idle',.011),('Listening',.023),('Thinking',.018),('Speaking',.014)]:
 rig.animation_data_create();action=bpy.data.actions.new(name);rig.animation_data.action=action
 for frame,phase in [(1,0),(41,math.pi/2),(81,math.pi),(121,3*math.pi/2),(161,math.tau)]:
  for n in ['neck','head']:
   b=rig.pose.bones[n];b.rotation_mode='XYZ';b.rotation_euler=(amp*.6*math.sin(phase),amp*.4*math.sin(phase),amp*math.sin(phase));b.keyframe_insert('rotation_euler',frame=frame)
 tr=rig.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,1,action);tr.mute=True
rig.animation_data.action=None
for b in rig.pose.bones:b.rotation_euler=(0,0,0)
bpy.context.scene.frame_set(1);bpy.context.scene.render.fps=30
glb=out/'synthia.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_animation_mode='NLA_TRACKS',export_animations=True,export_skins=True,export_morph=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'synthia-source.blend'))

# Production reference render, separate from the portable geometry.
def area(name,loc,power,size,color):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,1.25))-o.location).to_track_quat('-Z','Y').to_euler()
area('Softbox',(1.7,-3.2,3.6),125,2.5,(.88,.94,1))
area('Pearl fill',(-2,-1.3,2.2),75,2,(1,.94,.83))
area('Teal rim',(1.0,1.0,2.8),210,1.7,(.27,.75,.66))
bpy.ops.object.camera_add(location=(1.6,-4.5,1.64));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1.09))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.4
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.world.color=(.12,.12,.12);scene.render.film_transparent=True
scene.render.resolution_x=960;scene.render.resolution_y=1120;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(out/'portrait.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'synthia-source.blend'))
manifest={'schemaVersion':1,'id':'synthia-sculpt-v2','model':'/presence/synthia.glb','status':'visual-review-required','bytes':glb.stat().st_size,'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'animations':['Idle','Listening','Thinking','Speaking'],'expressions':['warmth','curiosity','jawOpen','blink'],'attribution':'Synthia identity: Jean-Sebastien Beaulieu. Anatomy: MakeHuman Community CC0 (commit 3edf9df0551765be43563d047888cf7877eb89b4). Sculpt, mechanics, rig and rendering: Codex, personally directed in this task.','sourceFiles':[{'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in anatomy.iterdir() if p.is_file()]}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('SYNTHIA_RENDER_COMPLETE '+str(out))
