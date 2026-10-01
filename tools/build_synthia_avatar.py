"""Build Orbit's portable Synthia study in Blender; never modifies source references.

blender --background --python tools/build_synthia_avatar.py -- --output web/public/presence
Original procedural geometry by Codex, directed by Jean-Sebastien Beaulieu.
This is an authored interpretation, not a recovered or reconstructed canonical mesh.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--references', default=r'Z:\SecuredMe Education suite\Synthia\assets')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
out = Path(args.output).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0, roughness=.4, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Emission Color'].default_value = (*color, 1)
    p.inputs['Emission Strength'].default_value = emission
    return m

ivory = material('Synthia | warm porcelain', (.79, .82, .76), .22, .32)
silver = material('Synthia | brushed silver', (.37, .46, .44), .8, .31)
graphite = material('Synthia | graphite', (.025, .045, .041), .45, .42)
teal = material('Synthia | soft teal signal', (.17, .47, .41), .35, .3, .5)
sage = material('Synthia | sage iris', (.26, .45, .24), .12, .2)
iris_light = material('Synthia | iris filaments', (.49, .61, .29), .12, .3)
white = material('Synthia | sclera', (.79, .83, .76), 0, .17)
pupil = material('Synthia | pupil', (.004, .012, .009), 0, .13)
lip = material('Synthia | ceramic lips', (.38, .43, .38), .12, .34)
highlight = material('Synthia | eye catchlight', (.93, 1, .91), 0, .12, .7)
objects = []

def finish(obj, name, mat, bone='head'):
    obj.name = name
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    objects.append((obj, bone))
    return obj

def mesh(name, vertices, faces, mat, bone='head'):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat, bone)

def sphere(name, loc, scale, mat, bone='head', segments=40, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bone)

def tube(name, points, radius, mat, bone='head', sides=8):
    # Mesh tubes keep the export independent of Blender curve evaluation.
    vertices, faces = [], []
    for i, point in enumerate(points):
        p = Vector(point)
        tangent = Vector(points[min(i + 1, len(points)-1)]) - Vector(points[max(0, i-1)])
        tangent.normalize()
        helper = Vector((0, 0, 1)) if abs(tangent.z) < .9 else Vector((1, 0, 0))
        a = tangent.cross(helper).normalized()
        b = tangent.cross(a).normalized()
        for j in range(sides):
            v = p + radius * (math.cos(j*math.tau/sides)*a + math.sin(j*math.tau/sides)*b)
            vertices.append(tuple(v))
        if i:
            for j in range(sides):
                faces.append(((i-1)*sides+j, (i-1)*sides+(j+1)%sides, i*sides+(j+1)%sides, i*sides+j))
    return mesh(name, vertices, faces, mat, bone)

def circle(name, center, radius, thickness, mat, axis='x', bone='head', count=64):
    pts=[]
    for i in range(count+1):
        a=i*math.tau/count
        if axis=='x': p=(center[0], center[1]+radius*math.cos(a), center[2]+radius*math.sin(a))
        elif axis=='y': p=(center[0]+radius*math.cos(a), center[1], center[2]+radius*math.sin(a))
        else: p=(center[0]+radius*math.cos(a), center[1]+radius*math.sin(a), center[2])
        pts.append(p)
    return tube(name, pts, thickness, mat, bone)

def morph(obj, name, transform):
    if not obj.data.shape_keys:
        obj.shape_key_add(name='Basis')
    key = obj.shape_key_add(name=name)
    for v in key.data:
        v.co = transform(v.co.copy())
    return key

def gauss(x,z,cx,cz,sx,sz):
    return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)

# Anatomical profile: chin -> jaw -> cheek -> brow -> cranial dome.
profile=[(1.50,.08,.12),(1.58,.21,.20),(1.70,.30,.29),(1.86,.39,.33),
         (2.06,.46,.36),(2.25,.50,.37),(2.45,.50,.38),(2.65,.49,.39),
         (2.86,.48,.39),(3.04,.43,.36),(3.20,.31,.28),(3.30,.08,.10)]
def dimensions(z):
    for a,b in zip(profile,profile[1:]):
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0]); return a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t
    return profile[-1][1:]

def surface(z, theta, offset=0):
    width, depth=dimensions(z)
    x=width*math.sin(theta)
    facing=max(0, math.cos(theta))
    y=-depth*math.cos(theta)
    if facing>0:
        # Soft integrated nose bridge/tip, muzzle, cheekbone, orbital recesses.
        feature=.105*gauss(x,z,0,2.42,.080,.26)+.22*gauss(x,z,0,2.19,.105,.095)
        feature+=.045*gauss(x,z,0,1.97,.23,.115)+.065*gauss(x,z,0,1.65,.19,.09)
        for s in [-1,1]:
            feature+=.035*gauss(x,z,s*.30,2.24,.17,.16)
            feature-=.065*gauss(x,z,s*.225,2.47,.14,.095)
        y-=feature*facing**2
    return (x+offset*math.sin(theta),y-offset*math.cos(theta),z)

verts, faces=[],[]
rows,cols=92,112
for iz in range(rows):
    z=1.50+(3.30-1.50)*iz/(rows-1)
    for j in range(cols): verts.append(surface(z,(j/cols)*math.tau))
    if iz:
        for j in range(cols): faces.append(((iz-1)*cols+j,(iz-1)*cols+(j+1)%cols,iz*cols+(j+1)%cols,iz*cols+j))
faces.extend([tuple(reversed(range(cols))),tuple((rows-1)*cols+j for j in range(cols))])
head=mesh('HeadShell',verts,faces,ivory)
def jaw(v):
    w=gauss(v.x,v.z,0,1.75,.42,.25)
    if v.y<-.13: v.z-=.050*w;v.y+=.018*w
    return v
def smile(v):
    if v.y<-.15: v.z+=.035*gauss(abs(v.x),v.z,.16,1.97,.09,.075)
    return v
morph(head,'jawOpen',jaw);morph(head,'warmth',smile)

# Cranial seams follow the actual surface, instead of a wireframe overlay.
for n,angle in enumerate([-.98,-.64,0,.64,.98,1.55,2.0,-1.55,-2.]):
    start=2.66 if abs(angle)<.8 else 1.9
    points=[surface(start+(3.275-start)*i/40,angle+.025*math.sin(i*.14),.006) for i in range(41)]
    tube('Cranial seam %02d'%n,points,.0045,silver)
for z in [2.73,2.92,3.10]:
    tube('Crown transverse seam %.2f'%z,[surface(z,.85+i*(math.tau-1.7)/80,.006) for i in range(81)],.005,silver)
for side in [-1,1]:
    for n,(za,zb,aa,ab) in enumerate([(2.31,1.75,.83,.9),(2.15,1.82,.55,.76),(2.72,2.42,.7,1.2)]):
        pts=[surface(za+(zb-za)*i/28,side*(aa+(ab-aa)*i/28),.007) for i in range(29)]
        tube('Cheek panel seam %s %s'%(side,n),pts,.004,silver)
        for p in [pts[0],pts[-1]]:sphere('Ceramic fastener',p,(.011,.011,.011),silver,segments=12,rings=8)

# Convex almond-shaped eye surfaces, layered iris, eyelid rims and soft brows.
for side in [-1,1]:
    cx,cz=side*.225,2.46
    eyeverts=[(cx,-.418,cz)]
    for j in range(65):
        t=j*math.tau/64
        x=.147*math.cos(t)
        z=(.060 if math.sin(t)>0 else .044)*math.sin(t)
        eyeverts.append((cx+x,-.380+abs(x)*.19,cz+z+side*x*.07))
    eyefaces=[(0,j+1,j+2) for j in range(64)]
    eye=mesh('Eye%s'%side,eyeverts,eyefaces,white)
    def blink(v,center=cz): v.z=center+(v.z-center)*.025;return v
    morph(eye,'blink',blink)
    iris=sphere('Iris%s'%side,(cx,-.419,cz),(.045,.009,.045),sage,segments=40,rings=16)
    # Morph coordinates are local on sphere-based parts.
    morph(iris,'blink',lambda v:Vector((v.x,v.y,v.z*.025)))
    pupil_obj=sphere('Pupil%s'%side,(cx,-.429,cz),(.019,.004,.022),pupil,segments=24,rings=12)
    morph(pupil_obj,'blink',lambda v:Vector((v.x,v.y,v.z*.025)))
    circle('Iris limbal ring%s'%side,(cx,-.426,cz),.046,.0025,graphite,axis='y')
    for i in range(22):
        a=i*math.tau/22
        tube('Iris filament',[(cx+r*math.sin(a),-.430,cz+r*math.cos(a)) for r in [.024,.038]],.001,iris_light,sides=4)
    sphere('Eye light%s'%side,(cx-.013,-.435,cz+.016),(.007,.003,.007),highlight,segments=12,rings=8)
    for upper in [True,False]:
        pts=[]
        for i in range(41):
            t=math.pi*i/40
            x=.15*math.cos(t)
            z=(.063 if upper else -.047)*math.sin(t)
            pts.append((cx+x,-.385+abs(x)*.19,cz+z+side*x*.07))
        rim=tube('Upper lid' if upper else 'Lower lid',pts,.010 if upper else .007,ivory)
        morph(rim,'blink',blink)
        if upper:
            lash=tube('Lash line',[(x,y-.007,z-.003) for x,y,z in pts],.004,graphite)
            morph(lash,'blink',blink)
    browpts=[]
    for i in range(30):
        t=i/29;x=cx+side*(-.125+.27*t);z=2.607+.035*math.sin(t*math.pi)-.025*t
        browpts.append((x,-.372+abs(x)*.035,z))
    brow=tube('Brow%s'%side,browpts,.011,graphite)
    morph(brow,'curiosity',lambda v:Vector((v.x,v.y,v.z+.033)))

# Lips and nostril recesses retain quiet human proportions.
for side in [-1,1]:
    sphere('Nostril recess',(side*.064,-.555,2.154),(.023,.009,.009),graphite,segments=24,rings=12)
mouthpts=[]
for i in range(41):
    x=-.15+.30*i/40;z=1.964+.004*math.cos(x/.15*math.pi)
    mouthpts.append((x,-.397-.025*(1-(x/.15)**2),z))
tube('Mouth separation',mouthpts,.0045,graphite)
for upper in [True,False]:
    pts=[]
    for i in range(41):
        x=-.148+.296*i/40;t=x/.148
        z=1.964+(1-t*t)*(.020 if upper else -.023)
        if upper:z-=.008*math.exp(-(x/.034)**2)
        pts.append((x,-.398-.026*(1-t*t),z))
    lips=tube('Upper lip' if upper else 'Lower lip',pts,.012,lip)
    morph(lips,'jawOpen',lambda v:Vector((v.x,v.y,v.z-(0 if upper else .025))))

# Mechanical temples: concentric housings, screws, exposed radial ribs, DNA motif.
for side in [-1,1]:
    x=side*.525
    sphere('Ear mechanical core',(x,.014,2.49),(.070,.22,.27),graphite)
    sphere('Ear ceramic disc',(x+side*.043,-.015,2.49),(.028,.186,.222),ivory)
    for r in [.150,.204,.235]:circle('Ear precision ring',(x+side*.06,0,2.49),r,.010,silver)
    for i in range(12):
        a=i*math.tau/12
        sphere('Ear screw',(x+side*.078,.18*math.cos(a),2.49+.18*math.sin(a)),(.009,.014,.014),silver,segments=12,rings=8)
    for strand in [-1,1]:
        pts=[(x+side*.08,-.01+strand*.053*math.sin(t*math.tau),2.36+.26*t) for t in [i/32 for i in range(33)]]
        tube('DNA temple strand',pts,.004,teal)
    for i in range(7):
        t=i/6;y=.053*math.sin(t*math.tau)
        tube('DNA rung',[(x+side*.08,-.01-y,2.36+.26*t),(x+side*.08,-.01+y,2.36+.26*t)],.003,silver)

# Exposed neck bundles and segmented vertebrae join a tailored shoulder shell.
sphere('Neck core',(0,.015,1.22),(.16,.14,.40),graphite,'neck')
for i in range(8):
    z=.94+i*.067
    circle('Cervical vertebra %s'%i,(0,.018,z),.152,.020,silver,axis='z',bone='neck',count=36)
for i in range(16):
    a=i*math.tau/16
    pts=[]
    for j in range(24):
        t=j/23;r=.16+.06*math.sin(t*math.pi)+.07*t
        pts.append((r*math.sin(a),r*math.cos(a),.91+.67*t))
    tube('Neck filament %02d'%i,pts,.010 if i%3 else .017,ivory if i%3==0 else silver,'neck')
    if i%4==0:tube('Neck signal',[(x*1.02,y*1.02,z) for x,y,z in pts],.004,teal,'neck')
sphere('Torso structure',(0,.07,.60),(.73,.29,.38),graphite,'spine')
for side in [-1,1]:
    sphere('Pectoral ceramic %s'%side,(side*.32,-.07,.60),(.40,.265,.31),ivory,'spine')
    sphere('Shoulder socket %s'%side,(side*.76,.04,.62),(.235,.225,.245),silver,'spine')
    sphere('Deltoid ceramic %s'%side,(side*.88,.017,.60),(.22,.24,.32),ivory,'spine')
    for offset in [0,.04]:
        pts=[(side*(.14+.66*t),-.19+.12*t,.90-.15*t-offset) for t in [i/24 for i in range(25)]]
        tube('Clavicle detail',pts,.015 if offset==0 else .005,ivory if offset==0 else teal,'spine')
    for i in range(4):
        a=-.8+i*.4
        pts=[(side*(.74+.20*math.cos(t)),.015+.22*math.sin(t),.63+i*.045) for t in [a+j*.025 for j in range(32)]]
        tube('Shoulder panel contour',pts,.005,silver,'spine')
circle('Sternal light',(0,-.281,.65),.053,.007,teal,axis='y',bone='spine')
for i in range(5):
    z=.25+i*.065
    sphere('Lower segmented shell %s'%i,(0,.025,z),(.51+i*.024,.235,.035),silver if i%2 else ivory,'spine',segments=40,rings=12)

# A real skeleton; every visible mesh is skinned to an explicit articulation.
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
rig=bpy.context.object;rig.name='SynthiaRig'
root=rig.data.edit_bones[0];root.name='root';root.head=(0,0,0);root.tail=(0,0,.4)
for name,headpos,tailpos,parent in [('spine',(0,0,.4),(0,0,.95),'root'),('neck',(0,0,.95),(0,0,1.6),'spine'),('head',(0,0,1.6),(0,0,2.7),'neck')]:
    b=rig.data.edit_bones.new(name);b.head=headpos;b.tail=tailpos;b.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for obj,bone in objects:
    group=obj.vertex_groups.new(name=bone);group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    mod=obj.modifiers.new('Synthia skin','ARMATURE');mod.object=rig
    obj.parent=rig
for name,amplitude in [('Idle',.018),('Listening',.040),('Thinking',.028),('Speaking',.023)]:
    rig.animation_data_create()
    action=bpy.data.actions.new(name);rig.animation_data.action=action
    for frame,phase in [(1,0),(31,math.pi/2),(61,math.pi),(91,3*math.pi/2),(121,math.tau)]:
        for bone_name in ['spine','neck','head']:
            bone=rig.pose.bones[bone_name];bone.rotation_mode='XYZ'
            bone.rotation_euler=(amplitude*.35*math.sin(phase),amplitude*.22*math.sin(phase),amplitude*math.sin(phase))
            bone.keyframe_insert(data_path='rotation_euler',frame=frame)
    track=rig.animation_data.nla_tracks.new();track.name=name
    track.strips.new(name,1,action);track.mute=True
rig.animation_data.action=None
for bone in rig.pose.bones:bone.rotation_euler=(0,0,0)
bpy.context.scene.frame_set(1)
bpy.context.scene.render.fps=30
bpy.context.scene.frame_end=121

glb=out/'synthia-study.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_morph=True,export_extras=True)

# Reload the exported artifact into a clean scene; verify the actual interchange asset.
expected_meshes=len(objects)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(glb))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
armatures=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']
shape_keys=sorted({k.name for o in meshes if o.data.shape_keys for k in o.data.shape_keys.key_blocks if k.name!='Basis'})
if not meshes or not armatures or not {'blink','curiosity','jawOpen','warmth'}.issubset(shape_keys):
    raise RuntimeError('GLB reimport validation failed: missing geometry, skin, or expressions')
refs=[]
refroot=Path(args.references)
for relative in ['Synthia_identity.png','face and body template/face/micro expression/face micro expression 1.png','face and body template/body/body 1.png']:
    source=refroot/relative
    if source.exists():refs.append({'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
manifest={'schemaVersion':1,'id':'synthia-study-v1','model':'/presence/synthia-study.glb','sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'bytes':glb.stat().st_size,
          'attribution':'Synthia identity: Jean-Sebastien Beaulieu / SecuredMe. Procedural 3D interpretation: Codex under maintainer direction.',
          'status':'visual-review-required','description':'Original procedural 3D bust informed by Synthia artwork. Not the canonical Synthia mesh; visual fidelity requires maintainer acceptance.',
          'tool':bpy.app.version_string,'references':refs,'animations':['Idle','Listening','Thinking','Speaking'],'expressions':shape_keys,
          'validation':{'reimported':True,'meshes':len(meshes),'sourceMeshes':expected_meshes,'armatures':len(armatures)}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('SYNTHIA_ASSET_VALIDATION '+json.dumps(manifest))
