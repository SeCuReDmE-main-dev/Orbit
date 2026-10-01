import assert from 'node:assert/strict';
import test from 'node:test';
import {assertGuidedBuildAllowed,canConsolidateCourseBuild} from '../tools/course-context-build-policy.mjs';

test('a new course permits its first build without inventing a cancelled job',()=>{
  const state={courseInstructionId:'instruction.fixture'};
  assert.doesNotThrow(()=>assertGuidedBuildAllowed(state));
  assert.equal(canConsolidateCourseBuild(state),false);
});

test('two accepted submissions are the hard bound, including legacy cancellation fields',()=>{
  assert.doesNotThrow(()=>assertGuidedBuildAllowed({courseInstructionId:'instruction.fixture',guidedBuildCount:1}));
  const state={courseInstructionId:'instruction.fixture',guidedBuildCount:2,
    buildJobId:'job.fixture',cancelledDuplicateBuildJobId:'job.fixture',approvedCorrectedBuildUsed:false};
  assert.throws(()=>assertGuidedBuildAllowed(state),/GUIDED_BUILD_LIMIT/);
});

test('invalid counts and missing instructions cannot authorize provider mutations',()=>{
  for(const count of [-1,0.5,NaN,'0',3]){
    assert.throws(()=>assertGuidedBuildAllowed({courseInstructionId:'instruction.fixture',guidedBuildCount:count}),/GUIDED_BUILD_LIMIT/);
  }
  for(const instruction of [undefined,null,'','   ']){
    assert.throws(()=>assertGuidedBuildAllowed({courseInstructionId:instruction}),/INSTRUCTION_MISSING/);
  }
});

test('consolidation requires the actual first accepted job, never undefined equality',()=>{
  assert.equal(canConsolidateCourseBuild({courseInstructionId:'instruction.fixture',guidedBuildCount:1}),false);
  assert.equal(canConsolidateCourseBuild({courseInstructionId:'instruction.fixture',buildJobId:'',guidedBuildCount:1}),false);
  assert.equal(canConsolidateCourseBuild({courseInstructionId:'instruction.fixture',buildJobId:'job.fixture',guidedBuildCount:1}),true);
  assert.equal(canConsolidateCourseBuild({courseInstructionId:'instruction.fixture',buildJobId:'job.fixture',guidedBuildCount:2}),false);
});
