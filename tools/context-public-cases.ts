/** Read the two documented case areas through native WebMCP on the public origin. */
import { writeFile, mkdir } from 'node:fs/promises'
import { WebMcpBrowser } from './webmcp-browser.js'
const browser=await WebMcpBrowser.launch('https://orbit.securedme.ca/app/');
try {
  await browser.discover();
  const calls=[];
  for (const paths of [['data_retention_and_privacy','deep_research/models_and_apis'],['sanity/knowledge_bases','sanity/groq_and_schema/schema_and_studio']]) {
    const startedAt=new Date().toISOString();
    try {calls.push({paths,startedAt,result:await browser.execute('orbit_sanity_read_entries',{paths},AbortSignal.timeout(55000))});}
    catch(error){calls.push({paths,startedAt,error:(error as Error).message});}
  }
  await mkdir('.orbit/benchmark-results',{recursive:true});
  await writeFile('.orbit/benchmark-results/public-context-cases.json',JSON.stringify({status:'scripted-source-reading-not-agent-benchmark',origin:browser.origin,calls},null,2)+'\n');
  console.log(JSON.stringify(calls.map(c=>({paths:c.paths,error:'error' in c?c.error:null,state:'result' in c?(c.result as any)?.state:null}))));
} finally {await browser.close();}
