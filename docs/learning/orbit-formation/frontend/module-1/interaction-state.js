/** Module 1: input changes state; rendering is supplied by the host. */
export const interactionOptions = { keyboardStep: 0.04 }; // STUDENT: compare 0.04 and 0.08.
export function createInteraction(element, onChange, options = interactionOptions) {
  if (!(options.keyboardStep > 0 && options.keyboardStep <= 0.25)) throw new Error('Keyboard step outside the learning limits.');
  const lifetime = new AbortController();
  let state = { id: 'element-1', phase: 'idle', position: { x: 0.5, y: 0.5 }, lastEvent: 'ready', pointerId: null };
  const copy = () => ({ ...state, position: { ...state.position } });
  const publish = (event) => { state.lastEvent = event; onChange(copy()); };
  const position = (event) => {
    const rect = element.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height))) };
  };
  const listen = (name, run) => element.addEventListener(name, run, { signal: lifetime.signal });
  listen('pointerdown', (event) => {
    if (event.button !== 0 || state.pointerId !== null) return;
    // Native buttons remain clickable. The host can put them outside this area.
    if (event.target.closest?.('a,button,input,select,textarea')) return;
    state = { ...state, phase: 'held', pointerId: event.pointerId, position: position(event) };
    element.setPointerCapture(event.pointerId); element.focus({ preventScroll: true }); publish('pointerdown');
  });
  listen('pointermove', (event) => {
    if (state.pointerId !== event.pointerId) return; // Crossing an airborne item does not stop it.
    state.position = position(event); publish('pointermove');
  });
  const finish = (event, cancelled) => {
    if (state.pointerId !== event.pointerId) return;
    const pointerId = state.pointerId;
    state.phase = cancelled ? 'cancelled' : 'released'; state.pointerId = null;
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    publish(cancelled ? 'pointercancel' : 'pointerup');
  };
  listen('pointerup', (event) => finish(event, false));
  listen('pointercancel', (event) => finish(event, true));
  listen('lostpointercapture', (event) => finish(event, true));
  listen('keydown', (event) => {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (directions[event.key]) {
      event.preventDefault(); const [dx, dy] = directions[event.key];
      state.position = { x: Math.max(0, Math.min(1, state.position.x + dx * options.keyboardStep)),
        y: Math.max(0, Math.min(1, state.position.y + dy * options.keyboardStep)) };
      state.phase = 'keyboard'; publish(event.key);
    } else if (event.key === 'Escape') {
      if (state.pointerId !== null) finish({ pointerId: state.pointerId }, true);
    }
  });
  return { snapshot: copy, dispose() { lifetime.abort(); if (state.pointerId !== null && element.hasPointerCapture(state.pointerId)) element.releasePointerCapture(state.pointerId); state.pointerId = null; } };
}
