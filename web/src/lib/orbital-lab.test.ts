import { afterEach, describe, expect, it, vi } from 'vitest'

const { renderSpy } = vi.hoisted(() => ({ renderSpy: vi.fn() }))

vi.mock('three', () => {
  class Geometry { dispose(): void {} }
  class Material { dispose(): void {} }
  class Mesh {
    position = { set: vi.fn() }
    rotation = { y: 0 }
    constructor(public geometry: Geometry, public material: Material) {}
  }

  return {
    AmbientLight: class {},
    BoxGeometry: Geometry,
    Mesh,
    MeshStandardMaterial: Material,
    PerspectiveCamera: class {
      aspect = 1
      position = { set: vi.fn() }
      lookAt(): void {}
      updateProjectionMatrix(): void {}
    },
    Scene: class { add(): void {} },
    SphereGeometry: Geometry,
    WebGLRenderer: class {
      dispose(): void {}
      render = renderSpy
      setSize(): void {}
    },
  }
})

import { mountOrbitalLab } from './orbital-lab'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('orbital lab visibility handling', () => {
  it('does not simulate or render while hidden and resumes without hidden elapsed time', () => {
    let now = 0
    let scheduledFrame: ((timestamp: number) => void) | undefined
    const documentListeners = new Map<string, () => void>()
    const fakeDocument = {
      hidden: false,
      addEventListener: vi.fn((type: string, listener: () => void) => documentListeners.set(type, listener)),
      removeEventListener: vi.fn((type: string) => documentListeners.delete(type)),
    }
    vi.stubGlobal('document', fakeDocument)
    vi.stubGlobal('performance', { now: () => now })
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: (timestamp: number) => void) => {
      scheduledFrame = callback
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('ResizeObserver', class { observe(): void {}; disconnect(): void {} })
    vi.stubGlobal('localStorage', { getItem: () => null, removeItem: vi.fn(), setItem: vi.fn() })
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      matchMedia: () => ({ matches: false }),
    })

    const button = () => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setAttribute: vi.fn(),
      textContent: '',
    })
    const telemetry = { textContent: '' }
    const dispose = mountOrbitalLab({
      canvas: { clientHeight: 300, clientWidth: 600, hidden: false },
      status: { textContent: '' },
      altitudeInput: { value: '400' },
      speedInput: { value: '1' },
      pauseButton: button(),
      resetButton: button(),
      telemetry,
      textAlternative: { textContent: '' },
    } as unknown as Parameters<typeof mountOrbitalLab>[0])

    expect(renderSpy).toHaveBeenCalledTimes(1)
    fakeDocument.hidden = true
    scheduledFrame?.(1_000)
    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(telemetry.textContent).toContain('elapsed 0 s')

    now = 10_000
    fakeDocument.hidden = false
    documentListeners.get('visibilitychange')?.()
    scheduledFrame?.(10_016)
    expect(renderSpy).toHaveBeenCalledTimes(2)
    expect(telemetry.textContent).toContain('elapsed 0 s')

    dispose()
  })
})
