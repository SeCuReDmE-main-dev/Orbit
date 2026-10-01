import { describe, expect, it } from 'vitest';
import { pointerDisplacement } from '../web/src/lib/atom-deformation';
describe('artistic pointer deformation', () => {
  it('pushes nearby geometry away and leaves distant geometry almost unchanged', () => {
    const pointer={x:0,y:0,z:0};
    expect(pointerDisplacement(.3,0,0,pointer,1)[0]).toBeGreaterThan(.5);
    expect(pointerDisplacement(-.3,0,0,pointer,1)[0]).toBeLessThan(-.5);
    expect(Math.hypot(...pointerDisplacement(8,0,0,pointer,1))).toBeLessThan(.00001);
  });
  it('restores the original geometry when the force fades', () => {
    expect(pointerDisplacement(.3,.1,0,{x:0,y:0,z:0},0)).toEqual([0,0,0]);
  });
  it('is finite at the pointer and bounds excessive input strength', () => {
    const center=pointerDisplacement(0,0,0,{x:0,y:0,z:0},10);
    expect(center.every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...center)).toBeLessThanOrEqual(1);
  });
});
