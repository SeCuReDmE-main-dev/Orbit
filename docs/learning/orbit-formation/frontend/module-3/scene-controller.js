export const sceneOptions = { cameraDistance: 5 }; // STUDENT: compare 5 and 7, with the same objects.
/** THREE is the exact host dependency, never a second bundled library. No owned RAF. */
export function createSceneController({ container, THREE, items, onSelect, options = sceneOptions }) {
  if (!(options.cameraDistance >= 1 && options.cameraDistance <= 10)) throw new Error('Camera distance outside the learning limits.');
  let renderer; const lifetime = new AbortController(); const geometries = []; const materials = [];
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { return { available: false, render() {}, setPosition() {}, setScale() {}, setParticles() {}, dispose() {} }; }
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5)); renderer.domElement.setAttribute('aria-hidden', 'true'); container.append(renderer.domElement);
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.z = options.cameraDistance;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x172037, 2));
  const objects = new Map();
  for (const [index, item] of items.entries()) {
    const geometry = new THREE.SphereGeometry(0.22, 16, 12);
    const material = new THREE.MeshStandardMaterial({ color: [0x5cd6e8, 0xa98de6, 0xffa234][index % 3] });
    geometries.push(geometry); materials.push(material);
    const object = new THREE.Mesh(geometry, material); object.userData.id = item.id;
    object.position.set((item.position.x - 0.5) * 4, (0.5 - item.position.y) * 3, 0); scene.add(object); objects.set(item.id, object);
  }
  const pointGeometry = new THREE.BufferGeometry(); const pointMaterial = new THREE.PointsMaterial({ color: 0xffa234, size: 0.025 });
  geometries.push(pointGeometry); materials.push(pointMaterial); const points = new THREE.Points(pointGeometry, pointMaterial); points.frustumCulled = false; scene.add(points);
  let pointArray = new Float32Array(0);
  const resize = () => { const rect = container.getBoundingClientRect(); camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height); camera.updateProjectionMatrix(); renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false); renderer.render(scene, camera); };
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  const ray = new THREE.Raycaster(); let start;
  renderer.domElement.addEventListener('pointerdown', (event) => { start = { x: event.clientX, y: event.clientY }; }, { signal: lifetime.signal });
  renderer.domElement.addEventListener('pointercancel', () => { start = undefined; }, { signal: lifetime.signal });
  renderer.domElement.addEventListener('pointerup', (event) => {
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera);
    const hit = ray.intersectObjects([...objects.values()])[0]; if (hit) onSelect(hit.object.userData.id);
    start = undefined;
  }, { signal: lifetime.signal });
  return { available: true,
    setPosition(id, position) { const object = objects.get(id); if (object) object.position.set((position.x - 0.5) * 4, (0.5 - position.y) * 3, 0); },
    setScale(id, value) { objects.get(id)?.scale.setScalar(value); },
    setParticles(particles) {
      if (pointArray.length !== particles.length * 3) { pointArray = new Float32Array(particles.length * 3); pointGeometry.setAttribute('position', new THREE.BufferAttribute(pointArray, 3)); }
      particles.forEach((particle, index) => { pointArray[index * 3] = (particle.x - 0.5) * 4; pointArray[index * 3 + 1] = (0.5 - particle.y) * 3; pointArray[index * 3 + 2] = -0.3; });
      if (pointArray.length) pointGeometry.attributes.position.needsUpdate = true;
      points.visible = Boolean(particles.length);
    }, render() { renderer.render(scene, camera); },
    dispose() { lifetime.abort(); observer.disconnect(); for (const value of geometries) value.dispose(); for (const value of materials) value.dispose(); renderer.dispose(); renderer.domElement.remove(); }
  };
}
