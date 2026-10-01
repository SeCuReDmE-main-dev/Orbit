const STORAGE_KEY = 'orbit-companion.mission-workspace.v1'
const PLAN_POINTS = 39
const TOPICS = ['Observation', 'Context', 'Terms', 'Source', 'Method', 'Evidence', 'Counterevidence', 'Limit', 'Decision'] as const
const ANGLES = ['scope', 'provenance', 'date', 'method', 'uncertainty', 'alternative', 'constraint', 'next action', 'evidence', 'owner'] as const

export type WorkspaceSource = Readonly<{ title: string; uri: string; observedAt: string; origin?: 'exa-discovered' }>
export type WorkspaceSnapshot = Readonly<{
  question: string
  paused: boolean
  checkpoints: readonly string[]
  sources: readonly WorkspaceSource[]
  missionFresh?: boolean
  companionResponse?: string
  companionModel?: string
}>
export type PlanPoint = Readonly<{ id: string; kind: 'topic' | 'angle'; label: string }>

type WorkspaceElements = Readonly<{
  form: HTMLFormElement
  question: HTMLTextAreaElement
  plan: HTMLElement
  status: HTMLElement
  pause: HTMLButtonElement
  checkpoint: HTMLButtonElement
  sourceForm: HTMLFormElement
  sourceTitle: HTMLInputElement
  sourceUri: HTMLInputElement
  sources: HTMLElement
  handoff: HTMLButtonElement
  handoffPreview: HTMLPreElement
  associationForm: HTMLFormElement
  associationCode: HTMLInputElement
  associationStatus: HTMLElement
}>

export function createPlan(question: string): readonly PlanPoint[] {
  const normalized = question.trim()
  if (!normalized) return []
  return [
    ...TOPICS.map((topic, index) => ({ id: `topic_${index + 1}`, kind: 'topic' as const, label: `${topic}: ${normalized}` })),
    ...Array.from({ length: 30 }, (_, index) => ({ id: `angle_${index + 1}`, kind: 'angle' as const, label: `${TOPICS[index % TOPICS.length]} — ${ANGLES[Math.floor(index / TOPICS.length) % ANGLES.length]}: ${normalized}` })),
  ]
}

export function buildLocalHandoff(snapshot: WorkspaceSnapshot): Readonly<Record<string, unknown>> {
  return Object.freeze({
    kind: 'CCPPackage-preview', protocol: 'Context Continuity Protocol', schemaVersion: 'local-preview-1',
    scope: 'local browser preview; no external provider was invoked',
    question: snapshot.question, plan: { pointCount: createPlan(snapshot.question).length, points: createPlan(snapshot.question) },
    sources: snapshot.sources, decisions: [`Mission is ${snapshot.paused ? 'paused' : 'active'}.`], checkpoints: snapshot.checkpoints,
    budget: { topics: 9, angles: 30, candidateRecords: 40, searches: 18, maxDepth: 2 },
  })
}

