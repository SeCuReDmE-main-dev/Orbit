export type OrbitSession = {
  user: null | { id: string; name: string; email: string }
  csrfToken: string
  storageConsent: { local: boolean; decided?: boolean }
  capabilities: { google: boolean; github: boolean; email: boolean }
}
export class OrbitApiError extends Error { constructor(public status: number, message: string) { super(message) } }
export async function readSession(): Promise<OrbitSession> {
  const response = await fetch('/api/v1/session', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new OrbitApiError(response.status, 'Le service de connexion est momentanément indisponible.')
  const value = await response.json()
  if (!value || typeof value.csrfToken !== 'string' || !value.csrfToken || !value.capabilities || !['google','github','email'].every(key => typeof value.capabilities[key] === 'boolean') || typeof value.storageConsent?.local !== 'boolean' || (value.user !== null && (typeof value.user?.id !== 'string' || typeof value.user?.email !== 'string'))) throw new OrbitApiError(503, 'La réponse du service de connexion est invalide.')
  return value as OrbitSession
}
export async function mutateOrbit(path: string, method: 'POST' | 'PUT', body: unknown, session: OrbitSession): Promise<unknown> {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': session.csrfToken }, body: JSON.stringify(body) })
  let value: unknown = {}
  if (response.headers.get('content-type')?.includes('application/json')) value = await response.json()
  if (!response.ok) throw new OrbitApiError(response.status, response.status === 429 ? 'Trop de tentatives. Patientez avant de réessayer.' : response.status === 401 || response.status === 422 ? 'Vérifiez les informations saisies puis réessayez.' : 'Cette opération est indisponible. Vos données n’ont pas été confirmées comme enregistrées.')
  return value
}
