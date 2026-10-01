import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createHolographicMaterial, faceClarity, prepareHologramGeometry } from '../packages/synthia-presence/src/holographic';

describe('readable holographic surface', () => {
  it('preserves face coverage and keeps shader injection compatible with morphing and skinning', () => {
    const texture = new THREE.Texture();
    const original = new THREE.MeshPhysicalMaterial({map:texture,metalness:.7,roughness:.3});
    const uniforms = {uOrbitTime:{value:0},uOrbitMotion:{value:1},uOrbitActivity:{value:0}};
    const material = createHolographicMaterial(original,uniforms) as THREE.MeshPhysicalMaterial;
    expect(material).not.toBe(original);
    expect(material.map).toBe(texture);
    expect(material.roughness).toBe(.3);
    expect(material.opacity).toBe(1);
    const shader = {vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader,uniforms:{}};
    material.onBeforeCompile(shader as never,{} as THREE.WebGLRenderer);
    expect(shader.vertexShader).toContain('#include <morphtarget_vertex>');
    expect(shader.vertexShader).toContain('#include <skinning_vertex>');
    expect(shader.fragmentShader).toContain('outgoingLight += accent');
    expect(shader.uniforms).toMatchObject(uniforms);
    expect(original.onBeforeCompile).not.toBe(material.onBeforeCompile);
    for(const item of [material,original,texture])item.dispose();
  });
  it('assigns clarity in the normalized rest space and protects eye geometry', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,-.5,0, 0,0,0, 0,.8,0],3));
    geometry.morphAttributes.position=[geometry.getAttribute('position').clone()];
    const mesh = new THREE.Mesh(geometry);
    mesh.updateMatrixWorld();prepareHologramGeometry(mesh);
    const mask=geometry.getAttribute('orbitClarity');
    expect(mask.getX(0)).toBe(0);expect(mask.getX(2)).toBe(1);
    expect(geometry.morphAttributes.position).toHaveLength(1);
    mesh.name='Orbit left iris';prepareHologramGeometry(mesh);
    expect([...geometry.getAttribute('orbitClarity').array]).toEqual([1,1,1]);
    expect(faceClarity(Number.NaN)).toBe(1);
    geometry.dispose();(mesh.material as THREE.Material).dispose();
  });
});
