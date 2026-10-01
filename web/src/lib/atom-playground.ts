import * as THREE from 'three';
import { landingText,translateLandingMessage } from './landing-preferences';

const translations:Record<string,[string,string,string,string]>={
 sling:['Slingshot','Pull the pearl, then release it through the dust.','Honda','Tira de la perla y suéltala para atravesar el polvo.'],
 paint:['Brush','Move the nucleus to paint a trail of light.','Pincel','Mueve el núcleo para pintar una estela de luz.'],
 strings:['Strings','Pull and release to make the orbits vibrate.','Cuerdas','Tira y suelta para hacer vibrar las órbitas.'],
 elastic:['Elastic','Press and pull: the nucleus returns with a bounce.','Elástico','Presiona y tira: el núcleo vuelve con un rebote.'],
 vortex:['Vortex','Draw a circle to move the vortex.','Vórtice','Dibuja un círculo para mover el vórtice.'],
 logo:['Sculpt Orbit','Move through the letters: their particles yield and return.','Esculpir Orbit','Atraviesa las letras: sus partículas ceden y vuelven.'],
 stars:['Constellation','Touch the background to add stars; drag them to reshape the links.','Constelación','Toca el fondo para añadir estrellas; arrástralas para cambiar los enlaces.'],
 collect:['Collection','Hold the background to collect; release to scatter the crown.','Colección','Mantén el fondo para recoger; suelta para dispersar la corona.'],
 rosette:['Rosettes','Rotate the atom to draw a luminous flower.','Rosetas','Gira el átomo para dibujar una flor luminosa.'],
 portals:['Portals','Move the nucleus into one ring to emerge from the other.','Portales','Lleva el núcleo a un anillo para salir por el otro.'],
 puzzle:['Puzzle','Rotate the nucleus to align the rings with their silhouettes.','Rompecabezas','Gira el núcleo para alinear los anillos con sus siluetas.'],
 echo:['Echo','Move the atom: its memory follows your path with a delay.','Eco','Mueve el átomo: su recuerdo sigue tu camino con retraso.'],
 rewind:['Rewind','Move the atom, then hold the background to rewind.','Retroceder','Mueve el átomo y mantén el fondo para retroceder.'],
 duet:['Encounter','Bring the nucleus near its companion to braid their lights.','Encuentro','Acerca el núcleo a su compañero para entrelazar sus luces.'],
 capture:['Imprint','Compose your scene, then save its image on your device.','Huella','Compón tu escena y guarda su imagen en tu dispositivo.'],
};

export const atomGames = [
  ['sling','Fronde','Tirez la perle puis relâchez : elle traverse les poussières.'],
  ['paint','Pinceau','Déplacez le noyau pour peindre un ruban de lumière.'],
  ['strings','Cordes','Tirez une orbite puis relâchez pour la faire vibrer.'],
  ['elastic','Élastique','Pressez et tirez le noyau : il revient avec un rebond.'],
  ['vortex','Vortex','Dessinez un cercle pour déplacer le tourbillon.'],
  ['logo','Sculpter Orbit','Traversez les lettres : leur poussière cède puis revient.'],
  ['stars','Constellation','Touchez le fond pour ajouter des étoiles ; attrapez-les pour les relier.'],
  ['collect','Collection','Maintenez le fond pour récolter ; relâchez pour semer votre couronne.'],
  ['rosette','Rosaces','Tournez l’atome : sa rotation dessine une fleur lumineuse.'],
  ['portals','Portails','Amenez le noyau dans un anneau pour ressortir par l’autre.'],
  ['puzzle','Puzzle','Tournez le noyau pour superposer les anneaux à leur silhouette.'],
  ['echo','Écho','Déplacez l’atome : son souvenir rejoue votre parcours avec un retard.'],
  ['rewind','Remonter le temps','Déplacez l’atome, puis maintenez le fond pour rembobiner son parcours.'],
  ['duet','Rencontre','Approchez le noyau de son compagnon pour tresser leurs lumières.'],
  ['capture','Empreinte','Composez votre scène, puis enregistrez son image sur votre appareil.'],
] as const;
export type AtomGame = typeof atomGames[number][0];

interface Context {
  canvas: HTMLCanvasElement; scope: HTMLElement; scene: THREE.Scene;
  camera: THREE.PerspectiveCamera; atom: THREE.Group; renderer: THREE.WebGLRenderer;
  flight: THREE.Vector2; velocity: THREE.Vector2; rotation: () => THREE.Vector2;
  setRotation: (x:number,y:number) => void; reduced: () => boolean;
  clock: () => number; setClock: (time:number) => void;
  schedule: () => void; status: (message:string) => void;
}

