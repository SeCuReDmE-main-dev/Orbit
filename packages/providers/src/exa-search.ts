/** Server-only Exa transport. The broker must reserve a persistent mission call before invoking it. */
export type ExaSearchResult = Readonly<{ url: string; title: string; publishedDate?: string; text?: string; status: 'discovered'; trust: 'untrusted' }>
export class ExaSearchError extends Error {
  constructor(readonly code: 'UNCONFIGURED' | 'INVALID_REQUEST' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'INVALID_RESPONSE', readonly retryAfterSeconds?: number) { super(code) }
}

export class ExaSearch {
  constructor(private readonly apiKey: string, private readonly transport: typeof fetch = fetch) {}

  /** Search metadata only: discovering a URL does not count as reading or validating a page. No automatic retry. */
  async search(query: string, domains: readonly string[], limit = 5, signal?: AbortSignal, includeText = false): Promise<readonly ExaSearchResult[]> {
    if (!this.apiKey.trim()) throw new ExaSearchError('UNCONFIGURED')
    if (!query.trim() || Buffer.byteLength(query) > 2000 || !Number.isInteger(limit) || limit < 1 || limit > 10 || domains.length < 1 || domains.length > 10 || domains.some(d => !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(d))) throw new ExaSearchError('INVALID_REQUEST')
    const response = await this.transport('https://api.exa.ai/search', {
      method: 'POST', headers: { 'x-api-key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim(), type: 'auto', numResults: limit, includeDomains: domains, ...(includeText ? {contents:{text:{maxCharacters:4000}}} : {}) }),
      redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
    }).catch(() => { throw new ExaSearchError('UNAVAILABLE') })
    if (response.status === 429) {
      const value = response.headers.get('retry-after') ?? ''
      const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - Date.now()) / 1000)
      throw new ExaSearchError('RATE_LIMITED', Number.isFinite(seconds) ? Math.max(0, Math.min(seconds, 86400)) : undefined)
    }
    if (!response.ok) throw new ExaSearchError('UNAVAILABLE')
    // Read a bounded stream rather than accepting an arbitrarily large provider payload.
    const reader = response.body?.getReader(); if (!reader) throw new ExaSearchError('INVALID_RESPONSE')
    const chunks: Uint8Array[] = []; let bytes = 0
    try { while (true) { const item = await reader.read(); if (item.done) break; bytes += item.value.byteLength; if (bytes > 256_000) { await reader.cancel(); throw new ExaSearchError('INVALID_RESPONSE') }; chunks.push(item.value) } }
    finally { reader.releaseLock() }
    let payload: unknown
    try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new ExaSearchError('INVALID_RESPONSE') }
    if (!payload || typeof payload !== 'object' || !('results' in payload) || !Array.isArray(payload.results)) throw new ExaSearchError('INVALID_RESPONSE')
    const found = new Map<string, ExaSearchResult>()
    for (const row of payload.results.slice(0, limit)) {
      if (!row || typeof row.url !== 'string' || typeof row.title !== 'string') continue
      try {
        const url = new URL(row.url)
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !domains.some(d => url.hostname === d.toLowerCase() || url.hostname.endsWith(`.${d.toLowerCase()}`))) continue
        url.hash = ''; const key = url.toString()
        found.set(key, { url: key, title: row.title.slice(0, 500), ...(typeof row.publishedDate === 'string' ? { publishedDate: row.publishedDate.slice(0, 50) } : {}), ...(includeText && typeof row.text === 'string' ? {text:row.text.slice(0,4000)} : {}), status: 'discovered', trust: 'untrusted' })
      } catch { /* Reject malformed URLs without exposing raw provider content. */ }
    }
    return [...found.values()]
  }
}
