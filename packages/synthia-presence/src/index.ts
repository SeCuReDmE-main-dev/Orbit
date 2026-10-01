import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPresenceParticles, createPresenceField } from './particles';
import { createHolographicMaterial, prepareHologramGeometry } from './holographic';

export type PresenceAppearance = 'particles' | 'solid' | 'holographic' | 'clay';
export type PresenceDiagnostics = {
  appearance: PresenceAppearance;
  activity: PresenceActivity;
  renderCalls: number;
  triangles: number;
  frameSamples: number;
  frameIntervalP95Ms: number | null;
  expressions: Record<string, number>;
};

export type PresenceActivity =
  "idle" | "listening" | "thinking" | "speaking" | "error";
export type PresenceManifest = {
  modelUrl: string;
  animations?: Partial<Record<PresenceActivity, string>>;
};
export type PresenceOptions = {
  quality?: "low" | "high";
  reducedMotion?: boolean;
  appearance?: PresenceAppearance;
  lighting?: 'studio' | 'cosmic';
  decoration?: boolean;
  onProjection?: (x: number, y: number) => void;
  onStatus?: (
    state: "loading" | "ready" | "unavailable",
    message: string,
  ) => void;
};
export type Presence = {
  ready: Promise<boolean>;
  setActivity(value: PresenceActivity): void;
  setExpression(name: string, value: number): void;
  setReducedMotion(value: boolean): void;
  setActive(value: boolean): void;
  setView(value: 'front' | 'three-quarter' | 'profile'): void;
  setTurntable(value: boolean): void;
  setAppearance(value: PresenceAppearance): void;
  getDiagnostics(): PresenceDiagnostics;
  scatter(): void;
  reset(): void;
  containsSurfacePoint(clientX: number, clientY: number): boolean;
  resize(): void;
  dispose(): void;
};

/** Reject hidden network dependencies before handing a self-contained GLB to Three. */
export function validateGlb(buffer: ArrayBuffer): void {
  if (buffer.byteLength < 20 || buffer.byteLength > 24 * 1024 * 1024)
    throw new Error("Invalid model size");
  const view = new DataView(buffer);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== buffer.byteLength ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    throw new Error("Invalid GLB header");
  const jsonLength = view.getUint32(12, true);
  if (jsonLength > buffer.byteLength - 20)
    throw new Error("Invalid GLB content");
  const doc = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)),
  );
  if (doc.asset?.version !== "2.0") throw new Error("Unsupported glTF version");
  if (
    [...(doc.buffers ?? []), ...(doc.images ?? [])].some(
      (asset) => asset.uri !== undefined,
    )
  )
    throw new Error("Model must embed all geometry and textures");
}