/** Bounded visual playground. No accounts, microphone, research or network calls. */
export function mountAtomPlayground(c: Context) {
  const group = new THREE.Group(); c.scene.add(group);
  const abort = new AbortController(); const signal = abort.signal;
  const panel = document.createElement('section'); panel.className='atom-games'; panel.hidden=true;
  panel.setAttribute('aria-label','Atelier des quinze jeux');
  panel.innerHTML=`<label for="atom-game">Explorer un jeu</label><select id="atom-game">${atomGames.map(([id,name],i)=>`<option value="${id}">${String(i+1).padStart(2,'0')} · ${name}</option>`).join('')}</select><p data-game-help></p><div><button type="button" data-game-prev aria-label="Jeu précédent">←</button><button type="button" data-game-action>Essayer</button><button type="button" data-game-clear>Effacer</button><button type="button" data-game-next aria-label="Jeu suivant">→</button><button type="button" data-game-close>Retour</button></div><p data-game-result role="status" aria-live="polite"></p>`;
  c.scope.append(panel);
  const select=panel.querySelector<HTMLSelectElement>('select')!;
  const help=panel.querySelector<HTMLElement>('[data-game-help]')!;
  const result=panel.querySelector<HTMLElement>('[data-game-result]')!;
  const action=panel.querySelector<HTMLButtonElement>('[data-game-action]')!;
  function labels(){
    panel.setAttribute('aria-label',landingText('Atelier des quinze jeux','Fifteen-game playground','Taller de quince juegos'));
    panel.querySelector('label')!.textContent=landingText('Explorer un jeu','Explore a game','Explorar un juego');
    for(const option of select.options){const game=atomGames.find(g=>g[0]===option.value)!,tr=translations[game[0]],name=landingText(game[1],tr[0],tr[2]);option.textContent=String(atomGames.indexOf(game)+1).padStart(2,'0')+' · '+name;}
    const game=atomGames.find(g=>g[0]===mode)!,tr=translations[mode];help.textContent=landingText(game[2],tr[1],tr[3]);
    action.textContent=mode==='capture'?landingText('Enregistrer PNG','Save PNG','Guardar PNG'):landingText('Essayer le geste','Try the gesture','Probar el gesto');
    panel.querySelector('[data-game-clear]')!.textContent=landingText('Effacer','Clear','Borrar');panel.querySelector('[data-game-close]')!.textContent=landingText('Retour','Back','Volver');
    panel.querySelector('[data-game-prev]')!.setAttribute('aria-label',landingText('Jeu précédent','Previous game','Juego anterior'));panel.querySelector('[data-game-next]')!.setAttribute('aria-label',landingText('Jeu suivant','Next game','Juego siguiente'));
  }
  let mode:AtomGame='vortex', active=false, held=false, picked=-1, age=0, strength=.35, spring=0, springV=0, cooldown=0;
  let puzzleSolved=false, rewindIndex=-1, collecting=0, seedFlash=0, ripple=0, portalCrossings=0, captures=0;
  const pointer=new THREE.Vector3(), down=new THREE.Vector3(), slingPosition=new THREE.Vector3(1,1,0), slingVelocity=new THREE.Vector3();
  const vortex=new THREE.Vector3(0,0,0), elasticDirection=new THREE.Vector3(1,0,0);
  const portalA=new THREE.Vector3(-2.2,.5,0), portalB=new THREE.Vector3(2.2,1,0);
  const duetPosition=new THREE.Vector3(2.1,1,0), atomPosition=new THREE.Vector3();
  const histories:{position:THREE.Vector3; x:number; y:number; time:number; clock:number; trail?:Float32Array; alpha?:Float32Array}[]=[];
  const stars:THREE.Vector3[]=[];
  const ray=new THREE.Raycaster(); const plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
  const mat=(color:string,opacity=1)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false});
  const pearl=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),mat('#ffce89')); group.add(pearl);
  const tetherGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
  const tether=new THREE.Line(tetherGeometry,new THREE.LineBasicMaterial({color:'#ffc97a'}));group.add(tether);
  const lineGeometry=new THREE.BufferGeometry();const lineArray=new Float32Array(64*3);
  lineGeometry.setAttribute('position',new THREE.BufferAttribute(lineArray,3));
  const starLines=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:'#73d7ff',transparent:true,opacity:.7}));group.add(starLines);
  const starGeometry=new THREE.BufferGeometry(); const starArray=new Float32Array(32*3);starGeometry.setAttribute('position',new THREE.BufferAttribute(starArray,3));
  const starPoints=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:'#eaf3ff',size:.13,sizeAttenuation:true}));group.add(starPoints);
  const trailSize=1024,trailArray=new Float32Array(trailSize*3),trailAlpha=new Float32Array(trailSize);
  const trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailArray,3));trailGeometry.setAttribute('life',new THREE.BufferAttribute(trailAlpha,1));
  const trailMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color('#73d7ff')}},vertexShader:'attribute float life; varying float a; void main(){a=life; vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(45./-p.z,2.,10.);}',fragmentShader:'varying float a;uniform vec3 color;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(color,a*(1.-smoothstep(.05,.5,d)));}'});
  const trail=new THREE.Points(trailGeometry,trailMaterial); trail.frustumCulled=false;group.add(trail);let trailIndex=0;
  function emit(p:THREE.Vector3,life=1){p.toArray(trailArray,trailIndex*3);trailAlpha[trailIndex]=life;trailIndex=(trailIndex+1)%trailSize;}
  const portalGeometry=new THREE.TorusGeometry(.65,.035,8,64);
  const ports=[new THREE.Mesh(portalGeometry,mat('#73d7ff')),new THREE.Mesh(portalGeometry,mat('#d4a5ff'))];ports[0].position.copy(portalA);ports[1].position.copy(portalB);ports.forEach(p=>group.add(p));
  const crownGeometry=new THREE.BufferGeometry();const crownArray=new Float32Array(128*3);crownGeometry.setAttribute('position',new THREE.BufferAttribute(crownArray,3));
  const crown=new THREE.Points(crownGeometry,new THREE.PointsMaterial({color:'#ffce89',size:.065,transparent:true,opacity:.8}));group.add(crown);
  // Echo preserves the atom silhouette with one draw call instead of duplicating its lit meshes.
  const ghost=new THREE.Group();
  const ghostPositions:number[]=[];
  c.atom.updateMatrixWorld(true);
  c.atom.traverse(o=>{if(o instanceof THREE.Points){const a=o.geometry.getAttribute('position');for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i);o.localToWorld(v);c.atom.worldToLocal(v);ghostPositions.push(v.x,v.y,v.z);}}});
  const ghostGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(ghostPositions,3));
  ghost.add(new THREE.Points(ghostGeometry,new THREE.PointsMaterial({color:'#bd98ff',size:.028,transparent:true,opacity:.2,depthWrite:false})));
  group.add(ghost);
  const offsetScratch=new THREE.Vector3(),dustScratch=new THREE.Vector4();
  let historyElapsed=0,telemetryElapsed=0,ambientHolding=false,holdStarted=0,vacuum=0,starStarted=-1,starArmed=true,starPaused=-1;
  const puzzle=new THREE.Group();const targetX=.35,targetY=.7;
  const rotations=[new THREE.Euler(.85,.35,.5),new THREE.Euler(-.75,.7,-.35),new THREE.Euler(.12,-.6,1.32)];
  for(const rot of rotations){const pts=Array.from({length:129},(_,i)=>new THREE.Vector3(Math.cos(i/128*Math.PI*2)*2.35,Math.sin(i/128*Math.PI*2)*1.82,0).applyEuler(rot));puzzle.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#ffce89',transparent:true,opacity:.35})));}group.add(puzzle);
  const duet=c.atom.clone(true);group.add(duet);duet.position.copy(duetPosition);duet.scale.setScalar(.4);
  const braidGeometry=new THREE.BufferGeometry();const braidArray=new Float32Array(96*3);braidGeometry.setAttribute('position',new THREE.BufferAttribute(braidArray,3));
  const braid=new THREE.Line(braidGeometry,new THREE.LineBasicMaterial({color:'#bd98ff',transparent:true,opacity:.85}));group.add(braid);
  // Letter pixels are sampled locally, once per resize: the wordmark is real particle geometry.
  const logoGeometry=new THREE.BufferGeometry();const logo=new THREE.Points(logoGeometry,new THREE.PointsMaterial({color:'#bd98ff',size:.042,transparent:true,opacity:.65}));group.add(logo);
  let logoHomes=new Float32Array(0),logoPositions=new Float32Array(0),logoAge=-1;
  const wordmark=c.scope.querySelector<HTMLElement>('.orbit-wordmark')!;
  let logoDimensions='';
  function buildLogo(){
    const rect=c.canvas.getBoundingClientRect();const dimensions=`${rect.width}:${rect.height}`;if(dimensions===logoDimensions)return;logoDimensions=dimensions;
    const sample=document.createElement('canvas');sample.width=Math.round(rect.width);sample.height=Math.round(rect.height);const ctx=sample.getContext('2d')!;
    const letters=Array.from(wordmark.querySelectorAll<HTMLElement>('span'));
    for(const letter of letters){const r=letter.getBoundingClientRect(),style=getComputedStyle(letter);ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.fillText(letter.textContent||'',r.left-rect.left,r.top-rect.top+r.height*.5);}
    const rgba=ctx.getImageData(0,0,sample.width,sample.height).data,points:number[]=[];
    const half=Math.tan(THREE.MathUtils.degToRad(c.camera.fov/2))*c.camera.position.z;
    for(let y=0;y<sample.height;y+=7)for(let x=0;x<sample.width;x+=7)if(rgba[(y*sample.width+x)*4+3]>80){points.push((x/sample.width*2-1)*half*c.camera.aspect,(1-y/sample.height*2)*half,0);}
    logoHomes=new Float32Array(points);logoPositions=new Float32Array(points);logoGeometry.setAttribute('position',new THREE.BufferAttribute(logoPositions,3));
  }
  function point(event:PointerEvent){const r=c.canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2),c.camera);ray.ray.intersectPlane(plane,pointer);}
  function message(text:string){result.textContent=translateLandingMessage(text);c.status(text);}
  function clear(){trailAlpha.fill(0);stars.length=0;histories.length=0;rewindIndex=-1;collecting=0;seedFlash=0;spring=springV=strength=ripple=0;puzzleSolved=false;slingPosition.set(1,1,0);slingVelocity.set(0,0,0);logoAge=-1;message('Scène du jeu réinitialisée.');}
  function choose(id:AtomGame){mode=id;select.value=id;if(id!=='capture')clear();held=false;picked=-1;age=0;labels();c.scope.dataset.atomGame=id;logoDimensions='';c.schedule();}
  function open(){ambientHolding=false;vacuum=0;starStarted=-1;active=true;panel.hidden=false;c.scope.dataset.gameOpen='true';choose(mode);select.focus();}
  function close(){ambientHolding=false;vacuum=0;starStarted=-1;active=false;held=false;panel.hidden=true;group.visible=false;wordmark.style.visibility='';c.scope.dataset.gameOpen='false';delete c.scope.dataset.atomGame;c.scope.querySelector<HTMLButtonElement>('[data-atom-games]')?.focus();c.schedule();}
  c.scope.querySelector('[data-atom-games]')?.addEventListener('click',open,{signal});
  c.scope.addEventListener('orbit:language-change',()=>{labels();result.textContent='';},{signal});
  select.addEventListener('change',()=>choose(select.value as AtomGame),{signal});
  panel.querySelector('[data-game-close]')!.addEventListener('click',close,{signal});
  panel.querySelector('[data-game-clear]')!.addEventListener('click',()=>{clear();c.schedule();},{signal});
  for(const [attr,step] of [['prev',-1],['next',1]] as const)panel.querySelector(`[data-game-${attr}]`)!.addEventListener('click',()=>choose(atomGames[(atomGames.findIndex(g=>g[0]===mode)+step+15)%15][0]),{signal});
  function capture(){
    try {c.renderer.render(c.scene,c.camera);const image=document.createElement('canvas');image.width=c.canvas.width;image.height=c.canvas.height;const ctx=image.getContext('2d')!;ctx.fillStyle='#080b20';ctx.fillRect(0,0,image.width,image.height);ctx.drawImage(c.canvas,0,0);
      const r=c.canvas.getBoundingClientRect(),scale=image.width/r.width;ctx.scale(scale,scale);ctx.fillStyle='#d4c1fc30';ctx.textBaseline='middle';if(mode!=='logo')for(const letter of wordmark.querySelectorAll<HTMLElement>('span')){const lr=letter.getBoundingClientRect(),style=getComputedStyle(letter);ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ctx.fillText(letter.textContent||'',lr.left-r.left,lr.top-r.top+lr.height/2);}
      ctx.font='16px sans-serif';ctx.fillStyle='#ffce89';ctx.fillText('orbit. · ma constellation',24,r.height-28);
      image.toBlob(blob=>{if(!blob){message('Capture indisponible. Réessayez.');return;}captures++;c.scope.dataset.gameCaptures=String(captures);const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='orbit-empreinte.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Empreinte PNG enregistrée sur votre appareil.');},'image/png');
    }catch(error){c.scope.dataset.gameCaptureError=error instanceof Error?error.name:'CAPTURE_FAILED';message('Capture indisponible dans ce navigateur.');}
  }
  function demonstrate(){
    if(mode==='capture'){capture();return;}
    if(mode==='sling'){slingPosition.copy(atomPosition).add(new THREE.Vector3(.7,.3,0));slingVelocity.set(-3,2,0);}
    if(mode==='paint'){for(let i=0;i<160;i++){const a=i/160*Math.PI*2;emit(atomPosition.clone().add(new THREE.Vector3(Math.cos(a),Math.sin(a),0)));}}
    if(mode==='strings'){ripple=1.2;}
    if(mode==='elastic'){spring=.75;elasticDirection.set(1,.35,0);}
    if(mode==='vortex'){vortex.copy(atomPosition);strength=1;}
    if(mode==='logo'){logoAge=0;}
    if(mode==='stars'){stars.splice(0,stars.length,...Array.from({length:6},(_,i)=>new THREE.Vector3(Math.cos(i*1.2)*2,Math.sin(i*1.2)*1.5,0)));}
    if(mode==='collect'){collecting=Math.min(128,collecting+40);seedFlash=1;}
    if(mode==='rosette'){c.setRotation(c.rotation().x+.3,c.rotation().y+.6);}
    if(mode==='portals'){c.flight.x+=portalA.x-atomPosition.x;c.flight.y+=portalA.y-atomPosition.y;cooldown=0;}
    if(mode==='puzzle'){c.setRotation(targetX,targetY);message('Alignement assisté. Effacer pour essayer vous-même.');}
    if(mode==='echo'||mode==='rewind'){if(histories.length<90)histories.push(...Array.from({length:90},(_,i)=>({position:atomPosition.clone().add(new THREE.Vector3(Math.sin(i*.06),Math.cos(i*.06)*.4,0)),x:0,y:i*.02,time:age-3+i/30,clock:c.clock()-3+i/30,trail:trailArray.slice(),alpha:trailAlpha.slice()})));if(mode==='rewind')rewindIndex=histories.length-1;}
    if(mode==='duet'){c.flight.x+=duetPosition.x-atomPosition.x-.8;c.flight.y+=duetPosition.y-atomPosition.y;}
    c.schedule(); if(mode!=='puzzle')message('Geste déclenché. Essayez maintenant avec la souris ou au toucher.');
  }
  action.addEventListener('click',demonstrate,{signal});
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')close();},{signal});
  const consumes=()=>['sling','strings','elastic','vortex','stars','collect'].includes(mode);
  // Only vortex is ambient. Echo and rewind retain isolated, opt-in games.
  // Named games isolate those same mechanisms; navigation elements remain outside the canvas.
  c.scope.dataset.ambientInteractions='vortex';
  function finishRewind(){if(rewindIndex>=0)histories.splice(Math.max(0,Math.floor(rewindIndex)+1));rewindIndex=-1;held=false;}
  c.canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0||c.scope.dataset.motion==='static')return;point(e);
    if(!active){ambientHolding=true;holdStarted=performance.now();if(starStarted<0){starArmed=true;vortex.copy(pointer);}strength=1;c.canvas.setPointerCapture(e.pointerId);c.schedule();return;}
    down.copy(pointer);held=true;picked=-1;
    if(mode==='rewind'&&pointer.distanceTo(atomPosition)>.8){rewindIndex=histories.length-1;e.stopImmediatePropagation();c.canvas.setPointerCapture(e.pointerId);}
    if(consumes()) {e.stopImmediatePropagation();c.canvas.setPointerCapture(e.pointerId);}
    if(mode==='stars'){picked=stars.findIndex(p=>p.distanceTo(pointer)<.25);if(picked<0&&stars.length<32){stars.push(pointer.clone());picked=stars.length-1;}message(`${stars.length} étoiles dans votre constellation.`);}
    if(mode==='elastic')elasticDirection.copy(pointer).sub(atomPosition).normalize();
    if(mode==='vortex'){vortex.copy(pointer);strength=1;}
    c.schedule();
  },{signal,capture:true});
  c.canvas.addEventListener('pointermove',e=>{point(e);if(!active){if(starStarted<0)vortex.lerp(pointer,.15);strength=1;if(held)e.stopImmediatePropagation();c.schedule();return;}if(held){
    if(mode==='sling'){slingPosition.copy(pointer);slingVelocity.set(0,0,0);}
    if(mode==='strings')ripple=THREE.MathUtils.clamp(pointer.distanceTo(down),.05,1.5);
    if(mode==='elastic')spring=THREE.MathUtils.clamp(pointer.distanceTo(down)+.15,0,.8);
    if(mode==='vortex')vortex.lerp(pointer,.15);
    if(mode==='stars'&&picked>=0)stars[picked].copy(pointer);
    if(consumes())e.stopImmediatePropagation();c.schedule();
  }},{signal,capture:true});
  const release=(e:PointerEvent)=>{if(!active){ambientHolding=false;vacuum=0;if(c.canvas.hasPointerCapture(e.pointerId))c.canvas.releasePointerCapture(e.pointerId);if(held){finishRewind();if(c.canvas.hasPointerCapture(e.pointerId))c.canvas.releasePointerCapture(e.pointerId);message('Parcours repris · un nouveau mouvement crée une nouvelle suite.');c.schedule();}return;}if(held&&mode==='sling'){slingVelocity.copy(atomPosition).sub(slingPosition).multiplyScalar(3).clampLength(0,8);message('Fronde relâchée : direction vers le noyau.');}
    if(held&&mode==='collect'){seedFlash=1;for(let i=0;i<collecting;i++){const a=i*.618*Math.PI*2;emit(atomPosition.clone().add(new THREE.Vector3(Math.cos(a),Math.sin(a),0)),1);}message(`${Math.floor(collecting)} particules semées.`);}
    if(mode==='rewind'&&held&&rewindIndex>=0){histories.splice(Math.max(0,Math.floor(rewindIndex)+1));rewindIndex=-1;}
    held=false;picked=-1;if(c.canvas.hasPointerCapture(e.pointerId))c.canvas.releasePointerCapture(e.pointerId);c.schedule();};
  c.canvas.addEventListener('pointerup',release,{signal,capture:true});c.canvas.addEventListener('pointercancel',release,{signal,capture:true});
  c.canvas.addEventListener('keydown',e=>{if(c.scope.dataset.motion==='static')return;if(!active)return;if(e.key==='Escape'){e.stopImmediatePropagation();close();}else if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();demonstrate();}},{signal,capture:true});
  c.canvas.addEventListener('keyup',e=>{if(!active&&e.key.toLowerCase()==='h'){finishRewind();c.schedule();}},{signal,capture:true});

  function ambientUpdate(dt:number){
    group.visible=true;age+=dt;atomPosition.copy(c.atom.position);
    pearl.visible=tether.visible=starLines.visible=starPoints.visible=crown.visible=puzzle.visible=duet.visible=braid.visible=logo.visible=trail.visible=false;
    ports.forEach(p=>p.visible=false);wordmark.style.visibility='';
    strength*=Math.exp(-dt*.07);
    const target=starArmed&&ambientHolding&&performance.now()-holdStarted>=2000&&!c.reduced()?1:0;
    vacuum+=(target-vacuum)*(1-Math.exp(-dt*(target?3:5)));
    const moving=dt>0&&!c.reduced();
    ghost.visible=false;
    telemetryElapsed+=dt;if(telemetryElapsed>=.1||dt===0){telemetryElapsed=0;c.scope.dataset.vortexSuction=vacuum.toFixed(3);c.scope.dataset.ambientHistory=String(histories.length);c.scope.dataset.ambientRewinding=String(rewindIndex>=0);c.scope.dataset.ambientVortex=String(c.reduced()?0:strength);}
  }

  function update(dt:number){
    if(!active){ambientUpdate(dt);return;}group.visible=true;trail.visible=true;age+=dt;atomPosition.copy(c.atom.position);cooldown=Math.max(0,cooldown-dt);
    const moving=dt>0&&!c.reduced();
    if(mode!=='capture') {pearl.visible=tether.visible=mode==='sling';starLines.visible=starPoints.visible=mode==='stars';ports.forEach(p=>p.visible=mode==='portals');
    crown.visible=mode==='collect';ghost.visible=mode==='echo';puzzle.visible=mode==='puzzle';duet.visible=braid.visible=mode==='duet';logo.visible=mode==='logo';wordmark.style.visibility=mode==='logo'?'hidden':'';}
    if(mode==='sling'){if(!held&&moving){slingPosition.addScaledVector(slingVelocity,dt);slingVelocity.multiplyScalar(Math.exp(-.55*dt));const half=Math.tan(THREE.MathUtils.degToRad(c.camera.fov/2))*c.camera.position.z;if(Math.abs(slingPosition.x)>half*c.camera.aspect){slingPosition.x=THREE.MathUtils.clamp(slingPosition.x,-half*c.camera.aspect,half*c.camera.aspect);slingVelocity.x*=-.8;}if(Math.abs(slingPosition.y)>half){slingPosition.y=THREE.MathUtils.clamp(slingPosition.y,-half,half);slingVelocity.y*=-.8;}if(slingVelocity.length()>.1)emit(slingPosition);}
      pearl.position.copy(slingPosition);tether.visible=held;const a=tetherGeometry.attributes.position as THREE.BufferAttribute;a.setXYZ(0,atomPosition.x,atomPosition.y,0);a.setXYZ(1,slingPosition.x,slingPosition.y,0);a.needsUpdate=true;}
    for(let i=0;i<trailSize;i++)trailAlpha[i]=Math.max(0,trailAlpha[i]-dt*.22);
    if(mode==='paint'&&moving&&(held||c.velocity.length()>.1))for(let j=0;j<3;j++)emit(atomPosition.clone().add(new THREE.Vector3(Math.sin(age*8+j)*.03,Math.cos(age*8+j)*.03,0)));
    if(mode==='strings'&&!held)ripple*=Math.exp(-dt*1.4);
    if(mode==='elastic'&&!held&&moving){springV+=(-18*spring-4*springV)*dt;spring+=springV*dt;}
    if(mode==='vortex'&&!held)strength*=Math.exp(-dt*.07);
    if(mode==='stars'){for(let i=0;i<stars.length;i++)stars[i].toArray(starArray,i*3);starGeometry.setDrawRange(0,stars.length);starGeometry.attributes.position.needsUpdate=true;for(let i=0;i<stars.length;i++)stars[i].toArray(lineArray,i*3);lineGeometry.setDrawRange(0,stars.length);lineGeometry.attributes.position.needsUpdate=true;}
    if(mode==='collect'){if(held)collecting=Math.min(128,collecting+dt*24);seedFlash=Math.max(0,seedFlash-dt*.4);for(let i=0;i<128;i++){const a=i/128*Math.PI*2+age*.5,r=.85+seedFlash*.65;new THREE.Vector3(atomPosition.x+Math.cos(a)*r,atomPosition.y+Math.sin(a)*r,Math.sin(a*3)*.15).toArray(crownArray,i*3);}crownGeometry.setDrawRange(0,Math.floor(collecting));crownGeometry.attributes.position.needsUpdate=true;}
    if(mode==='rosette'){const rotation=c.rotation();for(let i=0;i<6;i++){const a=age*.6+i/6*.03,petals=3+Math.round(Math.abs(rotation.x)*2),r=1.25*Math.cos(petals*a+rotation.y);emit(atomPosition.clone().add(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,.1)),.8);}}
    if(mode==='portals'&&cooldown===0){const index=[portalA,portalB].findIndex(p=>p.distanceTo(atomPosition)<.5);if(index>=0){const from=index===0?portalA:portalB,to=index===0?portalB:portalA;c.flight.add(new THREE.Vector2(to.x-from.x,to.y-from.y));portalCrossings++;cooldown=1.3;for(let i=0;i<70;i++)emit(from.clone().lerp(to,i/69));message('Portail traversé · mouvement conservé.');}}
    if(mode==='puzzle'){puzzle.position.copy(atomPosition);puzzle.scale.copy(c.atom.scale);puzzle.rotation.set(targetX,targetY,-.1);const rot=c.rotation(),error=Math.hypot(rot.x-targetX,Math.atan2(Math.sin(rot.y-targetY),Math.cos(rot.y-targetY)));if(error<.12&&!puzzleSolved){puzzleSolved=true;message('Puzzle aligné ! Les trois silhouettes se superposent.');for(let i=0;i<160;i++){const a=i/160*Math.PI*2;emit(atomPosition.clone().add(new THREE.Vector3(Math.cos(a)*2,Math.sin(a)*2,0)));}}}
    if((mode==='echo'||mode==='rewind')&&rewindIndex<0&&moving){const rot=c.rotation();histories.push({position:atomPosition.clone(),x:rot.x,y:rot.y,time:age,clock:c.clock(),trail:trailArray.slice(),alpha:trailAlpha.slice()});if(histories.length>240)histories.shift();}
    if(mode==='echo'){const entry=histories.find(h=>h.time>=age-1.5);ghost.visible=!!entry;if(entry){ghost.position.copy(entry.position);ghost.rotation.set(entry.x,entry.y,-.1);ghost.scale.copy(c.atom.scale);if(moving)emit(entry.position,.3);}}
    if(mode==='rewind'&&rewindIndex>=0){const entry=histories[Math.floor(rewindIndex)];if(entry){c.flight.add(new THREE.Vector2(entry.position.x-atomPosition.x,entry.position.y-atomPosition.y));c.setClock(Math.max(0,entry.clock));c.setRotation(entry.x,entry.y);if(entry.trail)trailArray.set(entry.trail);if(entry.alpha)trailAlpha.set(entry.alpha);c.velocity.set(0,0);if(moving)rewindIndex-=dt*(active?60:30);}else{histories.length=0;rewindIndex=-1;message('Historique rembobiné. Vous pouvez créer un nouveau parcours.');}}
    if(mode==='duet'){duet.rotation.set(c.atom.rotation.x,-c.atom.rotation.y,0);const distance=atomPosition.distanceTo(duetPosition);const connection=Math.max(0,1-distance/4);braid.visible=connection>.01;for(let i=0;i<96;i++){const t=i/95,p=atomPosition.clone().lerp(duetPosition,t);p.y+=Math.sin(t*Math.PI*12+age*3)*.22*connection;p.z+=Math.cos(t*Math.PI*12+age*3)*.22*connection;p.toArray(braidArray,i*3);}braidGeometry.attributes.position.needsUpdate=true;if(moving&&connection>.5){const t=(age*.45)%1;emit(atomPosition.clone().lerp(duetPosition,t));emit(duetPosition.clone().lerp(atomPosition,t));}}
    if(mode==='logo'){buildLogo();if(logoAge>=0)logoAge+=dt;for(let i=0;i<logoPositions.length;i+=3){const dx=logoHomes[i]-atomPosition.x,dy=logoHomes[i+1]-atomPosition.y,d=Math.hypot(dx,dy)||1;const force=Math.exp(-d*d/1.2)*.9+(logoAge>=0?Math.exp(-logoAge*1.8)*.6:0);logoPositions[i]=logoHomes[i]+dx/d*force;logoPositions[i+1]=logoHomes[i+1]+dy/d*force;logoPositions[i+2]=Math.sin(i+age)*force*.15;}logoGeometry.attributes.position.needsUpdate=true;}
    trailGeometry.attributes.position.needsUpdate=true;trailGeometry.attributes.life.needsUpdate=true;
    telemetryElapsed+=dt;
    if(telemetryElapsed>=.1||dt===0){
      telemetryElapsed=0;let value=0;
      switch(mode){
        case 'sling':value=slingVelocity.length();break;
        case 'paint':case 'rosette':for(const life of trailAlpha)if(life>0)value++;break;
        case 'strings':value=ripple;break;case 'elastic':value=Math.abs(spring);break;
        case 'vortex':value=strength;break;
        case 'logo':for(let i=0;i<logoPositions.length;i++)value+=Math.abs(logoPositions[i]-logoHomes[i]);break;
        case 'stars':value=stars.length;break;case 'collect':value=collecting;break;
        case 'portals':value=portalCrossings;break;case 'puzzle':value=puzzleSolved?1:0;break;
        case 'echo':value=histories.length;break;case 'rewind':value=rewindIndex>=0?1:0;break;
        case 'duet':value=braid.visible?1:0;break;case 'capture':value=captures;break;
      }
      c.scope.dataset.gameSignal=String(value);
    }
  }
  const suctionState={strength:0,point:vortex,ascii:false,burst:0,starCollapse:false,burstAge:-1};
  return {
    update,
    ringOffset:(x:number,y:number,z:number)=>active&&mode==='strings'?Math.sin(Math.atan2(y,x)*5-age*8)*ripple*Math.exp(-Math.abs(z)*.1)*.12:0,
    nucleusOffset:(x:number,y:number,z:number)=>{
      if(!active||mode!=='elastic')return offsetScratch.set(0,0,0);
      const dx=x-elasticDirection.x*.5,dy=y-elasticDirection.y*.5,dz=z-elasticDirection.z*.5;
      return offsetScratch.copy(elasticDirection).multiplyScalar(spring*Math.exp(-(dx*dx+dy*dy+dz*dz)*4));
    },
    suction:()=>{
      const now=performance.now(),holdFor=now-holdStarted,enabled=!active&&!c.reduced();
      if(starPaused>=0){if(starStarted>=0)starStarted+=now-starPaused;starPaused=-1;}
      if(enabled&&ambientHolding&&starArmed&&holdFor>=6000){starStarted=now;starArmed=false;vacuum=0;}
      const elapsed=starStarted<0?-1:(now-starStarted)/1000;
      const sequence=enabled&&elapsed>=0&&elapsed<3.2;
      if(elapsed>=3.2)starStarted=-1;
      suctionState.starCollapse=sequence&&elapsed<.35;
      suctionState.strength=suctionState.starCollapse?1:sequence||!starArmed?0:vacuum;
      suctionState.ascii=sequence||(enabled&&ambientHolding&&starArmed&&holdFor>=4000);
      suctionState.burst=sequence?Math.min(1,Math.max(0,(elapsed-.35)/.35))*Math.max(0,Math.min(1,(3.2-elapsed)/1.6)):0;
      suctionState.burstAge=suctionState.burst>0?elapsed-.35:-1;
      c.scope.dataset.vortexBurst=String(suctionState.burst);c.scope.dataset.vortexStarCollapse=String(suctionState.starCollapse);
      return suctionState;
    },
    dustEffect:()=>active?dustScratch.set(mode==='vortex'?vortex.x:mode==='sling'?slingPosition.x:atomPosition.x,mode==='vortex'?vortex.y:mode==='sling'?slingPosition.y:atomPosition.y,mode==='vortex'?strength:mode==='collect'?Math.min(1,collecting/80):mode==='sling'?Math.min(1,slingVelocity.length()/4):0,mode==='vortex'?1:mode==='collect'?2:3):dustScratch.set(vortex.x,vortex.y,c.reduced()?0:suctionState.burst>0?suctionState.burst:suctionState.strength>.001?suctionState.strength:strength,suctionState.burst>0?5:suctionState.strength>.001?4:1),
    suspend(){ambientHolding=false;if(starStarted>=0)starPaused=performance.now();finishRewind();picked=-1;},
    close,
    dispose(){abort.abort();panel.remove();wordmark.style.visibility='';c.scene.remove(group);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line||o instanceof THREE.Points){if(!c.atom.getObjectByProperty('geometry',o.geometry))geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());},
  };
}
