import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {verifyCourseFragment} from '../tools/course-context-source-provenance.mjs';

const canonical='# Public protocol\n\nModule8: 3 solo hours and1 webinar hour.\n\nProject: 1 setting hour,6 solo hours,1 closure hour; separate from module time.\n\n    const label = "two  spaces";\n';
const sha=value=>createHash('sha256').update(value).digest('hex');
const parent={sourceId:'parent-fixture',filename:'PROTOCOL.md',providerKnowledgeBaseId:'internal-kb',ingestedSha256:sha(canonical),sourceSha256:'a'.repeat(64)};
const source={id:'fragment-fixture',filename:'PROTOCOL.md § Public protocol',status:'ready',kind:'file',knowledgeBaseId:'internal-kb'};
const fragment=(body=canonical)=>({sourceId:source.id,content:'> From PROTOCOL.md › Public protocol\n\n'+body});

test('a real split fragment keeps its canonical parent and hashes without adding a source',()=>{
  const admitted=verifyCourseFragment(source,fragment(canonical.replace(/\n\n/g,'\n\n\n')),parent,canonical);
  assert.equal(admitted.parent_source_id,parent.sourceId);
  assert.equal(admitted.parent_sha256,parent.sourceSha256);
  assert.equal(admitted.sha256.length,64);
  assert.equal(admitted.canonical_projection_sha256.length,64);
});

test('a changed timing or code string is rejected despite a plausible source filename',()=>{
  for(const body of [canonical.replace('3 solo','1 solo'),canonical.replace('two  spaces','two spaces')]){
    assert.throws(()=>verifyCourseFragment(source,fragment(body),parent,canonical),/TEXT_DIFFERS/);
  }
});

test('a fragment from another KB, parent, or changed canonical snapshot is refused',()=>{
  assert.throws(()=>verifyCourseFragment({...source,knowledgeBaseId:'other'},fragment(),parent,canonical),/PROVENANCE/);
  assert.throws(()=>verifyCourseFragment({...source,filename:'OTHER.md § Public protocol'},fragment(),parent,canonical),/PROVENANCE/);
  assert.throws(()=>verifyCourseFragment(source,fragment(),parent,canonical+'changed'),/PROVENANCE/);
  assert.throws(()=>verifyCourseFragment(source,{...fragment(),sourceId:'other'},parent,canonical),/PROVENANCE/);
});

test('provider wrappers cannot change the origin or admit an unrelated passage',()=>{
  assert.throws(()=>verifyCourseFragment(source,{sourceId:source.id,content:'> From OTHER.md › Public protocol\n\n'+canonical},parent,canonical),/WRAPPER/);
  assert.throws(()=>verifyCourseFragment(source,fragment('Invented content. '.repeat(20)),parent,canonical),/TEXT_DIFFERS/);
});
