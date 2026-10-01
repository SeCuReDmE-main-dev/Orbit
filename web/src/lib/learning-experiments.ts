/** Course demonstrations only. No imported student code or benchmark model is executed. */
import * as THREE from 'three';
import { readPreferences, preferenceText } from '../../../packages/ui-preferences/src/index';
import { createInteraction } from '../../../docs/learning/orbit-formation/frontend/module-1/interaction-state.js';
import { createCards } from '../../../docs/learning/orbit-formation/frontend/module-2/exploration-card.js';
import { createSceneController } from '../../../docs/learning/orbit-formation/frontend/module-3/scene-controller.js';
import { createInertia } from '../../../docs/learning/orbit-formation/frontend/module-4/inertia.js';
import { createTransition } from '../../../docs/learning/orbit-formation/frontend/module-5/transitions.js';
import { createParticleLayer } from '../../../docs/learning/orbit-formation/frontend/module-6/particle-layer.js';
import { createInteractionFlow } from '../../../docs/learning/orbit-formation/frontend/module-7/interaction-flow.js';

export const learningExperimentParameters = [
  { moduleId: 1, initial: .04, min: .01, max: .25, step: .01, key: 'keyboardStep' },
  { moduleId: 2, initial: 0, min: 0, max: 1, step: 1, key: 'descriptionVariant' },
  { moduleId: 3, initial: 5, min: 1, max: 10, step: 1, key: 'cameraDistance' },
  { moduleId: 4, initial: .65, min: 0, max: 10, step: .05, key: 'damping' },
  { moduleId: 5, initial: 12, min: 0, max: 30, step: 1, key: 'damping' },
  { moduleId: 6, initial: 64, min: 0, max: 256, step: 1, key: 'count' },
  { moduleId: 7, initial: 32, min: 1, max: 100, step: 1, key: 'historyLimit' },
  { moduleId: 8, initial: 12000, min: 1000, max: 12000, step: 1000, key: 'snapshotLimit' },
] as const;

