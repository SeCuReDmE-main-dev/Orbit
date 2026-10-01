/** Observe the deployed provenance contract through actual native page tools. */
import { mkdir, writeFile } from 'node:fs/promises'
import { WebMcpBrowser } from './webmcp-browser.js'

const browser=await WebMcpBrowser.launch('https://orbit.securedme.ca/app/');
try {
  const tools=await browser.discover();
  if(tools.length!==15)throw Error('Expected fifteen native tools.');
  const result:any=await browser.execute('orbit_sanity_read_entries',
    {paths:['deep_research/models_and_apis']},AbortSignal.timeout(70000));
  if(result.state!=='READY')throw Error('Context read did not complete.');
  const provenance=result.provenance;
  if(provenance?.format!=='orbit-context-provenance-v1'||provenance.originalDocumentsRead!==false)
    throw Error('The deployed provenance contract is missing.');
  if(provenance.referencesWithoutOriginalUrl!==provenance.references.filter((r:any)=>r.url===null).length)
    throw Error('Unresolved reference count is inconsistent.');
  if(!provenance.references.length)throw Error('No source references were observed.');
  const report={observedAt:new Date().toISOString(),origin:browser.origin,
    host:'scripted deployed native WebMCP check; no model or human decision',
    nativeTools:tools.length,path:'deep_research/models_and_apis',state:result.state,
    provenance,passed:true};
  await mkdir('.orbit/benchmark-results',{recursive:true});
  await writeFile('.orbit/benchmark-results/public-context-provenance.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:true,nativeTools:tools.length,state:result.state,
    provenanceStatus:provenance.status,references:provenance.references.length,
    missingOriginalUrls:provenance.referencesWithoutOriginalUrl,originalDocumentsRead:false}));
} finally {await browser.close();}
