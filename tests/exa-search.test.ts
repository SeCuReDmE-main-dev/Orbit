import { describe, it, expect, vi } from 'vitest'
import { ExaSearch } from '../packages/providers/src/exa-search.js'
describe('Exa server-only boundary', () => {
  it('limits destinations and preserves discovered versus read', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ results: [
      { url: 'https://nasa.gov/page#one', title: 'NASA' }, { url: 'https://nasa.gov/page#two', title: 'NASA duplicate' },
      { url: 'https://evil.example/nasa.gov', title: 'outside' }, { url: 'https://user:secret@nasa.gov/', title: 'credentials' },
    ] })))
    const result = await new ExaSearch('fixture-key', request as typeof fetch).search('orbit', ['nasa.gov'])
    expect(result).toHaveLength(1); expect(result[0]).toMatchObject({ status: 'discovered', trust: 'untrusted' })
    const args = request.mock.calls[0] as unknown as [string, RequestInit]
    expect(args[0]).toBe('https://api.exa.ai/search'); expect(args[1].redirect).toBe('error')
    expect(JSON.parse(args[1].body as string)).not.toHaveProperty('contents')
  })
  it('does not call without configuration or a bounded domain scope', async () => {
    const request = vi.fn()
    await expect(new ExaSearch('', request).search('orbit', ['nasa.gov'])).rejects.toMatchObject({ code: 'UNCONFIGURED' })
    await expect(new ExaSearch('fixture', request).search('orbit', [])).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    expect(request).not.toHaveBeenCalled()
  })
  it('returns retry-after without retrying or leaking the response', async () => {
    const request = vi.fn(async () => new Response('private provider body', { status: 429, headers: { 'retry-after': '12' } }))
    await expect(new ExaSearch('fixture', request as typeof fetch).search('orbit', ['nasa.gov'])).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 12 })
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('rejects malformed and oversized responses', async () => {
    for (const text of ['not json', 'x'.repeat(256001)]) {
      await expect(new ExaSearch('fixture', (async () => new Response(text)) as typeof fetch).search('orbit', ['nasa.gov'])).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    }
  })
})
