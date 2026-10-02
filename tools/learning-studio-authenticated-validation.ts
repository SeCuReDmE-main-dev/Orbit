/** Kaggle-dispatched native Studio QA in one official E2B Desktop.
 * The human signs in directly and reviews/checks the publication acknowledgement.
 * Browser protocol uses an OS pipe, never an exposed debugging TCP service.
 */
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import {createHash,timingSafeEqual} from 'node:crypto'
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises'
import {createWriteStream} from 'node:fs'
import type {Readable,Writable} from 'node:stream'

const secret=process.env.ORBIT_STUDIO_CHECK_TOKEN,origin=process.env.ORBIT_STUDIO_ORIGIN
if(process.platform!=='linux'||process.env.ORBIT_VALIDATION_HOST!=='E2B'||!secret||secret.length<40)throw Error('OWNED_E2B_MISSION_REQUIRED')
if(!origin||!/^https:\/\/8000-[a-z0-9]+\.e2b\.app$/.test(origin))throw Error('EXACT_DESKTOP_ORIGIN_REQUIRED')
const profile='/home/user/orbit-studio-native-profile',folder='/home/user/orbit-studio-auth-results'
await mkdir(folder,{recursive:true})
// Retain the preceding controller's receipt before initialise writes this run.
// Recovery accepts only its exact origin and observed synthetic mutation.
let precedingReceipt:any
try{const prior=JSON.parse(await readFile(folder+'/status.json','utf8'));if(prior.schema==='orbit.authenticated-native-studio-qa.v1'&&prior.origin===origin&&Array.isArray(prior.checks))precedingReceipt=prior}catch{}
const chrome=spawn('/usr/bin/google-chrome',[`--user-data-dir=${profile}`,'--remote-debugging-pipe','--enable-blink-features=WebMCPTesting','--no-first-run','--no-default-browser-check','--disable-sync',origin+'/formation/studio/'],{stdio:['ignore','ignore','pipe','pipe','pipe'],env:{...process.env,DISPLAY:':0'}})
const startupLog=createWriteStream(folder+'/chrome-startup.private.log')
chrome.stderr?.pipe(startupLog);chrome.once('exit',()=>startupLog.end())
const input=chrome.stdio[3] as Writable,output=chrome.stdio[4] as Readable
let rpcId=0,buffer=Buffer.alloc(0),session='',major=0,retired=false,busy=false
type Pending={resolve:(value:any)=>void,reject:(error:Error)=>void,timer:ReturnType<typeof setTimeout>}
const pending=new Map<number,Pending>(),mutationResponses:Array<{status:number,path:string}>=[],logoutResponses:Array<{status:number,path:string}>=[]
output.on('data',(chunk:Buffer)=>{
  buffer=Buffer.concat([buffer,chunk]);let end
  while((end=buffer.indexOf(0))!==-1){
    const body=buffer.subarray(0,end).toString('utf8');buffer=buffer.subarray(end+1)
    if(!body)continue
    let message:any;try{message=JSON.parse(body)}catch{continue}
    const request=pending.get(message.id)
    if(request){clearTimeout(request.timer);pending.delete(message.id);message.error?request.reject(Error('NATIVE_PROTOCOL_FAILED')):request.resolve(message.result)}
    // Preserve mutation status only. Request headers, cookies and credentials
    // never enter the receipt, even after native human authentication.
    if(message.method==='Network.responseReceived'){
      try{const url=new URL(message.params.response.url);if(url.hostname==='pzscx4w8.api.sanity.io'&&/^\/v[^/]+\/data\/mutate\/production$/.test(url.pathname))mutationResponses.push({status:message.params.response.status,path:url.pathname});if(['api.sanity.io','pzscx4w8.api.sanity.io'].includes(url.hostname)&&/^\/v[^/]+\/auth\/logout$/.test(url.pathname))logoutResponses.push({status:message.params.response.status,path:url.pathname})}catch{}
    }
  }
})
chrome.on('error',()=>undefined)
chrome.on('exit',()=>{for(const item of pending.values()){clearTimeout(item.timer);item.reject(Error('NATIVE_BROWSER_CLOSED'))}pending.clear()})
function call(method:string,params:unknown={},target?:string,timeout=12000):Promise<any>{
  const id=++rpcId;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('NATIVE_PROTOCOL_TIMEOUT'))},timeout);pending.set(id,{resolve,reject,timer});input.write(JSON.stringify({id,method,params,...(target?{sessionId:target}:{})})+'\0')})
}
async function evaluate(expression:string,timeout=12000){const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},session,timeout);if(result.exceptionDetails){const reason=result.exceptionDetails.exception?.description?.match(/^Error: ([A-Z_]{1,80})(?:\n|$)/)?.[1];throw Error(reason??'NATIVE_PAGE_EVALUATION_FAILED')}return result.result?.value}
async function wait(expression:string,maximum=10000){return evaluate(`(async()=>{const end=performance.now()+${maximum};while(performance.now()<end){if(${expression})return true;await new Promise(r=>setTimeout(r,75));}throw Error('UI_NOT_READY')})()`)}
async function button(pattern:string){return evaluate(`(()=>{const b=Array.from(document.querySelectorAll('.orbit-learning-studio button')).find(b=>new RegExp(${JSON.stringify(pattern)},'i').test(b.textContent));if(!b||b.disabled)throw Error('CONTROL_NOT_READY');b.click();return true})()`)}
async function view(pattern:string){return evaluate(`(()=>{const a=Array.from(document.querySelectorAll('.orbit-learning-studio nav a')).find(a=>new RegExp(${JSON.stringify(pattern)},'i').test(a.textContent));if(!a)throw Error('VIEW_NOT_READY');a.click();return true})()`)}
async function fill(selector:string,text:string){return evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('FIELD_NOT_READY');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(text)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`)}
async function permission(pattern:string,allowed:boolean){return evaluate(`(()=>{const label=Array.from(document.querySelectorAll('.orbit-learning-studio fieldset label')).find(e=>new RegExp(${JSON.stringify(pattern)},'i').test(e.textContent));const input=label?.querySelector('input[type=checkbox]');if(!input)throw Error('PERMISSION_CONTROL_NOT_READY');if(input.checked!==${allowed})input.click();return input.checked===${allowed}})()`)}
async function nativeTool(name:string,args:unknown={}){
  const result=await evaluate(`(async()=>{const fingerprint=location.origin+location.pathname+location.search;if(location.origin!==${JSON.stringify(origin)})throw Error('EXACT_NATIVE_TOOL_ORIGIN_REQUIRED');const tools=await document.modelContext.getTools();const tool=tools.find(t=>t.name===${JSON.stringify(name)}&&(!t.origin||t.origin===location.origin));if(!tool)throw Error('NATIVE_TOOL_NOT_FOUND');const result=await document.modelContext.executeTool(tool,${major>=155?JSON.stringify(args):JSON.stringify(JSON.stringify(args))});if(location.origin+location.pathname+location.search!==fingerprint)throw Error('NATIVE_TOOL_PAGE_CHANGED');return result})()`,45000)
  return typeof result==='string'?JSON.parse(result):result
}
async function nativeRegistry(name:string){
  await wait(`document.modelContext?.getTools&&document.modelContext?.executeTool`)
  const tools=await evaluate(`(async()=>{for(let i=0;i<80;i++){const tools=await document.modelContext.getTools();if(tools.length===25)return tools.map(t=>({name:t.name,origin:t.origin}));await new Promise(r=>setTimeout(r,75));}throw Error('NATIVE_REGISTRY_NOT_READY')})()`)
  record(name,tools.length===25&&new Set(tools.map((t:any)=>t.name)).size===25&&tools.every((t:any)=>/^orbit_[a-z_]+$/.test(t.name)&&(!t.origin||t.origin===origin)),{toolCount:tools.length})
}
const receipt:any={schema:'orbit.authenticated-native-studio-qa.v1',state:'WAITING_FOR_NATIVE_HUMAN_LOGIN',orchestrator:'Kaggle',browserHost:'E2B Desktop',origin,checks:[],modelCalls:0,personalSessionExported:false,ownerTokenTransferred:false,remoteDebuggingTcpExposed:false,humanAcknowledgementFabricated:false,contentLakeWriteExecuted:false,readOnlyServerRejection:{state:'NOT_RUN',reason:'Requires a separate existing read-only native identity.'},fullMissionComplete:false}
function record(name:string,passed:boolean,observation?:unknown){receipt.checks.push({name,passed,...(observation===undefined?{}:{observation})});if(!passed)throw Error('CHECK_FAILED:'+name)}
let preview:any,firstDocument:any
const save=()=>writeFile(folder+'/status.json',JSON.stringify(receipt,null,2))
async function initialise(){
  const version=await call('Browser.getVersion');major=Number(version.product?.match(/\/(\d+)/)?.[1]);receipt.chromeMajor=major
  const targets=await call('Target.getTargets'),target=targets.targetInfos.find((item:any)=>item.type==='page'&&item.url.startsWith(origin!+'/formation/studio/'))??targets.targetInfos.find((item:any)=>item.type==='page')
  if(!target)throw Error('NATIVE_PAGE_TARGET_UNAVAILABLE')
  session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId
  await call('Page.enable',{},session);await call('Network.enable',{},session)
  if(precedingReceipt){receipt.priorAttempts=[...(precedingReceipt.priorAttempts??[]),{state:precedingReceipt.state,checks:precedingReceipt.checks,error:precedingReceipt.error??null,preview:precedingReceipt.preview,contentLakeWriteExecuted:precedingReceipt.contentLakeWriteExecuted}];receipt.recoveryAvailable=Boolean(precedingReceipt.preview)}
  await save()
}
async function nativeState(){return evaluate(`(async()=>({origin:location.origin,learningUI:!!document.querySelector('.orbit-learning-studio'),tools:document.modelContext?.getTools?(await document.modelContext.getTools()).map(t=>t.name):[]}))()`)}
async function login(){
  // A bounded reload on this controller's one Studio page; never accept a URL
  // or an authentication value from the caller.
  await call('Page.reload',{ignoreCache:false},session)
  const signals=await evaluate(`(async()=>{for(let i=0;i<80;i++){const text=document.body?.innerText??'';const learningSurface=!!document.querySelector('.orbit-learning-studio');const loginScreen=/Choose login provider|Sign in to Sanity|Log in to Sanity|Connexion à Sanity|Connect to Sanity/i.test(text);const corsError=/CORS|origin is not allowed|Origin not allowed/i.test(text);if(learningSurface||loginScreen||corsError)return{origin:location.origin,learningSurface,loginScreen,corsError};await new Promise(r=>setTimeout(r,100));}return{origin:location.origin,learningSurface:!!document.querySelector('.orbit-learning-studio'),loginScreen:false,corsError:false}})()`)
  if(signals.origin!==origin)throw Error('EXACT_NATIVE_LOGIN_ORIGIN_REQUIRED')
  receipt.loginPreparation={...signals,reloadedFromKaggle:true,credentialsEnteredByAgent:false}
  receipt.state=signals.learningSurface?'NATIVE_AUTHENTICATED_SURFACE_READY':signals.loginScreen?'WAITING_FOR_NATIVE_HUMAN_LOGIN':signals.corsError?'CORS_SCREEN_PRESENT':'NATIVE_LOGIN_SCREEN_NOT_IDENTIFIED'
  await save()
}
async function prepare(){
  if(receipt.checks.length){
    receipt.priorAttempts??=[]
    receipt.priorAttempts.push({state:receipt.state,checks:structuredClone(receipt.checks),error:receipt.error??null})
    receipt.checks=[];delete receipt.error
  }
  const state=await nativeState();record('native-authenticated-studio-on-exact-foreign-host',state.origin===origin&&state.learningUI)
  await nativeRegistry('portable-studio-native-25-tools')
  const capabilities=await nativeTool('orbit_get_capabilities')
  const freshControls=await evaluate(`(()=>{const inputs=Array.from(document.querySelectorAll('.orbit-learning-studio fieldset input[type=checkbox]'));return {count:inputs.length,allOff:inputs.every(e=>!e.checked)}})()`)
  record('native-fresh-session-has-six-permissions-off-and-no-engine',capabilities.state==='READY'&&Object.keys(capabilities.permissions??{}).length===6&&Object.values(capabilities.permissions).every(v=>v===false)&&capabilities.classification?.selection?.length===0&&freshControls.count===6&&freshControls.allOff,{permissionCount:freshControls.count})
  record('native-private-read-refused-before-sharing',(await nativeTool('orbit_get_research_request')).state==='CONSENT_REQUIRED')
  const context=await nativeTool('orbit_sanity_initial_context')
  record('native-course-context-has-audited-provenance',context.state==='READY'&&context.source==='sanity-context-mcp'&&context.knowledgeBase==='kbbBvrClyweF'&&context.projection==='public-course-allowlist-v1'&&context.upstreamTool==='initial_context'&&context.auditedRevision==='d2c6279c-4ded-44de-a45e-f5e8e63bdf94',{state:context.state,projection:context.projection,auditedRevision:context.auditedRevision})
  const paths=(context.content??[]).filter((p:any)=>p.type==='text').flatMap((p:any)=>String(p.text).split('\n')).filter((line:string)=>line.includes(' — ')).map((line:string)=>line.split(' — ')[0].trim()).filter((path:string)=>/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path))
  record('native-course-outline-has-nine-admitted-entry-paths',paths.length===9&&new Set(paths).size===9,{entryCount:paths.length})
  const entry=await nativeTool('orbit_sanity_read_entries',{paths:[paths[0]]})
  record('native-course-entry-has-audited-source-citations',entry.state==='READY'&&entry.knowledgeBase===context.knowledgeBase&&entry.auditedRevision===context.auditedRevision&&entry.upstreamTool==='knowledge_base_read'&&entry.auditedCitations?.length===1&&entry.auditedCitations[0].path===paths[0]&&entry.auditedCitations[0].sourceIds?.length>0&&entry.auditedCitations[0].fragmentsAreIndependentSources===false,{state:entry.state,citationGroups:entry.auditedCitations?.length??0,sourceCount:entry.auditedCitations?.[0]?.sourceIds?.length??0})
  record('actual-studio-destination',await evaluate(`document.querySelector('.orbit-learning-studio').textContent.includes('pzscx4w8/production')`))
  // Use real host navigation. Never construct a fake current user or replace
  // plugin state. Imported files are public synthetic test fixtures only.
  await evaluate(`(()=>{const a=Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')?.includes('/orbit-learning-projects'));if(!a)throw Error('PROJECT_TOOL_LINK_NOT_READY');a.click();return true})()`)
  await wait(`document.querySelector('.orbit-learning-studio nav')&&/Mes projets|My projects|Mis proyectos/.test(document.querySelector('.orbit-learning-studio h1')?.textContent??'')`)
  await nativeRegistry('native-project-navigation-keeps-one-25-tool-registry')
  await view('^Fichiers$|^Files$|^Archivos$')
  const fixtures=[['orbit-publication-synthetic-brick.js',"export const orbitQaFixture = Object.freeze({kind: 'synthetic-publication-test', module: 1});\n"],['orbit-synthetic-private-note.txt','SYNTHETIC_UNSELECTED_ARTIFACT_20261001: must remain in this session.\n']]
  for(const [name,text] of fixtures){
    const path=folder+'/'+name;await writeFile(path,text)
    const doc=await call('DOM.getDocument',{},session),file=await call('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.orbit-learning-studio input[type=file]'},session)
    await call('DOM.setFileInputFiles',{nodeId:file.nodeId,files:[path]},session)
    await wait(`document.querySelector('.orbit-learning-studio').textContent.includes(${JSON.stringify(name)})`)
  }
  await view('^Journal$|^Diario$')
  await fill('.orbit-learning-studio textarea','SYNTHETIC_PRIVATE_JOURNAL_20261001: test marker only; do not publish.')
  await button('Conserver mon bilan|Keep my reflection|Conservar mi reflexión')
  await verifyPersistence(fixtures)
  await view('^Partage$|^Sharing$|^Compartir$')
  await evaluate(`(()=>{const label=Array.from(document.querySelectorAll('.orbit-learning-studio fieldset label')).find(e=>/contenu publiable|publishable content|contenido publicable/i.test(e.textContent));if(!label)throw Error('PUBLICATION_PERMISSION_NOT_READY');const e=label.querySelector('input');if(!e.checked)e.click();return true})()`)
  await fill('.orbit-learning-studio input[maxlength="160"]','Orbit QA — synthetic selected artifact — 2026-10-01')
  await evaluate(`(()=>{const label=Array.from(document.querySelectorAll('.orbit-learning-studio label')).find(e=>e.textContent.trim()==='orbit-publication-synthetic-brick.js');if(!label)throw Error('SELECTED_ARTIFACT_NOT_READY');const e=label.querySelector('input');if(!e.checked)e.click();return true})()`)
  await preparePreview()
}
async function verifyPersistence(fixtures:string[][]){
  await permission('Sauvegarder explicitement|Explicitly save|Guardar explícitamente',true)
  await permission('l’assistant à lire|assistant to read|asistente leer',true)
  await view('^Fichiers$|^Files$|^Archivos$')
  await evaluate(`(()=>{const inputs=Array.from(document.querySelectorAll('.orbit-learning-studio .ol-grid label input[type=checkbox]'));if(inputs.length!==2)throw Error('SYNTHETIC_ARTIFACT_SELECTION_NOT_READY');for(const input of inputs)if(!input.checked)input.click();return true})()`)
  await view('^Journal$|^Diario$')
  await evaluate(`(()=>{const label=Array.from(document.querySelectorAll('.orbit-learning-studio article.ol-card')).find(e=>e.textContent.includes('SYNTHETIC_PRIVATE_JOURNAL_20261001'));const input=label?.querySelector('input[type=checkbox]');if(!input)throw Error('SYNTHETIC_JOURNAL_SELECTION_NOT_READY');if(!input.checked)input.click();return true})()`)
  await button('Enregistrer explicitement la version actuelle|Explicitly save the current version|Guardar explícitamente la versión actual')
  await wait(`Array.from(document.querySelectorAll('.orbit-learning-studio strong')).some(e=>/ · saved$/.test(e.textContent))`)
  record('native-explicit-browser-save-confirmed',true)
  await call('Page.reload',{ignoreCache:false},session)
  await wait(`document.querySelector('.orbit-learning-studio nav')&&/Mes projets|My projects|Mis proyectos/.test(document.querySelector('.orbit-learning-studio h1')?.textContent??'')`)
  await nativeRegistry('native-reload-registers-25-tools-once')
  const afterReload=await nativeTool('orbit_get_capabilities')
  await view('^Fichiers$|^Files$|^Archivos$')
  record('native-reload-does-not-restore-work-or-permissions-implicitly',Object.values(afterReload.permissions??{}).length===6&&Object.values(afterReload.permissions).every(v=>v===false)&&afterReload.classification?.selection?.length===0&&await evaluate(`document.querySelectorAll('.orbit-learning-studio .ol-grid article').length===0`))
  await permission('Sauvegarder explicitement|Explicitly save|Guardar explícitamente',true)
  record('native-storage-choice-does-not-auto-restore',await evaluate(`document.querySelectorAll('.orbit-learning-studio .ol-grid article').length===0&&Array.from(document.querySelectorAll('.orbit-learning-studio strong')).some(e=>/ · awaiting-choice$/.test(e.textContent))`))
  await button('Reprendre la copie locale après consentement|Restore browser copy after consent|Restaurar copia local después del consentimiento')
  await wait(`document.querySelectorAll('.orbit-learning-studio .ol-grid article').length===2`)
  const restored=await nativeTool('orbit_get_capabilities')
  const artifacts=await evaluate(`(()=>{const rows=Array.from(document.querySelectorAll('.orbit-learning-studio .ol-grid article'));return {titles:rows.map(e=>e.querySelector('button')?.textContent),allUnshared:rows.every(e=>!e.querySelector('input[type=checkbox]')?.checked)}})()`)
  await view('^Journal$|^Diario$')
  const journal=await evaluate(`(()=>{const rows=Array.from(document.querySelectorAll('.orbit-learning-studio article.ol-card'));return {markerCount:rows.filter(e=>e.textContent.includes('SYNTHETIC_PRIVATE_JOURNAL_20261001')).length,allUnshared:rows.every(e=>!e.querySelector('input[type=checkbox]')?.checked)}})()`)
  record('native-explicit-restore-keeps-fixtures-and-revokes-sharing',artifacts.titles.length===2&&fixtures.every(([name])=>artifacts.titles.includes(name))&&artifacts.allUnshared&&journal.markerCount===1&&journal.allUnshared&&Object.values(restored.permissions??{}).length===6&&Object.values(restored.permissions).every(v=>v===false)&&restored.classification?.selection?.length===0,{artifacts:artifacts.titles.length,journalMarkers:journal.markerCount})
  record('native-restored-private-read-requires-fresh-sharing',(await nativeTool('orbit_get_research_request')).state==='CONSENT_REQUIRED')
  const downloads=folder+'/synthetic-export-'+Date.now();await mkdir(downloads,{recursive:true})
  await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads})
  await button('Exporter mon dossier|Export my dossier|Exportar mi expediente')
  let exported:Buffer|undefined
  for(let i=0;i<100;i++){const names=(await readdir(downloads)).filter(name=>/^orbit-learning-[a-zA-Z0-9_-]+\.json$/.test(name));if(names.length>1)throw Error('SYNTHETIC_EXPORT_NOT_UNIQUE');if(names.length===1){exported=await readFile(downloads+'/'+names[0]);break}await new Promise(r=>setTimeout(r,100))}
  const value=exported?JSON.parse(exported.toString('utf8')):null
  record('native-real-export-has-exact-fixtures-and-no-grants',value?.format==='orbit-learning-v1'&&value.artifacts?.length===2&&fixtures.every(([name,content])=>value.artifacts.some((a:any)=>a.title===name&&a.content===content))&&value.journal?.length===1&&value.journal[0].text==='SYNTHETIC_PRIVATE_JOURNAL_20261001: test marker only; do not publish.'&&Object.keys(value.permissions??{}).length===6&&Object.values(value.permissions).every(v=>v===false)&&value.sharedArtifactIds?.length===0&&value.sharedJournalIds?.length===0&&value.engineSelection?.length===0,{bytes:exported?.length??0,sha256:exported?createHash('sha256').update(exported).digest('hex'):null,artifacts:value?.artifacts?.length??0,journalEntries:value?.journal?.length??0})
  receipt.persistence={state:'EXPLICIT_SAVE_RELOAD_RESTORE_EXPORT_VERIFIED',syntheticOnly:true,downloadRemainsInOwnedVm:true,permissionsReset:true}
}
async function preparePreview(){
  await button('Prévisualiser le contenu exact|Preview exact content|Previsualizar contenido exacto')
  await wait(`Array.from(document.querySelectorAll('.orbit-learning-studio pre')).some(e=>e.textContent.includes('"_type": "orbitLearningPublication"'))`)
  preview=await evaluate(`JSON.parse(Array.from(document.querySelectorAll('.orbit-learning-studio pre')).find(e=>e.textContent.includes('"_type": "orbitLearningPublication"')).textContent)`)
  const payload=JSON.parse(preview.payloadJson)
  record('preview-has-only-selected-synthetic-artifact',preview._type==='orbitLearningPublication'&&payload.artifacts.length===1&&payload.artifacts[0].title==='orbit-publication-synthetic-brick.js'&&!JSON.stringify(preview).includes('SYNTHETIC_PRIVATE_JOURNAL')&&!JSON.stringify(preview).includes('SYNTHETIC_UNSELECTED_ARTIFACT')&&!Object.hasOwn(payload,'journal')&&!Object.hasOwn(payload,'permissions')&&!Object.hasOwn(payload,'proposals'))
  const blocked=await evaluate(`Array.from(document.querySelectorAll('.orbit-learning-studio button')).find(e=>/Publier la sélection examinée|Publish reviewed selection|Publicar selección revisada/i.test(e.textContent))?.disabled===true`)
  record('publish-disabled-before-separate-human-acknowledgement',blocked)
  receipt.preview={documentId:preview._id,type:preview._type,title:preview.title,payloadSha256:createHash('sha256').update(preview.payloadJson).digest('hex'),selectedArtifacts:1,syntheticOnly:true}
  receipt.state='AWAITING_HUMAN_REVIEW_OF_EXACT_PREVIEW';await save()
}
async function readExact(id:string){
  if(!/^orbit\.learning\.[a-f0-9]{64}$/.test(id))throw Error('EXACT_SYNTHETIC_DOCUMENT_REQUIRED')
  const query='*[_id == $id]{_id,_type,title,moduleId,revision,publishedAt,payloadJson}',url='https://pzscx4w8.api.sanity.io/v2026-03-01/data/query/production?query='+encodeURIComponent(query)+'&%24id='+encodeURIComponent(JSON.stringify(id))
  // Dotted Sanity IDs require authenticated reads even in a public dataset.
  // Use this native browser's cookie session; never inspect/export credentials.
  const read=await evaluate(`(async()=>{if(location.origin!==${JSON.stringify(origin)}||!document.querySelector('.orbit-learning-studio'))throw Error('NATIVE_AUTHENTICATED_READ_REQUIRED');const response=await fetch(${JSON.stringify(url)},{credentials:'include',headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('NATIVE_EXACT_READBACK_FAILED');const data=await response.json();return data.result})()`,20000)
  if(!Array.isArray(read))throw Error('NATIVE_EXACT_READBACK_INVALID')
  return read
}
async function recoverPublication(){
  const prior=precedingReceipt,metadata=prior?.preview
  const observedMutation=prior?.checks?.some((check:any)=>check.name==='native-content-lake-mutation-success'&&check.passed===true&&Array.isArray(check.observation)&&check.observation.some((response:any)=>response.status>=200&&response.status<300))
  if(!observedMutation||prior.humanAcknowledgementObserved!==true||metadata?.type!=='orbitLearningPublication'||metadata.title!=='Orbit QA — synthetic selected artifact — 2026-10-01'||metadata.selectedArtifacts!==1||metadata.syntheticOnly!==true||!/^orbit\.learning\.[a-f0-9]{64}$/.test(metadata.documentId??'')||!/^[a-f0-9]{64}$/.test(metadata.payloadSha256??''))throw Error('OBSERVED_SYNTHETIC_MUTATION_REQUIRED')
  // This flag describes the preserved real 2xx mutation, not a new write.
  receipt.contentLakeWriteExecuted=true;receipt.humanAcknowledgementObserved=true;receipt.preview=structuredClone(metadata);receipt.recovery={state:'READING_EXISTING_SYNTHETIC_PUBLICATION',newMutationExecuted:false};await save()
  const docs=await readExact(metadata.documentId),document=docs[0]
  const payload=document?JSON.parse(document.payloadJson):null
  record('recovered-authenticated-exact-synthetic-publication-readback',docs.length===1&&document._id===metadata.documentId&&document._type===metadata.type&&document.title===metadata.title&&createHash('sha256').update(document.payloadJson).digest('hex')===metadata.payloadSha256&&payload?.format==='orbit-learning-publication-v1'&&payload.artifacts?.length===1&&payload.artifacts[0].title==='orbit-publication-synthetic-brick.js'&&payload.artifacts[0].content==="export const orbitQaFixture = Object.freeze({kind: 'synthetic-publication-test', module: 1});\n"&&!Object.hasOwn(payload,'journal')&&!Object.hasOwn(payload,'permissions')&&!Object.hasOwn(payload,'proposals')&&!JSON.stringify(document).includes('SYNTHETIC_PRIVATE_JOURNAL')&&!JSON.stringify(document).includes('SYNTHETIC_UNSELECTED_ARTIFACT'),{documentId:metadata.documentId,count:docs.length,payloadSha256:metadata.payloadSha256,transport:'Native authenticated browser query; no credential export.'})
  preview=document;firstDocument=document;receipt.recovery.state='EXISTING_PUBLICATION_VERIFIED_WITHOUT_NEW_MUTATION';receipt.state='PUBLICATION_VERIFIED';delete receipt.error;await save()
}
async function publish(replay=false){
  if(!preview)throw Error('REVIEWABLE_PREVIEW_REQUIRED')
  const acknowledged=await evaluate(`(()=>{const label=Array.from(document.querySelectorAll('.orbit-learning-studio label')).find(e=>/J’accepte que cette sélection|I accept that this selection|Acepto que esta selección/i.test(e.textContent));return label?.querySelector('input')?.checked===true})()`)
  if(!acknowledged)throw Error('NATIVE_HUMAN_ACKNOWLEDGEMENT_REQUIRED')
  receipt.humanAcknowledgementObserved=true;const before=mutationResponses.length
  await button('Publier la sélection examinée|Publish reviewed selection|Publicar selección revisada')
  await wait(`Array.from(document.querySelectorAll('.orbit-learning-studio [role=status]')).some(e=>/Sélection publiée|Selection published|Selección publicada/i.test(e.textContent))`)
  record(replay?'native-replay-mutation-success':'native-content-lake-mutation-success',mutationResponses.slice(before).some(r=>r.status>=200&&r.status<300),mutationResponses.slice(before))
  receipt.contentLakeWriteExecuted=true;receipt.state='MUTATION_OBSERVED_READBACK_PENDING';await save()
  const docs=await readExact(preview._id)
  record(replay?'immutable-replay-readback':'exact-synthetic-publication-readback',Array.isArray(docs)&&docs.length===1&&docs[0]._type===preview._type&&docs[0].payloadJson===preview.payloadJson&&docs[0].title===preview.title&&(!replay||docs[0].publishedAt===firstDocument.publishedAt),{documentId:preview._id,count:docs.length})
  if(!replay)firstDocument=docs[0]
  receipt.contentLakeWriteExecuted=true;receipt.state=replay?'PUBLICATION_AND_REPLAY_VERIFIED':'PUBLICATION_VERIFIED';await save()
}
async function logout(){
  const before=logoutResponses.length,state=await nativeState()
  record('authenticated-surface-before-native-logout',state.origin===origin&&state.learningUI)
  // The selectors derive from the installed Sanity UserMenu and @sanity/ui
  // MenuButton: id=user-menu, data-testid=user-menu, native Sign out action.
  await evaluate(`(()=>{const button=document.querySelector('button#user-menu');if(!button)throw Error('NATIVE_USER_MENU_NOT_READY');button.click();return true})()`)
  await wait(`document.querySelector('[data-testid="user-menu"]')`)
  await evaluate(`(()=>{const item=Array.from(document.querySelectorAll('[data-testid="user-menu"] [role="menuitem"]')).find(e=>/^Sign out$|^Se déconnecter$|^Déconnexion$|^Cerrar sesión$/i.test(e.textContent.trim()));if(!item)throw Error('NATIVE_LOGOUT_ACTION_NOT_READY');item.click();return true})()`)
  await wait(`!document.querySelector('.orbit-learning-studio')&&/Choose login provider|Sign in to Sanity|Log in to Sanity/i.test(document.body?.innerText??'')`)
  const tools=await evaluate(`(async()=>{for(let i=0;i<80;i++){const tools=document.modelContext?.getTools?await document.modelContext.getTools():[];if(!tools.length)return tools;await new Promise(r=>setTimeout(r,75));}return await document.modelContext.getTools()})()`)
  record('native-logout-removes-learning-surface-and-tools',tools.length===0&&await evaluate(`!document.querySelector('.orbit-learning-studio')`),{toolCount:tools.length})
  record('actual-native-server-logout-observed',logoutResponses.slice(before).some(response=>response.status>=200&&response.status<300),logoutResponses.slice(before))
  receipt.state='NATIVE_LOGOUT_VERIFIED';await save()
}
try{await initialise()}catch(error){receipt.state='CONTROLLER_STARTUP_FAILED';receipt.error=error instanceof Error&&/^[A-Z0-9_:.-]{1,200}$/.test(error.message)?error.message:'NATIVE_BROWSER_STARTUP_FAILED';await save();chrome.kill();throw Error(receipt.error)}
const server=createServer(async(req,res)=>{
  res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store')
  const given=Buffer.from(req.headers.authorization??''),expected=Buffer.from('Bearer '+secret)
  const send=(code:number,value:unknown)=>{res.statusCode=code;res.end(JSON.stringify(value))}
  if(retired||given.length!==expected.length||!timingSafeEqual(given,expected)){send(401,{state:'UNAUTHORIZED'});return}
  if(req.method==='GET'&&req.url==='/status'){send(200,{...receipt,busy});return}
  if(req.method!=='POST'||!['/login','/prepare','/publish','/recover-publication','/prepare-replay','/publish-replay','/logout','/retire'].includes(req.url??'')){send(404,{state:'NOT_FOUND'});return}
  let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>2){send(413,{state:'EMPTY_INPUT_ONLY'});return}}
  if(req.url==='/retire'){retired=true;send(200,{state:'RETIRED'});setTimeout(()=>{chrome.kill();server.close(()=>process.exit(0))},1000);return}
  if(busy){send(409,{state:'BUSY'});return}
  busy=true;send(202,{state:'DISPATCHED_FROM_KAGGLE'})
  try{
    if(req.url==='/login')await login()
    else if(req.url==='/prepare')await prepare()
    else if(req.url==='/recover-publication')await recoverPublication()
    else if(req.url==='/logout')await logout()
    else if(req.url==='/prepare-replay')await preparePreview()
    else await publish(req.url==='/publish-replay')
  }catch(error){receipt.state='FAILED';receipt.error=error instanceof Error&&/^[A-Z0-9_:.-]{1,200}$/.test(error.message)?error.message:'NATIVE_STUDIO_CHECK_FAILED';await save()}
  finally{busy=false}
})
server.listen(8022,'0.0.0.0')
setTimeout(()=>{retired=true;chrome.kill();server.close()},90*60_000)
