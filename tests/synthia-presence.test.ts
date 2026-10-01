import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { validateGlb } from '../packages/synthia-presence/src/index'

function fixture(doc: unknown) {
  const json = JSON.stringify(doc), size = Math.ceil(json.length / 4) * 4
  const buffer = new ArrayBuffer(20 + size), view = new DataView(buffer)
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, buffer.byteLength, true)
  view.setUint32(12, size, true); view.setUint32(16, 0x4e4f534a, true)
  new Uint8Array(buffer, 20).fill(32); new Uint8Array(buffer, 20).set(new TextEncoder().encode(json))
  return buffer
}
describe('Portable Synthia asset boundary', () => {
  it('accepts the actual embedded model shipped for visual review', () => {
    const bytes = readFileSync('web/public/presence-review/orbit-study.glb')
    expect(() => validateGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))).not.toThrow()
  })
  it('rejects textures or buffers that could silently fetch another origin', () => {
    for (const key of ['images','buffers']) expect(() => validateGlb(fixture({asset:{version:'2.0'},[key]:[{uri:'https://example.org/track'}]}))).toThrow('embed')
  })
  it('rejects truncated data and oversized allocation requests', () => {
    expect(() => validateGlb(new ArrayBuffer(10))).toThrow('size')
    const bad = fixture({asset:{version:'2.0'}}); new DataView(bad).setUint32(12,0xffffffff,true)
    expect(() => validateGlb(bad)).toThrow('content')
  })
})