/** Mounts presentation only: no microphone, account, conversation or service permissions. */
export function mountPresence(
  canvas: HTMLCanvasElement,
  manifest: PresenceManifest,
  options: PresenceOptions = {},
): Presence {
  const events = new AbortController(),
    request = new AbortController();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = options.reducedMotion ?? motion.matches,
    disposed = false,
    visible = true,
    enabled = true,
    lost = false,
    frame = 0,
    previous = 0,
    elapsed = 0;
  let renderer: THREE.WebGLRenderer | undefined,
    mixer: THREE.AnimationMixer | undefined,
    currentAction: THREE.AnimationAction | undefined;
  let activity: PresenceActivity = "idle",
    meshRoot: THREE.Object3D | undefined;
  const actions = new Map<string, THREE.AnimationAction>(),
    expressions = new Map<string, number>();
  let cloud: ReturnType<typeof createPresenceParticles> | undefined;
  let field: ReturnType<typeof createPresenceField> | undefined;
  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const hologramMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const readableHologramMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const clayMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const hologramUniforms = { uOrbitTime:{value:0}, uOrbitMotion:{value:1}, uOrbitActivity:{value:0} };
  const frameIntervals: number[] = [];
  let reformAppearance: PresenceAppearance = options.appearance ?? 'solid';
  let appearance = options.appearance ?? 'solid';
  let turntable = false;
  let dispersion = 0, dispersionTarget = 0;
  const offset = new THREE.Vector2(), velocity = new THREE.Vector2();
  const pointer = new THREE.Vector3(20, 20, 0);
  const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const resources = new Set<
    THREE.BufferGeometry | THREE.Material | THREE.Texture | THREE.WebGLRenderTarget
  >();
  const remember = (object: THREE.Object3D) =>
    object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry) resources.add(mesh.geometry);
      if (mesh.material)
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) {
          resources.add(material);
          for (const value of Object.values(material))
            if (value instanceof THREE.Texture) resources.add(value);
        }
    });
  const emit = (status: "loading" | "ready" | "unavailable", message: string) =>
    options.onStatus?.(status, message);
  let framedWidth = 2.2,
    targetY = 0.13,
    targetX = 0,
    startX = 0,
    startY = 0,
    lastPointerTime = 0,
    dragging = false;
  const setAppearance = (value: PresenceAppearance) => {
    if (value !== appearance) frameIntervals.length = 0;
    appearance = value;
    if (value !== 'particles') { dispersion = 0; dispersionTarget = 0; reformAppearance = value; }
    if (meshRoot) meshRoot.visible = value !== 'particles' || dispersion < .015;
    originalMaterials.forEach((material,mesh) => { mesh.material = value === 'solid' ? material : value === 'clay' ? clayMaterials.get(mesh)! : value === 'holographic' ? readableHologramMaterials.get(mesh)! : hologramMaterials.get(mesh)!; });
    if(value === 'particles') {
      mixer?.setTime(0);
      meshRoot?.traverse(object=>{const mesh=object as THREE.Mesh;mesh.morphTargetInfluences?.fill(0);});
    }
    if (cloud) cloud.points.visible = value === 'particles';
    canvas.dataset.appearance = value;
    schedule();
  };
  const reset = () => {
    offset.set(0, 0); velocity.set(0, 0); targetX = 0; targetY = .13;
    dispersionTarget = 0;
    if (reduced) dispersion = 0;
    if (appearance === 'particles' && reformAppearance !== 'particles') setAppearance(reformAppearance);
    schedule();
  };
  const scatter = () => {
    if (appearance !== 'particles') reformAppearance = appearance;
    if (appearance === 'particles' && dispersionTarget > .1 && reformAppearance !== 'particles') {
      setAppearance(reformAppearance); return;
    }
    setAppearance('particles');
    dispersionTarget = dispersionTarget > .1 ? 0 : .75;
    if (reduced) dispersion = dispersionTarget;
    schedule();
  };
  const draw = () => {
    if (!renderer || disposed || lost) return;
    pivot.rotation.y = targetY;
    pivot.rotation.x = targetX;
    pivot.position.set(offset.x, offset.y + (!reduced && activity !== "error" ? Math.sin(elapsed * 0.8) * 0.006 : 0), 0);
    if (meshRoot) meshRoot.visible = appearance !== 'particles' || dispersion < .015;
    hologramUniforms.uOrbitTime.value = elapsed;
    hologramUniforms.uOrbitMotion.value = reduced ? 0 : 1;
    hologramUniforms.uOrbitActivity.value = activity === 'idle' ? 0 : 1;
    if (field) {
      field.uniforms.uTime.value=elapsed;
      field.uniforms.uMotion.value=reduced?0:1;
      field.uniforms.uPointer.value.copy(pointer);
      field.uniforms.uCenter.value.copy(offset);
      field.uniforms.uSpeed.value=velocity.length();
    }
    if (cloud) {
      pivot.updateMatrixWorld(true);
      cloud.uniforms.uTime.value = elapsed;
      cloud.uniforms.uScatter.value = dispersion;
      cloud.uniforms.uMotion.value = reduced ? 0 : 1;
      cloud.uniforms.uActivity.value = activity === 'idle' ? 0 : 1;
      cloud.uniforms.uPointer.value.copy(pointer);
      pivot.worldToLocal(cloud.uniforms.uPointer.value);
    }
    meshRoot?.traverse((object) => {
      if (appearance === 'particles') return;
      const mesh = object as THREE.Mesh;
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
      for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
        // No fabricated lip synchronization: jawOpen is only driven explicitly.
        let weight = expressions.get(name) ?? 0;
        if (name === "blink" && !reduced) {
          const phase = elapsed % 5.6;
          weight = Math.max(
            weight,
            Math.max(0, 1 - Math.abs(phase - 0.14) / 0.11),
          );
        }
        mesh.morphTargetInfluences[index] = weight;
      }
    });
    renderer.render(scene, camera);
    projected.copy(pivot.position).project(camera);
    options.onProjection?.((projected.x + 1) * 50, (1 - projected.y) * 50);
  };
  const loop = (now: number) => {
    frame = 0;
    if (disposed || lost || document.hidden || !visible || !enabled || reduced) return;
    if (previous) { frameIntervals.push(now - previous); if (frameIntervals.length > 240) frameIntervals.shift(); }
    const dt = Math.min((now - (previous || now)) / 1000, 0.05);
    previous = now;
    elapsed += dt;
    if (turntable && !dragging) targetY += dt * .25;
    if (!dragging) {
      offset.addScaledVector(velocity, dt);
      velocity.multiplyScalar(Math.exp(-4 * dt));
      offset.x = THREE.MathUtils.clamp(offset.x, -1.5, 1.5);
      offset.y = THREE.MathUtils.clamp(offset.y, -.8, .8);
    }
    dispersion = THREE.MathUtils.damp(dispersion, dispersionTarget, 4, dt);
    if (appearance !== 'particles') mixer?.update(dt);
    draw();
    frame = requestAnimationFrame(loop);
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (disposed || document.hidden || !visible || !enabled || lost) return;
    draw();
    if (!reduced && meshRoot) frame = requestAnimationFrame(loop);
  };
  const resize = () => {
    if (!renderer || disposed) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const horizontalFit = framedWidth / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    camera.position.set(0, 0.04, Math.max(4.25, horizontalFit * 1.10));
    camera.lookAt(0, 0.08, 0);
    camera.updateProjectionMatrix();
    schedule();
  };
  const setActivity = (value: PresenceActivity) => {
    activity = value;
    const next = actions.get(manifest.animations?.[value] ?? value) ?? actions.get(manifest.animations?.idle ?? 'Idle');
    if (next && next !== currentAction) {
      next.reset().play();
      if (currentAction) currentAction.crossFadeTo(next, 0.3, false);
      currentAction = next;
    }
    schedule();
  };
  const observer = new ResizeObserver(resize);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? false;
    schedule();
  });
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, options.quality === "low" ? 1 : 1.75),
    );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (options.decoration !== false) {
      field=createPresenceField(options.quality === 'low'?600:1800,renderer.getPixelRatio());
      scene.add(field.points); remember(field.points);
    }
    // Locally generated softbox reflections: no external HDRI or network dependency.
    const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture;
    scene.environmentIntensity = .42;
    resources.add(environment);
    room.dispose(); pmrem.dispose();
    const studio = options.lighting === 'studio';
    scene.add(new THREE.HemisphereLight(studio ? '#ffffff' : '#ebe6ff', studio ? '#222222' : '#0b1030', .32));
    const key = new THREE.DirectionalLight(studio ? '#ffffff' : '#fff0dc', 2.1);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(studio ? '#ffffff' : '#68dcff', .55);
    fill.position.set(3, 1, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(studio ? '#ffffff' : '#bd98ff', studio ? 1 : 2.4);
    rim.position.set(2, 2, -3);
    scene.add(rim);
    // Projection rings frame the volume without enclosing it in a portrait card.
    for (const [radius, color] of (options.decoration === false ? [] : [[.70, '#68dcff'], [.88, '#bd98ff'], [1.03, '#ffc97a']]) as [number,string][]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + .004, 120), new THREE.MeshBasicMaterial({color, transparent:true, opacity:.36, side:THREE.DoubleSide, depthWrite:false}));
      ring.rotation.x = -Math.PI / 2; ring.position.y = -1.14;
      scene.add(ring); remember(ring);
    }
    observer.observe(canvas);
    intersection.observe(canvas);
  } catch {
    emit(
      "unavailable",
      "WebGL indisponible. La conversation reste accessible.",
    );
  }
  const ready = (async () => {
    if (!renderer) return false;
    emit("loading", "Chargement du modèle 3D…");
    try {
      const url = new URL(manifest.modelUrl, location.href);
      if (url.origin !== location.origin)
        throw new Error("Only local model assets are accepted");
      const response = await fetch(url, {
        credentials: "omit",
        signal: request.signal,
      });
      if (
        !response.ok ||
        Number(response.headers.get("Content-Length") ?? 0) > 24 * 1024 * 1024
      )
        throw new Error("Model unavailable");
      const buffer = await response.arrayBuffer();
      validateGlb(buffer);
      const gltf = await new GLTFLoader().parseAsync(buffer, "");
      remember(gltf.scene);
      if (disposed) {
        resources.forEach((resource) => resource.dispose());
        resources.clear();
        return false;
      }
      meshRoot = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(meshRoot),
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0)
        throw new Error("Empty model");
      const factor = 2.2 / size.y;
      framedWidth = Math.max(size.x, size.z) * factor;
      meshRoot.scale.multiplyScalar(factor);
      meshRoot.position.copy(center.multiplyScalar(-factor));
      // Sample in the shared pivot's rest space, before presentation rotations.
      cloud = createPresenceParticles(meshRoot, options.quality === 'low' ? 10000 : 32000, renderer.getPixelRatio());
      pivot.add(cloud.points); remember(cloud.points);
      pivot.add(meshRoot);
      meshRoot.traverse(object=>{
        const mesh=object as THREE.Mesh;
        if(mesh.isMesh){
          prepareHologramGeometry(mesh);
          originalMaterials.set(mesh,mesh.material);mesh.renderOrder=-1;
          const readableList=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(original=>{
            const material=createHolographicMaterial(original,hologramUniforms);resources.add(material);return material;
          });
          readableHologramMaterials.set(mesh,Array.isArray(mesh.material)?readableList:readableList[0]);
          const clayList=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(()=>{
            const material=new THREE.MeshStandardMaterial({color:'#b2b5ba',roughness:.72,metalness:0});resources.add(material);return material;
          });
          clayMaterials.set(mesh,Array.isArray(mesh.material)?clayList:clayList[0]);
          const materialList=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(original=>{
            const material=original.clone() as THREE.MeshStandardMaterial;
            material.transparent=true;material.opacity=.22;material.depthWrite=true;
            if(material.color)material.color.lerp(new THREE.Color('#78b3ff'),.45);
            resources.add(material);return material;
          });
          hologramMaterials.set(mesh,Array.isArray(mesh.material)?materialList:materialList[0]);
        }
      });
      mixer = new THREE.AnimationMixer(meshRoot);
      gltf.animations.forEach((clip) =>
        actions.set(clip.name, mixer!.clipAction(clip)),
      );
      setActivity(activity);
      setAppearance(appearance);
      resize();
      emit("ready", "Modèle 3D chargé");
      return true;
    } catch {
      if (!disposed)
        emit(
          "unavailable",
          "Modèle indisponible. Les commandes de conversation restent accessibles.",
        );
      return false;
    }
  })();
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      dragging = true;
      velocity.set(0, 0);
      lastPointerTime = performance.now();
      startX = event.clientX;
      startY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1), camera);
      if (raycaster.ray.intersectPlane(plane, hit)) pointer.copy(hit);
      if (cloud) cloud.uniforms.uPointerStrength.value = 1;
      if (!dragging) { if (reduced) draw(); return; }
      const dx = event.clientX - startX, dy = event.clientY - startY;
      if (event.shiftKey || appearance === 'solid') {
        targetY += dx * .008;
        targetX = THREE.MathUtils.clamp(targetX + dy * .006, -.5, .5);
      } else {
        const scale = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / rect.height;
        const dt = Math.max(.016, (performance.now()-lastPointerTime)/1000);
        offset.x = THREE.MathUtils.clamp(offset.x + dx * scale, -1.5, 1.5);
        offset.y = THREE.MathUtils.clamp(offset.y - dy * scale, -.8, .8);
        velocity.set(THREE.MathUtils.clamp(dx*scale/dt,-3,3),THREE.MathUtils.clamp(-dy*scale/dt,-3,3));
      }
      lastPointerTime = performance.now();
      startX = event.clientX;
      startY = event.clientY;
      draw();
    },
    { signal: events.signal },
  );
  for (const name of ["pointerup", "pointercancel"])
    canvas.addEventListener(
      name,
      () => {
        dragging = false;
        if (reduced || performance.now()-lastPointerTime > 90) velocity.set(0,0);
      },
      { signal: events.signal },
    );
  canvas.addEventListener(
    "keydown",
    (event) => {
      if (['e','E','r','R'].includes(event.key)) {
        event.preventDefault();
        if(event.key.toLowerCase()==='e')scatter();else reset();
        return;
      }
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
          event.key,
        )
      )
        return;
      event.preventDefault();
      if(event.key==='Home'){reset();return;}
      if(event.shiftKey){
        if(event.key==='ArrowLeft')offset.x=Math.max(-1.5,offset.x-.12);
        if(event.key==='ArrowRight')offset.x=Math.min(1.5,offset.x+.12);
        if(event.key==='ArrowUp')offset.y=Math.min(.8,offset.y+.12);
        if(event.key==='ArrowDown')offset.y=Math.max(-.8,offset.y-.12);
        velocity.set(0,0);schedule();return;
      }
      if (event.key === "ArrowLeft") targetY -= 0.15;
      if (event.key === "ArrowRight") targetY += 0.15;
      if (event.key === "ArrowUp") targetX = Math.max(-0.3, targetX - 0.08);
      if (event.key === "ArrowDown") targetX = Math.min(0.3, targetX + 0.08);
      if (event.key === "Home") {
        targetY = 0.13;
        targetX = 0;
      }
      schedule();
    },
    { signal: events.signal },
  );
  document.addEventListener("visibilitychange", schedule, {
    signal: events.signal,
  });
  canvas.addEventListener('pointerleave', () => { pointer.set(20,20,0); if(cloud)cloud.uniforms.uPointerStrength.value=0; if(reduced)draw(); }, {signal:events.signal});
  canvas.addEventListener('lostpointercapture', () => { dragging=false; }, {signal:events.signal});
  motion.addEventListener(
    "change",
    () => {
      reduced = motion.matches;
      schedule();
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      emit(
        "unavailable",
        "Rendu interrompu. Rechargez pour relancer la présence.",
      );
    },
    { signal: events.signal },
  );
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    request.abort();
    events.abort();
    cancelAnimationFrame(frame);
    observer.disconnect();
    intersection.disconnect();
    mixer?.stopAllAction();
    if (meshRoot) mixer?.uncacheRoot(meshRoot);
    resources.forEach((resource) => resource.dispose());
    resources.clear();
    renderer?.dispose();
  };
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) cancelAnimationFrame(frame);
      else dispose();
    },
    { signal: events.signal },
  );
  window.addEventListener("pageshow", schedule, { signal: events.signal });
  return {
    ready,
    setActivity,
    setAppearance,
    getDiagnostics() {
      const sorted = [...frameIntervals].sort((a,b)=>a-b);
      const actualExpressions: Record<string,number> = {};
      meshRoot?.traverse(object=>{const mesh=object as THREE.Mesh;
        for(const [name,index] of Object.entries(mesh.morphTargetDictionary ?? {})) actualExpressions[name]=mesh.morphTargetInfluences?.[index] ?? 0;
      });
      return { appearance, activity, renderCalls:renderer?.info.render.calls ?? 0, triangles:renderer?.info.render.triangles ?? 0,
        frameSamples:sorted.length, frameIntervalP95Ms:sorted.length ? sorted[Math.ceil(sorted.length*.95)-1] : null, expressions:actualExpressions };
    },
    scatter,
    reset,
    containsSurfacePoint(clientX, clientY) {
      if (!meshRoot || !renderer || disposed || dispersion > .02) return false;
      const rect=canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),camera);
      return raycaster.intersectObject(meshRoot,true).length>0;
    },
    setView(value) { targetX = 0; targetY = value === 'front' ? 0 : value === 'profile' ? Math.PI / 2 : Math.PI / 4; schedule(); },
    setTurntable(value) { turntable = value; schedule(); },
    resize,
    dispose,
    setExpression(name, value) {
      expressions.set(
        name,
        Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 0,
      );
      schedule();
    },
    setReducedMotion(value) {
      reduced = value;
      schedule();
    },
    setActive(value) { enabled = value; schedule(); },
  };
}
