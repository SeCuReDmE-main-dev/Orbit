/** Publication is a human UI operation. This module is not a WebMCP tool. */
export interface PublicationDestination { projectId: string; dataset: string; userId: string }
export interface PublishableSession {
  id: string
  namespace: string
  revision: number
  permissions: { sanityPublish: boolean }
  artifacts: Array<{ id: string }>
}
export interface PublicationPreview {
  destination: PublicationDestination
  sessionId: string
  namespace: string
  revision: number
  selectedIds: string[]
  digest: string
  document: { _id: string; _type: 'orbitLearningPublication'; title: string; moduleId?: number; revision: number; publishedAt: string; payloadJson: string }
}
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([,item]) => item !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}
async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(value))
  if (!globalThis.crypto?.subtle) throw Error('Secure context required to prepare a publication.')
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
function selectedPayload(session: PublishableSession, selectedIds: string[]) {
  if (!selectedIds.length || selectedIds.length > 64 || new Set(selectedIds).size !== selectedIds.length) throw Error('Choose one to 64 distinct artefacts.')
  const artifacts = selectedIds.map((id) => {
    const artifact = session.artifacts.find((item) => item.id === id)
    if (!artifact) throw Error('An artefact is no longer available.')
    return structuredClone(artifact)
  })
  const payload = { format: 'orbit-learning-publication-v1', sessionId: session.id, revision: session.revision, artifacts }
  if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > 750_000) throw Error('The selected publication exceeds 750 KB. Export large files separately.')
  return payload
}
export async function createPublicationPreview(session: PublishableSession & {moduleId?: number}, selectedIds: string[], destination: PublicationDestination, title: string, now = new Date().toISOString()): Promise<PublicationPreview> {
  if (!destination.projectId || !destination.dataset || !destination.userId) throw Error('A signed-in destination is required.')
  if (!title.trim() || title.length > 160) throw Error('Give the publication a title of at most 160 characters.')
  const payload = selectedPayload(session, selectedIds)
  const contentDigest = await digest({ destination, namespace: session.namespace, payload })
  return {
    destination: structuredClone(destination), sessionId: session.id, namespace: session.namespace,
    revision: session.revision, selectedIds: [...selectedIds], digest: contentDigest,
    document: { _id: `orbit.learning.${contentDigest}`, _type: 'orbitLearningPublication', title: title.trim(),
      ...(session.moduleId ? {moduleId: session.moduleId} : {}), revision: session.revision, publishedAt: now, payloadJson: JSON.stringify(payload, null, 2) },
  }
}
export async function validatePublication(preview: PublicationPreview, session: PublishableSession, destination: PublicationDestination, acknowledged: boolean): Promise<void> {
  if (!acknowledged || !session.permissions.sanityPublish) throw Error('Explicit human publication acknowledgement required.')
  if (stableJson(destination) !== stableJson(preview.destination) || session.namespace !== preview.namespace || session.id !== preview.sessionId) throw Error('The Studio workspace or account changed; prepare a new preview.')
  if (session.revision !== preview.revision) throw Error('The session changed; prepare a new preview.')
  const payload = selectedPayload(session, preview.selectedIds)
  const contentDigest = await digest({ destination, namespace: session.namespace, payload })
  if (contentDigest !== preview.digest || preview.document._id !== `orbit.learning.${contentDigest}` || preview.document.payloadJson !== JSON.stringify(payload, null, 2) || preview.document._type !== 'orbitLearningPublication') throw Error('The preview content changed; prepare a new preview.')
}
export async function publishReviewedSelection(client: {createIfNotExists(document: PublicationPreview['document']): Promise<unknown>}, preview: PublicationPreview, session: PublishableSession, destination: PublicationDestination, acknowledged: boolean, isCurrent: () => boolean = () => true) {
  await validatePublication(preview, session, destination, acknowledged)
  if (!isCurrent()) throw Error('The publication permission or workspace changed; prepare a new preview.')
  // Immutable, content-addressed publication. Repeated clicks do not overwrite
  // an existing document and no private journal or permission object is sent.
  return client.createIfNotExists(structuredClone(preview.document))
}
