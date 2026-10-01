import { describe, expect, it } from 'vitest'
import { AssociationAuthority, ASSOCIATION_CODE_TTL_MS } from '@orbit/broker'

describe('local association authority', () => {
  it('binds a one-time code and revocable session to one extension origin', () => {
    let now = 100
    const authority = new AssociationAuthority('code', now, () => now)
    const session = authority.exchange('code', 'chrome-extension://abcdefghijklmnopabcdefghijklmnop')
    expect(authority.authorize(session, 'chrome-extension://abcdefghijklmnopabcdefghijklmnop', 'missions')).toBe(true)
    expect(authority.authorize(session, 'chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'missions')).toBe(false)
    expect(() => authority.exchange('code', 'chrome-extension://abcdefghijklmnopabcdefghijklmnop')).toThrow('already used')
    expect(authority.revoke(session)).toBe(true)
    expect(authority.authorize(session, 'chrome-extension://abcdefghijklmnopabcdefghijklmnop', 'missions')).toBe(false)
    now += ASSOCIATION_CODE_TTL_MS + 1
    expect(() => new AssociationAuthority('late', 100, () => now).exchange('late', 'chrome-extension://abcdefghijklmnopabcdefghijklmnop')).toThrow('invalid, expired, or already used')
  })
})
