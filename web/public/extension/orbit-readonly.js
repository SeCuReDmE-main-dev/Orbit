const BROKER = 'http://127.0.0.1:47831'
const SESSION_KEY = 'orbit.association.session'
const MISSION_KEY = 'orbit.association.mission'
chrome.runtime.onInstalled.addListener(() => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined))
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender.url?.startsWith(chrome.runtime.getURL(''))) return
  if (message?.type === 'orbit.capturePage') { capturePage().then(value => sendResponse({ok:true,value})).catch(() => sendResponse({ok:false})); return true }
  if (message?.type === 'orbit.readStatus') { sendResponse({ ok: true, mode: 'private-session-only', broker: BROKER, externalProviders: 'BLOCKED_EXTERNAL' }); return }
  if (message?.type === 'orbit.associate') { associate(message.code).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false })); return true }
  if (message?.type === 'orbit.checkpoint') { checkpoint(message).then((value) => sendResponse({ ok: true, value })).catch(() => sendResponse({ ok: false })); return true }
  if (message?.type === 'orbit.restore') { restore().then((value) => sendResponse({ ok: true, value })).catch(() => sendResponse({ ok: false })); return true }
  if (message?.type === 'orbit.search') { search(message).then((value) => sendResponse({ ok: true, value })).catch(() => sendResponse({ ok: false })); return true }
  if (message?.type === 'orbit.read') { readMission(message.path).then((value) => sendResponse({ ok: true, value })).catch(() => sendResponse({ ok: false })); return true }
  if (message?.type === 'orbit.companionStatus') { companion(message, true).then((value) => sendResponse({ ok: true, value })).catch(() => sendResponse({ ok: false })); return true }
  if (message?.type === 'orbit.companion') { companion(message, false).then((value) => sendResponse({ ok: true, value })).catch(() => sendResponse({ ok: false })); return true }
})
async function associate(code) { if (typeof code !== 'string' || !code.trim()) throw new Error('Association code required.'); const response = await fetch(`${BROKER}/associations`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-orbit-association-code': code.trim() }, body: JSON.stringify({ consent: true }), credentials: 'omit' }); if (!response.ok) throw new Error('Association rejected.'); const value = await response.json(); await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }); await chrome.storage.session.set({ [SESSION_KEY]: value.session }) }
async function checkpoint(message) { const stored = await chrome.storage.session.get([SESSION_KEY, MISSION_KEY]); const session = stored[SESSION_KEY]; if (typeof session !== 'string') throw new Error('No associated session.'); let missionId = stored[MISSION_KEY]; if (typeof missionId !== 'string' || message.newMission === true) { const id = `mission_${crypto.randomUUID().replaceAll('-', '')}`; const created = await request('/missions', session, { id, title: typeof message.question === 'string' && message.question.trim() ? message.question.trim().slice(0, 500) : 'Local Orbit mission' }); missionId = created.mission.id; await chrome.storage.session.set({ [MISSION_KEY]: missionId }) } return request(`/missions/${encodeURIComponent(missionId)}/checkpoints`, session, { label: message.label, detail: message.question, snapshot: message.snapshot }) }
async function restore() { const stored = await chrome.storage.session.get([SESSION_KEY, MISSION_KEY]); if (typeof stored[SESSION_KEY] !== 'string' || typeof stored[MISSION_KEY] !== 'string') throw new Error('No associated mission.'); return request(`/missions/${encodeURIComponent(stored[MISSION_KEY])}`, stored[SESSION_KEY]) }
async function search(message) { const stored = await chrome.storage.session.get([SESSION_KEY, MISSION_KEY]); if (typeof stored[SESSION_KEY] !== 'string' || typeof stored[MISSION_KEY] !== 'string') throw new Error('Save a checkpoint after associating the broker.'); return request(`/missions/${encodeURIComponent(stored[MISSION_KEY])}/search`, stored[SESSION_KEY], { query: message.query }) }
async function companion(message, statusOnly) { const stored = await chrome.storage.session.get([SESSION_KEY, MISSION_KEY]); if (typeof stored[SESSION_KEY] !== 'string') throw new Error('Associate the broker first.'); if (statusOnly) return request('/companion/status', stored[SESSION_KEY]); if (typeof stored[MISSION_KEY] !== 'string') throw new Error('Save a mission checkpoint first.'); return request(`/missions/${encodeURIComponent(stored[MISSION_KEY])}/companion`, stored[SESSION_KEY], { question: message.question, consent: message.consent, mode: message.mode ?? 'chat', context: typeof message.context === 'string' ? message.context.slice(0,12000) : '' }) }
async function readMission(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid read path.')
  const url = new URL(path, BROKER)
  if (url.origin !== BROKER || !/^\/(research-points|sources(?:\/source_[A-Za-z0-9_-]+)?|missions\/mission_[A-Za-z0-9_-]+)$/.test(url.pathname)) throw new Error('Read route denied.')
  const stored = await chrome.storage.session.get([SESSION_KEY, MISSION_KEY]); const missionId = stored[MISSION_KEY]
  if (typeof stored[SESSION_KEY] !== 'string' || typeof missionId !== 'string') throw new Error('No associated mission.')
  if (url.pathname.startsWith('/missions/') && url.pathname !== `/missions/${missionId}`) throw new Error('Other mission denied.')
  url.searchParams.set('missionId', missionId)
  return request(url.pathname + url.search, stored[SESSION_KEY])
}
async function request(path, session, body) { const response = await fetch(`${BROKER}${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${session}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, credentials: 'omit' }); if (!response.ok) throw new Error('Broker request rejected.'); return response.json() }

async function capturePage() {
  const [tab] = await chrome.tabs.query({active:true, currentWindow:true})
  if (!tab?.id || !/^https?:\/\//.test(tab.url ?? '')) throw new Error('Only the explicitly authorized web page can be captured.')
  const results = await chrome.scripting.executeScript({target:{tabId:tab.id},func:() => {
    const selected = window.getSelection()?.toString() ?? ''
    const root = document.querySelector('main, article') ?? document.body
    return {title:document.title.slice(0,300),url:location.href,text:(selected || root.innerText).slice(0,12000), capturedAt:new Date().toISOString()}
  }})
  return results[0]?.result
}
