import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Present in Three r181; the installed @types addon omits this documented method.
declare module 'three/addons/math/MeshSurfaceSampler.js' {
  interface MeshSurfaceSampler { setRandomGenerator(random: () => number): this; }
}

/** A bounded, repeatable surface study of the actual model, never a portrait billboard. */
export function samplePresenceSurface(root: THREE.Object3D, count: number): THREE.BufferGeometry {
  if (!Number.isFinite(count)) throw new Error('Invalid particle count');
  const amount = Math.max(100, Math.min(32000, Math.floor(count)));
  const pieces: THREE.BufferGeometry[] = [];
  root.updateMatrixWorld(true);
  root.traverse(node => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry.getAttribute('position')) return;
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    for (const key of Object.keys(geometry.attributes)) if (!['position', 'normal'].includes(key)) geometry.deleteAttribute(key);
    geometry.morphAttributes = {};
    geometry.morphTargetsRelative = false;
    geometry.clearGroups();
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    geometry.applyMatrix4(mesh.matrixWorld);
    pieces.push(geometry);
  });
  if (!pieces.length) throw new Error('No surface to sample');
  const surface = mergeGeometries(pieces, false);
  pieces.forEach(piece => piece.dispose());
  if (!surface) throw new Error('Incompatible presence geometry');
  // Give the face enough samples to remain legible at laptop and phone sizes.
  // The entire surface remains eligible, including its sides and back.
  const vertices = surface.getAttribute('position');
  const weights = new Float32Array(vertices.count);
  for (let i = 0; i < vertices.count; i++) {
    const upper = THREE.MathUtils.smoothstep(vertices.getY(i), .05, .45);
    weights[i] = 1 + upper * 3;
  }
  surface.setAttribute('weight', new THREE.BufferAttribute(weights, 1));
  let seed = 190927;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const helper = new THREE.Mesh(surface);
  const sampler = new MeshSurfaceSampler(helper).setWeightAttribute('weight').setRandomGenerator(random).build();
  const positions = new Float32Array(amount * 3), normals = new Float32Array(amount * 3), seeds = new Float32Array(amount);
  const point = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let i = 0; i < amount; i++) {
    sampler.sample(point, normal);
    point.toArray(positions, i * 3); normal.toArray(normals, i * 3); seeds[i] = random();
  }
  surface.dispose();
  (helper.material as THREE.Material).dispose();
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  result.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  result.computeBoundingSphere();
  return result;
}

export function createPresenceParticles(root: THREE.Object3D, count: number, pixelRatio: number) {
  const geometry = samplePresenceSurface(root, count);
  const uniforms = {
    uTime: { value: 0 }, uScatter: { value: 0 }, uActivity: { value: 0 },
    uPointer: { value: new THREE.Vector3(20, 20, 0) }, uPointerStrength: { value: 0 },
    uPixelRatio: { value: pixelRatio }, uMotion: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: true, depthTest: true,
    vertexShader: `
      attribute float aSeed;
      uniform float uTime, uScatter, uActivity, uPixelRatio, uPointerStrength, uMotion;
      uniform vec3 uPointer;
      varying float vSeed, vFacing, vLight, vScatter;
      void main() {
        vec3 p = position + normal * .003;
        vec3 radial = normalize(position + vec3(sin(aSeed * 69.0), cos(aSeed * 47.0), sin(aSeed * 81.0)) * .6);
        p += radial * uScatter * (1.0 + 2.0 * aSeed);
        p += vec3(sin(uTime*.45 + aSeed*60.0), cos(uTime*.65 + aSeed*31.0), sin(uTime*.5 + aSeed*14.0)) * .004 * uMotion;
        vec3 delta = p - uPointer;
        float force = exp(-dot(delta.xy,delta.xy) / .075) * uPointerStrength;
        p += normalize(delta + vec3(.001,.001,.09)) * force * .18;
        float breathing = sin(uTime*1.1) * .004 * uMotion;
        p.x += normal.x * breathing;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFacing = dot(n,normalize(-mv.xyz));
        vLight = .18 + .82 * max(0.0,dot(n,normalize(vec3(-.55,.7,1.0))));
        vSeed=aSeed; vScatter=uScatter;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((1.6 + aSeed*.7) * uPixelRatio * (4.0 / max(1.0,-mv.z)),1.0,5.0);
      }`,
    fragmentShader: `
      uniform float uTime, uActivity, uMotion;
      varying float vSeed, vFacing, vLight, vScatter;
      void main() {
        float d=length(gl_PointCoord-.5);
        if(d>.5 || (vFacing<.02 && vScatter<.1)) discard;
        vec3 cyan=vec3(.06,.42,.9), violet=vec3(.4,.10,.88), pearl=vec3(.6,.72,.92), gold=vec3(1.0,.46,.12);
        vec3 tint=mix(cyan,violet,smoothstep(.38,.88,vSeed));
        if(vSeed>.965)tint=gold;
        tint=mix(tint,pearl,.28*max(vFacing,0.0));
        float pulse=1.0 + uActivity*.14*sin(uTime*2.2 + vSeed*6.28)*uMotion;
        float alpha=(1.0-smoothstep(.25,.5,d))*.94;
        gl_FragColor=vec4(tint*vLight*pulse,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geometry, material);
  // Dispersion goes beyond the rest-pose bounding sphere.
  points.frustumCulled = false;
  points.name = 'Orbit surface particles';
  return { points, uniforms };
}

/** Decorative dust responds to the pointer and to the moving presence, locally on the GPU. */
export function createPresenceField(count: number, pixelRatio: number) {
  const positions = new Float32Array(count * 3), seeds = new Float32Array(count);
  let seed = 270926;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for(let i=0;i<count;i++) {
    positions.set([(random()-.5)*15,(random()-.5)*8,-.8-random()*2],i*3);
    seeds[i]=random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
  const uniforms = {
    uTime:{value:0},uMotion:{value:1},uPointer:{value:new THREE.Vector3(20,20,0)},
    uCenter:{value:new THREE.Vector2()},uSpeed:{value:0},uPixelRatio:{value:pixelRatio},
  };
  const material = new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms,
    vertexShader:`attribute float aSeed; uniform float uTime,uMotion,uSpeed,uPixelRatio;
      uniform vec3 uPointer; uniform vec2 uCenter; varying float vSeed;
      void main(){
        vec3 p=position;
        vec2 wake=p.xy-uCenter;
        p.xy+=normalize(wake+vec2(.001)) * exp(-dot(wake,wake)*.55)*uSpeed*.65;
        vec2 d=p.xy-uPointer.xy;
        p.xy+=normalize(d+vec2(.001)) * exp(-dot(d,d)*1.3)*.45;
        p.y+=sin(uTime*.13+aSeed*30.)*.035*uMotion;
        vSeed=aSeed;vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=(1.+aSeed*1.5)*uPixelRatio;
      }`,
    fragmentShader:`varying float vSeed;
      void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;
        vec3 c=mix(vec3(.23,.63,1.),vec3(.76,.46,1.),vSeed);
        if(vSeed>.96)c=vec3(1.,.68,.32);
        gl_FragColor=vec4(c,(1.-smoothstep(.05,.5,d))*(.15+vSeed*.30));
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return {points,uniforms};
}
