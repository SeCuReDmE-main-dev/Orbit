/** Public, published Sanity corpus only. Personal missions and credentials never enter this transport. */
export class SanityKnowledge {
  private readonly endpoint = 'https://pzscx4w8.api.sanity.io/v2025-02-19/data/query/production'
  async earthReference(signal?: AbortSignal): Promise<unknown> {
    const query = '*[_type == "source" && _id == "orbit-source-nasa-earth"][0]{_id,title,url,publisher,observedAt,notes,"claims": *[_type == "claim" && references(^._id)][0...10]{_id,statement,status,value,unit,qualifier}}'
    const response = await fetch(`${this.endpoint}?query=${encodeURIComponent(query)}&perspective=published`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error(`Sanity public corpus unavailable (${response.status}).`)
    const payload = await response.json() as { result?: { _id?: string; claims?: unknown[] } }
    if (payload.result?._id !== 'orbit-source-nasa-earth' || !Array.isArray(payload.result.claims)) throw new Error('Sanity corpus does not match the expected contract.')
    return { source: 'sanity_content_lake', project: 'pzscx4w8', dataset: 'production', perspective: 'published', retrievedAt: new Date().toISOString(), document: payload.result }
  }
}
