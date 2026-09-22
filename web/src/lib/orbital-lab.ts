import * as THREE from 'three'
import {
  EARTH_REFERENCE,
  FixedStepOrbitLoop,
  circularSpeed,
  createOrbitState,
  magnitude,
  restoreOrbitState,
  serializeOrbitState,
  specificOrbitalEnergy,
  type NewtonianOrbitState,
} from './orbital-simulation'

const STORAGE_KEY = 'orbit-companion.physics.v1'

type LabElements = Readonly<{
  canvas: HTMLCanvasElement
  status: HTMLElement
  altitudeInput: HTMLInputElement
  speedInput: HTMLInputElement
  pauseButton: HTMLButtonElement
  resetButton: HTMLButtonElement
  telemetry: HTMLElement
  textAlternative: HTMLElement
}>

export function mountOrbitalLab(elements: LabElements): () => void {
  let restored = false
  let initialState = createOrbitState(number(elements.altitudeInput.value) * 1_000, number(elements.speedInput.value))
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) { initialState = restoreOrbitState(saved); restored = true }
  } catch { /* A corrupt or inaccessible local snapshot must not prevent the lab. */ }
  const loop = new FixedStepOrbitLoop(initialState)
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let previous = performance.now()
  let animationFrame = 0
  let disposed = false
  let renderer: THREE.WebGLRenderer | undefined
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 3, 7)
  camera.lookAt(0, 0, 0)
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 32), new THREE.MeshStandardMaterial({ color: 0x1d78c9, roughness: 0.8 }))
  const satellite = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.45), new THREE.MeshStandardMaterial({ color: 0xf2d269 }))
  scene.add(earth, satellite, new THREE.AmbientLight(0xffffff, 1.5))
  try { renderer = new THREE.WebGLRenderer({ canvas: elements.canvas, antialias: true }) } catch {
    elements.canvas.hidden = true
    elements.status.textContent = 'WebGL unavailable; the numerical view remains active.'
  }

  const resize = () => {
    if (!renderer) return
    const width = Math.max(elements.canvas.clientWidth, 1)
    const height = Math.max(elements.canvas.clientHeight, 1)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  const update = (state: NewtonianOrbitState) => {
    const radius = magnitude(state.positionMeters)
    const speed = magnitude(state.velocityMetersPerSecond)
    const scale = 2.5 / (EARTH_REFERENCE.earthRadiusMeters + 400_000)
    satellite.position.set(state.positionMeters.x * scale, 0.35, state.positionMeters.y * scale)
    satellite.rotation.y = -Math.atan2(state.positionMeters.y, state.positionMeters.x)
    const summary = `${state.disposition}; altitude ${Math.max(0, radius - EARTH_REFERENCE.earthRadiusMeters).toFixed(0)} m; speed ${speed.toFixed(1)} m/s; elapsed ${state.elapsedSeconds.toFixed(0)} s.`
    elements.telemetry.textContent = `${summary} Specific energy ${specificOrbitalEnergy(state).toExponential(4)} J/kg.`
    elements.textAlternative.textContent = summary
    elements.status.textContent = `${paused ? 'Paused' : 'Running'} at 60× simulated time${restored ? '; restored local checkpoint' : ''}.`
    if (!document.hidden) renderer?.render(scene, camera)
  }
  const render = (now: number) => {
    if (disposed) return
    if (document.hidden) {
      previous = now
      animationFrame = requestAnimationFrame(render)
      return
    }
    if (!paused) loop.tick((now - previous) / 1_000)
    previous = now
    update(loop.snapshot())
    animationFrame = requestAnimationFrame(render)
  }
  const handleVisibilityChange = () => { previous = performance.now() }
  const reset = () => {
    const altitude = clamp(number(elements.altitudeInput.value), 1, 50_000) * 1_000
    const multiplier = clamp(number(elements.speedInput.value), 0, 2)
    loop.reset(createOrbitState(altitude, multiplier))
    restored = false
    localStorage.removeItem(STORAGE_KEY)
    update(loop.snapshot())
  }
  const togglePause = () => {
    paused = !paused
    elements.pauseButton.textContent = paused ? 'Resume' : 'Pause'
    elements.pauseButton.setAttribute('aria-pressed', String(paused))
    previous = performance.now()
  }
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, serializeOrbitState(loop.snapshot())) } catch { /* local persistence is best effort */ }
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(elements.canvas)
  elements.resetButton.addEventListener('click', reset)
  elements.pauseButton.addEventListener('click', togglePause)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  elements.pauseButton.textContent = paused ? 'Resume' : 'Pause'
  elements.pauseButton.setAttribute('aria-pressed', String(paused))
  resize()
  update(loop.snapshot())
  animationFrame = requestAnimationFrame(render)

  const dispose = () => {
    if (disposed) return
    disposed = true
    save()
    cancelAnimationFrame(animationFrame)
    resizeObserver.disconnect()
    elements.resetButton.removeEventListener('click', reset)
    elements.pauseButton.removeEventListener('click', togglePause)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    earth.geometry.dispose(); (earth.material as THREE.Material).dispose()
    satellite.geometry.dispose(); (satellite.material as THREE.Material).dispose()
    renderer?.dispose()
  }
  window.addEventListener('pagehide', dispose, { once: true })
  return dispose
}

export function referenceTelemetry(altitudeKilometers: number): Readonly<{ speedMetersPerSecond: number; periodSeconds: number }> {
  const radius = EARTH_REFERENCE.earthRadiusMeters + altitudeKilometers * 1_000
  return Object.freeze({ speedMetersPerSecond: circularSpeed(radius), periodSeconds: 2 * Math.PI * Math.sqrt(radius ** 3 / EARTH_REFERENCE.gravitationalParameter) })
}

function number(value: string): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0 }
function clamp(value: number, minimum: number, maximum: number): number { return Math.min(maximum, Math.max(minimum, value)) }
