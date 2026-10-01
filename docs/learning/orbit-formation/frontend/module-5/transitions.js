export const transitionOptions = { stiffness: 36, damping: 12 }; // STUDENT: compare damping 12 and 5.
export function createTransition(options = transitionOptions) {
  if (!(options.stiffness > 0 && options.stiffness <= 100 && options.damping >= 0 && options.damping <= 30)) throw new Error('Spring parameters outside the learning limits.');
  let value = 1, velocity = 0, target = 1;
  return { snapshot: () => ({ value, velocity, target }),
    setTarget(next) { if (!Number.isFinite(next) || next < 0.5 || next > 2) throw new Error('Target outside learning limits.'); target = next; },
    step(dt, isStatic = false) {
      if (isStatic || !Number.isFinite(dt) || dt <= 0) return value;
      const bounded = Math.min(dt, 0.05); const steps = Math.ceil(bounded * 120); const h = bounded / steps;
      for (let index = 0; index < steps; index++) { velocity += (options.stiffness * (target - value) - options.damping * velocity) * h; value += velocity * h; }
      return value;
    }, dispose() { velocity = 0; }
  };
}