export function mountMissionWorkspace(elements: WorkspaceElements): () => void {
  const privateAccountSurface = Boolean(document.querySelector('[data-app-shell]'))
  // The advanced broker notebook is separate from an authenticated cloud workspace.
  // Never import an anonymous notebook into whichever account signs in first.
  let snapshot = privateAccountSurface ? { question: '', paused: false, checkpoints: [], sources: [] } as WorkspaceSnapshot : restore()
  const persist = () => { if (privateAccountSurface) return; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)) } catch { /* The interface remains usable without browser storage. */ } }
  const render = () => {
    const plan = createPlan(snapshot.question)
    const topics = plan.filter((point) => point.kind === 'topic')
    const angles = plan.filter((point) => point.kind === 'angle')
    elements.plan.innerHTML = plan.length
      ? `<li class="plan-group"><h5>Subjects <span>9</span></h5><ol>${topics.map((point) => `<li>${escapeHtml(point.label)}</li>`).join('')}</ol></li><li class="plan-group"><h5>Angles <span>30</span></h5><ol>${angles.map((point) => `<li>${escapeHtml(point.label)}</li>`).join('')}</ol></li>`
      : '<li>Enter a mission question to create the bounded plan.</li>'
    elements.sources.innerHTML = snapshot.sources.length
      ? snapshot.sources.map((source) => `<li><a href="${escapeAttribute(source.uri)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a> <span>${source.origin === 'exa-discovered' ? 'Exa discovery — unread, unverified' : 'user-supplied'}, ${escapeHtml(source.observedAt)}</span></li>`).join('')
      : '<li>No source receipt is stored in this browser workspace.</li>'
    elements.pause.textContent = snapshot.paused ? 'Resume mission' : 'Pause mission'
    elements.pause.setAttribute('aria-pressed', String(snapshot.paused))
    elements.status.textContent = snapshot.question
      ? `${snapshot.paused ? 'Paused' : 'Active'}: ${plan.length}/39 plan points; ${snapshot.sources.length} local source receipt(s); ${snapshot.checkpoints.length} checkpoint(s).`
      : 'Awaiting a mission question. External providers remain unavailable.'
    elements.handoffPreview.textContent = JSON.stringify(buildLocalHandoff(snapshot), null, 2)
  }
  const onPlan = (event: SubmitEvent) => {
    event.preventDefault()
    const question = elements.question.value.trim()
    if (!question) { elements.status.textContent = 'A mission question is required.'; return }
    snapshot = { question, paused: false, checkpoints: [`${new Date().toISOString()} plan-created`], sources: [], missionFresh: true }
    persist(); render()
  }
  const onPause = () => { snapshot = { ...snapshot, paused: !snapshot.paused }; persist(); render() }
  const onCheckpoint = async () => { if (!snapshot.question) return; try { await extensionRequest({ type: 'orbit.checkpoint', label: snapshot.paused ? 'paused' : 'active', question: snapshot.question, snapshot, newMission: snapshot.missionFresh === true }); snapshot = { ...snapshot, missionFresh: false, checkpoints: [...snapshot.checkpoints, `${new Date().toISOString()} sqlite-checkpoint`] } } catch { snapshot = { ...snapshot, checkpoints: [...snapshot.checkpoints, `${new Date().toISOString()} local-checkpoint-awaiting-association`] }; elements.status.textContent = 'Checkpoint remains local until the extension is associated.' }; persist(); render() }
  const onAssociation = async (event: SubmitEvent) => { event.preventDefault(); try { await extensionRequest({ type: 'orbit.associate', code: elements.associationCode.value.trim() }); elements.associationStatus.textContent = 'Associated for this browser session; the broker session is not stored in this page.' } catch { elements.associationStatus.textContent = 'Association unavailable, expired, or declined. No credential was stored in this page.' } finally { elements.associationCode.value = '' } }
  const onSource = (event: SubmitEvent) => {
    event.preventDefault()
    const title = elements.sourceTitle.value.trim(); const uri = elements.sourceUri.value.trim()
    try { const parsed = new URL(uri); if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('invalid') } catch { elements.status.textContent = 'Provide a public HTTP(S) source URL without credentials.'; return }
    if (!title) { elements.status.textContent = 'A source title is required.'; return }
    snapshot = { ...snapshot, sources: [...snapshot.sources, { title, uri, observedAt: new Date().toISOString() }] }
    elements.sourceForm.reset(); persist(); render()
  }
  const onHandoff = () => {
    const payload = JSON.stringify(buildLocalHandoff(snapshot), null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'orbit-ccp-preview.json'; link.click(); URL.revokeObjectURL(link.href)
  }
  elements.form.addEventListener('submit', onPlan); elements.pause.addEventListener('click', onPause); elements.checkpoint.addEventListener('click', onCheckpoint)
  elements.sourceForm.addEventListener('submit', onSource); elements.handoff.addEventListener('click', onHandoff)
  elements.associationForm.addEventListener('submit', onAssociation)
  const searchButton = document.createElement('button')
  searchButton.type = 'button'; searchButton.textContent = 'Search NASA sources with Exa'
  searchButton.className = 'button button--discovery'
  elements.sourceForm.before(searchButton)
  searchButton.addEventListener('click', async () => {
    if (!snapshot.question || snapshot.paused) { elements.status.textContent = 'Create an active mission first.'; return }
    searchButton.disabled = true
    try {
      await extensionRequest({ type: 'orbit.checkpoint', label: 'before-search', question: snapshot.question, snapshot, newMission: snapshot.missionFresh === true })
      snapshot = { ...snapshot, missionFresh: false }; persist()
      const reply = await extensionRequest({ type: 'orbit.search', query: snapshot.question }) as { value: { results: { title: string; url: string }[]; cached: boolean } }
      const discovered: WorkspaceSource[] = reply.value.results.map(row => ({ title: row.title, uri: row.url, observedAt: new Date().toISOString(), origin: 'exa-discovered' }))
      snapshot = { ...snapshot, sources: [...new Map([...snapshot.sources, ...discovered.filter(isSource)].map(source => [source.uri, source])).values()] }
      persist(); render()
      await extensionRequest({ type: 'orbit.checkpoint', label: 'after-search', question: snapshot.question, snapshot })
      elements.status.textContent = `${discovered.length} NASA links discovered${reply.value.cached ? ' (mission cache)' : ''}. Pages have not been read or verified.`
    } catch { elements.status.textContent = 'Search unavailable. Use the installed extension, associate the broker, and check its Exa configuration and mission limit.' }
    finally { searchButton.disabled = false }
  })
  elements.question.value = snapshot.question; render()
  if (!privateAccountSurface) void extensionRequest({ type: 'orbit.restore' }).then((response) => {
    const value = (response as { value?: { snapshot?: unknown } }).value?.snapshot
    if (isWorkspaceSnapshot(value)) { snapshot = value; elements.question.value = snapshot.question; persist(); render(); elements.associationStatus.textContent = 'Restored from the associated local broker.' }
  }).catch(() => { elements.associationStatus.textContent = 'No associated broker snapshot; local draft remains available.' })
  return () => { elements.form.removeEventListener('submit', onPlan); elements.pause.removeEventListener('click', onPause); elements.checkpoint.removeEventListener('click', onCheckpoint); elements.sourceForm.removeEventListener('submit', onSource); elements.handoff.removeEventListener('click', onHandoff); elements.associationForm.removeEventListener('submit', onAssociation) }
}

