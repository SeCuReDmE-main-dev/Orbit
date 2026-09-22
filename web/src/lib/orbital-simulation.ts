export type Vector2 = Readonly<{ x: number; y: number }>
export type OrbitDisposition = 'ORBITING' | 'COLLIDED' | 'ESCAPED'

export type OrbitConstants = Readonly<{
  gravitationalParameter: number
  earthRadiusMeters: number
  escapeRadiusMeters: number
}>

export type NewtonianOrbitState = Readonly<{
  positionMeters: Vector2
  velocityMetersPerSecond: Vector2
  elapsedSeconds: number
  disposition: OrbitDisposition
}>

export const EARTH_REFERENCE: OrbitConstants = Object.freeze({
  gravitationalParameter: 3.986e14,
  earthRadiusMeters: 6.371e6,
  escapeRadiusMeters: 1.5e8,
})

export function magnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y)
}

export function circularSpeed(radiusMeters: number, constants: OrbitConstants = EARTH_REFERENCE): number {
  if (!Number.isFinite(radiusMeters) || radiusMeters < constants.earthRadiusMeters) {
    throw new Error('Reference radius must be finite and at or above the Earth radius.')
  }
  return Math.sqrt(constants.gravitationalParameter / radiusMeters)
}

export function createOrbitState(
  altitudeMeters = 400_000,
  speedMultiplier = 1,
  constants: OrbitConstants = EARTH_REFERENCE,
): NewtonianOrbitState {
  if (!Number.isFinite(altitudeMeters) || altitudeMeters < 0) throw new Error('Altitude must be finite and non-negative.')
  if (!Number.isFinite(speedMultiplier) || speedMultiplier < 0) throw new Error('Speed multiplier must be finite and non-negative.')
  const radius = constants.earthRadiusMeters + altitudeMeters
  return Object.freeze({
    positionMeters: Object.freeze({ x: radius, y: 0 }),
    velocityMetersPerSecond: Object.freeze({ x: 0, y: circularSpeed(radius, constants) * speedMultiplier }),
    elapsedSeconds: 0,
    disposition: altitudeMeters === 0 ? 'COLLIDED' : 'ORBITING',
  })
}

export function acceleration(positionMeters: Vector2, constants: OrbitConstants = EARTH_REFERENCE): Vector2 {
  const radius = magnitude(positionMeters)
  if (!Number.isFinite(radius) || radius <= 0) throw new Error('Position must have a positive finite radius.')
  const factor = -constants.gravitationalParameter / (radius * radius * radius)
  return Object.freeze({ x: positionMeters.x * factor, y: positionMeters.y * factor })
}

/** Velocity-Verlet step for a point satellite around a fixed spherical Earth. */
export function advanceNewtonianOrbit(
  state: NewtonianOrbitState,
  seconds: number,
  constants: OrbitConstants = EARTH_REFERENCE,
): NewtonianOrbitState {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Step seconds must be finite and positive.')
  if (state.disposition !== 'ORBITING') return state
  const firstAcceleration = acceleration(state.positionMeters, constants)
  const nextPosition = Object.freeze({
    x: state.positionMeters.x + state.velocityMetersPerSecond.x * seconds + 0.5 * firstAcceleration.x * seconds * seconds,
    y: state.positionMeters.y + state.velocityMetersPerSecond.y * seconds + 0.5 * firstAcceleration.y * seconds * seconds,
  })
  const nextAcceleration = acceleration(nextPosition, constants)
  const nextVelocity = Object.freeze({
    x: state.velocityMetersPerSecond.x + 0.5 * (firstAcceleration.x + nextAcceleration.x) * seconds,
    y: state.velocityMetersPerSecond.y + 0.5 * (firstAcceleration.y + nextAcceleration.y) * seconds,
  })
  const candidate: NewtonianOrbitState = {
    positionMeters: nextPosition,
    velocityMetersPerSecond: nextVelocity,
    elapsedSeconds: state.elapsedSeconds + seconds,
    disposition: 'ORBITING',
  }
  const radius = magnitude(nextPosition)
  const radialVelocity = (nextPosition.x * nextVelocity.x + nextPosition.y * nextVelocity.y) / radius
  const disposition: OrbitDisposition = radius <= constants.earthRadiusMeters
    ? 'COLLIDED'
    : radius >= constants.escapeRadiusMeters && radialVelocity > 0 && specificOrbitalEnergy(candidate, constants) >= 0
      ? 'ESCAPED'
      : 'ORBITING'
  return Object.freeze({ ...candidate, disposition })
}

