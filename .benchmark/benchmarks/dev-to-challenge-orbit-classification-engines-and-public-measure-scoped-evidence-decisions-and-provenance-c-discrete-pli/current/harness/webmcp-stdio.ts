/** MCP transport adapter to native WebMCP. No server-side imitation of tools. */
import { createInterface } from 'node:readline'
import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { WebMcpBrowser } from './webmcp-browser.js'

const root = resolve(import.meta.dirname,'..');
const tracePath = resolve(process.env.ORBIT_BENCHMARK_TRACE ?? resolve(root,'.orbit/benchmark-results/webmcp-agent-trace.jsonl'));
const traceRoot = resolve(root,'.orbit');
if (!tracePath.startsWith(traceRoot+'\\') && !tracePath.startsWith(traceRoot+'/')) throw Error('Trace must stay inside the private Orbit runtime folder.');
await mkdir(dirname(tracePath),{recursive:true});
const browser = await WebMcpBrowser.launch('https://orbit.securedme.ca/app/',root);
let tools;
try { tools = await browser.discover(); }
catch (error) { await browser.close(); throw error; }
if (tools.length !== 15) { await browser.close(); throw Error('Expected fifteen native page tools.'); }
const signal = AbortSignal.timeout(8*60*1000);
let calls=0;
let stopped=false;
const stop = async()=>{ if(stopped)return; stopped=true; await browser.close(); };
signal.addEventListener('abort',()=>{void stop();process.stdin.destroy();},{once:true});
process.on('SIGINT',()=>{void stop().finally(()=>process.exit(0));});
process.on('SIGTERM',()=>{void stop().finally(()=>process.exit(0));});
const input=createInterface({input:process.stdin});
// Attach the iterator before any awaited I/O. Readline emits 'line' events as
// soon as stdin resumes; a client may already have sent initialize at startup.
// Delaying this subscription until after writing the trace loses that request.
const requests=input[Symbol.asyncIterator]();
const send=(id:unknown,result:unknown)=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n');
await appendFile(tracePath,JSON.stringify({type:'session',origin:browser.origin,nativeTools:tools.map(t=>t.name),capturedAt:new Date().toISOString(),maxCalls:20,maxMinutes:8,approvals:'No human approvals manufactured; empty isolated page has no shared dossier.'})+'\n');
try {
  for await(const line of requests) {
    let request:any;
    try { request=JSON.parse(line); } catch { continue; }
    if(request.id===undefined)continue;
    await appendFile(tracePath,JSON.stringify({type:'transport',method:request.method,capturedAt:new Date().toISOString()})+'\n');
    if(request.method==='initialize') {
      send(request.id,{protocolVersion:['2024-11-05','2025-03-26','2025-06-18'].includes(request.params?.protocolVersion)?request.params.protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'orbit-native-webmcp-adapter',version:'1.0.0'},instructions:'These tools execute in an isolated live Orbit page. Permissions belong to that page. A denied access is not authorization to bypass consent.'});
    } else if(request.method==='ping')send(request.id,{});
    else if(request.method==='tools/list')send(request.id,{tools:tools.map(t=>({...t,annotations:{readOnlyHint:t.name!=='orbit_present_research',destructiveHint:false,openWorldHint:t.name.startsWith('orbit_sanity_')}}))});
    else if(request.method==='tools/call') {
      const name=request.params?.name;
      if(!tools.some(t=>t.name===name)||++calls>20||signal.aborted||JSON.stringify(request.params?.arguments??{}).length>200000){send(request.id,{isError:true,content:[{type:'text',text:'TOOL_SESSION_BOUNDARY'}]});continue;}
      const startedAt=new Date().toISOString();
      try {
        const result=await browser.execute(name,request.params.arguments??{},signal);
        await appendFile(tracePath,JSON.stringify({type:'call',name,input:request.params.arguments??{},startedAt,completedAt:new Date().toISOString(),result})+'\n');
        send(request.id,{content:[{type:'text',text:JSON.stringify(result)}]});
      } catch(error) {
        const failure=(error as Error).message;
        await appendFile(tracePath,JSON.stringify({type:'call',name,startedAt,error:failure})+'\n');
        send(request.id,{isError:true,content:[{type:'text',text:failure}]});
      }
    } else process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'Method not found'}})+'\n');
  }
} finally { input.close(); await stop(); }
