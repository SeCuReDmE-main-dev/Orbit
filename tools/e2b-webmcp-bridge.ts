/** Ephemeral mission bridge. Agents receive Orbit tools, never CDP or shell. */
import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { WebMcpBrowser } from './webmcp-browser.js'
import { parseDossier } from '../packages/evidence-review/src/index.js'

const secret = process.env.ORBIT_BRIDGE_TOKEN;
if (!secret || secret.length < 40) throw Error('MISSION_TOKEN_REQUIRED');
const lifetime = 24 * 60 * 60 * 1000;
const expiry = Date.now() + lifetime;
let browser: WebMcpBrowser | undefined, controller: AbortController | undefined;
let started = 0, calls = 0, busy = false;
let allowedNames=new Set<string>(), scenario='', events:unknown[]=[];
let retired=false;
const authenticated = (header?: string) => {
  const supplied = Buffer.from(header ?? ''), expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
};
const finish = async () => { controller?.abort(); await browser?.close(); browser = undefined; controller = undefined; };
const server = createServer(async (request,response) => {
  response.setHeader('content-type','application/json'); response.setHeader('cache-control','no-store');
  const send = (status:number,value:unknown) => { response.statusCode=status; response.end(JSON.stringify(value)); };
  if (retired || !authenticated(request.headers.authorization) || Date.now()>expiry) return send(401,{error:'MISSION_ACCESS_DENIED'});
  if (request.method!=='POST' || !['/start','/discover','/call','/stop','/retire'].includes(request.url ?? '')) return send(404,{error:'UNAVAILABLE'});
  if (busy) return send(409,{error:'MISSION_BUSY'});
  busy=true;
  try {
    let body=''; for await (const chunk of request) { body+=chunk; if (body.length>200000) throw Error('INPUT_BOUND_EXCEEDED'); }
    const input=JSON.parse(body || '{}');
    if(request.url==='/retire'){await finish();retired=true;send(200,{state:'credential-revoked',scope:'this-worker-only'});setTimeout(()=>server.close(),3000).unref();return;}
    if(request.url==='/start') {
      await finish(); calls=0; started=Date.now(); controller=new AbortController();
      browser=await WebMcpBrowser.launch('https://orbit.securedme.ca/app/','/home/user/orbit-worker');
      scenario=String(input.scenario ?? 'preflight'); events=[];
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
      return send(200,{host:'E2B',modelHost:'Kaggle',native:true,...diagnostic,tools,events});
    }
    if(request.url==='/stop') { await finish(); return send(200,{state:'closed'}); }
    if(!browser || !controller || Date.now()-started>480000) { await finish(); return send(410,{error:'MISSION_EXPIRED'}); }
    if(request.url==='/discover') return send(200,{tools:(await browser.discover()).filter(tool=>allowedNames.has(tool.name)),events});
    if(++calls>20) return send(429,{error:'TOOL_BUDGET_EXCEEDED'});
    if(!allowedNames.has(String(input.name)))throw Error('TOOL_NOT_ALLOWED');
    if(scenario==='W08'&&calls===3){await browser.consent(false,false);events.push({kind:'automated-revocation',atCall:calls});}
    if(scenario==='W12'&&calls===3){await browser.reload();events.push({kind:'automated-reload',atCall:calls});}
    return send(200,{result:await browser.execute(String(input.name),input.arguments,controller.signal),calls,events});
  } catch(error) {
    // Browser errors are identifiers, never HTTP credential-bearing exceptions.
    const message=error instanceof Error ? error.message.split('\n')[0] : 'BRIDGE_FAILED';
    send(422,{error:/^[A-Z_]+$/.test(message)?message:'BRIDGE_FAILED'});
  } finally { busy=false; }
});
server.listen(8000,'0.0.0.0');
setTimeout(async()=>{await finish();server.close();},lifetime).unref();
