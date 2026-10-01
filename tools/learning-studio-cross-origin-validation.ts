/** Kaggle-dispatched checks using a fresh Chrome profile in owned E2B.
 * Public Astro runs on Orbit; portable Studio runs on an owned foreign origin.
 * No credentials, fake identity, injected registry, publication, or human review.
 */
import {createServer} from 'node:http'
import {spawn, type ChildProcess} from 'node:child_process'
import {createHash, randomUUID, timingSafeEqual} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {BrowserRpc} from './webmcp-browser'

const secret=process.env.ORBIT_CROSS_ORIGIN_CHECK_TOKEN
if(!secret||secret.length<40)throw Error('MISSION_TOKEN_REQUIRED')
if(process.platform!=='linux'||process.env.ORBIT_VALIDATION_HOST!=='E2B')throw Error('E2B_ONLY')
const foreign=new URL(process.env.ORBIT_FOREIGN_ORIGIN??'')
if(foreign.protocol!=='https:'||foreign.username||foreign.password||foreign.port||foreign.pathname!=='/'||foreign.search||foreign.hash||
  !/^[a-z0-9-]+\.(?:e2b\.app|e2b\.dev)$/.test(foreign.hostname))throw Error('OWNED_E2B_HTTPS_ORIGIN_REQUIRED')
const expectedRelease=process.env.ORBIT_FORMATION_RELEASE_SHA256
if(!expectedRelease||!/^[a-f0-9]{64}$/.test(expectedRelease))throw Error('PINNED_RELEASE_REQUIRED')
const port=Number(process.env.ORBIT_CROSS_ORIGIN_CHECK_PORT??8021)
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_PORT')
const output='/home/user/learning-studio-cross-origin-results'
const publicOrigin='https://orbit.securedme.ca'
type Check={name:string;passed:boolean;observation?:unknown}
type Status={state:'idle'|'running'|'complete';runId?:string;success?:boolean;checks:Check[];errors:string[];[key:string]:unknown}
let retired=false,busy=false
let status:Status={state:'idle',checks:[],errors:[],host:'E2B',orchestrator:'Kaggle',modelCalls:0}
const toolNames=['orbit_get_capabilities','orbit_get_research_protocol','orbit_sanity_initial_context','orbit_sanity_read_entries','orbit_get_research_request','orbit_get_mission_summary','orbit_list_research_points','orbit_search_sources','orbit_read_source_record','orbit_present_research','orbit_classify_evidence','orbit_compare_claims','orbit_find_relations','orbit_resolve_hold','orbit_trace_impact','orbit_get_learning_mission','orbit_get_learning_protocol','orbit_plan_learning_activity','orbit_prepare_experiment','orbit_read_learning_artifact','orbit_get_learning_support','orbit_check_understanding','orbit_prepare_transfer','orbit_present_learning_work','orbit_get_learning_journal']

