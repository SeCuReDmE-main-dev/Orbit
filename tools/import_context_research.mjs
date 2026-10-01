/** Controlled Context ingestion for the 50 original Orbit research notes. */
import * as svc from '../node_modules/@sanity/cli/dist/services/context.js';
import {getGlobalCliClient} from '../node_modules/@sanity/cli-core/dist/apiClient.js';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const kb = 'kb5CHIYGXCMJ';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const folder = path.join(root, 'docs', 'research', 'deepsearch-corpus-50-2026-09-27', 'sanity-ingestion-2026-09-27');
const manifest = JSON.parse(await readFile(path.join(folder, 'MANIFEST.json'), 'utf8'));
const statusPath = path.join(folder, 'INGESTION_STATUS.json');
const client = await getGlobalCliClient({apiVersion:'v2026-08-25', requireUser:true, resource:{id:kb,type:'knowledge-base'}, context:{organizationId:'oatv1mmu8'}});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const action = process.argv[2];
const pilotName = 'P01.md';
const archiveName = manifest.archive.path;

async function save(record) {
  const prior = await readFile(statusPath, 'utf8').then(JSON.parse).catch(()=>({}));
  const value = {...prior, ...record, recordedAt:new Date().toISOString(), knowledgeBaseId:kb};
  await writeFile(statusPath, JSON.stringify(value,null,2)+'\n');
  return value;
}
function summary(imports) {
  return imports.map(x=>({id:x.id,name:x.name,status:x.status,sourceCount:x.sourceCount,error:x.error}));
}
async function allSources(importId) {
  let cursor, all=[];
  do {
    const page = await client.context.sources.list({importId,cursor});
    all.push(...page.data);
    cursor = page.nextCursor;
  } while(cursor);
  return all;
}
async function matchingImport(filename) {
  const imports=await svc.listImports(kb);
  const found=imports.filter(x=>x.name===filename);
  if(found.length>1)throw Error(`Duplicate import filename ${filename}; inspect manually`);
  return {imports,found:found[0]};
}
async function uploadFile(filename,contentType,expectedHash) {
  const {found}=await matchingImport(filename);
  if(found) {
    if(found.status==='failed')throw Error(`Existing ${filename} import failed; inspect before retry`);
    console.log(JSON.stringify({filename,existing:true,status:found.status,sourceCount:found.sourceCount}));
    return;
  }
  const bytes=await readFile(path.join(folder,filename==='P01.md'?'notes':'',filename));
  if(hash(bytes)!==expectedHash)throw Error(`Local file hash changed: ${filename}`);
  const job=await svc.createImport(kb,{type:'file',file:bytes,filename,contentType});
  await save({lastUploadedFile:filename,lastImportJobId:job.jobId});
  console.log(JSON.stringify({filename,submitted:true,jobId:job.jobId}));
}

