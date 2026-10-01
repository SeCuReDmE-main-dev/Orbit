import { allowSharing, allowPresentation, currentDraft, updateDraft, restoreDraft } from './companion-state'
export function mountCompanionConsole() {
 const form = document.querySelector<HTMLFormElement>('[data-companion-form]')!
 if (!form) return
 const status = document.querySelector<HTMLElement>('[data-companion-status]')!
 const answer = document.querySelector<HTMLElement>('[data-companion-answer]')!
 const question = document.querySelector<HTMLTextAreaElement>('#companion-question')!
 const context = document.querySelector<HTMLTextAreaElement>('#companion-context')!
 const submit = document.querySelector<HTMLButtonElement>('[data-companion-submit]')!
 const route = document.querySelector<HTMLSelectElement>('#companion-route')!
 const share = document.querySelector<HTMLInputElement>('#webmcp-consent')!
 const present = document.querySelector<HTMLInputElement>('#webmcp-present-consent')!
 const google = document.querySelector<HTMLAnchorElement>('[data-google-search]')!
 const saved = restoreDraft(); question.value = saved.question; context.value = saved.context
 let generation = 0
 const invalidate = () => { generation++; submit.disabled=false; allowSharing(false); share.checked=false; present.checked=false; state('idle') }
 // Account or workspace changes revoke ownership of any in-flight response.
 for(const event of ['orbit:logout','orbit:session-expired','orbit:workspace-selected']) document.addEventListener(event,invalidate)
 if (saved.report) answer.textContent = saved.report
 const refreshGoogle = () => { google.href = `https://www.google.com/search?q=${encodeURIComponent(question.value.slice(0,2000))}` }
 // Persist the editable draft through the consent-aware owner, never directly to storage.
 const captureDraft = () => updateDraft({question:question.value.slice(0,2000),context:context.value.slice(0,12000)})
 question.addEventListener('input',captureDraft);context.addEventListener('input',captureDraft)
 refreshGoogle(); question.addEventListener('input',refreshGoogle)
 document.addEventListener('orbit:workspace-selected',refreshGoogle)
 const state = (value:string,text?:string) => document.dispatchEvent(new CustomEvent('orbit:companion-state',{detail:{state:value,text}}))
 share.addEventListener('change',()=>{ allowSharing(share.checked); if (!share.checked) present.checked=false; status.textContent = share.checked ? 'Workspace sharing enabled. Send your question, then invite your WebMCP agent.' : 'WebMCP sharing revoked.' })
 present.addEventListener('change',()=>{ if (!share.checked) { present.checked=false; status.textContent='Activez d’abord le partage de cette mission.' } allowPresentation(present.checked) })
 document.querySelector('[data-companion-connect]')?.addEventListener('click',async()=>{
  const started = generation
  status.textContent='Checking the official local Codex client…'
  try {const v=await send({type:'orbit.companionStatus'});if(started===generation)status.textContent=v.connected?`Connected · ${v.model}`:v.reason??'Sign in with Codex.'}
  catch {if(started===generation)status.textContent='Codex needs the associated extension and local broker. Your WebMCP browser agent is a separate route.'}
 })
 document.querySelector('[data-capture-page]')?.addEventListener('click',async()=>{
  const started = generation
  try {const v=await send({type:'orbit.capturePage'});if(started!==generation)return;context.value=`${v.title}\n${v.url}\n\n${v.text}`.slice(0,12000);updateDraft({context:context.value});status.textContent='Captured locally. Review before sending. No form-field values collected.'}
  catch {if(started===generation)status.textContent='Click the Orbit extension icon on the desired web page, then capture again. On the website, paste context and links.'}
 })
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(submit.disabled||!form.reportValidity())return
  if(route.value==='external'&&!share.checked){status.textContent='Autorisez le partage WebMCP pour transmettre la question à cet agent.';return}
  const previous=currentDraft()
  updateDraft({requestId:crypto.randomUUID().replaceAll('-',''),question:question.value.trim(),context:context.value,report:'',axes:[],sources:[]})
  const turn=currentDraft(), started=++generation
  const ownsResponse=()=>{const now=currentDraft();return started===generation&&now.requestId===turn.requestId&&now.question===turn.question&&now.context===turn.context}
  if(route.value==='external'){
   status.textContent='Request ready. Ask your browser agent to call orbit_get_research_request, research with its authorized tools, then orbit_present_research. No autonomous call has started.'
   answer.textContent='Your question is ready for your browser agent.';state('idle');return
  }
  submit.disabled=true;state('thinking')
  const research=document.querySelector<HTMLInputElement>('#research-consent')!.checked
  status.textContent=research?'Preparing nine axes, searching NASA with Exa, then assembling a report…':'Your companion is considering the selected context…'
  try {
   await send({type:'orbit.checkpoint',label:'companion-intake',question:turn.question,newMission:!previous.requestId,snapshot:{question:turn.question,sources:previous.sources.map(s=>({title:s.title,uri:s.url})),companionResponse:previous.report}})
   if(!ownsResponse())return
   const v=await send({type:'orbit.companion',question:turn.question,context:turn.context,consent:true,mode:research?'research':'chat'})
   if(!ownsResponse())return
   answer.textContent=v.text
   updateDraft({report:v.text,axes:v.axes??[],sources:(v.sources??[]).map((s:any,i:number)=>({id:`source_${turn.requestId}_${i}`,title:s.title,url:s.url,status:s.text?'excerpt-read':'discovered'}))})
   status.textContent=`Saved · ${v.model} · checkpoint ${v.checkpoint}${research?` · ${v.sources?.length??0}/30 source URLs`:''}`;state('speaking',v.text)
  }catch{if(ownsResponse()){status.textContent='Turn unavailable. Draft preserved. Check extension association, Codex connection and Exa credits. No fallback model was used.';state('error')}}
  finally{if(started===generation){submit.disabled=false;if(!ownsResponse()){status.textContent='Le contexte a changé. La réponse précédente n’a pas été appliquée. Vous pouvez envoyer la nouvelle question.';state('idle')}}}
 })
 document.addEventListener('orbit:research-result',()=>{const v=currentDraft();answer.textContent=v.report;status.textContent=`${v.sources.length} sources · external-agent report; verify citations.`;state('idle')})
 document.querySelector('[data-report-download]')?.addEventListener('click',()=>{
  const v=currentDraft();if(!v.report){status.textContent='Complete a companion turn before downloading.';return}
  const blob=new Blob([`# ${v.question}\n\n${v.report}\n\n## Source ledger\n${v.sources.map(s=>`- ${s.title}: ${s.url} (${s.status})`).join('\n')}`],{type:'text/markdown;charset=utf-8'})
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='orbit-research-report.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
 })
}
async function send(message:unknown):Promise<any>{
 const runtime=(globalThis as any).chrome?.runtime
 if(!runtime?.sendMessage)throw new Error('Extension required')
 return new Promise((resolve,reject)=>runtime.sendMessage(message,(response:any)=>runtime.lastError||!response?.ok?reject(new Error('Companion unavailable')):resolve(response.value)))
}
