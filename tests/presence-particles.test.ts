import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { samplePresenceSurface } from '../packages/synthia-presence/src/particles';

describe('particle surface derived from real geometry', () => {
  it('accepts a GLB mixing relative morph targets and unrigged armour', () => {
    const root=new THREE.Group();
    const face=new THREE.Mesh(new THREE.SphereGeometry(.5,12,8));
    face.geometry.morphTargetsRelative=true;
    face.geometry.morphAttributes.position=[face.geometry.getAttribute('position').clone()];
    const armour=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
    root.add(face,armour);
    const cloud=samplePresenceSurface(root,200);
    expect(cloud.getAttribute('position').count).toBe(200);
    expect(face.geometry.morphTargetsRelative).toBe(true);
    expect(face.geometry.morphAttributes.position).toHaveLength(1);
    cloud.dispose();
    for(const mesh of [face,armour]){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}
  });
  it('samples the transformed surface and keeps normals finite', () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    mesh.position.set(4, 2, -3); root.add(mesh);
    const cloud = samplePresenceSurface(root, 1200);
    const positions = cloud.getAttribute('position'), normals = cloud.getAttribute('normal');
    for (let i = 0; i < positions.count; i++) {
      const x=positions.getX(i)-4, y=positions.getY(i)-2, z=positions.getZ(i)+3;
      expect(Math.max(Math.abs(x),Math.abs(y),Math.abs(z))).toBeCloseTo(1, 5);
      expect(Math.hypot(normals.getX(i),normals.getY(i),normals.getZ(i))).toBeCloseTo(1, 5);
    }
    cloud.dispose(); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
  });
  it('is repeatable, bounded and rejects missing geometry', () => {
    const root=new THREE.Group();
    expect(()=>samplePresenceSurface(root,500)).toThrow('No surface');
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,8)); root.add(mesh);
    const a=samplePresenceSurface(root,500), b=samplePresenceSurface(root,500);
    expect(a.getAttribute('position').array).toEqual(b.getAttribute('position').array);
    const bounded=samplePresenceSurface(root,50000);
    expect(bounded.getAttribute('position').count).toBe(32000);
    for(const geometry of [a,b,bounded,mesh.geometry])geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
});
