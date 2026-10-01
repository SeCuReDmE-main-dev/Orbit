export const inertiaOptions = { damping: 0.65, restitution: 0.9 }; // STUDENT: change only damping first.
export function createInertia(options = inertiaOptions) {
  if (!(options.damping >= 0 && options.damping <= 10 && options.restitution >= 0 && options.restitution <= 1)) throw new Error('Invalid bounded motion parameter.');
  let state = { x: 0.5, y: 0.5, vx: 0, vy: 0, held: false }; let sample;
  const checkPosition = (position) => { if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || position.x < 0 || position.x > 1 || position.y < 0 || position.y > 1) throw new Error('Position outside normalized coordinates.'); };
  const snapshot = () => ({ ...state });
  return { snapshot,
    grab(position, nowSeconds) { checkPosition(position); state = { ...state, ...position, vx: 0, vy: 0, held: true }; sample = { ...position, time: nowSeconds }; },
    move(position, nowSeconds) {
      if (!state.held) return;
      checkPosition(position);
      const dt = nowSeconds - sample.time;
      if (dt > 0) { state.vx = Math.max(-3, Math.min(3, (position.x - sample.x) / dt)); state.vy = Math.max(-3, Math.min(3, (position.y - sample.y) / dt)); }
      state.x = position.x; state.y = position.y; sample = { ...position, time: nowSeconds };
    },
    release(nowSeconds) { if (sample && nowSeconds - sample.time > 0.12) state.vx = state.vy = 0; state.held = false; },
    cancel() { state.held = false; state.vx = state.vy = 0; },
    setPosition(position) { checkPosition(position); state.x = position.x; state.y = position.y; state.vx = state.vy = 0; },
    step(dt, isStatic = false) {
      if (isStatic || state.held || !Number.isFinite(dt) || dt <= 0) return snapshot();
      dt = Math.min(dt, 0.05); const decay = Math.exp(-options.damping * dt);
      const displacement = options.damping ? (1 - decay) / options.damping : dt;
      state.x += state.vx * displacement; state.y += state.vy * displacement; state.vx *= decay; state.vy *= decay;
      for (const [position, velocity] of [['x', 'vx'], ['y', 'vy']]) {
        if (state[position] < 0) { state[position] = -state[position]; state[velocity] = Math.abs(state[velocity]) * options.restitution; }
        if (state[position] > 1) { state[position] = 2 - state[position]; state[velocity] = -Math.abs(state[velocity]) * options.restitution; }
        state[position] = Math.max(0, Math.min(1, state[position]));
      }
      return snapshot();
    }, dispose() { sample = undefined; state.vx = state.vy = 0; state.held = false; }
  };
}
