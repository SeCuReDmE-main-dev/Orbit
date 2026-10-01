export const particleOptions = { count: 64, lifetime: 3, seed: 17 }; // STUDENT: compare count 64 and 128, then restore.
export function createParticleLayer(options = particleOptions) {
  if (!Number.isInteger(options.count) || options.count < 0 || options.count > 256 || !Number.isFinite(options.lifetime) || options.lifetime < 0.2 || options.lifetime > 10) throw new Error('Particles outside the learning budget.');
  let seed = options.seed >>> 0; const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const particles = Array.from({ length: options.count }, () => ({ x: random(), y: random(), vx: (random() - 0.5) * 0.08, vy: (random() - 0.5) * 0.08, age: random() * options.lifetime }));
  let disposed = false;
  return { snapshot: () => particles.map((value) => ({ ...value })),
    step(dt, isStatic = false) {
      if (disposed || isStatic || !Number.isFinite(dt) || dt <= 0) return particles;
      dt = Math.min(dt, 0.05);
      for (const particle of particles) { particle.age += dt; particle.x = (particle.x + particle.vx * dt + 1) % 1; particle.y = (particle.y + particle.vy * dt + 1) % 1; if (particle.age >= options.lifetime) { particle.age = 0; particle.x = random(); particle.y = random(); } }
      return particles;
    }, dispose() { disposed = true; particles.length = 0; }
  };
}