if(action==='preflight') {
  const kbState=await svc.getKnowledgeBase(kb);
  const {imports}=await matchingImport(pilotName);
  if(kbState.isBuilding)throw Error('Knowledge Base is already building');
  if(imports.some(x=>[pilotName,archiveName].includes(x.name)))throw Error('Batch already started; use status');
  console.log(JSON.stringify({state:kbState.state,isBuilding:kbState.isBuilding,imports:imports.length,sourceCount:imports.reduce((a,x)=>a+(x.sourceCount||0),0)}));
} else if(action==='pilot') {
  await uploadFile(pilotName,'text/markdown',manifest.pilot.sha256);
} else if(action==='archive') {
  const {found}=await matchingImport(pilotName);
  if(!found||found.status!=='complete'||found.sourceCount!==1)throw Error('Pilot not yet a complete one-document import');
  const source=await allSources(found.id);
  if(source.length!==1||!source[0].sizeBytes)throw Error('Pilot source has no extracted body');
  await uploadFile(archiveName,'application/zip',manifest.archive.sha256);
} else if(action==='status') {
  const {imports}=await matchingImport(pilotName);
  console.log(JSON.stringify({batch:summary(imports.filter(x=>[pilotName,archiveName].includes(x.name))),totalImports:imports.length,totalDocumentCount:imports.reduce((a,x)=>a+(x.sourceCount||0),0)}));
} else if(action==='verify') {
  const {imports}=await matchingImport(pilotName);
  const pilot=imports.find(x=>x.name===pilotName), rest=imports.find(x=>x.name===archiveName);
  if(!pilot||!rest)throw Error('Batch import is incomplete');
  if(pilot.status!=='complete'||rest.status!=='complete')throw Error('Batch imports still processing or failed');
  if(pilot.sourceCount!==1||rest.sourceCount!==49)throw Error(`Expected 1+49 extracted documents, got ${pilot.sourceCount}+${rest.sourceCount}`);
  const sources=[...await allSources(pilot.id),...await allSources(rest.id)];
  if(sources.length!==50||sources.some(x=>!(x.sizeBytes>0)))throw Error('A source is absent or has no extracted bytes');
  const others=imports.filter(x=>![pilotName,archiveName].includes(x.name));
  if(others.some(x=>x.status!=='complete'||!x.sourceCount))throw Error('Earlier source still incomplete or empty');
  await save({verified:true,verifiedDocumentCount:50,verifiedExistingDocumentCount:others.reduce((a,x)=>a+(x.sourceCount||0),0),pilotImportId:pilot.id,archiveImportId:rest.id,sourceIds:sources.map(x=>x.id)});
  console.log(JSON.stringify({verified:true,addedDocuments:sources.length,previousDocuments:others.reduce((a,x)=>a+(x.sourceCount||0),0),totalDocuments:imports.reduce((a,x)=>a+(x.sourceCount||0),0),emptyDocuments:0}));
} else if(action==='verify-content') {
  const record=JSON.parse(await readFile(statusPath,'utf8'));
  if(!record.verified||!record.pilotImportId||!record.archiveImportId)throw Error('Batch not verified');
  const sources=[...await allSources(record.pilotImportId),...await allSources(record.archiveImportId)];
  if(sources.length!==50)throw Error('Batch source count changed');
  const seen=[];
  for(const source of sources) {
    const page=await client.context.sources.content({sourceId:source.id});
    const body=typeof page.content==='string'?page.content:JSON.stringify(page.content);
    const id=body.match(/Source identifier:\s*([PSREWC][0-9]{2})/)?.[1];
    if(!id)throw Error(`Missing source identifier in extracted document ${source.id}`);
    const expected=manifest.items.find(x=>x.id===id);
    if(!expected||!body.includes(expected.original_url))throw Error(`Wrong original URL in ${id}`);
    seen.push(id);
  }
  if(new Set(seen).size!==50)throw Error('Duplicate or missing document identity in extracted batch');
  await save({verifiedDocumentIdentities:50,verifiedCanonicalUrls:50});
  console.log(JSON.stringify({verifiedDocumentIdentities:50,verifiedCanonicalUrls:50,uniqueIds:50}));
} else if(action==='build') {
  const record=JSON.parse(await readFile(statusPath,'utf8'));
  if(!record.verified||record.verifiedDocumentCount!==50)throw Error('Verification receipt missing');
  const {imports}=await matchingImport(pilotName);
  const pilot=imports.find(x=>x.name===pilotName), rest=imports.find(x=>x.name===archiveName);
  if(pilot?.status!=='complete'||pilot.sourceCount!==1||rest?.status!=='complete'||rest.sourceCount!==49)throw Error('Verified imports have changed; refusing build');
  const k=await svc.getKnowledgeBase(kb);
  if(k.isBuilding)throw Error('Knowledge Base is already building');
  if(record.buildJobId)throw Error('This batch already has a build job');
  const job=await svc.buildKnowledgeBase(kb);
  await save({buildJobId:job.jobId,buildSubmittedAt:new Date().toISOString()});
  console.log(JSON.stringify({submitted:true,jobId:job.jobId}));
} else if(action==='build-status') {
  const record=JSON.parse(await readFile(statusPath,'utf8'));
  if(!record.buildJobId)throw Error('No build job in batch receipt');
  const job=await svc.getJob(kb,record.buildJobId);
  const k=await svc.getKnowledgeBase(kb);
  await save({buildJobStatus:job.status,buildCompletedAt:job.completedAt||null,buildError:job.error||null,knowledgeBaseState:k.state,openIssueCount:k.openIssueCount});
  console.log(JSON.stringify({jobStatus:job.status,completedAt:job.completedAt||null,revisionId:job.result?.revisionId||null,entryCount:job.result?.entryCount||null,criticalIssueCount:job.result?.criticalIssueCount||0,knowledgeBaseState:k.state,isBuilding:k.isBuilding,stages:k.buildStageState?.stages?.map(x=>({id:x.id,status:x.status}))||[],openIssueCount:k.openIssueCount,error:job.error||null}));
} else {
  throw Error('Use preflight, pilot, archive, status, verify, verify-content, build, or build-status');
}
