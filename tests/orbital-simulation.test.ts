import { describe, expect, it } from 'vitest'
import {
  EARTH_REFERENCE,
  FixedStepOrbitLoop,
  advanceNewtonianOrbit,
  circularSpeed,
  createOrbitState,
  magnitude,
  restoreOrbitState,
  serializeOrbitState,
  specificOrbitalEnergy,
} from '../web/src/lib/orbital-simulation'

describe('fixed-step Newtonian orbital simulation', () => {
  it('matches the circular reference at 400 km', () => {
    const radius = EARTH_REFERENCE.earthRadiusMeters + 400_000
    expect(circularSpeed(radius)).toBeCloseTo(7_672.594, 2)
    const period = 2 * Math.PI * Math.sqrt(radius ** 3 / EARTH_REFERENCE.gravitationalParameter)
    expect(period / 60).toBeCloseTo(92.414, 2)
  })

  it('keeps a circular reference bounded for one orbit', () => {
    const initial = createOrbitState(400_000)
    const initialEnergy = specificOrbitalEnergy(initial)
    const period = 2 * Math.PI * Math.sqrt(magnitude(initial.positionMeters) ** 3 / EARTH_REFERENCE.gravitationalParameter)
    let state = initial
    for (let elapsed = 0; elapsed < period; elapsed += 2) state = advanceNewtonianOrbit(state, Math.min(2, period - elapsed))
    expect(state.disposition).toBe('ORBITING')
    expect(Math.abs(magnitude(state.positionMeters) - magnitude(initial.positionMeters))).toBeLessThan(100)
    expect(Math.abs((specificOrbitalEnergy(state) - initialEnergy) / initialEnergy)).toBeLessThan(1e-8)
  })

  it('is deterministic across different display frame sizes', () => {
    const initial = createOrbitState()
    const a = new FixedStepOrbitLoop(initial, 2, 1, 20)
    const b = new FixedStepOrbitLoop(initial, 2, 1, 20)
    a.tick(0.6)
    for (let index = 0; index < 6; index += 1) b.tick(0.1)
    expect(a.snapshot().elapsedSeconds).toBe(b.snapshot().elapsedSeconds)
    expect(a.snapshot().positionMeters.x).toBeCloseTo(b.snapshot().positionMeters.x, 8)
    expect(a.snapshot().positionMeters.y).toBeCloseTo(b.snapshot().positionMeters.y, 8)
  })

  it('detects collision and escape and preserves a versioned snapshot', () => {
    expect(advanceNewtonianOrbit(createOrbitState(1, 0), 2).disposition).toBe('COLLIDED')
    let state = createOrbitState(400_000, 2)
    for (let index = 0; index < 25_000 && state.disposition === 'ORBITING'; index += 1) state = advanceNewtonianOrbit(state, 10)
    expect(state.disposition).toBe('ESCAPED')
    expect(restoreOrbitState(serializeOrbitState(state))).toEqual(state)
    expect(() => restoreOrbitState('{"schemaVersion":2}')).toThrow('Invalid orbital state')
    expect(() => restoreOrbitState(JSON.stringify({
      schemaVersion: 1,
      positionMeters: { x: 0, y: 0 },
      velocityMetersPerSecond: { x: 0, y: 0 },
      elapsedSeconds: 0,
      disposition: 'ORBITING',
    }))).toThrow('Invalid orbital state')
    expect(() => restoreOrbitState(JSON.stringify({
      schemaVersion: 1,
      positionMeters: { x: EARTH_REFERENCE.earthRadiusMeters + 1, y: 0 },
      velocityMetersPerSecond: { x: 0, y: 0 },
      elapsedSeconds: -1,
      disposition: 'ORBITING',
    }))).toThrow('Invalid orbital state')
  })
})
