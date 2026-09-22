import { describe, expect, it } from 'vitest'
import { FixedStepOrbitLoop, advanceOrbit } from '../web/src/lib/orbital-simulation'

describe('fixed-step orbital simulation', () => {
  it('advances deterministically across differently sized frames', () => {
    const a = new FixedStepOrbitLoop(0.1, 1)
    const b = new FixedStepOrbitLoop(0.1, 1)
    a.tick(0.3)
    b.tick(0.1); b.tick(0.1); b.tick(0.1)
    expect(a.tick(0).elapsedSeconds).toBeCloseTo(b.tick(0).elapsedSeconds, 8)
    expect(a.tick(0).angle).toBeCloseTo(b.tick(0).angle, 8)
  })

  it('caps a stalled frame and rejects invalid time', () => {
    const loop = new FixedStepOrbitLoop(0.1, 0.25)
    expect(loop.tick(4).elapsedSeconds).toBeCloseTo(0.2)
    expect(() => advanceOrbit({ angle: 0, elapsedSeconds: 0 }, -1)).toThrow('non-negative')
  })
})
