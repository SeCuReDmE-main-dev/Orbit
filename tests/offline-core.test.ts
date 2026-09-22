import { describe, expect, it } from 'vitest'
import { normalizeLink, normalizeLinks, scheduleBounded } from '@orbit/core'

describe('offline deterministic utilities', () => {
  it('keeps a bounded, stable task order', () => {
    const tasks = [
      { id: 'zeta', priority: 1, depth: 0 },
      { id: 'alpha', priority: 3, depth: 1 },
      { id: 'beta', priority: 3, depth: 1 },
      { id: 'too-deep', priority: 99, depth: 3 },
      ...Array.from({ length: 10 }, (_, index) => ({ id: `task-${index}`, priority: 2, depth: 2 })),
    ]
    expect(scheduleBounded(tasks).map(({ id }) => id)).toEqual(['alpha', 'beta', 'task-0', 'task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6'])
  })

  it('normalizes safe fixture links and rejects non-web schemes', () => {
    expect(normalizeLink('HTTPS://Example.Test:443/path?z=2&utm_source=x&a=1#fragment')).toBe('https://example.test/path?a=1&z=2')
    expect(normalizeLink('file:///private/input')).toBeUndefined()
    expect(normalizeLinks(['https://example.test/a?fbclid=x', 'https://example.test/a', 'mailto:test@example.test'])).toEqual(['https://example.test/a'])
  })
})
