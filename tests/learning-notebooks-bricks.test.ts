/** Execute in the Kaggle software-validation notebook, not as a model benchmark. */
import { describe, expect, it } from 'vitest';
import { createInteraction } from '../docs/learning/orbit-formation/frontend/module-1/interaction-state.js';
import { createSceneController } from '../docs/learning/orbit-formation/frontend/module-3/scene-controller.js';
import { createInertia } from '../docs/learning/orbit-formation/frontend/module-4/inertia.js';
import { createTransition } from '../docs/learning/orbit-formation/frontend/module-5/transitions.js';
import { createParticleLayer } from '../docs/learning/orbit-formation/frontend/module-6/particle-layer.js';
import { createInteractionFlow } from '../docs/learning/orbit-formation/frontend/module-7/interaction-flow.js';
import { registerLearningCapability } from '../docs/learning/orbit-formation/frontend/module-8/register-capabilities.js';

class InputSurface extends EventTarget {
  captured = new Set<number>();
  closest() { return null; }
  focus() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
  send(type: string, values: object = {}) { this.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), values)); }
}

describe('student gesture and scene boundaries', () => {
  it('continues outside a captured zone and cancels without leaving held state', () => {
    const surface = new InputSurface(), rows: any[] = [];
    const control = createInteraction(surface, (row: any) => rows.push(row));
    surface.send('pointerdown', { button: 0, pointerId: 1, clientX: 50, clientY: 50 });
    surface.send('pointermove', { pointerId: 1, clientX: 130, clientY: 20 });
    expect(control.snapshot()).toMatchObject({ phase: 'held', position: { x: 1, y: .2 } });
    surface.send('pointercancel', { pointerId: 1 });
    expect(control.snapshot()).toMatchObject({ phase: 'cancelled', pointerId: null });
    expect(surface.captured.size).toBe(0);
    const before = rows.length; control.dispose(); surface.send('keydown', { key: 'ArrowRight' });
    expect(rows.length).toBe(before);
  });
  it('provides keyboard movement, ignores an unrelated pointer and preserves release', () => {
    const surface = new InputSurface(); const control = createInteraction(surface, () => {});
    surface.send('keydown', { key: 'ArrowRight' }); expect(control.snapshot().position.x).toBeCloseTo(.54);
    surface.send('pointerdown', { button: 0, pointerId: 1, clientX: 20, clientY: 20 });
    surface.send('pointermove', { pointerId: 2, clientX: 80, clientY: 80 }); expect(control.snapshot().position.x).toBe(.2);
    surface.send('pointerup', { pointerId: 1 });
    surface.send('lostpointercapture', { pointerId: 1 }); expect(control.snapshot().phase).toBe('released');
    control.dispose();
  });
  it('keeps a usable HTML path when WebGL construction is unavailable', () => {
    const scene = createSceneController({ container: {}, THREE: { WebGLRenderer: class { constructor() { throw new Error('no GPU'); } } }, items: [], onSelect() {} });
    expect(scene.available).toBe(false); scene.render(); scene.setParticles([]); scene.dispose();
  });
});

