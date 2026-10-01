/** Bounded artistic displacement; it does not model atomic forces. */
export function pointerDisplacement(
  x: number, y: number, z: number,
  pointer: { x: number; y: number; z: number }, strength: number,
  out: [number,number,number] = [0,0,0],
): [number, number, number] {
  const dx = x - pointer.x, dy = y - pointer.y, dz = z - pointer.z;
  const distance2 = dx * dx + dy * dy + dz * dz * .3;
  const force = Math.exp(-distance2 / 1.35) * Math.max(0, Math.min(1, strength));
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  out[0]=dx / length * force * .85;out[1]=dy / length * force * .85;out[2]=force * .3;return out;
}
