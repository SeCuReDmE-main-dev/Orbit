/** Kaggle-dispatched native Studio QA in one official E2B Desktop.
 * The human signs in directly and reviews/checks the publication acknowledgement.
 * Browser protocol uses an OS pipe, never an exposed debugging TCP service.
 */
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import {createHash,timingSafeEqual} from 'node:crypto'
import {mkdir,writeFile} from 'node:fs/promises'
import {createWriteStream} from 'node:fs'
import type {Readable,Writable} from 'node:stream'

const secret=process.env.ORBIT_STUDIO_CHECK_TOKEN,origin=process.env.ORBIT_STUDIO_ORIGIN
if(process.platform!=='linux'||process.env.ORBIT_VALIDATION_HOST!=='E2B'||!secret||secret.length<40)throw Error('OWNED_E2B_MISSION_REQUIRED')
if(!origin||!/^https:\/\/8000-[a-z0-9]+\.e2b\.app$/.test(origin))throw Error('EXACT_DESKTOP_ORIGIN_REQUIRED')
const profile='/home/user/orbit-studio-native-profile',folder='/home/user/orbit-studio-auth-results'
await mkdir(folder,{recursive:true})
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
async function evaluate(expression:string){const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},session);if(result.exceptionDetails){const reason=result.exceptionDetails.exception?.description?.match(/^Error: ([A-Z_]{1,80})(?:\n|$)/)?.[1];throw Error(reason??'NATIVE_PAGE_EVALUATION_FAILED')}return result.result?.value}
async function wait(expression:string,maximum=10000){return evaluate(`(async()=>{const end=performance.now()+${maximum};while(performance.now()<end){if(${expression})return true;await new Promise(r=>setTimeout(r,75));}throw Error('UI_NOT_READY')})()`)}
async function button(pattern:string){return evaluate(`(()=>{const b=Array.from(document.querySelectorAll('.orbit-learning-studio button')).find(b=>new RegExp(${JSON.stringify(pattern)},'i').test(b.textContent));if(!b||b.disabled)throw Error('CONTROL_NOT_READY');b.click();return true})()`)}
async function view(pattern:string){return evaluate(`(()=>{const a=Array.from(document.querySelectorAll('.orbit-learning-studio nav a')).find(a=>new RegExp(${JSON.stringify(pattern)},'i').test(a.textContent));if(!a)throw Error('VIEW_NOT_READY');a.click();return true})()`)}
async function fill(selector:string,text:string){return evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('FIELD_NOT_READY');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(text)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`)}
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
  await wait(`document.modelContext?.getTools`)
  const tools=await evaluate(`(async()=>{for(let i=0;i<80;i++){const t=await document.modelContext.getTools();if(t.length===25)return t.map(x=>x.name);await new Promise(r=>setTimeout(r,75));}return[]})()`)
  record('portable-studio-native-25-tools',tools.length===25&&new Set(tools).size===25,{toolCount:tools.length})
  record('actual-studio-destination',await evaluate(`document.querySelector('.orbit-learning-studio').textContent.includes('pzscx4w8/production')`))
  // Use real host navigation. Never construct a fake current user or replace
  // plugin state. Imported files are public synthetic test fixtures only.
  await evaluate(`(()=>{const a=Array.from(document.querySelectorAll('a')).find(a=>a.getAttribute('href')?.includes('/orbit-learning-projects'));if(!a)throw Error('PROJECT_TOOL_LINK_NOT_READY');a.click();return true})()`)
  await wait(`document.querySelector('.orbit-learning-studio nav')&&/Mes projets|My projects|Mis proyectos/.test(document.querySelector('.orbit-learning-studio h1')?.textContent??'')`)
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
  await view('^Partage$|^Sharing$|^Compartir$')
  await evaluate(`(()=>{const label=Array.from(document.querySelectorAll('.orbit-learning-studio fieldset label')).find(e=>/contenu publiable|publishable content|contenido publicable/i.test(e.textContent));if(!label)throw Error('PUBLICATION_PERMISSION_NOT_READY');const e=label.querySelector('input');if(!e.checked)e.click();return true})()`)
  await fill('.orbit-learning-studio input[maxlength="160"]','Orbit QA — synthetic selected artifact — 2026-10-01')
  await evaluate(`(()=>{const label=Array.from(document.querySelectorAll('.orbit-learning-studio label')).find(e=>e.textContent.trim()==='orbit-publication-synthetic-brick.js');if(!label)throw Error('SELECTED_ARTIFACT_NOT_READY');const e=label.querySelector('input');if(!e.checked)e.click();return true})()`)
  await preparePreview()
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
  const query='*[_id == $id]',url='https://pzscx4w8.api.sanity.io/v2026-03-01/data/query/production?query='+encodeURIComponent(query)+'&%24id='+encodeURIComponent(JSON.stringify(id))
  const response=await fetch(url,{credentials:'omit',headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)})
  if(!response.ok)throw Error('PUBLIC_EXACT_READBACK_FAILED')
  return (await response.json()).result
}
async function publish(replay=false){
  if(!preview)throw Error('REVIEWABLE_PREVIEW_REQUIRED')
  const acknowledged=await evaluate(`(()=>{const label=Array.from(document.querySelectorAll('.orbit-learning-studio label')).find(e=>/J’accepte que cette sélection|I accept that this selection|Acepto que esta selección/i.test(e.textContent));return label?.querySelector('input')?.checked===true})()`)
  if(!acknowledged)throw Error('NATIVE_HUMAN_ACKNOWLEDGEMENT_REQUIRED')
  receipt.humanAcknowledgementObserved=true;const before=mutationResponses.length
  await button('Publier la sélection examinée|Publish reviewed selection|Publicar selección revisada')
  await wait(`Array.from(document.querySelectorAll('.orbit-learning-studio [role=status]')).some(e=>/Sélection publiée|Selection published|Selección publicada/i.test(e.textContent))`)
  record(replay?'native-replay-mutation-success':'native-content-lake-mutation-success',mutationResponses.slice(before).some(r=>r.status>=200&&r.status<300),mutationResponses.slice(before))
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
  if(req.method!=='POST'||!['/login','/prepare','/publish','/prepare-replay','/publish-replay','/logout','/retire'].includes(req.url??'')){send(404,{state:'NOT_FOUND'});return}
  let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>2){send(413,{state:'EMPTY_INPUT_ONLY'});return}}
  if(req.url==='/retire'){retired=true;send(200,{state:'RETIRED'});setTimeout(()=>{chrome.kill();server.close()},1000);return}
  if(busy){send(409,{state:'BUSY'});return}
  busy=true;send(202,{state:'DISPATCHED_FROM_KAGGLE'})
  try{
    if(req.url==='/login')await login()
    else if(req.url==='/prepare')await prepare()
    else if(req.url==='/logout')await logout()
    else if(req.url==='/prepare-replay')await preparePreview()
    else await publish(req.url==='/publish-replay')
  }catch(error){receipt.state='FAILED';receipt.error=error instanceof Error&&/^[A-Z0-9_:.-]{1,200}$/.test(error.message)?error.message:'NATIVE_STUDIO_CHECK_FAILED';await save()}
  finally{busy=false}
})
server.listen(8022,'0.0.0.0')
setTimeout(()=>{retired=true;chrome.kill();server.close()},90*60_000)