async function extensionRequest(message: Record<string, unknown>): Promise<unknown> {
  const runtime = (globalThis as typeof globalThis & { chrome?: { runtime?: { sendMessage: (message: unknown, callback: (response: unknown) => void) => void; lastError?: { message?: string } } } }).chrome?.runtime
  if (!runtime?.sendMessage) throw new Error('Extension runtime unavailable.')
  return new Promise((resolve, reject) => runtime.sendMessage(message, (response) => runtime.lastError ? reject(new Error(runtime.lastError.message)) : response && typeof response === 'object' && 'ok' in response && response.ok === true ? resolve(response) : reject(new Error('Extension request denied.'))))
}

function restore(): WorkspaceSnapshot {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<WorkspaceSnapshot>
    if (typeof parsed.question === 'string' && typeof parsed.paused === 'boolean' && Array.isArray(parsed.checkpoints) && Array.isArray(parsed.sources)) return { question: parsed.question, paused: parsed.paused, checkpoints: parsed.checkpoints.filter((item): item is string => typeof item === 'string'), sources: parsed.sources.filter(isSource), missionFresh: parsed.missionFresh === true, companionResponse: typeof parsed.companionResponse === 'string' ? parsed.companionResponse : undefined, companionModel: typeof parsed.companionModel === 'string' ? parsed.companionModel : undefined }
  } catch { /* Start a fresh, local workspace. */ }
  return { question: '', paused: false, checkpoints: [], sources: [] }
}

function isSource(value: unknown): value is WorkspaceSource { if (!value || typeof value !== 'object') return false; const source = value as WorkspaceSource; if (typeof source.title !== 'string' || typeof source.uri !== 'string' || typeof source.observedAt !== 'string') return false; try { const url = new URL(source.uri); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password } catch { return false } }
function isWorkspaceSnapshot(value: unknown): value is WorkspaceSnapshot { if (!value || typeof value !== 'object') return false; const snapshot = value as Partial<WorkspaceSnapshot>; return typeof snapshot.question === 'string' && typeof snapshot.paused === 'boolean' && Array.isArray(snapshot.checkpoints) && snapshot.checkpoints.every((item) => typeof item === 'string') && Array.isArray(snapshot.sources) && snapshot.sources.every(isSource) && (snapshot.companionResponse === undefined || typeof snapshot.companionResponse === 'string') && (snapshot.companionModel === undefined || typeof snapshot.companionModel === 'string') }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!) }
function escapeAttribute(value: string): string { return escapeHtml(value) }
