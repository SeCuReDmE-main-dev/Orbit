/** Publication is a human UI operation. This module is not a WebMCP tool. */
export interface PublicationDestination { projectId: string; dataset: string; userId: string }
export interface PublishableSession {
  id: string
  namespace: string
  revision: number
  moduleId?: number
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
  previewDigest: string
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
function publicationMetadata(session: PublishableSession, title: string) {
  if (typeof title !== 'string' || !title.trim() || title.length > 160) throw Error('Give the publication a title of at most 160 characters.')
  if (session.moduleId !== undefined && (!Number.isInteger(session.moduleId) || session.moduleId < 1 || session.moduleId > 8)) throw Error('Choose a valid course module.')
  return {_type: 'orbitLearningPublication' as const, title: title.trim(), revision: session.revision,
    ...(session.moduleId === undefined ? {} : {moduleId: session.moduleId})}
}
function previewContent(preview: Omit<PublicationPreview, 'previewDigest'>) {
  return {destination: preview.destination, sessionId: preview.sessionId, namespace: preview.namespace,
    revision: preview.revision, selectedIds: preview.selectedIds, digest: preview.digest, document: preview.document}
}
function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}
export async function createPublicationPreview(session: PublishableSession, selectedIds: string[], destination: PublicationDestination, title: string, now = new Date().toISOString()): Promise<PublicationPreview> {
  if (!destination.projectId || !destination.dataset || !destination.userId) throw Error('A signed-in destination is required.')
  if (!validTimestamp(now)) throw Error('A valid publication timestamp is required.')
  const metadata = publicationMetadata(session, title)
  const payload = selectedPayload(session, selectedIds)
  // Creation time is excluded from identity: reopening the same reviewed selection
  // preserves its immutable ID and the first stored publication's timestamp.
  const contentDigest = await digest({ destination, namespace: session.namespace, metadata, payload })
  const preview = {
    destination: structuredClone(destination), sessionId: session.id, namespace: session.namespace,
    revision: session.revision, selectedIds: [...selectedIds], digest: contentDigest,
    document: {_id: `orbit.learning.${contentDigest}`, ...metadata, publishedAt: now, payloadJson: JSON.stringify(payload, null, 2)},
  }
  // Unlike immutable identity, this seal covers every field shown in this preview.
  return {...preview, previewDigest: await digest(previewContent(preview))}
}
export async function validatePublication(preview: PublicationPreview, session: PublishableSession, destination: PublicationDestination, acknowledged: boolean): Promise<void> {
  if (!acknowledged || !session.permissions.sanityPublish) throw Error('Explicit human publication acknowledgement required.')
  if (stableJson(destination) !== stableJson(preview.destination) || session.namespace !== preview.namespace || session.id !== preview.sessionId) throw Error('The Studio workspace or account changed; prepare a new preview.')
  if (session.revision !== preview.revision) throw Error('The session changed; prepare a new preview.')
  const payload = selectedPayload(session, preview.selectedIds)
  const metadata = publicationMetadata(session, preview.document.title)
  const contentDigest = await digest({ destination, namespace: session.namespace, metadata, payload })
  if (contentDigest !== preview.digest || preview.document._id !== `orbit.learning.${contentDigest}` || preview.document.payloadJson !== JSON.stringify(payload, null, 2) || preview.document._type !== metadata._type || preview.document.moduleId !== metadata.moduleId || preview.document.revision !== session.revision || !validTimestamp(preview.document.publishedAt) || preview.previewDigest !== await digest(previewContent(preview))) throw Error('The preview content changed; prepare a new preview.')
}
export async function publishReviewedSelection(client: {createIfNotExists(document: PublicationPreview['document']): Promise<unknown>}, preview: PublicationPreview, session: PublishableSession, destination: PublicationDestination, acknowledged: boolean, isCurrent: () => boolean = () => true) {
  await validatePublication(preview, session, destination, acknowledged)
  if (!isCurrent()) throw Error('The publication permission or workspace changed; prepare a new preview.')
  // Immutable, content-addressed publication. Repeated clicks do not overwrite
  // an existing document and no private journal or permission object is sent.
  const stored = await client.createIfNotExists(structuredClone(preview.document))
  // A completed mutation cannot be undone here. Withhold its response if the host
  // was revoked or unmounted while it was in flight; do not report stale success.
  if (!isCurrent()) throw Error('The publication permission or workspace changed while writing; inspect the stored document before retrying.')
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw Error('The stored publication was not returned; inspect it before retrying.')
  const document = stored as Record<string, unknown>
  const expected = preview.document
  const allowed = new Set([...Object.keys(expected), '_rev', '_createdAt', '_updatedAt'])
  if (Object.keys(document).some(key => !allowed.has(key)) || document._id !== expected._id || document._type !== expected._type || document.title !== expected.title || document.moduleId !== expected.moduleId || document.revision !== expected.revision || document.payloadJson !== expected.payloadJson || !validTimestamp(document.publishedAt)) throw Error('The stored publication differs from the reviewed selection; inspect it before retrying.')
  return structuredClone(stored) as PublicationPreview['document']
}