async function campaign(runId:string){
  const started=Date.now(),deadline=started+150_000,folder=join(output,runId),profile=join(folder,'chrome-profile'),downloads=join(folder,'downloads')
  await mkdir(profile,{recursive:true});await mkdir(downloads,{recursive:true})
  status={state:'running',runId,checks:[],errors:[],host:'E2B',orchestrator:'Kaggle',modelCalls:0,
    foreignOrigin:foreign.origin,publicCourseOrigin:publicOrigin,expectedRelease,personalSessionExported:false,authenticatedStudio:false,
    publicationExecuted:false,humanAcknowledgement:false,fixtureAuthority:'Automated synthetic test setup only.',
    logout:{state:'NOT_RUN',reason:'Fresh isolated profile has no authenticated Sanity session.'}}
  let chrome:ChildProcess|undefined,rpc:BrowserRpc|undefined,session='',chromeMajor=0
  const requests:Array<{path:string;method:string;authorizationPresent:boolean;cookiePresent:boolean}>=[]
  const responses:Array<{path:string;status:number;allowOrigin:string|null;allowCredentials:string|null}>=[]
  const record=(name:string,passed:boolean,observation?:unknown)=>{status.checks.push({name,passed,...(observation===undefined?{}:{observation})})}
  const must=(name:string,passed:boolean,observation?:unknown)=>{record(name,passed,observation);if(!passed)throw Error('CHECK_FAILED:'+name)}
  const remaining=()=>{const ms=deadline-Date.now();if(ms<=0)throw Error('CAMPAIGN_TIME_BOUND');return ms}
  const call=async(method:string,params:unknown={})=>rpc!.call(method,params,session,Math.min(12_000,remaining()))
  const evaluate=async(expression:string)=>{
    const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})
    if(result.exceptionDetails){
      const description=String(result.exceptionDetails.exception?.description??'').split('\n')[0]
      const known=['UI_NOT_READY','NATIVE_REGISTRY_NOT_READY','FOREIGN_ORIGIN_CHANGED','CONTROL_NOT_FOUND','PERMISSION_CONTROL_NOT_FOUND','TOOL_NOT_FOUND']
      const reason=known.find(value=>description===`Error: ${value}`)
      throw Error('PAGE_EVALUATION_FAILED'+(reason?':'+reason:''))
    }
    return result.result?.value
  }
  const wait=async(expression:string,maximum=7000)=>evaluate(`(async()=>{const end=performance.now()+${maximum};while(performance.now()<end){if(${expression})return true;await new Promise(r=>setTimeout(r,50));}throw Error('UI_NOT_READY')})()`)
  const click=async(selector:string)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('CONTROL_NOT_FOUND');e.click();return true})()`)
  const permission=async(name:string,value:boolean)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify('[data-permission="'+name+'"]')});if(!e)throw Error('PERMISSION_CONTROL_NOT_FOUND');e.checked=${value};e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`)
  const discover=async()=>{
    await wait(`document.modelContext?.getTools&&document.modelContext?.executeTool&&document.querySelector('[data-formation]')?.dataset.mounted==='true'`)
    return evaluate(`(async()=>{for(let i=0;i<80;i++){const tools=await document.modelContext.getTools();if(tools.length===25)return tools.map(t=>({name:t.name,origin:t.origin,inputSchema:t.inputSchema}));await new Promise(r=>setTimeout(r,75));}throw Error('NATIVE_REGISTRY_NOT_READY')})()`)
  }
  const execute=async(name:string,args:unknown={})=>{
    const result=await evaluate(`(async()=>{if(location.origin!==${JSON.stringify(publicOrigin)})throw Error('FOREIGN_ORIGIN_CHANGED');const tools=await document.modelContext.getTools();const tool=tools.find(t=>t.name===${JSON.stringify(name)}&&(!t.origin||t.origin===location.origin));if(!tool)throw Error('TOOL_NOT_FOUND');return document.modelContext.executeTool(tool,${chromeMajor>=155?JSON.stringify(args):JSON.stringify(JSON.stringify(args))})})()`)
    return typeof result==='string'?JSON.parse(result):result
  }
  const navigate=async(path:string,origin=publicOrigin)=>{await call('Page.navigate',{url:origin+path});await wait(`document.readyState==='complete'&&location.origin===${JSON.stringify(origin)}&&location.pathname===${JSON.stringify(path)}`)}
  let publicReleaseResponse:{requestId:string,status:number,mimeType:string}|undefined
  const validatePortableStudio=async()=>{
    status.portableStudioAttempted=true;status.stage='portable-studio-navigation'
    await navigate('/formation/studio/',foreign.origin)
    await wait(`document.body.innerText.length>50`,12_000)
    const signedOut=await evaluate(`(async()=>({learningUI:!!document.querySelector('.orbit-learning-studio'),loginVisible:/sign in|log in|login|connect|connexion/i.test(document.body.innerText),tools:document.modelContext?.getTools?await document.modelContext.getTools():[]}))()`)
    must('foreign-portable-studio-requires-native-login',!signedOut.learningUI&&signedOut.loginVisible&&signedOut.tools.length===0,{learningUI:signedOut.learningUI,loginVisible:signedOut.loginVisible,registeredTools:signedOut.tools.length})
    const foreignOutline=await evaluate(`(async()=>{const response=await fetch(${JSON.stringify(publicOrigin+'/api/v1/course-context/outline')},{credentials:'omit',headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)});const data=await response.json();return {httpStatus:response.status,state:data.state,knowledgeBase:data.knowledgeBase}})()`)
    must('foreign-browser-can-read-public-course-context',foreignOutline.httpStatus===200&&foreignOutline.state==='READY'&&foreignOutline.knowledgeBase==='kbbBvrClyweF',foreignOutline)
    record('course-gateway-allows-foreign-read-without-credentials',responses.length>0&&responses.every(row=>[foreign.origin,'*'].includes(row.allowOrigin??'')&&row.allowCredentials!=='true'),responses)
    status.authenticatedStudioValidation={state:'NOT_RUN',reason:'No personal session or credentials are copied into E2B. HTTPS Sanity CORS and a native authenticated session are separate prerequisites.'}
    status.publicationValidation={state:'NOT_RUN',reason:'A real Content Lake write and read-only rejection require authenticated native Studio sessions; public course checks are not substitutes.'}
  }
  try{
    status.stage='public-release-read'
    const release=await fetch(foreign.origin+'/formation/release.json',{credentials:'omit',headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15_000)})
    const releaseReader=release.body?.getReader()
    if(!releaseReader)throw Error('RELEASE_MANIFEST_UNAVAILABLE')
    const releaseChunks:Buffer[]=[]
    let releaseSize=0
    try{
      for(;;){
        const {done,value}=await releaseReader.read();if(done)break
        releaseSize+=value.byteLength
        if(releaseSize>1_000_000)throw Error('RELEASE_MANIFEST_BOUND')
        releaseChunks.push(Buffer.from(value));remaining()
      }
    }finally{await releaseReader.cancel()}
    const releaseBytes=Buffer.concat(releaseChunks)
    const metadata=release.ok?JSON.parse(releaseBytes.toString('utf8')):null
    const releaseSha256=createHash('sha256').update(releaseBytes).digest('hex')
    must('foreign-host-serves-pinned-formation-release',release.ok&&releaseSha256===expectedRelease&&metadata?.scope==='formation-only',{httpStatus:release.status,releaseSha256})
    const binary=process.env.ORBIT_CHROME_BINARY??'/usr/bin/google-chrome'
    chrome=spawn(binary,['--headless=new','--disable-dev-shm-usage',`--user-data-dir=${profile}`,'--remote-debugging-port=0','--enable-blink-features=WebMCPTesting','--no-first-run','--no-default-browser-check','--disable-sync','about:blank'],{stdio:['ignore','ignore','ignore'],shell:false})
    chrome.on('error',()=>undefined)
    let debuggingPort=''
    for(let i=0;i<450;i++){
      try{debuggingPort=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];if(/^\d+$/.test(debuggingPort))break}catch{}
      if(chrome.exitCode!==null||chrome.signalCode!==null)throw Error('CHROME_START_FAILED')
      remaining();await new Promise(r=>setTimeout(r,100))
    }
    if(!debuggingPort)throw Error('CHROME_DEBUGGING_UNAVAILABLE')
    status.stage='browser-attachment'
    const version:any=await(await fetch(`http://127.0.0.1:${debuggingPort}/json/version`)).json()
    chromeMajor=Number(version.Browser.match(/\/(\d+)/)?.[1]);status.chromeMajor=chromeMajor
    rpc=await BrowserRpc.connect(version.webSocketDebuggerUrl)
    const target=await rpc.call('Target.createTarget',{url:'about:blank'})
    const attached=await rpc.call('Target.attachToTarget',{targetId:target.targetId,flatten:true});session=attached.sessionId
    // Project only fixed public course paths and header-presence booleans.
    // No headers, body, credentials, account details, or conversations are retained.
    ;(rpc as any).ws.addEventListener('message',(event:any)=>{
      try{
        const message=JSON.parse(String(event.data));if(message.sessionId!==session)return
        if(message.method==='Network.requestWillBeSent'){
          const request=message.params.request,url=new URL(request.url)
          if(url.origin===publicOrigin&&/^\/api\/v1\/course-context\/(outline|entries)$/.test(url.pathname)){
            const headers=Object.fromEntries(Object.entries(request.headers??{}).map(([key,value])=>[key.toLowerCase(),value]))
            requests.push({path:url.pathname,method:request.method,authorizationPresent:Object.hasOwn(headers,'authorization'),cookiePresent:Object.hasOwn(headers,'cookie')})
          }
        }
        if(message.method==='Network.responseReceived'){
          const response=message.params.response,url=new URL(response.url)
          if(url.origin===publicOrigin&&url.pathname==='/formation/release.json')publicReleaseResponse={requestId:message.params.requestId,status:response.status,mimeType:response.mimeType}
          if(url.origin===publicOrigin&&/^\/api\/v1\/course-context\/(outline|entries)$/.test(url.pathname)){
            const headers=Object.fromEntries(Object.entries(response.headers??{}).map(([key,value])=>[key.toLowerCase(),String(value)]))
            responses.push({path:url.pathname,status:response.status,allowOrigin:headers['access-control-allow-origin']??null,allowCredentials:headers['access-control-allow-credentials']??null})
          }
        }
      }catch{}
    })
    await call('Network.enable');await rpc.call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads})
    status.stage='public-native-release-read'
    await navigate('/formation/release.json')
    if(!publicReleaseResponse)throw Error('NATIVE_RELEASE_RESPONSE_UNAVAILABLE')
    const publicBody=await call('Network.getResponseBody',{requestId:publicReleaseResponse.requestId})
    const publicReleaseBytes=Buffer.from(publicBody.body,publicBody.base64Encoded?'base64':'utf8')
    if(publicReleaseBytes.length>1_000_000)throw Error('RELEASE_MANIFEST_BOUND')
    const publicReleaseSha256=createHash('sha256').update(publicReleaseBytes).digest('hex')
    must('public-orbit-serves-pinned-formation-release',publicReleaseResponse.status===200&&publicReleaseSha256===expectedRelease,{httpStatus:publicReleaseResponse.status,releaseSha256:publicReleaseSha256,bytes:publicReleaseBytes.length,contentType:publicReleaseResponse.mimeType,transport:'Native Chrome navigation; no User-Agent modification or security exception.',...(publicReleaseSha256!==expectedRelease?{publicPrefix:publicReleaseBytes.toString('utf8').slice(0,160)}:{})})
    status.stage='lab-navigation'
    await navigate('/formation/lab/')
    status.stage='native-tool-discovery'
    const tools=await discover()
    must('public-orbit-astro-page-has-native-25-tools',tools.length===25&&new Set(tools.map((t:any)=>t.name)).size===25&&toolNames.every(name=>tools.some((t:any)=>t.name===name)),{toolCount:tools.length,origin:publicOrigin})
    const capabilities=await execute('orbit_get_capabilities')
    must('fresh-public-session-has-no-grants-or-engine',capabilities.state==='READY'&&Object.values(capabilities.permissions).every(value=>value===false)&&capabilities.classification.selection.length===0)
    must('public-private-read-refused-before-sharing',(await execute('orbit_get_research_request')).state==='CONSENT_REQUIRED')
    const context=await execute('orbit_sanity_initial_context')
    record('public-native-course-context-is-ready',context.state==='READY'&&context.knowledgeBase==='kbbBvrClyweF',{state:context.state,httpStatus:context.httpStatus??null,knowledgeBase:context.knowledgeBase??null})
    if(context.state==='READY'){
      const outline=context.content?.filter((part:any)=>part.type==='text').map((part:any)=>part.text).join('\n')??''
      const path=outline.split('\n').filter((line:string)=>line.includes(' — ')).map((line:string)=>line.split(' — ')[0].trim()).find((line:string)=>/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(line))
      if(path){const entry=await execute('orbit_sanity_read_entries',{paths:[path]});record('public-native-course-entry-read-is-ready',entry.state==='READY',{state:entry.state})}
      else record('public-native-course-entry-read-is-ready',false,{reason:'NO_DECLARED_ENTRY_PATH'})
    }
    record('course-transport-has-no-credential-headers',requests.length>0&&requests.every(row=>row.method==='GET'&&!row.authorizationPresent&&!row.cookiePresent),{observedRequests:requests.length})
    await click('.formation-header a[href="/formation/projets/"]');await wait(`location.pathname==='/formation/projets/'`);await discover()
    const fixture={schemaVersion:'orbit-learning-colab-v1',missionId:'module-1',moduleId:1,attemptId:'synthetic-cross-origin',parameters:{fixture:true},prediction:'Synthetic import boundary fixture.',observations:['Not a notebook execution.'],explanation:'No learner understanding examined.',assistance:['Automated test harness.'],limitations:['This receipt covers browser mechanisms only.'],openQuestion:'',status:'external-declared',artifacts:[{path:'frontend/fixture.js',content:'export const fixture = true;\n',mediaType:'text/javascript'}]}
    const fixturePath=join(folder,'synthetic-colab-fixture.json');await writeFile(fixturePath,JSON.stringify(fixture))
    await click('[data-import-artifact]')
    const doc=await call('DOM.getDocument'),input=await call('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'[data-learning-import]'})
    await call('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[fixturePath]})
    await wait(`document.querySelectorAll('[data-share-artifact]').length===2`)
    must('public-import-remains-declared-and-not-executed',await evaluate(`document.querySelector('[data-learning-surface]').textContent.includes('external-declared')&&!document.querySelector('[data-learning-surface]').textContent.includes('human-reviewed')`))
    await evaluate(`(()=>{const e=document.querySelector('[data-share-artifact]');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`)
    await click('[data-permissions]');await permission('agentRead',true);await click('[data-dialog-close]')
    const summary=await execute('orbit_get_mission_summary'),mission=await execute('orbit_get_learning_mission',{sessionId:summary.requestId})
    const artifact=await execute('orbit_read_learning_artifact',{sessionId:summary.requestId,expectedRevision:summary.revision,artifactId:mission.data.selectedArtifactIds[0]})
    must('public-native-selected-artifact-read',artifact.state==='READY'&&artifact.data.executable===false&&artifact.data.humanApproval===false)
    await click('[data-export]')
    let exported:Buffer|undefined
    for(let i=0;i<60;i++){try{exported=await readFile(join(downloads,'orbit-learning-session.json'));break}catch{}await new Promise(r=>setTimeout(r,100))}
    const exportedSession=exported?JSON.parse(exported.toString('utf8')):null
    must('public-real-download-removes-access-grants',Boolean(exportedSession)&&exportedSession.artifacts.length===2&&Object.values(exportedSession.permissions).every(value=>value===false)&&exportedSession.sharedArtifactIds.length===0&&exportedSession.engineSelection.length===0,{bytes:exported?.length??0,sha256:exported?createHash('sha256').update(exported).digest('hex'):null})
    await click('[data-permissions]');await click('[data-revoke]')
    must('public-native-revocation-refuses-private-read',(await execute('orbit_get_research_request')).state==='CONSENT_REQUIRED')
    must('public-unsaved-session-has-no-local-copy',await evaluate(`Object.keys(localStorage).filter(key=>key.startsWith('orbit.learning.v1:')).length===0`))
    await validatePortableStudio()
  }catch(error){
    status.errors.push(error instanceof Error&&/^[A-Z0-9_:.\-]+$/.test(error.message)?error.message:'CROSS_ORIGIN_CHECK_FAILED')
    // Only public page shape and API availability are retained. Never collect
    // form values, private learner text, credentials, storage or conversations.
    if(rpc&&session){try{
      const diagnostic=await rpc.call('Runtime.evaluate',{expression:`({origin:location.origin,path:location.pathname,readyState:document.readyState,workspacePresent:!!document.querySelector('[data-formation]'),mounted:document.querySelector('[data-formation]')?.dataset.mounted==='true',registerTool:typeof document.modelContext?.registerTool,getTools:typeof document.modelContext?.getTools,executeTool:typeof document.modelContext?.executeTool,publicHeading:document.querySelector('h1')?.textContent?.slice(0,160)??null})`,returnByValue:true},session,3000)
      if(!diagnostic.exceptionDetails)status.publicFailureDiagnostic=diagnostic.result?.value
    }catch{}}
    if(rpc&&session&&!status.portableStudioAttempted){try{await validatePortableStudio()}catch{status.errors.push('PORTABLE_STUDIO_CHECK_FAILED')}}
  }
  finally{
    try{await rpc?.call('Browser.close',{},undefined,3000)}catch{}
    rpc?.close();chrome?.kill()
    status.state='complete';status.durationMs=Date.now()-started;status.success=status.errors.length===0&&status.checks.length>0&&status.checks.every(check=>check.passed)
    await writeFile(join(folder,'status.json'),JSON.stringify(status,null,2));busy=false
  }
}

