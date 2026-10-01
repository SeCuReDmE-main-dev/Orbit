/** Governed nine-document course import into the existing Context KB. No learner work. */
import {getGlobalCliClient} from '../node_modules/@sanity/cli-core/dist/apiClient.js';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT=path.join(ROOT,'.orbit','formation-context');
const KB='kb5CHIYGXCMJ',ORG='oatv1mmu8';
const COMMIT='784dbca3f71c5aa12fc71e616e327ccb4fe53ddb';
const PREFIX=`https://raw.githubusercontent.com/SeCuReDmE-main-dev/Orbit/${COMMIT}/docs/learning/orbit-formation/`;
const SOURCE_FILES=[...Array.from({length:8},(_,i)=>`modules/module-${i+1}.md`),'PROJECT.md'];
const PHASE=process.argv[2]??'preflight';
const hash=value=>createHash('sha256').update(value).digest('hex');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const publicReceipt=path.join(ROOT,'docs','receipts','formation','course-context-ingestion.json');
const INSTRUCTION_MARKER='orbit-public-course-scope-v1';
const client=await getGlobalCliClient({apiVersion:'v2026-08-25',requireUser:true,
  resource:{id:KB,type:'knowledge-base'},context:{organizationId:ORG}});

async function imports(){const rows=[];let cursor,pages=0;do{const page=await client.context.imports.list({cursor});rows.push(...page.data);cursor=page.nextCursor??undefined;if(++pages>20)throw Error('IMPORT_PAGE_LIMIT');}while(cursor);return rows;}
async function sources(importId){const rows=[];let cursor,pages=0;do{const page=await client.context.sources.list({importId,cursor});rows.push(...page.data);cursor=page.nextCursor??undefined;if(++pages>10)throw Error('SOURCE_PAGE_LIMIT');}while(cursor);return rows;}
async function localManifest(){return JSON.parse(await readFile(path.join(OUT,'prepared.json'),'utf8'));}
async function existingState(){try{return JSON.parse(await readFile(path.join(OUT,'state.json'),'utf8'));}catch{return {};}}
async function save(change){await mkdir(OUT,{recursive:true});const value={...await existingState(),...change,recordedAt:new Date().toISOString(),knowledgeBase:KB};await writeFile(path.join(OUT,'state.json'),JSON.stringify(value,null,2)+'\n');return value;}
async function safety(additional){const knowledge=await client.context.knowledgeBases.get(KB),rows=await sources();const skipped=rows.filter(row=>row.status==='skipped').length;
  const used=knowledge.sourceUsage?.used,limit=knowledge.sourceUsage?.limit;
  if(!Number.isInteger(used)||!Number.isInteger(limit)||used+additional>limit||used+skipped+additional>150)throw Error('DOCUMENT_BUDGET_NOT_PROVEN');
  if(knowledge.isBuilding)throw Error('KNOWLEDGE_BASE_ALREADY_BUILDING');
  return {state:knowledge.state,isBuilding:knowledge.isBuilding,sourceUsage:{used,limit},listedSources:rows.length,listedReady:rows.filter(row=>row.status==='ready').length,skippedSources:skipped,conservativeAfter:used+skipped+additional,hardSafetyCeiling:150,openIssueCount:knowledge.openIssueCount};
}
async function fetchPublic(url){const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('PUBLIC_SOURCE_UNAVAILABLE:'+response.status);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<100||bytes.length>100000)throw Error('PUBLIC_SOURCE_SIZE_REJECTED');return bytes;}
async function prepared(){
  await mkdir(path.join(OUT,'notes'),{recursive:true});const records=[];
  for(const relative of SOURCE_FILES){const url=PREFIX+relative,bytes=await fetchPublic(url);const local=await readFile(path.join(ROOT,'docs','learning','orbit-formation',relative));
    // New local drafts must be pushed and reviewed before they can become an imported public source.
    if(hash(bytes)!==hash(local))throw Error('PUBLIC_LOCAL_SNAPSHOT_DIFFERS:'+relative);
    const text=bytes.toString('utf8');if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-proj-|e2b_)[A-Za-z0-9_-]{16,}/.test(text))throw Error('SECRET_MARKER_IN_PUBLIC_SOURCE');
    const index=relative==='PROJECT.md'?9:Number(relative.match(/module-(\d)/)[1]);
    const filename=`ORBIT_FORMATION_${index===9?'PROTOCOL':`MODULE_${index}`}_${COMMIT.slice(0,12)}.md`;
    const note=`# Orbit Formation — ${index===9?'Public course protocol':`Module ${index}`}\n\nSource URL: ${url}\nSource snapshot: ${COMMIT}\nSource SHA-256: ${hash(bytes)}\n\nContent status: original Orbit public course material, not a learner journal or a record of learner mastery. Code examples and predicted outcomes are teaching resources. A prepared trace is not a live WebMCP run.\n\n---\n\n${text}`;
    await writeFile(path.join(OUT,'notes',filename),note,'utf8');records.push({index,filename,url,sourceSha256:hash(bytes),ingestedSha256:hash(note),bytes:Buffer.byteLength(note)});
  }
  const manifest={version:'orbit-formation-context-import-v1',knowledgeBase:KB,commit:COMMIT,documents:records};await writeFile(path.join(OUT,'prepared.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
async function courseSources(manifest,listed){const rows=[];
  for(const item of manifest.documents){const match=listed.filter(row=>row.name===item.filename);if(match.length!==1||match[0].status!=='complete'||match[0].sourceCount!==1)throw Error('COURSE_IMPORT_NOT_COMPLETE:'+item.filename);
    const found=await sources(match[0].id);if(found.length!==1||!(found[0].sizeBytes>0))throw Error('COURSE_SOURCE_NOT_EXTRACTED:'+item.filename);
    const content=await client.context.sources.content({sourceId:found[0].id});const text=typeof content.content==='string'?content.content:JSON.stringify(content.content);
    if(!text.includes(item.url)||!text.includes(item.sourceSha256)||!text.includes('not a learner journal'))throw Error('COURSE_SOURCE_PROVENANCE_MISMATCH');
    rows.push({...item,importId:match[0].id,sourceId:found[0].id,status:found[0].status});
  }return rows;
}
async function actualContext(kind,paths=[]){const query=kind==='entries'?`?${new URLSearchParams({paths:JSON.stringify(paths)})}`:'';
  const response=await fetch(`https://orbit.securedme.ca/api/v1/knowledge/${kind}${query}`,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(30000)});const body=await response.json();
  if(!response.ok||body.state!=='READY'||body.source!=='sanity-context-mcp'||body.knowledgeBase!==KB||!Array.isArray(body.content)||!body.content.length)throw Error('REAL_CONTEXT_READ_NOT_READY');
  if(body.content.some(block=>block.type!=='text'||typeof block.text!=='string'))throw Error('REAL_CONTEXT_CONTENT_REJECTED');
  const text=body.content.map(block=>block.text).join('\n');if(Buffer.byteLength(text)>262144)throw Error('REAL_CONTEXT_CONTENT_TOO_LARGE');return {body,text};
}
function phpString(value){return `'${value.replaceAll('\\','\\\\').replaceAll("'","\\'")}'`;}
function manifestPhp(scope){const lines=['<?php','','/** Audited public course scope. No credentials, journals or automatic publication. */','return [',`    'enabled' => ${scope.enabled?'true':'false'},`,`    'knowledge_base' => ${phpString(KB)},`,`    'revision_id' => ${phpString(scope.revision_id)},`,`    'outline_sha256' => ${phpString(scope.outline_sha256)},`,"    'sources' => ["];
  for(const [id,source] of Object.entries(scope.sources))lines.push(`        ${phpString(id)} => ['url' => ${phpString(source.url)}, 'sha256' => ${phpString(source.sha256)}],`);
  lines.push('    ],',"    'entries' => [");for(const [entryPath,entry] of Object.entries(scope.entries))lines.push(`        ${phpString(entryPath)} => ['title' => ${phpString(entry.title)}, 'sha256' => ${phpString(entry.sha256)}, 'source_ids' => [${entry.source_ids.map(phpString).join(', ')}]],`);
  lines.push('    ],','];','');return lines.join('\n');
}
function scopedInstruction(rows){return `${INSTRUCTION_MARKER}. Codex creates this routing rule under explicit human implementation authorization; it is not human content review or learner assessment.
Apply only to the nine scoped original public Orbit Formation sources, snapshot ${COMMIT}. Preserve unrelated instructions, research content, all sources and existing citations. Do not delete a source.
Create a distinct orbit_formation namespace with nine filled entries. Mapping of exact entry path to the only admissible source ID:
${rows.map(row=>`orbit_formation/${row.index===9?'protocol':`module_${row.index}`}: ${row.sourceId}`).join('\n')}
Each entry must cite only its matching source above. The protocol entry covers PROJECT.md; module entries cover MODULE_1 through MODULE_8. All nine sources must be represented. Never merge these entries with sanity or general research topics, or cite legacy/external sources inside orbit_formation. Public references linked by a module may remain links, not additional admitted evidence.
Keep original public source URLs and provenance inspectable. Prepared traces are not live WebMCP runs; artistic interactions are not scientific simulations. Do not fabricate private learner work, human approvals, tests or model results.
Course timing: eight modules of 1 teacher hour and 3 solo hours (2 guided-learning hours +30 Colab minutes +30 review minutes). Final project: 1 teacher setting hour, then 6 solo hours with assistant, then 1 teacher closure hour; 40 hours total.`;}
function instructionSourceIds(instruction){return (instruction.scopeSources??[]).map(source=>source.sourceId).sort();}
function issueReferences(content){const sourceIds=new Set(),entryPaths=new Set();function visit(value,key=''){if(typeof value==='string'){if(key==='sourceId'||key==='sourceIds')sourceIds.add(value);if(['entryPath','entryPaths','scopePath','path'].includes(key)&&value!=='*')entryPaths.add(value);}else if(Array.isArray(value))value.forEach(item=>visit(item,key));else if(value&&typeof value==='object')Object.entries(value).forEach(([child,item])=>visit(item,child));}visit(content);return {sourceIds:[...sourceIds],entryPaths:[...entryPaths]};}
function consolidatedInstruction(rows){return `${INSTRUCTION_MARKER}. Codex routing under explicit human implementation authorization; not human content review or learner assessment.
Only the nine scoped public Orbit course sources, snapshot ${COMMIT}. Preserve every existing source, citation, unrelated instruction and research entry.
Create ONE filled entry orbit_formation/course with all nine sources, avoiding single-source leaves. Mapping:
${rows.map(row=>`${row.index===9?'PROJECT protocol':`Module ${row.index}`}: ${row.sourceId}`).join('\n')}
Make nine sections, one per module plus protocol. Cite each matching source and include all nine source IDs in entry citations. PROJECT.md supplies distinct timing, final-project sequence, privacy and deliverables: do not omit it as redundant.
Never merge this course into sanity or research topics; never cite legacy/external sources in orbit_formation/course. Keep public URLs and provenance inspectable. Linked references may remain links, not admitted evidence sources.
Prepared traces are not live runs, artistic scenes are not science simulations. Do not invent tests, private work or human approvals.
Timing:8 modules of1 teacher hour+3 solo hours(2 guided hours+30 Colab minutes+30 review minutes). Final project:1 teacher setting hour,6 solo hours with assistant,1 teacher closure hour. Total40hours.`;}

try{
  if(PHASE==='preflight'){
    const before=await safety(9),manifest=await prepared();await save({phase:'PREPARED_PUBLIC_SOURCES_NOT_IMPORTED',before,documents:manifest.documents});console.log(JSON.stringify({phase:'PREPARED_PUBLIC_SOURCES_NOT_IMPORTED',before,documents:9,commit:COMMIT,sourceHashes:manifest.documents.map(item=>({url:item.url,sha256:item.sourceSha256})),mutation:false}));
  }else if(PHASE==='import'){
    const manifest=await localManifest();const listed=await imports();const missing=manifest.documents.filter(item=>!listed.some(row=>row.name===item.filename));const preflight=await safety(missing.length);
    if(manifest.documents.length!==9||manifest.commit!==COMMIT)throw Error('PREPARED_SCOPE_CHANGED');
    const submissions=[];
    for(const item of manifest.documents){const existing=listed.filter(row=>row.name===item.filename);if(existing.length>1||existing[0]?.status==='failed')throw Error('COURSE_IMPORT_DUPLICATE_OR_FAILED');if(existing.length){submissions.push({filename:item.filename,existing:true,id:existing[0].id,status:existing[0].status});continue;}
      const bytes=await readFile(path.join(OUT,'notes',item.filename));if(hash(bytes)!==item.ingestedSha256)throw Error('PREPARED_BYTES_CHANGED');
      const job=await client.context.imports.create({type:'file',file:bytes,filename:item.filename,contentType:'text/markdown'});submissions.push({filename:item.filename,jobId:job.jobId});await save({phase:'IMPORTS_SUBMITTED',preflight,submissions});console.log(JSON.stringify({filename:item.filename,jobId:job.jobId,submitted:true}));
    }await save({phase:'IMPORTS_SUBMITTED',preflight,submissions});
  }else if(PHASE==='status'){
    const manifest=await localManifest(),listed=await imports();const batch=listed.filter(row=>manifest.documents.some(item=>item.filename===row.name));const knowledge=await client.context.knowledgeBases.get(KB);console.log(JSON.stringify({phase:'IMPORT_STATUS',batch:batch.map(row=>({name:row.name,status:row.status,sourceCount:row.sourceCount})),sourceUsage:knowledge.sourceUsage,knowledgeState:knowledge.state,isBuilding:knowledge.isBuilding,openIssueCount:knowledge.openIssueCount,mutation:false}));
  }else if(PHASE==='build'){
    const prior=await existingState();if(prior.buildJobId)throw Error('BUILD_ALREADY_SUBMITTED_USE_BUILD_STATUS');const manifest=await localManifest(),rows=await courseSources(manifest,await imports()),beforeBuild=await safety(0);const job=await client.context.build();await save({phase:'BUILD_SUBMITTED',beforeBuild,courseSources:rows,buildJobId:job.jobId});console.log(JSON.stringify({phase:'BUILD_SUBMITTED',jobId:job.jobId,verifiedCourseDocuments:rows.length}));
  }else if(PHASE==='instruction'){
    const rows=await courseSources(await localManifest(),await imports()),before=await safety(0),existing=await client.context.instructions.list(),statement=scopedInstruction(rows),matches=existing.filter(item=>item.statement?.includes(INSTRUCTION_MARKER));
    if(statement.length>2000)throw Error('INSTRUCTION_TOO_LARGE');
    if(matches.length>1)throw Error('DUPLICATE_COURSE_INSTRUCTION');
    if(matches.length){if(matches[0].statement!==statement||matches[0].status!=='active'||JSON.stringify(instructionSourceIds(matches[0]))!==JSON.stringify(rows.map(row=>row.sourceId).sort()))throw Error('EXISTING_INSTRUCTION_DIFFERS');await save({courseInstructionId:matches[0]._id,instructionSha256:hash(statement)});console.log(JSON.stringify({phase:'COURSE_INSTRUCTION_ALREADY_PRESENT',mutation:false}));}
    else{let response;try{response=await client.context.instructions.create({statement,scopeSourceIds:rows.map(row=>row.sourceId),verified:false});}catch(error){const provider=error.response?.body??{};await writeFile(path.join(OUT,'instruction-error.json'),JSON.stringify({statusCode:error.statusCode??null,body:provider},null,2)+'\n');throw error;}const after=await client.context.instructions.list();if(response.rebuildJobId||after.length!==existing.length+1||existing.some(item=>!after.some(next=>next._id===item._id&&next.statement===item.statement)))throw Error('EXISTING_INSTRUCTION_PRESERVATION_NOT_PROVEN');
      await save({phase:'PUBLIC_COURSE_ROUTING_INSTRUCTION_APPENDED',beforeInstruction:before,courseInstructionId:response.instruction.id,instructionSha256:hash(statement),beforeInstructionsSha256:hash(JSON.stringify(existing)),afterInstructionsSha256:hash(JSON.stringify(after)),preservedExistingInstructions:existing.length,instructionAttribution:'Codex automated routing under explicit human implementation authorization; not human content review',providerInstructionOrigin:response.instruction.origin});console.log(JSON.stringify({phase:'PUBLIC_COURSE_ROUTING_INSTRUCTION_APPENDED',preservedExistingInstructions:existing.length,newInstructions:1,scopedPublicSources:rows.length,verificationClaim:false,automaticRebuild:false}));}
  }else if(PHASE==='consolidate-route'){
    const prior=await existingState();if(!prior.courseInstructionId||!((prior.guidedBuildCount??0)===1||prior.cancelledDuplicateBuildJobId===prior.buildJobId))throw Error('CONSOLIDATION_REQUIRES_FIRST_GUIDED_BUILD');await safety(0);
    const rows=await courseSources(await localManifest(),await imports()),statement=consolidatedInstruction(rows);if(statement.length>2000)throw Error('INSTRUCTION_TOO_LARGE');const before=await client.context.instructions.list(),current=before.find(item=>item._id===prior.courseInstructionId);if(!current||!current.statement.includes(INSTRUCTION_MARKER)||JSON.stringify(instructionSourceIds(current))!==JSON.stringify(rows.map(row=>row.sourceId).sort()))throw Error('COURSE_INSTRUCTION_SCOPE_CHANGED');
    if(current.statement!==statement)await client.context.instructions.edit({instructionId:prior.courseInstructionId,statement,scopeSourceIds:rows.map(row=>row.sourceId)});
    const after=await client.context.instructions.list();if(after.length!==before.length||before.filter(item=>item._id!==prior.courseInstructionId).some(item=>!after.some(next=>next._id===item._id&&next.statement===item.statement)))throw Error('UNRELATED_INSTRUCTION_CHANGED');
    await save({phase:'PUBLIC_COURSE_ROUTING_CONSOLIDATED',instructionSha256:hash(statement),instructionHistory:[...(prior.instructionHistory??[]),{sha256:prior.instructionSha256,reason:'Single-source leaf separation did not produce publicly admissible entries'}],afterInstructionsSha256:hash(JSON.stringify(after))});
    const knowledge=await client.context.knowledgeBases.get(KB),append=' Public Orbit Formation course materials are also in scope: its eight Astro/Three.js frontend modules and PROJECT.md course protocol, learning with a personal assistant,40-hour timing, privacy, exports and final-project integration. These original public teaching sources are implementation material, not private learner work.';
    const description=knowledge.description.includes(append)?knowledge.description:knowledge.description+append;
    if(description!==knowledge.description)await client.context.knowledgeBases.edit(KB,{description});const updated=await client.context.knowledgeBases.get(KB);if(updated.description!==description)throw Error('COURSE_DOMAIN_DESCRIPTION_NOT_PRESERVED');
    await save({phase:'PUBLIC_COURSE_DOMAIN_APPENDED',beforeKnowledgeDescriptionSha256:hash(knowledge.description),afterKnowledgeDescriptionSha256:hash(updated.description),publicDescriptionAppend:append,preservedExistingKnowledgeDescription:true});console.log(JSON.stringify({phase:'PUBLIC_COURSE_DOMAIN_APPENDED',sourcesChanged:0,instructionScope:9,existingDescriptionPreserved:true,automaticBuild:updated.isBuilding}));
  }else if(PHASE==='guided-build'){
    const prior=await existingState();const correctedException=prior.cancelledDuplicateBuildJobId===prior.buildJobId&&!prior.approvedCorrectedBuildUsed;if(!prior.courseInstructionId||((prior.guidedBuildCount??0)>=2&&!correctedException))throw Error('GUIDED_BUILD_LIMIT_OR_INSTRUCTION_MISSING');if(correctedException){const duplicate=await client.context.jobs.get({jobId:prior.cancelledDuplicateBuildJobId});if(!['cancelled','canceled'].includes(duplicate.status))throw Error('DUPLICATE_CANCELLATION_NOT_CONFIRMED');}const instructions=await client.context.instructions.list(),instruction=instructions.find(item=>item._id===prior.courseInstructionId);if(!instruction||instruction.status!=='active'||hash(instruction.statement)!==prior.instructionSha256||instruction.statement.length>2000)throw Error('COURSE_INSTRUCTION_NOT_CURRENT');
    const beforeBuild=await safety(0),job=await client.context.build();await save({phase:'GUIDED_BUILD_SUBMITTED',beforeBuild,guidedBuildCount:(prior.guidedBuildCount??0)+1,approvedCorrectedBuildUsed:correctedException||prior.approvedCorrectedBuildUsed||false,buildHistory:[...(prior.buildHistory??[]),{jobId:prior.buildJobId,status:correctedException?'cancelled-orchestration-duplicate':prior.buildStatus??null}],buildJobId:job.jobId});console.log(JSON.stringify({phase:'GUIDED_BUILD_SUBMITTED',jobId:job.jobId,totalGuidedSubmissions:(prior.guidedBuildCount??0)+1,cancelledOrchestrationDuplicates:correctedException?1:0,maxUsefulAdditionalBuilds:2,instructionCharacters:instruction.statement.length}));
  }else if(PHASE==='build-status'){
    const prior=await existingState();if(!prior.buildJobId)throw Error('BUILD_JOB_NOT_RECORDED');const job=await client.context.jobs.get({jobId:prior.buildJobId}),knowledge=await client.context.knowledgeBases.get(KB);await save({phase:'BUILD_STATUS',buildStatus:job.status});console.log(JSON.stringify({phase:'BUILD_STATUS',status:job.status,completedAt:job.completedAt??null,revisionId:job.result?.revisionId??null,entryCount:job.result?.entryCount??null,errorPresent:!!job.error,knowledgeState:knowledge.state,isBuilding:knowledge.isBuilding,openIssueCount:knowledge.openIssueCount}));
  }else if(PHASE==='audit'){
    const manifest=await localManifest(),rows=await courseSources(manifest,await imports()),allowed=new Set(rows.map(row=>row.sourceId)),metadata=await client.context.entries.list(),admitted=[],rejected=[];
    const revisions=new Set(),coverage=new Set();
    for(let start=0;start<metadata.length;start+=4){const batch=await Promise.all(metadata.slice(start,start+4).map(entry=>client.context.entries.get({path:entry.path})));for(const entry of batch){if(!entry)continue;const ids=[...new Set((entry.citations??[]).map(citation=>citation.sourceId))];const mentions=ids.some(id=>allowed.has(id));if(!mentions)continue;if(entry.status!=='filled'||!entry.body||!ids.length||ids.some(id=>!allowed.has(id))){rejected.push({path:entry.path,reason:'MIXED_OR_INCOMPLETE_COURSE_ENTRY'});continue;}admitted.push({path:entry.path,title:entry.title,sourceIds:ids});revisions.add(entry.revisionId);ids.forEach(id=>coverage.add(id));}}
    if(revisions.size!==1||coverage.size!==9||admitted.length<1||admitted.length>40)throw Error('COURSE_CITATION_COVERAGE_NOT_COMPLETE');
    const after=await safety(0);if(after.conservativeAfter>150)throw Error('POST_IMPORT_BUDGET_REJECTED');
    const revision=[...revisions][0],issues=(await client.context.issues.list({status:'open'})).filter(issue=>issue.revisionId===revision),admittedPaths=new Set(admitted.map(entry=>entry.path));
    const relevantIssues=issues.filter(issue=>{const refs=issueReferences(issue.content);return(!refs.sourceIds.length&&!refs.entryPaths.length)||refs.sourceIds.some(id=>allowed.has(id))||refs.entryPaths.some(entryPath=>admittedPaths.has(entryPath)||entryPath.startsWith('orbit_formation/'));});
    if(issues.length!==after.openIssueCount||relevantIssues.length)throw Error('PUBLIC_COURSE_ISSUE_REQUIRES_REVIEW');
    let outline;for(let trial=0;trial<5;trial++){outline=await actualContext('outline');if(admitted.every(entry=>new RegExp('^'+entry.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\s+\\[[a-z]+\\])?\\s*$','m').test(outline.text)))break;if(trial===4)throw Error('REAL_OUTLINE_NOT_CURRENT');await pause(15000);}
    const scope={enabled:false,knowledge_base:KB,revision_id:[...revisions][0],outline_sha256:hash(outline.text),sources:Object.fromEntries(rows.map(row=>[row.sourceId,{url:row.url,sha256:row.sourceSha256}])),entries:{}};
    for(const entry of admitted){const actual=await actualContext('entries',[entry.path]);scope.entries[entry.path]={title:entry.title,source_ids:entry.sourceIds,sha256:hash(actual.text)};}
    await writeFile(path.join(OUT,'public-scope.json'),JSON.stringify(scope,null,2)+'\n');await writeFile(path.join(ROOT,'services/account-api/config/course_context.php'),manifestPhp(scope));
    const report={version:'orbit-formation-context-public-audit-v1',recordedAt:new Date().toISOString(),phase:'REAL_CONTEXT_AUDITED_NOT_ENABLED',knowledgeBase:KB,sourceCommit:COMMIT,before:(await existingState()).before??null,after,documents:rows.map(row=>({url:row.url,sha256:row.sourceSha256,ingestedSha256:row.ingestedSha256,sourceId:row.sourceId})),allowedEntries:admitted,auditedRevision:scope.revision_id,outlineSha256:scope.outline_sha256,entryHashes:Object.fromEntries(Object.entries(scope.entries).map(([key,value])=>[key,value.sha256])),excludedMixedEntries:rejected.length,allNineSourcesCited:true,upstreamRead:'Actual existing Sanity Context gateway; initial_context and single-entry knowledge_base_read',softwareValidation:'Pending Kaggle',publicEndpointEnabled:false,secretsIncluded:false,learnerWorkIncluded:false};
    await mkdir(path.dirname(publicReceipt),{recursive:true});await writeFile(publicReceipt,JSON.stringify(report,null,2)+'\n');await save({phase:report.phase,after,admittedEntries:admitted.length});console.log(JSON.stringify({phase:report.phase,after,allowedEntryCount:admitted.length,coveredDocuments:coverage.size,excludedMixedEntries:rejected.length,enabled:false}));
  }else{throw Error('Use preflight, import, status, build, instruction, consolidate-route, guided-build, build-status, or audit');}
}catch(error){console.error(JSON.stringify({phase:PHASE,state:'FAILED',errorType:error.constructor?.name,errorCode:typeof error.message==='string'&&/^[A-Z0-9_:.-]+$/.test(error.message)?error.message:'REDACTED_PROVIDER_ERROR',noSecretsPrinted:true}));process.exitCode=1;}
