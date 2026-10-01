import * as THREE from "three";
import { pointerDisplacement } from './atom-deformation';
import { mountAtomPlayground } from './atom-playground';
import { landingText,translateLandingMessage } from './landing-preferences';

/** An interactive sculpture, not an atomic or quantum simulation. */
export function mountAtomScene(root: HTMLElement): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-atom-canvas]")!;
  const fallback = root.querySelector<HTMLElement>("[data-atom-fallback]")!;
  const scope = root.closest<HTMLElement>("[data-landing]")!;
  const status = scope.querySelector<HTMLElement>("[data-atom-status]")!;
  const pause = scope.querySelector<HTMLButtonElement>("[data-atom-pause]")!;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController(),
    { signal } = events;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    scope.dataset.graphics='unavailable';
    status.textContent = "Sculpture statique · WebGL indisponible";
    canvas.hidden = true;
    scope
      .querySelectorAll<HTMLButtonElement>(".atom-buttons button, [data-play-toggle]")
      .forEach((button) => {
        button.disabled = true;
      });
    return () => events.abort();
  }
  fallback.hidden = true;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  const sculpture = new THREE.Group();
  scene.add(sculpture);
  scene.add(new THREE.HemisphereLight("#dbdcff", "#16142f", 2.6));
  const key = new THREE.DirectionalLight("#fff8e4", 4.2);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#c891ff", 3);
  rim.position.set(4, -1, -3);
  scene.add(rim);
  const core = new THREE.Group();
  sculpture.add(core);
  const nucleus: {
    mesh: THREE.Mesh;
    batch: THREE.InstancedMesh;
    index: number;
    home: THREE.Vector3;
    away: THREE.Vector3;
  }[] = [];
  const random = (index: number) => {
    const n = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const sphere = new THREE.SphereGeometry(0.17, 20, 14);
  const nucleusMaterials = ["#459aca", "#9870da", "#edf3f5", "#9870da"].map(
    (color) =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.53,
        roughness: 0.28,
        transparent:true,opacity:1,
      }),
  );
  // Four material batches keep all 55 independent transforms while reducing draw calls.
  const nucleusBatches=nucleusMaterials.map((material,i)=>{
    const batch=new THREE.InstancedMesh(sphere,material,Math.floor((54-i)/4)+1);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.frustumCulled=false;core.add(batch);return batch;
  });
  for (let i = 0; i < 55; i++) {
    const theta = i * 2.39996,
      y = 1 - 2 * ((i + 0.5) / 55),
      radius = Math.sqrt(1 - y * y);
    const home = new THREE.Vector3(
      Math.cos(theta) * radius,
      y,
      Math.sin(theta) * radius,
    ).multiplyScalar(0.46 + random(i) * 0.06);
    const mesh = new THREE.Mesh(
      sphere,
      nucleusMaterials[i % nucleusMaterials.length],
    );
    mesh.position.copy(home);
    mesh.scale.setScalar(0.72 + random(i + 180) * 0.45);
    mesh.updateMatrix();const batch=nucleusBatches[i%4],index=Math.floor(i/4);batch.setMatrixAt(index,mesh.matrix);
    nucleus.push({
      mesh,batch,index,
      home,
      away: home
        .clone()
        .normalize()
        .multiplyScalar(2 + random(i + 90) * 2.8),
    });
  }
  const orbitGroup = new THREE.Group();
  sculpture.add(orbitGroup);
  const orbitRotations = [
    new THREE.Euler(0.85, 0.35, 0.5),
    new THREE.Euler(-0.75, 0.7, -0.35),
    new THREE.Euler(0.12, -0.6, 1.32),
    new THREE.Euler(-0.26, 0.92, 0.91),
  ];
  const orbitMaterials: THREE.MeshStandardMaterial[] = [];
  const deformableRings: { geometry: THREE.BufferGeometry; home: Float32Array }[] = [];
  const orbitPoint = (angle: number, orbit: number, spread = 0) =>
    new THREE.Vector3(
      Math.cos(angle) * (2.35 + spread),
      Math.sin(angle) * (1.82 + spread),
      0,
    ).applyEuler(orbitRotations[orbit]);
  for (let orbit = 0; orbit < orbitRotations.length; orbit++) {
    for (let rail = 0; rail < 3; rail++) {
      const points = Array.from({ length: 257 }, (_, i) =>
        orbitPoint((i / 256) * Math.PI * 2, orbit, rail * 0.025),
      );
      const material = new THREE.MeshStandardMaterial({
        color: ["#bba0ff", "#ffc782", "#73d7ff", "#efb6ff"][orbit],
        emissive: ["#7044b7", "#bb7135", "#287ca9", "#a751c4"][orbit],
        emissiveIntensity: .4,
        transparent: true,
        opacity: rail === 0 ? 0.6 : 0.14,
        metalness: 0.8,
        roughness: 0.33,
      });
      orbitMaterials.push(material);
      const railGeometry = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points, true),
            256,
            rail === 0 ? 0.008 : 0.004,
            4,
            true,
          );
      deformableRings.push({geometry:railGeometry,home:new Float32Array(railGeometry.attributes.position.array)});
      orbitGroup.add(new THREE.Mesh(railGeometry,material));
    }
  }
  const count = 2100,
    positions = new Float32Array(count * 3),
    homes = new Float32Array(count * 3),
    away = new Float32Array(count * 3),
    sizes = new Float32Array(count),
    alpha = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const p =
      i < 1750
        ? orbitPoint(
            random(i + 3) * Math.PI * 2,
            i % orbitRotations.length,
            (random(i + 9) - 0.5) * 0.16,
          )
        : new THREE.Vector3(
            random(i + 5) - 0.5,
            random(i + 8) - 0.5,
            random(i + 13) - 0.5,
          )
            .normalize()
            .multiplyScalar(0.58 + random(i + 14) * 0.28);
    p.toArray(homes, i * 3);
    p.toArray(positions, i * 3);
    new THREE.Vector3(
      random(i + 91) - 0.5,
      random(i + 190) - 0.5,
      random(i + 304) - 0.5,
    )
      .normalize()
      .multiplyScalar(1.7 + random(i + 410) * 3.3)
      .toArray(away, i * 3);
    sizes[i] = 1.5 + random(i + 212) * 2.7;
    alpha[i] = 0.2 + random(i + 17) * 0.65;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("pointSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("pointAlpha", new THREE.BufferAttribute(alpha, 1));
  const particles = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { color: { value: new THREE.Color("#d6c4ff") } },
      vertexShader:
        "attribute float pointSize; attribute float pointAlpha; varying float opacity; void main(){ opacity=pointAlpha; vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=pointSize*(9./-p.z); }",
      fragmentShader:
        "uniform vec3 color; varying float opacity; void main(){ float d=length(gl_PointCoord-.5); if(d>.5)discard; gl_FragColor=vec4(color,opacity*(1.-smoothstep(.12,.5,d))); }",
    }),
  );
  sculpture.add(particles);
  const satellites = orbitRotations.map((_, i) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 16, 12),
      new THREE.MeshStandardMaterial({
        color: "#ff941f",
        emissive: "#ed700f",
        emissiveIntensity: 0.8,
        metalness: 0.65,
        roughness: 0.15,
      }),
    );
    sculpture.add(mesh);
    return mesh;
  });
  scope.dataset.atomElectronsOrange=String(satellites.every(m=>m.material.color.getHex()===0xff941f));
  scope.dataset.atomNucleusColors=String(new Set(nucleusMaterials.map(m=>m.color.getHex())).size);
  scope.dataset.atomNucleusWhite=String(nucleusMaterials.some(m=>m.color.getHex()===0xedf3f5));
  // A second real mesh group shares immutable geometry/material resources.
  // Synchronization is a visual phase lock, not a claim about quantum coupling.
  const partner = sculpture.clone(true);
  partner.visible = false;
  scene.add(partner);
  // A full-window dust field. The pointer displaces it in view space, independently
  // of the atom rotation; the force fades after the pointer leaves the scene.
  const dustCount = 8000, dustPositions = new Float32Array(dustCount * 3), seeds = new Float32Array(dustCount);
  for(let i=0;i<dustCount;i++) {
    dustPositions[i*3]=(random(i*3+502)-.5)*2;
    dustPositions[i*3+1]=(random(i*3+603)-.5)*2;
    dustPositions[i*3+2]=(random(i*3+704)-.5)*4;
    seeds[i]=random(i+911);
  }
  const dustGeometry=new THREE.BufferGeometry();
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  dustGeometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
  // A bounded, short-lived wake follows the real atom, including after release.
  const wake = Array.from({length:12}, () => new THREE.Vector4(30,30,10,0));
  let wakeIndex=0, wakeElapsed=0;
  const lastWake = new THREE.Vector2(30,30);
  const dustMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{uBurstAge:{value:-1},uPlay:{value:new THREE.Vector4()},uTime:{value:0},uExtent:{value:new THREE.Vector2(12,6)},uPointer:{value:new THREE.Vector2(30,30)},uForce:{value:0},uJourney:{value:0},uPixelRatio:{value:renderer.getPixelRatio()},uWake:{value:wake},uAtom:{value:new THREE.Vector3(0,0,0)}},
    vertexShader:`attribute float seed;
      uniform float uTime; uniform float uBurstAge; uniform vec2 uExtent; uniform vec2 uPointer; uniform float uForce; uniform float uJourney; uniform float uPixelRatio;
      uniform vec4 uWake[12]; uniform vec3 uAtom; uniform vec4 uPlay;
      varying float brightness; varying vec3 tint;
      void main(){
        vec3 p=position;
        p.xy *= uExtent;
        p.x += sin(seed*40.0 + uTime*.14 + p.y*.45)*.18;
        p.y += cos(seed*27.0 + uTime*.10 + p.x*.25)*.15;
        float wave=sin(p.x*.38 + uJourney*2.1 + seed*6.28);
        p.y += wave*.55*uJourney/3.0;
        vec2 delta=p.xy-uPointer; float distanceToPointer=length(delta);
        float force=exp(-distanceToPointer*distanceToPointer/1.8)*uForce;
        p.xy += normalize(delta+vec2(.001))*force*1.5;
        p.xy += vec2(-delta.y,delta.x)*force*.22;
        vec2 displaced=vec2(0.0); float flash=0.0;
        for(int i=0;i<12;i++){
          vec2 d=p.xy-uWake[i].xy;
          float age=uWake[i].z;
          float ring=exp(-pow(length(d)-age*2.4,2.0)/.32);
          float kick=ring*exp(-age*2.6)*uWake[i].w;
          displaced+=normalize(d+vec2(.002))*kick*.7;
          flash+=kick;
        }
        vec2 atomDelta=p.xy-uAtom.xy;
        float nearAtom=exp(-dot(atomDelta,atomDelta)/.7)*uAtom.z;
        p.xy+=displaced+normalize(atomDelta+vec2(.002))*nearAtom*.7;
        vec2 playDelta=p.xy-uPlay.xy;
        float playForce=exp(-dot(playDelta,playDelta)/5.0)*uPlay.z;
        if(uPlay.w<1.5){float turn=sin(uTime*.8)*playForce*2.4; p.xy=uPlay.xy+mat2(cos(turn),sin(turn),-sin(turn),cos(turn))*playDelta;}
        else if(uPlay.w<2.5) p.xy-=playDelta*playForce*.8;
        else if(uPlay.w<3.5) p.xy+=normalize(playDelta+vec2(.002))*playForce*1.1;
        else if(uPlay.w<4.5){float pull=uPlay.z;float turn=uTime*pull*.65;p.xy=uPlay.xy+mat2(cos(turn),sin(turn),-sin(turn),cos(turn))*playDelta*(1.-pull*.96);}
        else {p.xy=uPlay.xy+normalize(playDelta+vec2(.002))*(length(playDelta)*(0.04+uPlay.z*.96)+uPlay.z*5.5);p.z+=sin(seed*91.)*uPlay.z*3.;}
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp((.65+(uBurstAge>=0.?exp(-uBurstAge*3.2)*4.:0.)+seed*2.2+force*1.8+min(flash,2.0))*uPixelRatio*(10.0/-mv.z),.7,8.0);
        float starFlash=uBurstAge>=0.?exp(-uBurstAge*3.2):0.;
        brightness=.17+starFlash*1.3+seed*.35+force*.5+min(flash*.5,.8)+(uPlay.w>4.5?uPlay.z*.65:0.);
        tint=mix(vec3(.48,.34,.95),vec3(.24,.70,1.0),smoothstep(-.4,.7,position.x));
        tint=mix(tint,vec3(1.0,.66,.26),smoothstep(.69,1.0,seed));tint=mix(tint,vec3(1.,.94,.83),starFlash*.75);
      }`,
    fragmentShader:`varying float brightness; varying vec3 tint;
      void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(tint,brightness*(1.0-smoothstep(.05,.5,d)));}`,
  });
  const dust=new THREE.Points(dustGeometry,dustMaterial);dust.frustumCulled=false;scene.add(dust);
  const linkButtons=Array.from(scope.querySelectorAll<HTMLElement>('[data-atom-link]'));
  const playMenu=scope.querySelector<HTMLElement>('[data-atom-play]')!;
  const playToggle=scope.querySelector<HTMLButtonElement>('[data-play-toggle]')!;
  const playButtons=Array.from(playMenu.querySelectorAll<HTMLButtonElement>('.atom-buttons button'));
  let playing=false;
  const screenPoint=new THREE.Vector3();
  const cursor=new THREE.Vector2(30,30);
  const localPointer = new THREE.Vector3(30,30,0);
  const logoLetters=Array.from(root.querySelectorAll<HTMLElement>('[data-logo-letter]'));
  const logoMotion=logoLetters.map(()=>({x:0,y:0,tilt:0}));
  // Decorative ASCII glyphs preserve the branded word and use the existing six elements.
  const asciiGlyphs=[' ### \n#   #\n#   #\n#   #\n ### ','#### \n#   #\n#### \n#  # \n#   #','#### \n#   #\n#### \n#   #\n#### ','#####\n  #  \n  #  \n  #  \n#####','#####\n  #  \n  #  \n  #  \n  #  ','     \n     \n     \n ##  \n ##  '];
  logoLetters.forEach((letter,i)=>letter.dataset.ascii=asciiGlyphs[i]);
  let asciiLogo=false;

  const atomScreen = new THREE.Vector3();
  let logoPulse=0;
  let navigationHeld = false;
  for (const link of [...linkButtons,...playButtons]) {
    link.addEventListener('pointerenter', () => { navigationHeld = true; }, {signal});
    link.addEventListener('pointerleave', () => { navigationHeld = false; }, {signal});
    link.addEventListener('focus', () => { navigationHeld = true; }, {signal});
    link.addEventListener('blur', () => { navigationHeld = false; }, {signal});
  }
  let pointerPresent=false, pointerForce=0, journey=0, width=1, height=1, baseCameraZ=10.3;
  let frame = 0,
    time = 0,
    last = 0,
    disposed = false,
    paused = motion.matches,
    scattered = false,
    imploded = false,
    synchronized = false,
    collapse = 0,
    amount = 0,
    targetX = -0.08,
    targetY = -0.35,
    dragging = false,
    pointerX = 0,
    pointerY = 0;
  const angularVelocity = new THREE.Vector2();
  const flight = new THREE.Vector2(), flightVelocity = new THREE.Vector2();
  const dragStart = new THREE.Vector2(), flightStart = new THREE.Vector2();
  let movingAtom=false;
  const clampFlight = () => {
    if(width<=1||height<=1) return;
    const halfY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;
    const baseY=journey===3?.9:width/height<.8?1.1:.5;
    const baseX=journey===3?-2.1:0;
    // Keep the nucleus reachable even if the decorative rings cross an edge.
    const marginX=Math.min(.75,halfY*camera.aspect*.25);
    const minX=-halfY*camera.aspect+marginX-baseX,maxX=halfY*camera.aspect-marginX-baseX;
    const minY=-halfY+halfY*2*70/height-baseY,maxY=halfY-halfY*2*110/height-baseY;
    for(const [axis,min,max] of [['x',minX,maxX],['y',minY,maxY]] as const){
      const clamped=THREE.MathUtils.clamp(flight[axis],min,max);
      if(clamped!==flight[axis]){
        const pushingOut=(flight[axis]<min&&flightVelocity[axis]<0)||(flight[axis]>max&&flightVelocity[axis]>0);
        // Reflect the overshoot instead of discarding distance at the wall.
        flight[axis]=pushingOut?THREE.MathUtils.clamp(2*clamped-flight[axis],min,max):clamped;if(pushingOut)flightVelocity[axis]*=-.9;
      }
    }
  };
  let airborne=false;
  let pointerTime = 0;
  const throwSamples:{x:number;y:number;t:number}[]=[];
  let playground: ReturnType<typeof mountAtomPlayground> | undefined;
  let hasRendered=false;
  const staticDisplay=()=>scope.dataset.motion==='static';
  const updateStatus = (text: string) => {
    status.textContent = translateLandingMessage(text);
    pause.setAttribute("aria-pressed", String(paused));
    pause.textContent = paused ? landingText('Reprendre','Resume','Reanudar') : landingText('Pause','Pause','Pausa');
  };
  const displacementScratch:[number,number,number]=[0,0,0];
  let layoutDirty=true;
  let letterBounds:{x:number;y:number}[]=[],labelBounds:{w:number;h:number}[]=[];
  scope.addEventListener('orbit:language-change',()=>{layoutDirty=true;},{signal});
  const draw = (dt = 0) => {
    if (disposed||width<=1||height<=1||(staticDisplay()&&hasRendered)) return;
    if(layoutDirty){letterBounds=logoLetters.map(letter=>({x:letter.offsetLeft+letter.offsetWidth*.5,y:letter.offsetTop+letter.offsetHeight*.5}));labelBounds=linkButtons.map(button=>{const label=button.querySelector<HTMLElement>('span');return{w:label?.offsetWidth||120,h:label?.offsetHeight||36};});layoutDirty=false;}
    if (!paused && (!navigationHeld||airborne)) {
      time += dt;
      if(!dragging&&!motion.matches){
        const decay=Math.exp(-2.3*dt), travel=(1-decay)/2.3;
        targetX+=angularVelocity.x*travel;targetY+=angularVelocity.y*travel;
        angularVelocity.multiplyScalar(decay);
        const flightDecay=Math.exp(-.65*dt),flightTravel=(1-flightDecay)/.65;
        flight.addScaledVector(flightVelocity,flightTravel);flightVelocity.multiplyScalar(flightDecay);
        clampFlight();
      }
    }
    pointerForce=THREE.MathUtils.lerp(pointerForce, pointerPresent&&!motion.matches?1:0,.13);
    dustMaterial.uniforms.uTime.value=time;
    dustMaterial.uniforms.uForce.value=pointerForce;
    dustMaterial.uniforms.uJourney.value=journey;
    dustMaterial.uniforms.uPointer.value.copy(cursor);
    // Route changes preserve a fitted, centered playground instead of accumulating zoom.
    camera.position.z=baseCameraZ;
    sculpture.position.x=0;
    sculpture.position.y=width/height<.8 ? 1.1 : .5;
    sculpture.scale.setScalar(playing ? .72 : 1);
    // The atom stays interactive on every public route; Synthia has its own space.
    sculpture.visible=true;
    if(journey===3){sculpture.position.set(-2.1,.9,-3);sculpture.scale.setScalar(.64);}
    sculpture.position.x+=flight.x;sculpture.position.y+=flight.y;
    playground?.update(paused ? 0 : dt);
    const suction=playground?.suction(),blast=suction?.burst??0,pull=blast>0?0:suction?.strength??0;
    if(suction&&pull>.001&&!paused){
      const blend=1-Math.exp(-dt*pull*4),dx=(suction.point.x-sculpture.position.x)*blend,dy=(suction.point.y-sculpture.position.y)*blend;
      flight.x+=dx;flight.y+=dy;sculpture.position.x+=dx;sculpture.position.y+=dy;
      flightVelocity.multiplyScalar(Math.exp(-dt*pull*6));
    }
    dustMaterial.uniforms.uBurstAge.value=suction?.burstAge??-1;
    dustMaterial.uniforms.uPlay.value.copy(playground?.dustEffect() ?? new THREE.Vector4());
    wake.forEach(point=>{point.z=Math.min(10,point.z+dt);});
    wakeElapsed+=dt;
    const travelled=Math.hypot(sculpture.position.x-lastWake.x,sculpture.position.y-lastWake.y);
    if(!motion.matches&&!paused&&travelled>.08&&wakeElapsed>.035){
      wake[wakeIndex].set(sculpture.position.x,sculpture.position.y,0,Math.min(2,travelled/Math.max(dt,.016)*.12));
      wakeIndex=(wakeIndex+1)%wake.length;wakeElapsed=0;
      lastWake.set(sculpture.position.x,sculpture.position.y);
    }
    dustMaterial.uniforms.uAtom.value.set(sculpture.position.x,sculpture.position.y,motion.matches?0:dragging||flightVelocity.length()>.2?1.4:.25);
    const atomOpacity=1-THREE.MathUtils.smoothstep(journey,2.1,2.95);
    canvas.style.opacity=String(.8+.2*atomOpacity);
    amount = motion.matches
      ? scattered
        ? 1
        : 0
      : THREE.MathUtils.lerp(amount, scattered ? 1 : blast, blast>0?1-Math.exp(-dt*20):0.055);
    collapse=motion.matches ? (imploded?1:0) : THREE.MathUtils.lerp(collapse,imploded||suction?.starCollapse?1:pull*.88,suction?.starCollapse?1-Math.exp(-dt*24):blast>0?1-Math.exp(-dt*12):.075);
    const compression=1-collapse*.91;
    sculpture.updateMatrixWorld(true);
    localPointer.set(cursor.x,cursor.y,0);
    sculpture.worldToLocal(localPointer);
    const forceStrength = navigationHeld||airborne ? 0 : pointerForce;
    for (let i = 0; i < positions.length; i+=3) {
      const x=homes[i]+(away[i]-homes[i])*amount;
      const y=homes[i+1]+(away[i+1]-homes[i+1])*amount;
      const z=homes[i+2]+(away[i+2]-homes[i+2])*amount;
      const displacement=pointerDisplacement(x,y,z,localPointer,forceStrength,displacementScratch);
      positions[i]=(x+displacement[0])*compression*(1+blast*1.3);positions[i+1]=(y+displacement[1])*compression*(1+blast*1.3);positions[i+2]=(z+displacement[2])*compression*(1+blast*1.3);
    }
    geometry.attributes.position.needsUpdate = true;
    nucleus.forEach(({ mesh, batch,index,home, away: far }) => {
      mesh.position.copy(home).lerp(far, amount);
      const d=pointerDisplacement(mesh.position.x,mesh.position.y,mesh.position.z,localPointer,forceStrength,displacementScratch);
      mesh.position.x+=d[0];mesh.position.y+=d[1];mesh.position.z+=d[2];
      mesh.position.multiplyScalar(compression*(1+blast*1.3));
      mesh.position.add(playground?.nucleusOffset(home.x,home.y,home.z) ?? new THREE.Vector3());
      mesh.updateMatrix();batch.setMatrixAt(index,mesh.matrix);
    });
    nucleusBatches.forEach(batch=>{batch.instanceMatrix.needsUpdate=true;batch.visible=blast<.4;});
    for(const {geometry:ring,home} of deformableRings){
      const target=ring.attributes.position.array;
      for(let i=0;i<home.length;i+=3){
        const d=pointerDisplacement(home[i],home[i+1],home[i+2],localPointer,forceStrength,displacementScratch);
        target[i]=(home[i]+d[0]*.65)*compression;target[i+1]=(home[i+1]+d[1]*.65)*compression;target[i+2]=(home[i+2]+d[2]*.65)*compression;
        target[i+2]+=playground?.ringOffset(home[i],home[i+1],home[i+2]) ?? 0;
      }
      ring.attributes.position.needsUpdate=true;
    }
    const starFlash=(suction?.burstAge??-1)>=0?Math.exp(-suction!.burstAge*2.3):0;
    orbitGroup.scale.setScalar(1+blast*3.5);orbitGroup.visible=blast<.4;
    nucleusMaterials.forEach(material=>{material.emissive.copy(material.color);material.emissiveIntensity=suction?.starCollapse?1.1:starFlash*2;material.opacity=Math.max(0,1-blast*2.5);});
    orbitMaterials.forEach((material, index) => {
      material.opacity = (index % 3 === 0 ? 0.6 : 0.14) * Math.max(1-amount,starFlash)*Math.max(0,1-blast*2.5);
    });
    satellites.forEach((satellite, i) => {
      satellite.position.copy(orbitPoint(time * (0.23 + i * 0.06) + i * 2, i));
      satellite.visible = amount < 0.5 && collapse < .5;
    });
    sculpture.rotation.set(
      targetX + journey*.24 + (!paused && !motion.matches ? Math.sin(time * 0.1) * 0.07 : 0),
      targetY + journey*.72 + (!paused ? time * 0.022 : 0),
      -0.1,
    );
    partner.visible=synchronized;
    if(synchronized){
      // Keep the companion atom beside the primary one on narrow displays too.
      partner.position.copy(sculpture.position).add(new THREE.Vector3(width/height<.8?1.8:2.7,1.25,-1.2));
      partner.scale.setScalar(sculpture.scale.x*.45);
      partner.rotation.copy(sculpture.rotation);
      partner.children.forEach((child,i)=>{
        const source=sculpture.children[i];
        if(source instanceof THREE.Mesh){child.position.copy(source.position);child.visible=source.visible;}
        if(i===0)child.children.forEach((m,j)=>{const source=core.children[j];if(m instanceof THREE.InstancedMesh&&source instanceof THREE.InstancedMesh){m.instanceMatrix.copy(source.instanceMatrix);m.instanceMatrix.needsUpdate=true;}});
      });
    }
    scope.dataset.atomAirborne=String(airborne);scope.dataset.atomPointerInfluence=String(forceStrength);
    scope.dataset.atomParticleOnly=String(blast>=.4);
    scope.dataset.atomMode=imploded?'imploded':scattered?'exploded':synchronized?'synchronized':'orbiting';
    renderer.render(scene, camera);
    const drawCalls=String(renderer.info.render.calls);if(scope.dataset.atomDrawCalls!==drawCalls)scope.dataset.atomDrawCalls=drawCalls;
    hasRendered=true;
    // Project the live atom onto the wordmark; each letter yields then springs home.
    sculpture.getWorldPosition(atomScreen);atomScreen.project(camera);
    const atomX=(atomScreen.x*.5+.5)*width,atomY=(-atomScreen.y*.5+.5)*height;
    scope.dataset.atomScreenX=String(atomX);scope.dataset.atomScreenY=String(atomY);
    logoPulse*=Math.exp(-3.2*dt);
    const wordmark=root.querySelector<HTMLElement>('.orbit-wordmark');
    if(wordmark){
      const nextAscii=!!suction?.ascii;if(nextAscii!==asciiLogo){asciiLogo=nextAscii;wordmark.classList.toggle('is-ascii',asciiLogo);scope.dataset.logoAscii=String(asciiLogo);}
      logoLetters.forEach((letter,i)=>{
        const {x,y}=letterBounds[i];
        const dx=x-atomX,dy=y-atomY;
        const proximity=Math.exp(-(dx*dx+dy*dy)/(Math.max(150,width*.14)**2));
        const impact=Math.min(1,proximity*.65+logoPulse*.8);
        const sign=Math.sign(dx)||1;
        const targetX=motion.matches?0:sign*impact*28+(atomX-x)*pull*.85+Math.sign(dx)*blast*width*.35;
        const targetY=motion.matches?0:Math.sin(i*1.7+time*.45)*impact*12+(atomY-y)*pull*.85+Math.sign(dy)*blast*height*.35;
        const blend=dt>0?1-Math.exp(-7*dt):.12;
        const state=logoMotion[i];
        state.x+= (targetX-state.x)*blend;state.y+=(targetY-state.y)*blend;
        state.tilt+=(sign*impact*5-state.tilt)*blend;
        letter.style.transform=`translate3d(${state.x}px,${state.y}px,0) rotate(${motion.matches?0:state.tilt}deg) scale(${asciiLogo?Math.max(.12,1-pull*.88+blast*.3):1})`;
        letter.style.color=(i===0||i===logoLetters.length-1)?`rgba(255,148,31,${.65+impact*.3})`:`rgba(212,193,252,${.08+impact*.15})`;
        letter.style.textShadow=`0 0 ${30+impact*55}px rgba(173,124,255,${impact*.28})`;
      });
    }
    const rx=Math.min(width*.30,320),ry=Math.max(45,Math.min((height-230)/2,height*.29,220));
    const centerX=THREE.MathUtils.clamp(atomX,rx+55,width-rx-55),centerY=THREE.MathUtils.clamp(atomY,ry+115,height-ry-90);
    playButtons.forEach((button,i)=>{
      const angle=-Math.PI/2+i*Math.PI*2/playButtons.length;
      button.style.left=`${THREE.MathUtils.clamp(centerX+Math.cos(angle)*rx,55,width-55)}px`;
      button.style.top=`${THREE.MathUtils.clamp(centerY+Math.sin(angle)*ry,115,height-90)}px`;
    });
    const labelRects: { x:number; y:number; w:number; h:number }[]=[];
    satellites.forEach((satellite,i)=>{
      const button=linkButtons[i];if(!button)return;
      satellite.getWorldPosition(screenPoint);screenPoint.project(camera);
      const x=(screenPoint.x*.5+.5)*width,y=(-screenPoint.y*.5+.5)*height;
      button.hidden=playing;
      if(playing)return;
      button.style.transform=`translate3d(${x}px,${y}px,0)`;
      const label=button.querySelector<HTMLElement>('span');if(!label)return;
      const {w,h}=labelBounds[i];
      const options=[
        {left:28,top:-17},
        {left:-w-28,top:-17},
        {left:-w/2,top:-h-28},
        {left:-w/2,top:28},
        {left:Math.max(85,height*.18),top:-17},
        {left:-w-Math.max(85,height*.18),top:-17},
      ];
      let selected=options[0],best=Infinity;
      for(let offset=0;offset<options.length;offset++){
        const option=options[(offset+i)%options.length];
        const rect={x:x+option.left,y:y+option.top,w,h};
        const overflow=Math.max(0,12-rect.x)+Math.max(0,rect.x+w-(width-12))
          +Math.max(0,75-rect.y)+Math.max(0,rect.y+h-(height-45));
        const overlap=labelRects.reduce((sum,other)=>sum+Math.max(0,Math.min(rect.x+w,other.x+other.w)-Math.max(rect.x,other.x))
          *Math.max(0,Math.min(rect.y+h,other.y+other.h)-Math.max(rect.y,other.y)),0);
        const nearestX=THREE.MathUtils.clamp(atomX,rect.x,rect.x+w),nearestY=THREE.MathUtils.clamp(atomY,rect.y,rect.y+h);
        const coreOverlap=Math.max(0,Math.max(65,height*.14)-Math.hypot(nearestX-atomX,nearestY-atomY));
        const score=overflow*100+overlap*10+coreOverlap*500+offset;
        if(score<best){best=score;selected=option;}
      }
      label.style.left=`${selected.left}px`;
      label.style.top=`${selected.top}px`;
      label.style.right='auto';
      labelRects.push({x:x+selected.left,y:y+selected.top,w,h});
    });
  };
  const animate = (now: number) => {
    frame = 0;
    if (
      disposed ||
      staticDisplay() ||
      document.hidden ||
      scope.parentElement?.querySelector("dialog[open]")
    )
      return;
    const dt = Math.min((now - (last || now)) / 1000, 0.04);
    last = now;
    draw(dt);
    if (
      (!paused && !motion.matches) ||
      Math.abs(amount - (scattered ? 1 : 0)) > 0.001 || Math.abs(collapse-(imploded?1:0))>.001 || Math.abs(pointerForce-(pointerPresent&&!motion.matches?1:0))>.002
    )
      frame = requestAnimationFrame(animate);
  };
  const schedule = () => {
    if(staticDisplay()&&hasRendered)return;
    // Input updates do not restart a running frame clock: release keeps its momentum.
    if(frame)return;
    last = performance.now();
    draw();
    if (
      !document.hidden &&
      !scope.parentElement?.querySelector("dialog[open]") &&
      !staticDisplay()&&((!paused && !motion.matches) ||
        Math.abs(amount - (scattered ? 1 : 0)) > 0.001 || Math.abs(collapse-(imploded?1:0))>.001 || Math.abs(pointerForce-(pointerPresent&&!motion.matches?1:0))>.002)
    )
      frame = requestAnimationFrame(animate);
  };
  const displayMotion=()=>{
    const frozen=staticDisplay();cancelAnimationFrame(frame);frame=0;last=0;
    dragging=false;playground?.suspend();canvas.classList.remove('is-dragging');
    scope.querySelectorAll<HTMLButtonElement>('.atom-buttons button,[data-play-toggle],.atom-games button,.atom-games select').forEach(button=>{button.disabled=frozen;});
    if(!frozen){resizeScene();schedule();}
  };
  scope.addEventListener('orbit:motion-change',displayMotion,{signal});
  const setPlay = (value:boolean) => {
    if (!value) playground?.close();
    playing=value;playMenu.hidden=!value;
    playToggle.setAttribute('aria-expanded',String(value));
    navigationHeld=false;draw();schedule();
    (value?playButtons[0]:playToggle).focus({preventScroll:true});
  };
  playToggle.addEventListener('click',()=>setPlay(true),{signal});
  scope.querySelector('[data-play-close]')!.addEventListener('click',()=>setPlay(false),{signal});
  playMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setPlay(false)}},{signal});
  const dialogObserver = new MutationObserver(schedule);
  scope.parentElement
    ?.querySelectorAll("dialog")
    .forEach((dialog) =>
      dialogObserver.observe(dialog, {
        attributes: true,
        attributeFilter: ["open"],
      }),
    );
  const resizeScene=()=>{
    if(staticDisplay()&&hasRendered)return;
    layoutDirty=true;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Fit the sculpture horizontally on narrow screens instead of cropping its rings.
    baseCameraZ=camera.aspect<.8?7.5/camera.aspect:9.6;
    camera.position.set(0,0,baseCameraZ);
    const extentY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*baseCameraZ;
    dustMaterial.uniforms.uExtent.value.set(extentY*camera.aspect*1.25,extentY*1.25);
    sculpture.position.set(
      camera.aspect > 1.05 ? 0.4 : 0,
      camera.aspect < 0.8 ? 1.7 : 0.65,
      0,
    );
    camera.updateProjectionMatrix();
    schedule();
  };
  const resize = new ResizeObserver(resizeScene);
  resize.observe(canvas);
  scope.addEventListener('orbit:journey-progress',(event)=>{
    journey=(event as CustomEvent<{progress:number}>).detail.progress;
    schedule();
  },{signal});
  scope.addEventListener('pointermove',(event)=>{
    const p=event as PointerEvent,rect=canvas.getBoundingClientRect();
    const halfHeight=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;
    cursor.set(((p.clientX-rect.left)/width*2-1)*halfHeight*camera.aspect, (1-(p.clientY-rect.top)/height*2)*halfHeight);
    pointerPresent=true;
    if(!frame)schedule();
  },{signal,passive:true});
  scope.addEventListener('pointerleave',()=>{pointerPresent=false;schedule()},{signal});
  const scatter = () => {
    scattered = true;
    imploded = false;
    logoPulse=1;
    updateStatus(
      "Explosion · les particules se dispersent. Recomposez quand vous voulez.",
    );
    schedule();
  };
  const reform = () => {
    scattered = false;
    imploded = false;
    updateStatus("Les particules retrouvent leur trajectoire.");
    schedule();
  };
  const implode = () => {
    imploded=true;scattered=false;
    logoPulse=.85;
    updateStatus('Implosion · les structures se replient vers le noyau.');schedule();
  };
  const sync = () => {
    synchronized=!synchronized;
    scope.querySelector('[data-atom-sync]')?.setAttribute('aria-pressed',String(synchronized));
    updateStatus(synchronized?'Deux atomes · rotation synchronisée. Manipulez le premier.':'Retour à un seul atome.');schedule();
  };
  const launch = () => {
    logoPulse=.55;
    if(motion.matches){targetY+=Math.PI/3;updateStatus('Nouvel angle · mouvement réduit respecté.');}
    else {airborne=true;paused=false;angularVelocity.set(2.5,6);flightVelocity.set(4,2);updateStatus('Lancé ! Attrapez-le en glissant, ou réinitialisez.');}
    schedule();
  };
  const toggle = () => {
    paused = !paused;
    updateStatus(
      paused
        ? "Mouvement en pause · rotation manuelle disponible"
        : "Mouvement repris",
    );
    schedule();
  };
  const reset = () => {
    targetX = -0.08;
    targetY = -0.35;
    time = 0;
    scattered = false;
    imploded=false;synchronized=false;
    airborne=false;angularVelocity.set(0,0);flight.set(0,0);flightVelocity.set(0,0);
    scope.querySelector('[data-atom-sync]')?.setAttribute('aria-pressed','false');
    paused = motion.matches;
    updateStatus("Sculpture réinitialisée · glissez pour explorer");
    schedule();
  };
  scope
    .querySelector("[data-atom-scatter]")!
    .addEventListener("click", scatter, { signal });
  scope
    .querySelector("[data-atom-reform]")!
    .addEventListener("click", reform, { signal });
  pause.addEventListener("click", toggle, { signal });
  scope.querySelector('[data-atom-implode]')!.addEventListener('click',implode,{signal});
  scope.querySelector('[data-atom-sync]')!.addEventListener('click',sync,{signal});
  scope.querySelector('[data-atom-launch]')!.addEventListener('click',launch,{signal});
  scope
    .querySelector("[data-atom-reset]")!
    .addEventListener("click", reset, { signal });
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if(event.button!==0||staticDisplay()) return;
      const rect=canvas.getBoundingClientRect();
      sculpture.getWorldPosition(screenPoint);screenPoint.project(camera);
      const screenX=(screenPoint.x*.5+.5)*width,screenY=(-screenPoint.y*.5+.5)*height;
      movingAtom=Math.hypot(event.clientX-rect.left-screenX,event.clientY-rect.top-screenY)<Math.max(75,height*.34*(playing?.72:1));
      if(airborne&&!movingAtom)return;
      airborne=false;dragging=true;
      dragStart.set(event.clientX,event.clientY);flightStart.copy(flight);
      throwSamples.length=0;throwSamples.push({x:event.clientX,y:event.clientY,t:performance.now()});
      angularVelocity.set(0,0);flightVelocity.set(0,0);pointerTime=performance.now();
      pointerX = event.clientX;
      pointerY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("is-dragging");
    },
    { signal },
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (!dragging) return;
      const now=performance.now(),seconds=Math.max(.008,Math.min(.1,(now-pointerTime)/1000));
      const dx=event.clientX-pointerX,dy=event.clientY-pointerY;
      const sampleBlend=Math.max(.3,1-Math.exp(-seconds/.035));
      angularVelocity.lerp(new THREE.Vector2(THREE.MathUtils.clamp(dy*.006/seconds,-10,10),THREE.MathUtils.clamp(dx*.006/seconds,-10,10)),sampleBlend);
      const unitPerPixel=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z/height;
      if(movingAtom){
        flight.set(flightStart.x+(event.clientX-dragStart.x)*unitPerPixel,flightStart.y-(event.clientY-dragStart.y)*unitPerPixel);
        clampFlight();
        flightVelocity.lerp(new THREE.Vector2(THREE.MathUtils.clamp(dx*unitPerPixel/seconds,-12,12),THREE.MathUtils.clamp(-dy*unitPerPixel/seconds,-12,12)),sampleBlend);
        logoPulse=Math.min(.7,Math.hypot(dx,dy)/45);
      }
      throwSamples.push({x:event.clientX,y:event.clientY,t:now});while(throwSamples.length>16||(throwSamples.length>2&&now-throwSamples[0].t>110))throwSamples.shift();
      pointerTime=now;
      targetY += (event.clientX - pointerX) * 0.006;
      targetX = THREE.MathUtils.clamp(
        targetX + (event.clientY - pointerY) * 0.006,
        -1.4,
        1.4,
      );
      pointerX = event.clientX;
      pointerY = event.clientY;
      schedule();
    },
    { signal },
  );
  const release = (event:PointerEvent) => {
    if(dragging){
      if(event.type==='pointercancel'){angularVelocity.set(0,0);flightVelocity.set(0,0);}
      else{
        const now=performance.now(),recency=Math.exp(-Math.max(0,now-pointerTime-60)/160);
        if(movingAtom&&throwSamples.length>1){
          const first=throwSamples[0],lastSample=throwSamples[throwSamples.length-1],seconds=Math.max(.008,(lastSample.t-first.t)/1000);
          const units=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z/height;
          // The recent gesture controls the throw, rather than one noisy final event.
          flightVelocity.set((lastSample.x-first.x)*units/seconds,-(lastSample.y-first.y)*units/seconds).multiplyScalar(1.08).clampLength(0,14);
          angularVelocity.clampLength(0,6);
        }
        angularVelocity.multiplyScalar(recency);flightVelocity.multiplyScalar(recency);
      }
      if(event.type!=='pointercancel'&&movingAtom&&flightVelocity.length()>.05)airborne=true;
      updateStatus('Relâché · inertie puis retour au calme.');
    }
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    dragging = false;
    canvas.classList.remove("is-dragging");
    schedule();
  };
  canvas.addEventListener("pointerup", release, { signal });
  canvas.addEventListener("pointercancel", release, { signal });
  canvas.addEventListener(
    "keydown",
    (event) => {
      if(staticDisplay())return;
      if(event.shiftKey&&event.key.startsWith('Arrow')){
        event.preventDefault();
        flight.x+=event.key==='ArrowLeft'?-.3:event.key==='ArrowRight'?.3:0;
        flight.y+=event.key==='ArrowDown'?-.3:event.key==='ArrowUp'?.3:0;
        clampFlight();schedule();return;
      }
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          " ",
          "s",
          "r",
          "i",
          "y",
          "l",
        ].includes(event.key)
      )
        event.preventDefault();
      switch (event.key) {
        case "ArrowLeft":
          targetY -= 0.15;
          break;
        case "ArrowRight":
          targetY += 0.15;
          break;
        case "ArrowUp":
          targetX = Math.max(-1.4, targetX - .15);
          break;
        case "ArrowDown":
          targetX = Math.min(1.4, targetX + .15);
          break;
        case " ":
          toggle();
          break;
        case "s":
          scatter();
          break;
        case "r":
          reform();
          break;
        case "i": implode(); break;
        case "y": sync(); break;
        case "l": launch(); break;
        default:
          return;
      }
      schedule();
    },
    { signal },
  );
  document.addEventListener("visibilitychange", schedule, { signal });
  motion.addEventListener(
    "change",
    () => {
      paused = motion.matches;
      updateStatus(
        paused
          ? "Animations réduites · rotation manuelle disponible"
          : "Sculpture en mouvement",
      );
      schedule();
    },
    { signal },
  );
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      playground?.close();
      cancelAnimationFrame(frame);
      scope.dataset.graphics='unavailable';
      canvas.hidden = true;
      fallback.hidden = false;
      playMenu.hidden=true;playing=false;
      linkButtons.forEach(button=>{button.hidden=false;});
      scope.querySelectorAll<HTMLButtonElement>('.atom-buttons button, [data-play-toggle]').forEach(button=>{button.disabled=true;});
      status.textContent = "Rendu interrompu · sculpture statique disponible";
    },
    { signal },
  );
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    dialogObserver.disconnect();
    events.abort();
    playground?.dispose();
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material)
        (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        ).forEach((material) => materials.add(material));
    });
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    renderer.dispose();
  };
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) cancelAnimationFrame(frame);
      else dispose();
    },
    { signal },
  );
  window.addEventListener("pageshow", schedule, { signal });
  playground = mountAtomPlayground({canvas,scope,scene,camera,atom:sculpture,renderer,flight,velocity:flightVelocity,
    rotation:()=>new THREE.Vector2(sculpture.rotation.x,sculpture.rotation.y),
    setRotation:(x,y)=>{angularVelocity.set(0,0);targetX=x-journey*.24-(!paused&&!motion.matches?Math.sin(time*.1)*.07:0);targetY=y-journey*.72-(!paused?time*.022:0);},
    clock:()=>time,setClock:value=>{time=value;},reduced:()=>motion.matches,schedule,status:updateStatus});
  displayMotion();
  updateStatus(
    paused
      ? "Animations réduites · rotation manuelle disponible"
      : "Déplacez et lancez l’atome · flèches au clavier · explorez les quinze jeux",
  );
  schedule();
  return dispose;
}