const server=createServer(async(request,response)=>{
  response.setHeader('content-type','application/json');response.setHeader('cache-control','no-store')
  const supplied=Buffer.from(request.headers.authorization??''),expected=Buffer.from(`Bearer ${secret}`)
  const send=(code:number,value:unknown)=>{response.statusCode=code;response.end(JSON.stringify(value))}
  if(retired||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return send(401,{state:'UNAUTHORIZED'})
  if(request.method==='GET'&&request.url==='/status')return send(200,status)
  if(request.method==='POST'&&request.url==='/retire'){
    if(busy)return send(409,{state:'RUNNING'})
    retired=true;send(200,{state:'RETIRED'});setTimeout(()=>server.close(),1000).unref();return
  }
  if(request.method!=='POST'||request.url!=='/run')return send(404,{state:'UNAVAILABLE'})
  if(busy)return send(409,{state:'RUNNING'})
  let bytes=0;for await(const chunk of request){bytes+=chunk.length;if(bytes>2)return send(400,{state:'NO_INPUT_ALLOWED'})}
  busy=true;const runId='cross-origin-'+randomUUID();send(202,{state:'ACCEPTED',runId,poll:'/status'})
  void campaign(runId).catch(()=>{busy=false;status={...status,state:'complete',success:false,errors:[...status.errors,'WORKER_STORAGE_FAILURE']}})
})
server.listen(port,'0.0.0.0')
setTimeout(()=>server.close(),60*60*1000).unref()
