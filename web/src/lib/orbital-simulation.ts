export type OrbitState = Readonly<{ angle: number; elapsedSeconds: number }>

export function advanceOrbit(state: OrbitState, seconds: number, radiansPerSecond = 0.7): OrbitState {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Elapsed seconds must be finite and non-negative.')
  return Object.freeze({ angle: (state.angle + seconds * radiansPerSecond) % (Math.PI * 2), elapsedSeconds: state.elapsedSeconds + seconds })
}

export class FixedStepOrbitLoop {
  private accumulator = 0
  private state: OrbitState = Object.freeze({ angle: 0, elapsedSeconds: 0 })
  readonly stepSeconds: number
  readonly maxFrameSeconds: number

  constructor(stepSeconds = 1 / 60, maxFrameSeconds = 0.25) {
    if (stepSeconds <= 0 || maxFrameSeconds <= 0) throw new Error('Step and frame limits must be positive.')
    this.stepSeconds = stepSeconds
    this.maxFrameSeconds = maxFrameSeconds
  }

  tick(frameSeconds: number): OrbitState {
    if (!Number.isFinite(frameSeconds) || frameSeconds < 0) throw new Error('Frame seconds must be finite and non-negative.')
    this.accumulator += Math.min(frameSeconds, this.maxFrameSeconds)
    // Frame durations such as 0.3 cannot be represented exactly in binary floats.
    while (this.accumulator + Number.EPSILON * 16 >= this.stepSeconds) {
      this.state = advanceOrbit(this.state, this.stepSeconds)
      this.accumulator -= this.stepSeconds
    }
    return this.state
  }
}
