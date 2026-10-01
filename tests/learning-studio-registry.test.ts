/** Pure contract tests. These are not native-browser or autonomous-agent runs. */
import {afterEach,describe,expect,it,vi} from 'vitest'
import {LearningStore,LEARNING_TOOL_NAMES} from '../packages/learning/src/index'
import {createDossier} from '../packages/evidence-review/src/index'
import {createFormationTools,registerFormationTools,unregisterFormationTools,type LearningBrowserTool} from '../web/src/lib/learning-webmcp'

const originalNames=['orbit_get_capabilities','orbit_get_research_protocol','orbit_sanity_initial_context','orbit_sanity_read_entries','orbit_get_research_request','orbit_get_mission_summary','orbit_list_research_points','orbit_search_sources','orbit_read_source_record','orbit_present_research','orbit_classify_evidence','orbit_compare_claims','orbit_find_relations','orbit_resolve_hold','orbit_trace_impact']
function workspace(){return new LearningStore({projectId:'student-project',dataset:'production',userId:'student-1'})}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
function evidence(){
  const dossier=createDossier(),scope={subject:'card',property:'supported',value:'true',product:'course',mode:'animated',version:'1'}
  dossier.sources=[{id:'manual',title:'Synthetic course specification',url:'https://example.org/lesson',status:'read',version:'1',text:'The card can be selected with the keyboard.'}]
  dossier.claims=[{id:'keyboard',statement:'The card can be selected with the keyboard.',kind:'reported',disposition:'supported',scopeAttributes:scope,evidence:[{sourceId:'manual',quote:dossier.sources[0].text!,relation:'supports',scope}]}]
  return dossier
}
describe('portable Studio registry contracts',()=>{
  it('preserves files and exactly 25 tools through simulated Lab, Projects and Lab mounts on one account',async()=>{
    const store=workspace(),active=new Map<string,LearningBrowserTool>()
    const artifact=store.addArtifact({title:'Selected course brick',content:'export const retained = true;',origin:'learner'})
    store.shareSelection({artifactIds:[artifact.id]});store.setPermission('agentRead',true)
    const registerTool=vi.fn(async(tool:LearningBrowserTool,options:{signal:AbortSignal})=>{
      if(active.has(tool.name))throw Error('DUPLICATE_NATIVE_TOOL')
      active.set(tool.name,tool)
      options.signal.addEventListener('abort',()=>{if(active.get(tool.name)===tool)active.delete(tool.name)},{once:true})
    })
    vi.stubGlobal('document',Object.assign(new EventTarget(),{modelContext:{registerTool}}));vi.stubGlobal('window',new EventTarget())
    const firstLab=Symbol('first-lab'),projects=Symbol('projects'),secondLab=Symbol('second-lab')
    expect(await registerFormationTools(store,{owner:firstLab})).toBe('registered')
    const retainedLab=active.get('orbit_get_capabilities')!
    const projectRegistration=registerFormationTools(store,{owner:projects})
    unregisterFormationTools(store,firstLab)
    expect(await projectRegistration).toBe('registered')
    expect([...active.keys()]).toEqual([...originalNames,...LEARNING_TOOL_NAMES])
    expect(store.snapshot().permissions.agentRead).toBe(false)
    expect(store.snapshot().sharedArtifactIds).toEqual([])
    expect(store.snapshot().artifacts.map(item=>item.id)).toEqual([artifact.id])
    store.shareSelection({artifactIds:[artifact.id]});store.setPermission('agentRead',true)
    // A cleanup from the previous view cannot revoke freshly granted access.
    unregisterFormationTools(store,firstLab)
    expect(store.snapshot().permissions.agentRead).toBe(true)
    expect(await active.get('orbit_get_mission_summary')!.execute({})).toMatchObject({state:'READY',requestId:store.snapshot().id})
    const retainedProjects=active.get('orbit_get_capabilities')!
    const finalRegistration=registerFormationTools(store,{owner:secondLab})
    unregisterFormationTools(store,projects)
    expect(await finalRegistration).toBe('registered')
    expect(registerFormationTools(store,{owner:secondLab})).toBe(finalRegistration)
    expect(registerTool).toHaveBeenCalledTimes(75)
    expect([...active.keys()]).toEqual([...originalNames,...LEARNING_TOOL_NAMES])
    expect(store.snapshot().artifacts.map(item=>item.id)).toEqual([artifact.id])
    expect(store.snapshot().permissions.agentRead).toBe(false)
    await expect(retainedLab.execute({})).rejects.toThrow('ABORTED')
    await expect(retainedProjects.execute({})).rejects.toThrow('ABORTED')
    expect(await active.get('orbit_get_capabilities')!.execute({})).toMatchObject({state:'READY'})
    unregisterFormationTools(store,secondLab)
    expect(active.size).toBe(0)
  })
  it('retains the fifteen names and adds exactly the ten learning tools',async()=>{
    const store=workspace(),tools=createFormationTools(store)
    expect(new Set(tools.map(tool=>tool.name)).size).toBe(25)
    expect(tools.map(tool=>tool.name)).toEqual([...originalNames,...LEARNING_TOOL_NAMES])
    const capabilities=await tools[0].execute({}) as {state:string;classification:{selection:unknown[]};automaticActions:unknown[]}
    expect(capabilities.state).toBe('READY')
    expect(capabilities.classification.selection).toEqual([])
    expect(capabilities.automaticActions).toEqual([])
    expect(tools.some(tool=>/publish|approve|enrol/i.test(tool.name))).toBe(false)
  })
  it('discovery does not grant access to sources or private learner artefacts',async()=>{
    const store=workspace();store.setEvidenceDossier(evidence())
    const artifact=store.addArtifact({title:'Private code',content:'do not disclose',origin:'learner'})
    const tools=createFormationTools(store),snapshot=store.snapshot()
    const source=await tools.find(tool=>tool.name==='orbit_read_source_record')!.execute({sourceId:'manual'}) as {state:string}
    const privateFile=await tools.find(tool=>tool.name==='orbit_read_learning_artifact')!.execute({sessionId:snapshot.id,expectedRevision:snapshot.revision,artifactId:artifact.id}) as {state:string}
    expect(source.state).toBe('CONSENT_REQUIRED')
    expect(privateFile.state).toBe('CONSENT_REQUIRED')
    expect(store.snapshot().permissions.agentRead).toBe(false)
  })
  it('compares a human-selected pair, rejects a foreign claim and honours revocation',async()=>{
    const store=workspace();store.setEvidenceDossier(evidence());store.setEngineSelection(['baseline','n'],'human');store.setPermission('agentRead',true)
    const tool=createFormationTools(store).find(item=>item.name==='orbit_classify_evidence')!,snapshot=store.snapshot()
    const input={requestId:snapshot.id,expectedRevision:snapshot.revision,claimIds:['keyboard']}
    const result=await tool.execute(input) as {state:string;results:Array<{engine:string;result:Array<{engine:string}>}>}
    expect(result.state).toBe('READY');expect(result.results.map(row=>row.engine)).toEqual(['baseline','n'])
    expect(result.results.every(row=>row.result[0].engine===row.engine)).toBe(true)
    await expect(tool.execute({...input,claimIds:['foreign']})).rejects.toThrow('CLAIM_NOT_FOUND')
    store.revokeAgentAccess()
    expect((await tool.execute(input) as {state:string}).state).toBe('CONSENT_REQUIRED')
  })
  it('research deposits remain proposals and cannot fabricate a human review',async()=>{
    const store=workspace();store.setPermission('agentRead',true);store.setPermission('agentPropose',true)
    const snapshot=store.snapshot(),tool=createFormationTools(store).find(item=>item.name==='orbit_present_research')!
    const result=await tool.execute({requestId:snapshot.id,expectedRevision:snapshot.revision,submissionId:'research-proposal',report:'Check the cited conditions before accepting.',axes:[],sources:[]}) as {state:string}
    expect(result.state).toBe('PRESENTED');expect(store.snapshot().proposals[0].status).toBe('pending')
    expect(store.snapshot().reviews).toEqual([])
    await expect(tool.execute({requestId:snapshot.id,expectedRevision:store.snapshot().revision,report:'No review claimed.',axes:[],sources:[],humanApproved:true})).rejects.toThrow('UNKNOWN_FIELD')
  })
})
