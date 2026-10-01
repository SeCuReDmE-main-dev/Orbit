import * as THREE from 'three';

export type HologramUniforms = {
  uOrbitTime: { value: number };
  uOrbitMotion: { value: number };
  uOrbitActivity: { value: number };
};

/** Keep the expressive face readable; point coverage belongs mostly to the body. */
export function faceClarity(normalizedHeight: number): number {
  if (!Number.isFinite(normalizedHeight)) return 1;
  return THREE.MathUtils.smoothstep(normalizedHeight, -.30, -.05);
}

/** A rest-space attribute travels with the original skinned/morphed surface. */
export function prepareHologramGeometry(mesh: THREE.Mesh): void {
  const positions = mesh.geometry.getAttribute('position');
  const clarity = new Float32Array(positions.count), point = new THREE.Vector3();
  const preserve = /eye|iris|pupil|cornea|lid|lip/i.test(mesh.name);
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
    clarity[i] = preserve ? 1 : faceClarity(point.y);
  }
  mesh.geometry.setAttribute('orbitClarity', new THREE.BufferAttribute(clarity, 1));
}

/** Clone the original PBR material, retaining maps, morphing and skeletal animation. */
export function createHolographicMaterial(
  original: THREE.Material,
  uniforms: HologramUniforms,
): THREE.Material {
  const material = original.clone();
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;
  material.transparent = false;
  material.opacity = 1;
  material.depthWrite = true;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `attribute float orbitClarity;\nvarying float vOrbitClarity;\nvarying vec3 vOrbitSurface;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOrbitClarity = orbitClarity;\nvOrbitSurface = position;');
    shader.fragmentShader = `uniform float uOrbitTime;\nuniform float uOrbitMotion;\nuniform float uOrbitActivity;\nvarying float vOrbitClarity;\nvarying vec3 vOrbitSurface;\n${shader.fragmentShader}`
      .replace('#include <opaque_fragment>', `
        // Object-space stippling follows the surface without freezing the animation mixer.
        vec3 cell = floor(vOrbitSurface * 190.0);
        float grain = fract(sin(dot(cell, vec3(12.9898,78.233,37.719))) * 43758.5453);
        float coverage = mix(.91, 1.0, vOrbitClarity);
        if (grain > coverage) discard;
        float edge = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
        float pulse = .5 + .5 * sin(uOrbitTime * 1.1 * uOrbitMotion);
        vec3 accent = mix(vec3(.08,.54,.80), vec3(.55,.25,.90), pulse);
        outgoingLight += accent * edge * (.13 + .06 * uOrbitActivity);
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'orbit-holographic-pbr-v1';
  return material;
}
