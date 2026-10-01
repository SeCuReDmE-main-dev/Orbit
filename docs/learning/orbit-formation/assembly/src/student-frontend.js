/** Provided integration, attributed separately from the student's eight files. */
import * as THREE from 'three';
import { createInteraction } from './learning/module-1/interaction-state.js';
import { createCards } from './learning/module-2/exploration-card.js';
import { createSceneController } from './learning/module-3/scene-controller.js';
import { createInertia } from './learning/module-4/inertia.js';
import { createTransition } from './learning/module-5/transitions.js';
import { createParticleLayer } from './learning/module-6/particle-layer.js';
import { createInteractionFlow } from './learning/module-7/interaction-flow.js';
import { registerLearningCapability } from './learning/module-8/register-capabilities.js';

export function mountStudentFrontend(root) {
  const lifetime = new AbortController();
  const items = [
    { id: 'element-1', title: 'Mon geste', content: 'Un événement modifie une position conservée.', position: { x: .5, y: .5 } },
    { id: 'element-2', title: 'Mon observation', content: 'Je compare le comportement à ma prédiction.', position: { x: .25, y: .3 } },
    { id: 'element-3', title: 'Mon transfert', content: 'Je réutilise une brique dans une autre interface.', position: { x: .75, y: .3 } }
  ];
  const stage = root.querySelector('[data-stage]'), status = root.querySelector('[data-state]');
  const staticControl = root.querySelector('[data-static]'), shareControl = root.querySelector('[data-share]');
  const capabilityStatus = root.querySelector('[data-capability-status]');
  let stopped = false, frame = 0, last = 0, revision = 0, capability, isStatic = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = createInertia(); const transition = createTransition(); const particles = createParticleLayer();
  let cards, scene;
  const flow = createInteractionFlow({ onChange(state) {
    root.querySelector('[data-view-description]').textContent = `Vue : ${state.view} · sélection : ${state.selection}`;
    cards?.select(state.selection); transition.setTarget(state.selection === 'element-1' ? 1.35 : 1);
    for (const button of root.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    scene?.render();
  } });
  const select = (id) => { revision++; flow.navigate('proofs', id); cards.select(id); };
  cards = createCards(root, items, select);
  scene = createSceneController({ container: root.querySelector('[data-three]'), THREE, items, onSelect: select });
  stage.dataset.webgl = String(scene.available);
  const draw = (dt) => {
    flow.step(dt); const position = motion.step(dt, isStatic); const scale = transition.step(dt, isStatic);
    const values = particles.step(dt, isStatic);
    scene.setPosition('element-1', position); scene.setScale('element-1', scale);
    scene.setParticles(root.querySelector('[data-particles]').checked ? values : []); scene.render();
    const marker = root.querySelector('[data-marker]'); marker.style.left = `${position.x * 100}%`; marker.style.top = `${position.y * 100}%`;
  };
  const interaction = createInteraction(stage, (state) => {
    if (isStatic) return;
    const now = performance.now() / 1000;
    if (state.lastEvent === 'pointerdown') motion.grab(state.position, now);
    else if (state.lastEvent === 'pointermove') motion.move(state.position, now);
    else if (state.lastEvent === 'pointerup') motion.release(now);
    else if (state.lastEvent === 'pointercancel') motion.cancel();
    else { motion.setPosition(state.position); }
    revision++; status.textContent = `${state.lastEvent} → ${state.phase} · position (${state.position.x.toFixed(2)}, ${state.position.y.toFixed(2)})`;
    draw(0);
  });
  const tick = (now) => { if (stopped || isStatic) return; const dt = last ? (now - last) / 1000 : 0; last = now; draw(dt); frame = requestAnimationFrame(tick); };
  const setStatic = (next) => {
    isStatic = next; staticControl.checked = next; flow.setStatic(next); cancelAnimationFrame(frame); last = 0;
    if (next) motion.cancel(); else if (!stopped) frame = requestAnimationFrame(tick);
    draw(0);
  };
  staticControl.checked = isStatic; flow.setStatic(isStatic);
  staticControl.addEventListener('change', () => setStatic(staticControl.checked), { signal: lifetime.signal });
  root.querySelector('[data-particles]').addEventListener('change', () => draw(0), { signal: lifetime.signal });
  const unregister = () => { capability?.dispose(); capability = undefined; };
  shareControl.addEventListener('change', () => { revision++; unregister(); capabilityStatus.textContent = shareControl.checked ? 'Partage choisi. Enregistrez la capacité pour cette révision.' : 'Lecture révoquée.'; }, { signal: lifetime.signal });
  root.querySelector('[data-register]').addEventListener('click', async () => {
    unregister(); const requestRevision = revision;
    const registered = await registerLearningCapability({ root, getRevision: () => revision, canRead: () => shareControl.checked && !stopped,
      getSnapshot: () => ({ selected: flow.snapshot().selection, view: flow.snapshot().view, position: motion.snapshot(), authority: 'student-declared' }) });
    if (stopped || requestRevision !== revision) { registered.dispose(); return; }
    capability = registered; capabilityStatus.textContent = registered.state === 'READY' ? `Capacité disponible pour la révision ${revision}.` : 'WebMCP indisponible ; les commandes humaines restent utilisables.';
  }, { signal: lifetime.signal });
  for (const button of root.querySelectorAll('[data-view]')) button.addEventListener('click', () => { revision++; flow.navigate(button.dataset.view); }, { signal: lifetime.signal });
  const visibility = () => { cancelAnimationFrame(frame); last = 0; if (!document.hidden && !isStatic && !stopped) frame = requestAnimationFrame(tick); };
  document.addEventListener('visibilitychange', visibility, { signal: lifetime.signal });
  cards.select(flow.snapshot().selection); draw(0); if (!isStatic) frame = requestAnimationFrame(tick);
  return () => { if (stopped) return; stopped = true; lifetime.abort(); cancelAnimationFrame(frame); unregister(); interaction.dispose(); flow.dispose(); motion.dispose(); transition.dispose(); particles.dispose(); cards.dispose(); scene.dispose(); };
}
