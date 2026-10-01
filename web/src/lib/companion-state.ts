/** Explicitly shared research state. Page text is never captured or shared automatically. */
export type ResearchSource = { id: string; title: string; url: string; text?: string; status: string }
export type CompanionDraft = { requestId: string; question: string; context: string; report: string; axes: string[]; sources: ResearchSource[] }
const key = 'orbit.companion.draft.v2'
let shared = false
let presentation = false
let consentRevision = 0
let draft: CompanionDraft = { requestId: '', question: '', context: '', report: '', axes: [], sources: [] }
export function currentDraft(): CompanionDraft { return structuredClone(draft) }
export function sharingAllowed() { return shared }
export function presentationAllowed() { return shared && presentation }
export function sharingRevision() { return consentRevision }
export function allowSharing(value: boolean) { if (shared !== value) consentRevision++; shared = value; if (!value) presentation = false }
export function allowPresentation(value: boolean) { presentation = shared && value }
export function updateDraft(value: Partial<CompanionDraft>) {
  draft = { ...draft, ...value }
  if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') document.dispatchEvent(new CustomEvent('orbit:draft-updated', { detail: currentDraft() }))
}
/** Persistence is owned by the authenticated, consent-aware workspace layer. */
export function restoreDraft() { return currentDraft() }
export function resetDraft() {
  allowSharing(false)
  updateDraft({ requestId: '', question: '', context: '', report: '', axes: [], sources: [] })
}
export function parseDraft(value: unknown): CompanionDraft | null {
  const v = value as CompanionDraft
  if (!v || typeof v !== 'object' || typeof v.question !== 'string' || v.question.length > 2000 || typeof v.context !== 'string' || v.context.length > 12000 || typeof v.report !== 'string' || v.report.length > 40000) return null
  if (v.requestId !== undefined && (typeof v.requestId !== 'string' || v.requestId.length > 160)) return null
  const axes = v.axes ?? [], sources = v.sources ?? []
  if (!Array.isArray(axes) || axes.length > 9 || axes.some(a => typeof a !== 'string' || a.length > 300)) return null
  if (!Array.isArray(sources) || sources.length > 30 || sources.some(s => !s || typeof s.id !== 'string' || s.id.length > 160 || typeof s.title !== 'string' || s.title.length > 500 || !validPublicUrl(s.url) || !['discovered', 'excerpt-read', 'read'].includes(s.status) || (s.text !== undefined && (typeof s.text !== 'string' || s.text.length > 12000)))) return null
  return structuredClone({ requestId: v.requestId ?? '', question: v.question, context: v.context, report: v.report, axes, sources })
}
/** The user explicitly chooses whether an old anonymous draft belongs to this account. */
export function readLegacyDraft(): CompanionDraft | null {
  try {
    return parseDraft(JSON.parse(localStorage.getItem(key) ?? ''))
  } catch { return null }
}
export function validPublicUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000) return false
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password } catch { return false }
}
export function researchRequest() {
  if (!shared) return { state: 'CONSENT_REQUIRED', message: 'Ask the human to enable Share with my WebMCP agent in Orbit.' }
  return { state: draft.question ? 'QUESTION_READY' : 'AWAITING_QUESTION', ...currentDraft(), sourceTrust: 'untrusted', target: { axes: 9, sourceUrls: 30 }, nextTool: 'orbit_get_research_protocol', instructions: 'Consult the public method and Sanity entries. Clarify scope and obtain human approval of the plan in your conversation before deep collection. Use only your authorized tools. Never invent URLs to meet a target. Presentation requires separate consent.' }
}
export function presentResearch(input: Record<string, unknown>) {
  if (!presentationAllowed() || !draft.requestId || input.requestId !== draft.requestId) throw new Error('Consent or current request reference is missing.')
  if (typeof input.report !== 'string' || !input.report.trim() || input.report.length > 40000) throw new Error('Report must contain 1–40000 characters.')
  if (!Array.isArray(input.axes) || input.axes.length > 9 || input.axes.some(a => typeof a !== 'string' || !a.trim() || a.length > 300)) throw new Error('Provide up to nine relevant axes, or none for a clarification response.')
  if (!Array.isArray(input.sources) || input.sources.length > 30) throw new Error('At most thirty sources.')
  const sources: ResearchSource[] = input.sources.map((row: any, i: number) => {
    if (!validPublicUrl(row?.url) || typeof row.title !== 'string' || !row.title.trim() || row.title.length > 500 || !['discovered', 'excerpt-read', 'read'].includes(row.status)) throw new Error('Invalid source record.')
    return { id: `source_${draft.requestId}_${i}`, title: row.title, url: row.url, status: row.status }
  })
  updateDraft({ report: input.report, axes: input.axes as string[], sources })
  document.dispatchEvent(new CustomEvent('orbit:research-result', { detail: currentDraft() }))
  return { state: 'PRESENTED', sources: sources.length, evidenceStatus: 'external-agent-reported', remainingSources: Math.max(0, 30 - sources.length) }
}
