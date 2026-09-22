import { describe, expect, it } from 'vitest'
import { FixedStepOrbitLoop, createOrbitState } from './orbital-simulation'

describe('FixedStepOrbitLoop terminal states', () => {
  it('constructs a terminal surface state without attempting to advance it', () => {
    const state = createOrbitState(0)

    expect(state.disposition).toBe('COLLIDED')
    expect(new FixedStepOrbitLoop(state).tick(1)).toBe(state)
  })

  it('stops stepping and clears queued time after a collision', () => {
    const loop = new FixedStepOrbitLoop(createOrbitState(1, 0), 2, 20, 1)

    const terminal = loop.tick(20)

    expect(terminal.disposition).toBe('COLLIDED')
    expect(terminal.elapsedSeconds).toBe(2)
    expect((loop as unknown as { accumulatorSeconds: number }).accumulatorSeconds).toBe(0)
    expect(loop.tick(20)).toBe(terminal)
    expect((loop as unknown as { accumulatorSeconds: number }).accumulatorSeconds).toBe(0)
  })

  it('does not accumulate time for an already-terminal state', () => {
    const source = new FixedStepOrbitLoop(createOrbitState(1, 0), 2, 20, 1)
    const terminal = source.tick(20)
    const loop = new FixedStepOrbitLoop(terminal, 2, 20, 1)

    expect(loop.tick(20)).toBe(terminal)
    expect((loop as unknown as { accumulatorSeconds: number }).accumulatorSeconds).toBe(0)
  })
})
