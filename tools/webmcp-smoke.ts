/** Native page tools on the deployed origin; this is a scripted smoke test. */
import { mkdir, writeFile } from 'node:fs/promises'
import { WebMcpBrowser } from './webmcp-browser.js'
const browser = await WebMcpBrowser.launch('https://orbit.securedme.ca/app/');
try {
  const tools = await browser.discover();
  if (tools.length !== 15) throw Error('Expected fifteen live tools.');
  const calls = [];
  for (const name of ['orbit_get_capabilities','orbit_get_research_protocol','orbit_get_research_request','orbit_sanity_initial_context']) {
    const startedAt = new Date().toISOString();
    try { calls.push({name,startedAt,result:await browser.execute(name,{},AbortSignal.timeout(45000))}); }
    catch (error) { calls.push({name,startedAt,error:(error as Error).message}); }
  }
  await mkdir('.orbit/benchmark-results',{recursive:true});
  await writeFile('.orbit/benchmark-results/webmcp-smoke.json',JSON.stringify({status:'scripted-not-agent',origin:browser.origin,tools:tools.map(t=>t.name),calls},null,2)+'\n');
  console.log(JSON.stringify(calls.map(c=>({name:c.name,error:'error' in c?c.error:null,result:'result' in c?c.result:null}))));
} finally { await browser.close(); }
