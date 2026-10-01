/** Pure admission policy; no client, credentials, or provider operations. */
const hasId=value=>typeof value==='string'&&value.trim().length>0;

export function canConsolidateCourseBuild(state){
  return hasId(state.courseInstructionId)&&hasId(state.buildJobId)&&state.guidedBuildCount===1;
}

export function assertGuidedBuildAllowed(state){
  const count=state.guidedBuildCount??0;
  if(!hasId(state.courseInstructionId)||!Number.isInteger(count)||count<0||count>=2){
    throw Error('GUIDED_BUILD_LIMIT_OR_INSTRUCTION_MISSING');
  }
}