describe('shared temporal contract', () => {
  const launched = () => { const value = createInertia(); value.grab({ x: .5, y: .5 }, 0); value.move({ x: .6, y: .5 }, .1); value.release(.1); return value; };
  it('moves after release; a passive crossing has no new input method', () => {
    const value = launched(); expect(value.step(.05).x).toBeGreaterThan(.6);
    expect(value.snapshot().held).toBe(false);
  });
  it('preserves the image in static mode and stops after cancellation', () => {
    const value = launched(); const before = value.snapshot(); expect(value.step(.05, true)).toEqual(before);
    value.cancel(); const cancelled = value.snapshot(); expect(value.step(.05)).toEqual(cancelled);
  });
  it('has comparable motion for two frame rates away from a collision', () => {
    const a = launched(), b = launched(); for (let i = 0; i < 4; i++) a.step(.025); for (let i = 0; i < 8; i++) b.step(.0125);
    expect(a.snapshot().x).toBeCloseTo(b.snapshot().x, 10); expect(a.snapshot().vx).toBeCloseTo(b.snapshot().vx, 10);
  });
  it('reflects the boundary and rejects invalid learning parameters', () => {
    const value = createInertia(); value.grab({ x: .9, y: .5 }, 0); value.move({ x: .99, y: .5 }, .03); value.release(.03);
    const after = value.step(.05); expect(after.x).toBeLessThan(1); expect(after.vx).toBeLessThan(0);
    expect(() => createInertia({ damping: -1, restitution: .9 })).toThrow();
    expect(() => value.setPosition({ x: NaN, y: .2 })).toThrow();
  });
  it('freezes a spring and converges to the requested bounded target', () => {
    const spring = createTransition(); spring.setTarget(1.5); const before = spring.snapshot(); spring.step(.05, true); expect(spring.snapshot()).toEqual(before);
    for (let index = 0; index < 200; index++) spring.step(.025); expect(spring.snapshot().value).toBeCloseTo(1.5, 4);
    expect(() => spring.setTarget(8)).toThrow(); spring.dispose();
  });
  it('bounds and deduplicates particle allocation through its lifetime', () => {
    const a = createParticleLayer(), b = createParticleLayer(); expect(a.snapshot()).toEqual(b.snapshot());
    const before = a.snapshot(); a.step(.04, true); expect(a.snapshot()).toEqual(before);
    for (let index = 0; index < 1000; index++) a.step(.04); expect(a.snapshot().length).toBe(64);
    expect(a.snapshot().every((row: any) => row.x >= 0 && row.x <= 1 && row.y >= 0 && row.y <= 1)).toBe(true);
    a.dispose(); a.step(.04); expect(a.snapshot()).toEqual([]);
    expect(() => createParticleLayer({ count: 10000, lifetime: 1, seed: 1 })).toThrow();
    expect(() => createParticleLayer({ count: 1, lifetime: NaN, seed: 1 })).toThrow();
  });
});

describe('navigation and agent authority', () => {
  it('bounds history independently of gesture and suspends the timeline', () => {
    const flow = createInteractionFlow({ host: null, options: { historyLimit: 4 } });
    for (let index = 0; index < 5; index++) flow.navigate(index % 2 ? 'mission' : 'proofs', 'element-2');
    expect(flow.snapshot().entries.length).toBe(4); flow.step(.04); flow.setStatic(true);
    const elapsed = flow.snapshot().elapsed; flow.step(.04); expect(flow.snapshot().elapsed).toBe(elapsed);
    expect(() => flow.navigate('unknown')).toThrow(); flow.dispose(); expect(flow.snapshot().entries.length).toBe(0);
  });
  it('reports unavailable WebMCP without making a simulated execution', async () => {
    const result = await registerLearningCapability({ root: {}, canRead: () => false, getRevision: () => 0, getSnapshot: () => ({}), modelContext: {} });
    expect(result.state).toBe('UNAVAILABLE'); result.dispose();
  });
  it('checks consent before the getter and rejects stale or excessive arguments', async () => {
    const registered: any[] = []; let shared = false, revision = 2, reads = 0;
    const result = await registerLearningCapability({ root: {}, canRead: () => shared, getRevision: () => revision,
      getSnapshot: () => { reads++; return { selection: 'element-1' }; }, modelContext: { registerTool: async (tool: any, options: any) => { registered.push({ tool, options }); } } });
    const tool = registered[0].tool;
    expect(await tool.execute({ expectedRevision: 2 })).toEqual({ state: 'CONSENT_REQUIRED' }); expect(reads).toBe(0);
    shared = true; expect(await tool.execute({ expectedRevision: 2 })).toMatchObject({ state: 'READY', revision: 2 });
    revision++; expect(await tool.execute({ expectedRevision: 2 })).toEqual({ state: 'STALE_REVISION' });
    await expect(tool.execute({ expectedRevision: 2, publish: true })).rejects.toThrow();
    result.dispose(); expect(registered[0].options.signal.aborted).toBe(true); expect(await tool.execute({ expectedRevision: 3 })).toEqual({ state: 'UNAVAILABLE' });
  });
  it('replaces an existing registration without leaving its old signal active', async () => {
    const root = {}, signals: AbortSignal[] = [];
    const options = { root, canRead: () => true, getRevision: () => 1, getSnapshot: () => ({}), modelContext: { registerTool: async (_tool: any, value: any) => { signals.push(value.signal); } } };
    const first = await registerLearningCapability(options), second = await registerLearningCapability(options);
    expect(signals[0].aborted).toBe(true); expect(signals[1].aborted).toBe(false);
    first.dispose(); expect(signals[1].aborted).toBe(false); second.dispose(); expect(signals[1].aborted).toBe(true);
  });
});