export function mountLearningExperiment(root: HTMLElement, moduleId: number, notice: (text: string) => void): () => void {
  const stage = root.querySelector<HTMLElement>('[data-experiment-stage]');
  const output = root.querySelector<HTMLElement>('[data-experiment-observation]');
  const parameter = root.querySelector<HTMLInputElement>('[name="parameter"]');
  const prediction = root.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="prediction"]');
  if (!stage || !output || !parameter || !prediction || !Number.isInteger(moduleId) || moduleId < 1 || moduleId > 8) return () => {};
  const previousStyle = { height: stage.style.height, overflow: stage.style.overflow };
  // A fixed-height container from the former one-demo view must not clip controls or HTML fallback.
  stage.style.height = 'auto'; stage.style.overflow = 'visible';
  const lifetime = new AbortController(); let active = new AbortController(); let cleaners: Array<() => void> = [];
  let frame = 0, last = 0, stopped = false, started = false, step: (dt: number) => void = () => {}, motionChanged: (paused: boolean) => void = () => {}, frozen = readPreferences().motion === 'static';
  const animated = [4, 5, 6, 7].includes(moduleId);
  const text = (fr: string, en: string, es: string) => preferenceText(readPreferences().language, fr, en, es);
  const toolbar = document.createElement('div'), run = document.createElement('button'), restore = document.createElement('button');
  run.type = restore.type = 'button';
  run.textContent = text('Lancer l’essai', 'Start the experiment', 'Iniciar la prueba');
  restore.textContent = text('Restaurer la valeur initiale', 'Restore the initial value', 'Restaurar el valor inicial');
  toolbar.append(run, restore);
  const content = document.createElement('div'), live = document.createElement('p');
  live.dataset.experimentLive = ''; live.setAttribute('aria-live', 'off'); stage.replaceChildren(toolbar, content, live);
  const config = learningExperimentParameters[moduleId - 1];
  const put = (value: string) => {
    if ('value' in output) (output as HTMLTextAreaElement).value = value;
    else output.textContent = value;
    output.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const listen = (target: EventTarget, name: string, handler: EventListener) => target.addEventListener(name, handler, { signal: active.signal });
  const button = (label: string, action: () => void) => { const value = document.createElement('button'); value.type = 'button'; value.textContent = label; listen(value, 'click', action); content.append(value); return value; };
  const surface = () => {
    const area = document.createElement('div'); area.tabIndex = 0; area.setAttribute('role', 'group');
    area.setAttribute('aria-label', text('Zone d’expérience, pointeur ou clavier', 'Experiment area, pointer or keyboard', 'Área de prueba, puntero o teclado'));
    Object.assign(area.style, { position: 'relative', height: '260px', border: '1px solid currentColor', overflow: 'hidden', touchAction: 'none' }); content.append(area); return area;
  };
  const marker = (area: HTMLElement) => {
    const value = document.createElement('span'); value.setAttribute('aria-hidden', 'true');
    Object.assign(value.style, { position: 'absolute', width: '22px', height: '22px', borderRadius: '50%', background: '#ffa234', pointerEvents: 'none', transform: 'translate(-50%,-50%)' }); area.append(value);
    return { element: value, draw(position: { x: number; y: number }) { value.style.left = `${position.x * 100}%`; value.style.top = `${position.y * 100}%`; } };
  };
  const items = () => [
    { id: 'element-1', title: text('Geste', 'Gesture', 'Gesto'), content: text('Une position enregistrée.', 'A recorded position.', 'Una posición registrada.'), position: { x: .5, y: .5 } },
    { id: 'element-2', title: text('Observation', 'Observation', 'Observación'), content: text('Un résultat à examiner.', 'A result to inspect.', 'Un resultado que examinar.'), position: { x: .25, y: .3 } },
    { id: 'element-3', title: text('Transfert', 'Transfer', 'Transferencia'), content: text('Une nouvelle situation.', 'A new situation.', 'Una situación nueva.'), position: { x: .75, y: .3 } },
  ];
  const cardsRoot = () => { const value = document.createElement('section'), list = document.createElement('ul'), description = document.createElement('p'); list.dataset.learningCards = ''; description.dataset.learningDescription = ''; description.setAttribute('aria-live', 'polite'); value.append(list, description); content.append(value); return value; };
  const tick = (now: number) => { if (stopped || frozen || document.hidden) return; const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now; step(dt); frame = requestAnimationFrame(tick); };
  const stopActive = () => { cancelAnimationFrame(frame); last = 0; started = false; active.abort(); for (const dispose of cleaners) dispose(); cleaners = []; active = new AbortController(); step = () => {}; motionChanged = () => {}; content.replaceChildren(); live.textContent = ''; };
  const start = () => {
    if (!prediction.value.trim()) { notice(text('Écrivez votre prédiction avant l’essai.', 'Write your prediction before the experiment.', 'Escriba su predicción antes de la prueba.')); return; }
    const value = Number(parameter.value);
    if (!Number.isFinite(value) || value < config.min || value > config.max || ([2, 6, 7, 8].includes(moduleId) && !Number.isInteger(value))) {
      notice(text('Paramètre hors des limites de cette activité.', 'Parameter outside this activity’s limits.', 'Parámetro fuera de los límites de esta actividad.')); return;
    }
    stopActive();
    try {
      if (moduleId === 1) {
        const area = surface(), dot = marker(area); dot.draw({ x: .5, y: .5 });
        const interaction = createInteraction(area, (state: any) => {
          if (frozen) return; dot.draw(state.position); live.textContent = `${state.lastEvent} → ${state.phase}`;
          if (state.lastEvent !== 'pointermove') put(`${state.lastEvent} → ${state.phase}; x=${state.position.x.toFixed(2)}, y=${state.position.y.toFixed(2)}, keyboardStep=${value}.`);
        }, { keyboardStep: value }); cleaners.push(() => interaction.dispose());
        button(text('Annuler le geste actif', 'Cancel the active gesture', 'Cancelar el gesto activo'), () => { const pointerId = interaction.snapshot().pointerId; if (pointerId !== null) area.dispatchEvent(Object.assign(new Event('pointercancel'), { pointerId })); else notice(text('Aucun geste actif à annuler.', 'No active gesture to cancel.', 'No hay gesto activo que cancelar.')); });
        notice(text('Glissez ou utilisez les flèches. Échap interrompt une capture active.', 'Drag or use arrow keys. Escape interrupts active capture.', 'Arrastre o use las flechas. Escape interrumpe la captura activa.'));
      } else if (moduleId === 2) {
        const prefix = value === 0 ? text('Mon observation : ', 'My observation: ', 'Mi observación: ') : text('Ma décision expliquée : ', 'My explained decision: ', 'Mi decisión explicada: ');
        const cards = createCards(cardsRoot(), items(), (id: string) => { cards.select(id); put(text(`Carte ${id}; seul le préfixe de description est changé.`, `Card ${id}; only the description prefix changed.`, `Tarjeta ${id}; solo cambió el prefijo de descripción.`)); }, { descriptionPrefix: prefix }); cleaners.push(() => cards.dispose());
        notice(text('La structure vient du composant Astro, le choix du contrôleur JavaScript.', 'Structure comes from the Astro component; selection from the JavaScript controller.', 'La estructura viene del componente Astro; la selección del controlador JavaScript.'));
      } else if (moduleId === 3) {
        const area = surface(), definitions = items(); let cards: ReturnType<typeof createCards>;
        const select = (id: string) => { cards.select(id); put(text(`Sélection ${id}, caméra à ${value}; identifiant conservé.`, `Selection ${id}, camera at ${value}; stable identifier.`, `Selección ${id}, cámara a ${value}; identificador conservado.`)); };
        const scene = createSceneController({ container: area, THREE, items: definitions, onSelect: select, options: { cameraDistance: value } });
        cards = createCards(cardsRoot(), definitions, select); cleaners.push(() => cards.dispose(), () => scene.dispose());
        step = () => scene.render();
        notice(scene.available ? text('Scène Three.js réelle; la liste HTML donne les mêmes sélections.', 'Actual Three.js scene; the HTML list offers the same selections.', 'Escena Three.js real; la lista HTML ofrece las mismas selecciones.') : text('WebGL indisponible; utilisez la liste HTML.', 'WebGL unavailable; use the HTML list.', 'WebGL no disponible; use la lista HTML.'));
      } else if (moduleId === 4) {
        const area = surface(), dot = marker(area), motion = createInertia({ damping: value, restitution: .9 });
        const control = createInteraction(area, (state: any) => {
          if (frozen) return; const now = performance.now() / 1000;
          if (state.lastEvent === 'pointerdown') motion.grab(state.position, now);
          else if (state.lastEvent === 'pointermove') motion.move(state.position, now);
          else if (state.lastEvent === 'pointerup') { motion.release(now); const p = motion.snapshot(); put(`pointerup; damping=${value}, restitution=0.9, vx=${p.vx.toFixed(2)}, vy=${p.vy.toFixed(2)}; dt en secondes / seconds / segundos.`); }
          else if (state.lastEvent === 'pointercancel') motion.cancel(); else motion.setPosition(state.position);
        });
        cleaners.push(() => control.dispose(), () => motion.dispose());
        motionChanged = (paused) => { if (paused && motion.snapshot().held) motion.cancel(); };
        step = (dt) => { const p = motion.step(dt, frozen); dot.draw(p); live.textContent = `x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}, vx=${p.vx.toFixed(2)}, vy=${p.vy.toFixed(2)}`; };
        notice(text('Lancer, glisser et rebondir; le survol ne reprend pas le geste.', 'Throw, coast and bounce; hovering does not resume the gesture.', 'Lanzar, deslizar y rebotar; pasar el puntero no reinicia el gesto.'));
      } else if (moduleId === 5) {
        const area = surface(), dot = marker(area), transition = createTransition({ stiffness: 36, damping: value }); dot.draw({ x: .5, y: .5 }); let expanded = false;
        button(text('Changer la cible', 'Change the target', 'Cambiar el objetivo'), () => { expanded = !expanded; transition.setTarget(expanded ? 1.5 : 1); put(text(`Cible ${expanded ? 1.5 : 1}; stiffness=36, damping=${value}. Observez le dépassement.`, `Target ${expanded ? 1.5 : 1}; stiffness=36, damping=${value}. Observe overshoot.`, `Objetivo ${expanded ? 1.5 : 1}; stiffness=36, damping=${value}. Observe el sobrepaso.`)); });
        step = (dt) => { const scale = transition.step(dt, frozen); dot.element.style.width = dot.element.style.height = `${22 * scale}px`; live.textContent = `valeur / value / valor = ${scale.toFixed(3)}`; }; cleaners.push(() => transition.dispose());
      } else if (moduleId === 6) {
        const area = surface(), canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 260; canvas.style.width = '100%'; canvas.style.height = '100%'; area.append(canvas);
        const context = canvas.getContext('2d'), particles = createParticleLayer({ count: value, lifetime: 3, seed: 17 }); cleaners.push(() => particles.dispose());
        step = (dt) => { const values = particles.step(dt, frozen); if (context) { context.clearRect(0, 0, 600, 260); context.fillStyle = '#ffa234'; for (const point of values) { context.beginPath(); context.arc(point.x * 600, point.y * 260, 2, 0, Math.PI * 2); context.fill(); } } live.textContent = `${values.length} particules / particles / partículas`; };
        put(text(`${value} particules, lifetime=3, seed=17. Aperçu Canvas; ce n’est pas une mesure Three.js.`, `${value} particles, lifetime=3, seed=17. Canvas preview; not a Three.js measurement.`, `${value} partículas, lifetime=3, seed=17. Vista Canvas; no es una medición Three.js.`));
      } else if (moduleId === 7) {
        const flow = createInteractionFlow({ host: null, options: { historyLimit: value }, onChange: (state: any) => { live.textContent = `${state.view}; ${state.entries.length}/${value}`; } });
        for (const view of ['mission', 'experience', 'proofs', 'summary']) button(view, () => { const state = flow.navigate(view, 'element-1'); put(JSON.stringify({ view: state.view, history: state.entries, authority: 'observed internal history; browser navigation is separately tested' })); });
        step = (dt) => { flow.setStatic(frozen); flow.step(dt); }; cleaners.push(() => flow.dispose());
        notice(text('Historique interne de la démonstration; il ne déplace pas votre dossier.', 'Internal demonstration history; it does not navigate your dossier.', 'Historial interno de la demostración; no navega su expediente.'));
      } else {
        const prepared = { kind: 'prepared-example-not-a-live-call', tool: 'student_get_learning_snapshot', expectedRevision: 2, currentRevision: 3, canRead: false, claimedState: 'READY', claimedHumanApproval: true, snapshotLimit: value };
        const block = document.createElement('pre'); block.style.whiteSpace = 'pre-wrap'; block.textContent = JSON.stringify(prepared, null, 2); content.append(block);
        button(text('Examiner les contrôles', 'Inspect the checks', 'Examinar los controles'), () => put(text('Trace préparée : permission absente, révision périmée; READY et approbation humaine non établis. Aucun vrai appel ni moteur n’a été exécuté.', 'Prepared trace: missing permission, stale revision; READY and human approval are not established. No actual call or engine ran.', 'Traza preparada: falta permiso, revisión obsoleta; READY y aprobación humana no demostrados. No se ejecutó ninguna llamada real ni motor.')));
        notice(text('Exercice de lecture de trace. Les 25 vrais outils restent ceux de la page.', 'Trace-reading exercise. The page provides the 25 actual tools.', 'Ejercicio de lectura de trazas. Los 25 instrumentos reales pertenecen a la página.'));
      }
      started = true; step(0); if (animated && !frozen && !document.hidden) frame = requestAnimationFrame(tick);
    } catch (error) { stopActive(); notice(error instanceof Error ? error.message : text('Essai indisponible.', 'Experiment unavailable.', 'Prueba no disponible.')); }
  };
  run.addEventListener('click', start, { signal: lifetime.signal });
  restore.addEventListener('click', () => { parameter.value = String(config.initial); parameter.dispatchEvent(new Event('input', { bubbles: true })); start(); }, { signal: lifetime.signal });
  const refreshMotion = () => { frozen = readPreferences().motion === 'static'; cancelAnimationFrame(frame); last = 0; motionChanged(frozen); step(0); if (animated && started && !frozen && !document.hidden && !stopped) frame = requestAnimationFrame(tick); };
  window.addEventListener('orbit:preferences-change', refreshMotion, { signal: lifetime.signal });
  document.addEventListener('visibilitychange', refreshMotion, { signal: lifetime.signal });
  return () => { if (stopped) return; stopped = true; lifetime.abort(); stopActive(); stage.replaceChildren(); Object.assign(stage.style, previousStyle); };
}
