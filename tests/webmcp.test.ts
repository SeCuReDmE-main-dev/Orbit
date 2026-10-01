import { afterEach, describe, expect, it, vi } from 'vitest'
import { allowSharing, allowPresentation, updateDraft, resetDraft, currentDraft } from '../web/src/lib/companion-state'
import { orbitTools, registerOrbitTools } from '../web/src/lib/webmcp'
const tool = (name: string) => orbitTools().find(t => t.name === name)!
afterEach(() => { resetDraft(); vi.unstubAllGlobals() })
describe('External-agent WebMCP v2', () => {
 it('registers ten original tools plus five calculations without data retrieval or provider invocation', async () => {
  const registered: any[] = [], network = vi.fn(), sendMessage = vi.fn()
  vi.stubGlobal('document', { addEventListener: vi.fn(), modelContext: { registerTool: async (t: any) => { registered.push(t) } } })
  vi.stubGlobal('window', { addEventListener: vi.fn() }); vi.stubGlobal('fetch', network); vi.stubGlobal('chrome', { runtime: { sendMessage } })
  await expect(registerOrbitTools()).resolves.toBe('registered')
  expect(registered.map(t => t.name)).toEqual(['orbit_get_capabilities','orbit_get_research_protocol','orbit_sanity_initial_context','orbit_sanity_read_entries','orbit_get_research_request','orbit_get_mission_summary','orbit_list_research_points','orbit_search_sources','orbit_read_source_record','orbit_present_research','orbit_classify_evidence','orbit_compare_claims','orbit_find_relations','orbit_resolve_hold','orbit_trace_impact'])
  expect(registered.filter(t => !t.annotations.readOnlyHint).map(t => t.name)).toEqual(['orbit_present_research'])
  expect(registered.every(t => t.inputSchema.additionalProperties === false && t.outputSchema.required.includes('state'))).toBe(true)
  const capabilities = await tool('orbit_get_capabilities').execute({})
  expect(capabilities).toMatchObject({ automaticActions: [], workspace: { readable: false }, sanity: { state: 'NOT_CHECKED', dossierConsentRequired: false } })
  await tool('orbit_get_research_protocol').execute({})
  expect(network).not.toHaveBeenCalled(); expect(sendMessage).not.toHaveBeenCalled()
 })
 it('denies private reads even when an extension is present', async () => {
  const sendMessage = vi.fn(); vi.stubGlobal('chrome', { runtime: { sendMessage } })
  for (const name of ['orbit_get_research_request','orbit_get_mission_summary','orbit_list_research_points']) expect(await tool(name).execute({})).toMatchObject({state:'CONSENT_REQUIRED'})
  expect(sendMessage).not.toHaveBeenCalled()
 })
 it('paginates saved evidence and rejects foreign mission references', async () => {
  allowSharing(true); updateDraft({requestId:'current', axes:['A','B'],sources:[{id:'s1',title:'Earth one',url:'https://example.org/1',status:'read'},{id:'s2',title:'Earth two',url:'https://example.org/2',status:'discovered'}]})
  expect(await tool('orbit_search_sources').execute({query:'Earth',limit:1,offset:1})).toMatchObject({items:[{id:'s2'}],total:2,nextOffset:null})
  expect(await tool('orbit_get_mission_summary').execute({missionId:'mission_other'})).toEqual({state:'NOT_FOUND'})
  expect(await tool('orbit_get_mission_summary').execute({})).toMatchObject({mission:{id:'mission_current'}})
 })
 it('rejects unsupported parameters and bounded-path violations before any network call', async () => {
  const network=vi.fn();vi.stubGlobal('fetch',network)
  await expect(tool('orbit_sanity_read_entries').execute({paths:['good/path'],token:'secret'})).rejects.toThrow('not allowed')
  await expect(tool('orbit_sanity_read_entries').execute({paths:['../../private']})).rejects.toThrow('Invalid')
  await expect(tool('orbit_sanity_read_entries').execute({paths:['same','same']})).rejects.toThrow('Invalid')
  await expect(tool('orbit_list_research_points').execute({limit:26})).rejects.toThrow('Invalid')
  expect(network).not.toHaveBeenCalled()
 })
 it('needs separate presentation permission and does not dispatch voice events', async () => {
  const dispatchEvent=vi.fn();vi.stubGlobal('document',{dispatchEvent})
  allowSharing(true);updateDraft({requestId:'current',question:'How?'})
  const input={requestId:'current',report:'Proposed plan. Please approve.',axes:['One relevant axis'],sources:[]}
  expect(await tool('orbit_present_research').execute(input)).toMatchObject({state:'CONSENT_REQUIRED'})
  allowPresentation(true); expect(await tool('orbit_present_research').execute(input)).toMatchObject({state:'PRESENTED'})
  expect(currentDraft().report).toContain('approve')
  expect(dispatchEvent.mock.calls.every(([e])=>e.type!=='orbit:companion-state')).toBe(true)
  allowSharing(false);allowSharing(true)
  expect(await tool('orbit_present_research').execute(input)).toMatchObject({state:'CONSENT_REQUIRED'})
 })
 it('discards late reads after revocation even when sharing was subsequently enabled again', async () => {
  let reply: (v: unknown)=>void=()=>{};vi.stubGlobal('chrome',{runtime:{sendMessage:(_:unknown,cb:typeof reply)=>{reply=cb}}})
  allowSharing(true);const pending=tool('orbit_list_research_points').execute({})
  allowSharing(false);allowSharing(true);reply({ok:true,value:{private:'previous'}})
  expect(await pending).toMatchObject({state:'CONSENT_REQUIRED'})
 })
 it('honors cancellation and sends only selected paths to the fixed Sanity gateway', async () => {
  const fetchMock=vi.fn(async()=>new Response(JSON.stringify({state:'READY',source:'sanity-context-mcp',content:[{type:'text',text:'Citation'}]}),{headers:{'Content-Type':'application/json'}}))
  vi.stubGlobal('fetch',fetchMock); updateDraft({question:'PRIVATE_QUESTION'})
  expect(await tool('orbit_sanity_read_entries').execute({paths:['research/method']})).toMatchObject({source:'sanity-context-mcp'})
  expect(await tool('orbit_get_research_request').execute({})).toMatchObject({state:'CONSENT_REQUIRED'})
  expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/knowledge/entries?paths=')
  expect(JSON.stringify(fetchMock.mock.calls)).not.toContain('PRIVATE_QUESTION')
  const abort=new AbortController();abort.abort()
  await expect(tool('orbit_sanity_initial_context').execute({}, {signal:abort.signal})).rejects.toBeDefined()
  expect(fetchMock).toHaveBeenCalledTimes(1)
 })
 it('surfaces unresolved original-source links without changing Context text or private permissions', async () => {
  const text='# Entry\n## Sources\n1. Policy § overview — Web'
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({state:'READY',source:'sanity-context-mcp',content:[{type:'text',text}]}),{headers:{'Content-Type':'application/json'}})))
  expect(await tool('orbit_sanity_read_entries').execute({paths:['research/method']})).toMatchObject({content:[{text}],provenance:{status:'incomplete',referencesWithoutOriginalUrl:1,originalDocumentsRead:false}})
  expect(await tool('orbit_get_research_request').execute({})).toMatchObject({state:'CONSENT_REQUIRED'})
 })
 it('does not substitute local notes for an unavailable Sanity endpoint', async () => {
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('<html>missing</html>',{status:404})))
  expect(await tool('orbit_sanity_initial_context').execute({})).toMatchObject({state:'UNAVAILABLE',noFallback:true})
 })
})
