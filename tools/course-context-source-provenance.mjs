import {createHash} from 'node:crypto';

const hash=text=>createHash('sha256').update(text).digest('hex');
// Context inserts blank lines while splitting Markdown sections. Preserve every
// nonempty line verbatim, including indentation and spaces inside code/strings.
export const canonicalCourseProjection=text=>text.replace(/\r\n/g,'\n').split('\n').filter(line=>line.trim().length>0).join('\n');

export function verifyCourseFragment(source,content,parent,canonical){
  if(source.status!=='ready'||source.kind!=='file'||source.knowledgeBaseId!==parent.providerKnowledgeBaseId||
    typeof source.id!=='string'||content.sourceId!==source.id||typeof content.content!=='string'||
    !source.filename?.startsWith(parent.filename+' § ')||hash(canonical)!==parent.ingestedSha256){
    throw Error('COURSE_FRAGMENT_PROVENANCE_NOT_PROVEN');
  }
  const heading=source.filename.slice((parent.filename+' § ').length),text=content.content.replace(/\r\n/g,'\n');
  const wrapper='> From '+parent.filename+' › '+heading+'\n\n';
  if(!heading||heading.length>1500||!text.startsWith(wrapper)||Buffer.byteLength(text)>100000){
    throw Error('COURSE_FRAGMENT_WRAPPER_NOT_PROVEN');
  }
  const projection=canonicalCourseProjection(text.slice(wrapper.length));
  if(projection.length<100||!canonicalCourseProjection(canonical).includes(projection)){
    throw Error('COURSE_FRAGMENT_TEXT_DIFFERS_FROM_CANONICAL');
  }
  return {parent_source_id:parent.sourceId,parent_sha256:parent.sourceSha256,filename:source.filename,
    sha256:hash(content.content),canonical_projection_sha256:hash(projection),
    normalization:'empty-lines-and-crlf-after-provider-wrapper'};
}
