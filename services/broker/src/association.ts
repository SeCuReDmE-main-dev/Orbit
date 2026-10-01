import { randomBytes, timingSafeEqual } from 'node:crypto'

export const ASSOCIATION_CODE_TTL_MS = 5 * 60 * 1_000
export const SESSION_TTL_MS = 60 * 60 * 1_000
export const SESSION_SCOPES = ['missions', 'sources', 'checkpoints'] as const
export type AssociationScope = typeof SESSION_SCOPES[number]

type Session = Readonly<{ origin: string; expiresAt: number; scopes: readonly AssociationScope[]; missionIds: Set<string> }>

/** In-memory association state. Credentials are never stored in SQLite, localStorage, or logs. */
export class AssociationAuthority {
  private used = false
  private readonly sessions = new Map<string, Session>()
  constructor(private readonly code: string, private readonly issuedAt: number, private readonly now: () => number = Date.now) {}
  exchange(code: string, origin: string): string {
    if (this.used || this.now() > this.issuedAt + ASSOCIATION_CODE_TTL_MS || !sameSecret(code, this.code)) throw new Error('Association code is invalid, expired, or already used.')
    this.used = true
    const session = randomBytes(32).toString('base64url')
    this.sessions.set(session, Object.freeze({ origin, expiresAt: this.now() + SESSION_TTL_MS, scopes: SESSION_SCOPES, missionIds: new Set<string>() }))
    return session
  }
  authorize(session: string | undefined, origin: string | undefined, scope: AssociationScope, missionId?: string): boolean {
    if (!session || !origin) return false
    const record = this.sessions.get(session)
    return !!record && record.expiresAt > this.now() && record.origin === origin && record.scopes.includes(scope) && (!missionId || record.missionIds.has(missionId))
  }
  grantMission(session: string | undefined, missionId: string): void { const record = session ? this.sessions.get(session) : undefined; if (!record) throw new Error('Associated session required.'); record.missionIds.add(missionId) }
  missionIds(session: string | undefined): readonly string[] { const record = session ? this.sessions.get(session) : undefined; return record ? [...record.missionIds] : [] }
  revoke(session: string | undefined): boolean { return session ? this.sessions.delete(session) : false }
}
function sameSecret(left: string, right: string): boolean { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b) }