export function specificOrbitalEnergy(state: NewtonianOrbitState, constants: OrbitConstants = EARTH_REFERENCE): number {
  const speed = magnitude(state.velocityMetersPerSecond)
  return 0.5 * speed * speed - constants.gravitationalParameter / magnitude(state.positionMeters)
}

export function serializeOrbitState(state: NewtonianOrbitState): string {
  return JSON.stringify({ schemaVersion: 1, ...state })
}

export function restoreOrbitState(serialized: string): NewtonianOrbitState {
  const parsed: unknown = JSON.parse(serialized)
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid orbital state.')
  const value = parsed as Record<string, unknown>
  if (value.schemaVersion !== 1 || !isVector(value.positionMeters) || !isVector(value.velocityMetersPerSecond)
      || !isFiniteNumber(value.elapsedSeconds) || value.elapsedSeconds < 0
      || !['ORBITING', 'COLLIDED', 'ESCAPED'].includes(String(value.disposition))) {
    throw new Error('Invalid orbital state.')
  }
  const radius = magnitude(value.positionMeters)
  if (radius <= 0 || (value.disposition === 'ORBITING' && radius <= EARTH_REFERENCE.earthRadiusMeters)
      || (value.disposition === 'ESCAPED' && radius < EARTH_REFERENCE.escapeRadiusMeters)) {
    throw new Error('Invalid orbital state.')
  }
  return Object.freeze({
    positionMeters: Object.freeze({ ...value.positionMeters }),
    velocityMetersPerSecond: Object.freeze({ ...value.velocityMetersPerSecond }),
    elapsedSeconds: value.elapsedSeconds,
    disposition: value.disposition as OrbitDisposition,
  })
}

export class FixedStepOrbitLoop {
  private accumulatorSeconds = 0
  private state: NewtonianOrbitState
  readonly stepSeconds: number
  readonly maxFrameSeconds: number
  readonly timeScale: number

  constructor(
    initialState: NewtonianOrbitState = createOrbitState(),
    stepSeconds = 2,
    maxFrameSeconds = 0.25,
    timeScale = 60,
  ) {
    if (![stepSeconds, maxFrameSeconds, timeScale].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error('Step, frame limit and time scale must be finite and positive.')
    }
    this.state = initialState
    this.stepSeconds = stepSeconds
    this.maxFrameSeconds = maxFrameSeconds
    this.timeScale = timeScale
  }

  tick(frameSeconds: number): NewtonianOrbitState {
    if (!Number.isFinite(frameSeconds) || frameSeconds < 0) throw new Error('Frame seconds must be finite and non-negative.')
    if (this.state.disposition !== 'ORBITING') {
      this.accumulatorSeconds = 0
      return this.state
    }
    this.accumulatorSeconds += Math.min(frameSeconds, this.maxFrameSeconds) * this.timeScale
    while (this.accumulatorSeconds + Number.EPSILON * 16 >= this.stepSeconds && this.state.disposition === 'ORBITING') {
      this.state = advanceNewtonianOrbit(this.state, this.stepSeconds)
      this.accumulatorSeconds -= this.stepSeconds
    }
    if (this.state.disposition !== 'ORBITING') this.accumulatorSeconds = 0
    return this.state
  }

  snapshot(): NewtonianOrbitState { return this.state }
  reset(state: NewtonianOrbitState): void { this.state = state; this.accumulatorSeconds = 0 }
}

function isFiniteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) }
function isVector(value: unknown): value is Vector2 {
  if (!value || typeof value !== 'object') return false
  const vector = value as Record<string, unknown>
  return isFiniteNumber(vector.x) && isFiniteNumber(vector.y)
}
