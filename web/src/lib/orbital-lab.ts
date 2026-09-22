import * as THREE from 'three'
import { FixedStepOrbitLoop } from './orbital-simulation'

export function mountOrbitalLab(canvas: HTMLCanvasElement, status: HTMLElement): () => void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 3, 7)
  camera.lookAt(0, 0, 0)
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 32), new THREE.MeshStandardMaterial({ color: 0x1d78c9, roughness: 0.8 }))
  const satellite = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.45), new THREE.MeshStandardMaterial({ color: 0xf2d269 }))
  scene.add(earth, satellite, new THREE.AmbientLight(0xffffff, 1.5))
  const loop = new FixedStepOrbitLoop()
  let previous = performance.now()
  let animationFrame = 0
  let disposed = false

  const resize = () => {
    const width = Math.max(canvas.clientWidth, 1); const height = Math.max(canvas.clientHeight, 1)
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix()
  }
  const render = (now: number) => {
    if (disposed) return
    if (document.hidden) {
      previous = now
      animationFrame = requestAnimationFrame(render)
      return
    }
    const state = loop.tick((now - previous) / 1000); previous = now
    satellite.position.set(Math.cos(state.angle) * 2.5, 0.35, Math.sin(state.angle) * 2.5)
    satellite.rotation.y = -state.angle
    renderer.render(scene, camera)
    animationFrame = requestAnimationFrame(render)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  resize()
  status.textContent = 'Local fixed-step visual; no model calls.'
  animationFrame = requestAnimationFrame(render)

  const dispose = () => {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(animationFrame)
    resizeObserver.disconnect()
    earth.geometry.dispose(); (earth.material as THREE.Material).dispose()
    satellite.geometry.dispose(); (satellite.material as THREE.Material).dispose()
    renderer.dispose()
  }
  window.addEventListener('pagehide', dispose, { once: true })
  return dispose
}
