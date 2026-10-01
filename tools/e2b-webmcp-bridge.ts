/** Ephemeral mission bridge. Agents receive Orbit tools, never CDP or shell. */
import { createServer } from 'node:http'
import { createHash, timingSafeEqual } from 'node:crypto'
import { WebMcpBrowser } from './webmcp-browser.js'
import { parseDossier } from '../packages/evidence-review/src/index.js'

const secret = process.env.ORBIT_BRIDGE_TOKEN;
if (!secret || secret.length < 40) throw Error('MISSION_TOKEN_REQUIRED');
const controlSecret = process.env.ORBIT_BRIDGE_CONTROL_TOKEN;
if (!controlSecret || controlSecret.length < 40 || controlSecret === secret) throw Error('DISTINCT_CONTROL_TOKEN_REQUIRED');
const lifetime = 24 * 60 * 60 * 1000;
const expiry = Date.now() + lifetime;
let browser: WebMcpBrowser | undefined, controller: AbortController | undefined;
let started = 0, calls = 0, busy = false;
let allowedNames=new Set<string>(), scenario='', actorRole='investigation', events:unknown[]=[];
let retired=false, missionReady=false;
const authenticated = (header: string | undefined, credential: string) => {
  const supplied = Buffer.from(header ?? ''), expected = Buffer.from(`Bearer ${credential}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
};
const roleAllowed = (name:string) => allowedNames.has(name) &&
  !(scenario==='W06' && actorRole!=='coordination' && name==='orbit_present_research');
const finish = async () => {
  controller?.abort();
  const ownedBrowser=browser;
  browser=undefined; controller=undefined; missionReady=false;
  allowedNames.clear(); scenario=''; actorRole='investigation'; events=[];
  await ownedBrowser?.close();
};
const server = createServer(async (request,response) => {
  response.setHeader('content-type','application/json'); response.setHeader('cache-control','no-store');
  const send = (status:number,value:unknown) => { response.statusCode=status; response.end(JSON.stringify(value)); };
  const controlOnly=['/start','/role','/stop','/retire'].includes(request.url ?? '');
  if (retired || !authenticated(request.headers.authorization,controlOnly?controlSecret:secret) || Date.now()>expiry) return send(401,{error:'MISSION_ACCESS_DENIED'});
  if (request.method!=='POST' || !['/start','/role','/discover','/call','/stop','/retire'].includes(request.url ?? '')) return send(404,{error:'UNAVAILABLE'});
  if (busy) return send(409,{error:'MISSION_BUSY'});
  busy=true;
  try {
    let body=''; for await (const chunk of request) { body+=chunk; if (body.length>200000) throw Error('INPUT_BOUND_EXCEEDED'); }
    const input=JSON.parse(body || '{}');
    if(request.url==='/retire'){await finish();retired=true;send(200,{state:'credential-revoked',scope:'this-worker-only'});setTimeout(()=>server.close(),3000).unref();return;}
    if(request.url==='/start') {
      await finish(); calls=0; started=Date.now(); controller=new AbortController();
      if(!/^orbit-[a-z0-9-]+$/i.test(String(input.expectedReleaseId ?? '')))throw Error('PINNED_RELEASE_REQUIRED');
      if(!/^[a-f0-9]{64}$/.test(String(input.expectedReleaseSha256 ?? '')))throw Error('PINNED_RELEASE_FINGERPRINT_REQUIRED');
      browser=await WebMcpBrowser.launch('https://orbit.securedme.ca/app/','/home/user/orbit-worker');
      // Read the public manifest in the actual native Chrome session. A
      // separate Node/urllib request can be blocked by host bot protection and
      // is not interchangeable with the browser transport under evaluation.
      const releaseResponse:any=await browser.evaluate(`(async()=>{
        const response=await fetch('/orbit-release.json',{cache:'no-store',signal:AbortSignal.timeout(20000)});
        const text=await response.text();
        if(text.length>200000)throw Error('PUBLIC_RELEASE_RESPONSE_BOUND');
        return {status:response.status,text};
      })()`,25000);
      if(releaseResponse.status!==200)throw Error('PUBLIC_RELEASE_UNAVAILABLE');
      const releaseSha256=createHash('sha256').update(releaseResponse.text,'utf8').digest('hex');
      if(releaseSha256!==input.expectedReleaseSha256)throw Error('PUBLIC_RELEASE_FINGERPRINT_MISMATCH');
      let release:any;try{release=JSON.parse(releaseResponse.text);}catch{throw Error('PUBLIC_RELEASE_INVALID');}
      if(release.releaseId!==input.expectedReleaseId)throw Error('PUBLIC_RELEASE_MISMATCH');
      scenario=String(input.scenario ?? 'preflight'); events=[];
      actorRole=scenario==='W06'?'extraction':'investigation';
      if(input.dossier) {
        const fixture=parseDossier(input.dossier);
        if(!['baseline','n','p'].includes(input.engine))throw Error('ENGINE_NOT_ALLOWED');
        fixture.classificationEngine=input.engine;
        fixture.reviews=[]; fixture.sourceDecisions=[]; fixture.approvedPlan=undefined; fixture.proposals=[]; fixture.classificationHistory=[]; fixture.history=[];
        events.push(await browser.fixture(fixture,input.read!==false,input.write===true));
      }
      const diagnostic=await browser.diagnostic();
      const additions=new Set(['orbit_classify_evidence','orbit_compare_claims','orbit_find_relations','orbit_resolve_hold','orbit_trace_impact']);
      const tools=diagnostic.tools.filter(tool=>input.configuration!=='original10'||!additions.has(tool.name));
      allowedNames=new Set(tools.map(tool=>tool.name));
      missionReady=true;
      return send(200,{host:'E2B',modelHost:'Kaggle',native:true,...diagnostic,
        tools:tools.filter(tool=>roleAllowed(tool.name)),registeredToolCount:diagnostic.tools.length,
        exposedToolCount:tools.filter(tool=>roleAllowed(tool.name)).length,releaseId:release.releaseId,
        releaseSha256,releaseReadTransport:'native-Chrome-session-fetch',actorRole,events});
    }
    if(request.url==='/stop') { await finish(); return send(200,{state:'closed'}); }
    if(!missionReady || !browser || !controller || Date.now()-started>480000) { await finish(); return send(410,{error:'MISSION_EXPIRED'}); }
    if(request.url==='/role') {
      if(scenario!=='W06' || !['extraction','verification','coordination'].includes(input.role))throw Error('ROLE_NOT_ALLOWED');
      actorRole=input.role;events.push({kind:'controller-role-transition',role:actorRole});
      return send(200,{state:'role-selected',role:actorRole});
    }
    if(request.url==='/discover') return send(200,{tools:(await browser.discover()).filter(tool=>roleAllowed(tool.name)),actorRole,events});
    if(++calls>20) return send(429,{error:'TOOL_BUDGET_EXCEEDED'});
    if(!roleAllowed(String(input.name)))throw Error('TOOL_NOT_ALLOWED');
    if(scenario==='W08'&&calls===3){await browser.consent(false,false);events.push({kind:'automated-revocation',atCall:calls});}
    if(scenario==='W12'&&calls===3){await browser.reload();events.push({kind:'automated-reload',atCall:calls});}
    return send(200,{result:await browser.execute(String(input.name),input.arguments,controller.signal),calls,events});
  } catch(error) {
    // A rejected start must never expose a new page through the old mission's
    // registry, role or scenario. The handles are revoked before close waits.
    if(request.url==='/start') { try { await finish(); } catch {} }
    // Browser errors are identifiers, never HTTP credential-bearing exceptions.
    const message=error instanceof Error ? error.message.split('\n')[0] : 'BRIDGE_FAILED';
    const known=message.match(/\b(STALE_REVISION|SUBMISSION_CONFLICT|SESSION_REVOKED|PAGE_GENERATION_CHANGED|TOOL_SESSION_BOUNDARY)\b/)?.[1];
    send(422,{error:known ?? (/^[A-Z_]+$/.test(message)?message:'BRIDGE_FAILED')});
  } finally { busy=false; }
});
server.listen(8000,'0.0.0.0');
setTimeout(async()=>{await finish();server.close();},lifetime).unref();
