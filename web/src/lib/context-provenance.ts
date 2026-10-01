/** Inspect returned Context citations; never infer a missing original URL. */
export function contextProvenance(content: readonly { type?: string; text?: string }[], paths: readonly string[]) {
  const references: { number: number; title: string; kind: string; url: string | null; entryTitle: string | null }[] = []
  for (const block of content) {
    if (block.type !== 'text' || typeof block.text !== 'string') continue
    let inSources = false, entryTitle: string | null = null
    for (const line of block.text.split(/\r?\n/)) {
      if (/^# /.test(line)) { entryTitle = line.slice(2).trim(); inSources = false }
      if (/^## Sources\s*$/i.test(line)) { inSources = true; continue }
      if (inSources && /^#{1,6} /.test(line)) { inSources = false; continue }
      if (!inSources) continue
      const match = line.match(/^(\d+)\.\s+(.+?)\s+—\s+(Web|File|Dataset)(?:\s*·\s*(.*))?\s*$/)
      if (!match) continue
      const candidate = match[4]?.trim() ?? ''
      let url: string | null = null
      try {
        const parsed = new URL(candidate)
        if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) url = candidate
      } catch { /* No original URL was returned. The title is not a URL. */ }
      references.push({ number: Number(match[1]), title: match[2], kind: match[3].toLowerCase(), url, entryTitle })
    }
  }
  return {
    format: 'orbit-context-provenance-v1', requestedPaths: [...paths], references,
    referencesWithoutOriginalUrl: references.filter(r => !r.url).length,
    status: !references.length ? 'not-observed' : references.some(r => !r.url) ? 'incomplete' : 'urls-observed',
    originalDocumentsRead: false,
    interpretation: 'Only citation metadata present in the returned Context text is recorded. A title without a URL stays unresolved. A URL does not establish that the original document was read or supports the claim.',
  }
}
