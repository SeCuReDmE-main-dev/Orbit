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
    if (saved) {
      initialState = restoreOrbitState(saved); restored = true
      const settings = JSON.parse(localStorage.getItem(`${STORAGE_KEY}.settings`) || 'null')
      if (settings && Number.isFinite(settings.altitude) && settings.altitude >= 1 && settings.altitude <= 50000 && Number.isFinite(settings.multiplier) && settings.multiplier >= 0 && settings.multiplier <= 2) {
        elements.altitudeInput.value = String(settings.altitude)
        elements.speedInput.value = String(settings.multiplier)
      }
    }
  } catch { /* A corrupt or inaccessible local snapshot must not prevent the lab. */ }
  const loop = new FixedStepOrbitLoop(initialState)
  let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let previous = performance.now()
  let animationFrame = 0
  let disposed = false
  let renderer: THREE.WebGLRenderer | undefined
  let inView = true
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x07111e)
  const displayScale = 2.5 / (EARTH_REFERENCE.earthRadiusMeters + 400_000)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 5, 9)
  camera.lookAt(0, 0, 0)
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_REFERENCE.earthRadiusMeters * displayScale, 64, 48), new THREE.MeshStandardMaterial({ color: 0x176587, roughness: 0.72, metalness: 0.15 }))
  const satellite = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.45), new THREE.MeshStandardMaterial({ color: 0xf2d269 }))
  const sunlight = new THREE.DirectionalLight(0xc9f5ff, 3)
  sunlight.position.set(-4, 5, 4)
  scene.add(earth, satellite, sunlight, new THREE.AmbientLight(0x577eae, 0.35))
  const grid = new THREE.Mesh(new THREE.SphereGeometry(EARTH_REFERENCE.earthRadiusMeters * displayScale * 1.002, 32, 16), new THREE.MeshBasicMaterial({ color: 0x71bac6, wireframe: true, transparent: true, opacity: 0.12 }))
  scene.add(grid)
  const trailPoints: THREE.Vector3[] = []
  const trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf5b041, transparent: true, opacity: 0.8 }))
  scene.add(trail)
  let lastTrailTime = -1
  const starsGeometry = new THREE.BufferGeometry()
  const starPositions = new Float32Array(180 * 3)
  for (let i = 0; i < 180; i++) {
    const angle = i * 2.399963229728653
    const z = 1 - 2 * (i + 0.5) / 180
    const r = Math.sqrt(1 - z * z)
    starPositions.set([15 * r * Math.cos(angle), 15 * z, 15 * r * Math.sin(angle)], i * 3)
  }
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0x9bbbd5, size: 0.035 }))
  scene.add(stars)
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
    satellite.position.set(state.positionMeters.x * displayScale, 0, state.positionMeters.y * displayScale)
    if (state.elapsedSeconds < lastTrailTime) { trailPoints.length = 0; lastTrailTime = -1 }
    if (state.elapsedSeconds - lastTrailTime >= 5 || lastTrailTime < 0) {
      trailPoints.push(satellite.position.clone())
      if (trailPoints.length > 720) trailPoints.shift()
      trail.geometry.dispose()
      trail.geometry = new THREE.BufferGeometry().setFromPoints(trailPoints)
      lastTrailTime = state.elapsedSeconds
    }
    satellite.rotation.y = -Math.atan2(state.positionMeters.y, state.positionMeters.x)
    const summary = `${state.disposition}; altitude ${Math.max(0, radius - EARTH_REFERENCE.earthRadiusMeters).toFixed(0)} m; speed ${speed.toFixed(1)} m/s; elapsed ${state.elapsedSeconds.toFixed(0)} s.`
    elements.telemetry.textContent = `${summary} Specific energy ${specificOrbitalEnergy(state).toExponential(4)} J/kg.`
    elements.textAlternative.textContent = summary
    elements.status.textContent = `${paused ? 'Paused' : 'Running'} at 60× simulated time${restored ? '; restored local checkpoint' : ''}.`
    if (!document.hidden) renderer?.render(scene, camera)
  }
  const render = (now: number) => {
    if (disposed) return
    if (document.hidden || !inView) {
      previous = now
      animationFrame = requestAnimationFrame(render)
      return
    }
    // A visibility callback can run after rAF's timestamp was sampled.
    if (!paused) loop.tick(Math.max(0, now - previous) / 1_000)
    previous = Math.max(previous, now)
    update(loop.snapshot())
    animationFrame = requestAnimationFrame(render)
  }
  const handleVisibilityChange = () => { previous = performance.now() }
  const reset = () => {
    const altitude = clamp(number(elements.altitudeInput.value), 1, 50_000) * 1_000
    const multiplier = clamp(number(elements.speedInput.value), 0, 2)
    loop.reset(createOrbitState(altitude, multiplier))
    restored = false
    trailPoints.length = 0; lastTrailTime = -1
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* Restricted storage does not block reset. */ }
    update(loop.snapshot())
  }
  const togglePause = () => {
    paused = !paused
    elements.pauseButton.textContent = paused ? 'Resume' : 'Pause'
    elements.pauseButton.setAttribute('aria-pressed', String(paused))
    previous = performance.now()
  }
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, serializeOrbitState(loop.snapshot())); localStorage.setItem(`${STORAGE_KEY}.settings`, JSON.stringify({ altitude: number(elements.altitudeInput.value), multiplier: number(elements.speedInput.value) })) } catch { /* local persistence is best effort */ }
  }
  const visibilityObserver = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? false; previous = performance.now() })
  visibilityObserver.observe(elements.canvas)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(elements.canvas)
  elements.altitudeInput.addEventListener('change', reset)
  elements.speedInput.addEventListener('change', reset)
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
    visibilityObserver.disconnect()
    elements.altitudeInput.removeEventListener('change', reset)
    elements.speedInput.removeEventListener('change', reset)
    elements.resetButton.removeEventListener('click', reset)
    elements.pauseButton.removeEventListener('click', togglePause)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    earth.geometry.dispose(); (earth.material as THREE.Material).dispose()
    satellite.geometry.dispose(); (satellite.material as THREE.Material).dispose()
    grid.geometry.dispose(); grid.material.dispose()
    trail.geometry.dispose(); trail.material.dispose()
    stars.geometry.dispose(); stars.material.dispose()
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
