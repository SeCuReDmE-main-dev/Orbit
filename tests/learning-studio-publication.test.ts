import {describe, expect, it, vi} from 'vitest'
import {createPublicationPreview, publishReviewedSelection, validatePublication, type PublishableSession, type PublicationPreview} from '../packages/learning-studio/src/publication'

const destination = {projectId:'student-project',dataset:'production',userId:'student-1'}
function session(): PublishableSession & {artifacts:Array<{id:string;content:string;title?:string}>;journal: unknown[]; proposals: unknown[]} {
  return {id:'lesson-1',namespace:'student-project/production/student-1',revision:4,permissions:{sanityPublish:true},artifacts:[{id:'public-brick',content:'export const position = 3',title:'A chosen brick'},{id:'private-note',content:'Private observation',title:'Private note'}],journal:[{text:'Never publish automatically'}],proposals:[{text:'Private suggestion'}]}
}
describe('Studio publication boundary',()=>{
  it('prepares only explicitly selected artefacts, without a client write',async()=>{
    const preview=await createPublicationPreview(session(),['public-brick'],destination,'Shared example','2026-10-01T12:00:00Z')
    const payload=JSON.parse(preview.document.payloadJson)
    expect(payload.artifacts.map((item:{id:string})=>item.id)).toEqual(['public-brick'])
    expect(payload).not.toHaveProperty('journal')
    expect(payload).not.toHaveProperty('proposals')
    expect(payload).not.toHaveProperty('permissions')
    expect(preview.document._id).toMatch(/^orbit\.learning\.[a-f0-9]{64}$/)
  })
  it('does not write without separate human acknowledgement and publication permission',async()=>{
    const current=session(),preview=await createPublicationPreview(current,['public-brick'],destination,'Example')
    const client={createIfNotExists:vi.fn().mockResolvedValue({})}
    await expect(publishReviewedSelection(client,preview,current,destination,false)).rejects.toThrow('human')
    current.permissions.sanityPublish=false
    await expect(publishReviewedSelection(client,preview,current,destination,true)).rejects.toThrow('human')
    expect(client.createIfNotExists).not.toHaveBeenCalled()
  })
  it('invalidates a preview after a revision, account or workspace change',async()=>{
    const current=session(),preview=await createPublicationPreview(current,['public-brick'],destination,'Example')
    await expect(validatePublication(preview,{...current,revision:5},destination,true)).rejects.toThrow('session changed')
    await expect(validatePublication(preview,current,{...destination,userId:'other'},true)).rejects.toThrow('workspace or account')
    await expect(validatePublication(preview,{...current,namespace:'other'},destination,true)).rejects.toThrow('workspace or account')
  })
  it('does not write when access is revoked while validating the preview',async()=>{
    const current=session(),preview=await createPublicationPreview(current,['public-brick'],destination,'Example')
    const client={createIfNotExists:vi.fn().mockResolvedValue({})}
    await expect(publishReviewedSelection(client,preview,current,destination,true,()=>false)).rejects.toThrow('permission or workspace changed')
    expect(client.createIfNotExists).not.toHaveBeenCalled()
  })
  it('refuses unknown, duplicate or empty selections and a changed passage',async()=>{
    const current=session()
    await expect(createPublicationPreview(current,[],destination,'Example')).rejects.toThrow('distinct')
    await expect(createPublicationPreview(current,['public-brick','public-brick'],destination,'Example')).rejects.toThrow('distinct')
    await expect(createPublicationPreview(current,['missing'],destination,'Example')).rejects.toThrow('no longer')
    const preview=await createPublicationPreview(current,['public-brick'],destination,'Example')
    current.artifacts[0]={id:'public-brick',content:'different content'}
    await expect(validatePublication(preview,current,destination,true)).rejects.toThrow('preview content changed')
  })
  it('uses an immutable content-addressed create operation instead of replacing existing work',async()=>{
    const current=session(),preview=await createPublicationPreview(current,['public-brick'],destination,'Example')
    const documents=new Map<string,PublicationPreview['document']>()
    const client={createIfNotExists:vi.fn(async(document:PublicationPreview['document'])=>{
      if(!documents.has(document._id))documents.set(document._id,structuredClone(document))
      return structuredClone(documents.get(document._id)!)
    })}
    await publishReviewedSelection(client,preview,current,destination,true)
    await publishReviewedSelection(client,preview,current,destination,true)
    expect(client.createIfNotExists).toHaveBeenCalledTimes(2)
    expect(client.createIfNotExists.mock.calls[0][0]._id).toBe(client.createIfNotExists.mock.calls[1][0]._id)
    expect(documents.size).toBe(1)
  })
  it('gives a changed title or module its own immutable identity, preserving existing documents',async()=>{
    const current={...session(),moduleId:1}
    const first=await createPublicationPreview(current,['public-brick'],destination,'Title A')
    const renamed=await createPublicationPreview(current,['public-brick'],destination,'Title B')
    const anotherModule=await createPublicationPreview({...current,moduleId:2},['public-brick'],destination,'Title A')
    expect(renamed.document._id).not.toBe(first.document._id)
    expect(anotherModule.document._id).not.toBe(first.document._id)
    const documents=new Map<string,PublicationPreview['document']>()
    const client={createIfNotExists:vi.fn(async(document:PublicationPreview['document'])=>{
      if(!documents.has(document._id))documents.set(document._id,structuredClone(document))
      return structuredClone(documents.get(document._id)!)
    })}
    await publishReviewedSelection(client,first,current,destination,true)
    const result=await publishReviewedSelection(client,renamed,current,destination,true)
    expect(result.title).toBe('Title B')
    expect(documents.get(first.document._id)?.title).toBe('Title A')
    expect(documents.size).toBe(2)
  })
  it('keeps the same selection and normalized title stable across fresh preview timestamps',async()=>{
    const current={...session(),moduleId:1}
    const first=await createPublicationPreview(current,['public-brick'],destination,' Example ','2026-10-01T12:00:00Z')
    const later=await createPublicationPreview(current,['public-brick'],destination,'Example','2026-10-02T12:00:00Z')
    expect(later.document._id).toBe(first.document._id)
    expect(later.document.publishedAt).not.toBe(first.document.publishedAt)
    const client={createIfNotExists:vi.fn().mockResolvedValue(first.document)}
    const result=await publishReviewedSelection(client,later,current,destination,true)
    expect(result.publishedAt).toBe(first.document.publishedAt)
  })
  it.each([
    ['title','Changed after review'],['moduleId',8],['revision',999],
    ['publishedAt','2026-10-03T00:00:00Z'],['_type','anotherType'],
    ['privateJournal','Do not send this'],
  ])('refuses changed document metadata %s before writing',async(key,value)=>{
    const current={...session(),moduleId:1}
    const preview=await createPublicationPreview(current,['public-brick'],destination,'Example','2026-10-01T12:00:00Z')
    const changed=structuredClone(preview)
    Object.assign(changed.document,{[key]:value})
    const client={createIfNotExists:vi.fn().mockResolvedValue(changed.document)}
    await expect(publishReviewedSelection(client,changed,current,destination,true)).rejects.toThrow('preview content changed')
    expect(client.createIfNotExists).not.toHaveBeenCalled()
  })
  it.each([
    ['title','Unexpected title'],['moduleId',8],['revision',999],
    ['payloadJson','{}'],['_id','other-document'],['_type','anotherType'],
    ['publishedAt','not-a-date'],['privateJournal','Do not send this'],
  ])('does not report success for an inexact stored document %s',async(key,value)=>{
    const current={...session(),moduleId:1}
    const preview=await createPublicationPreview(current,['public-brick'],destination,'Example')
    const client={createIfNotExists:vi.fn().mockResolvedValue({...preview.document,[key]:value})}
    await expect(publishReviewedSelection(client,preview,current,destination,true)).rejects.toThrow('stored publication')
  })
  it('refuses an empty mutation response instead of inferring successful publication',async()=>{
    const current=session(),preview=await createPublicationPreview(current,['public-brick'],destination,'Example')
    const client={createIfNotExists:vi.fn().mockResolvedValue({_id:preview.document._id})}
    await expect(publishReviewedSelection(client,preview,current,destination,true)).rejects.toThrow('stored publication')
  })
  it('accepts actual Sanity system metadata without incorporating it into the reviewed content',async()=>{
    const current=session(),preview=await createPublicationPreview(current,['public-brick'],destination,'Example')
    const stored={...preview.document,_rev:'native-revision',_createdAt:preview.document.publishedAt,_updatedAt:preview.document.publishedAt}
    const client={createIfNotExists:vi.fn().mockResolvedValue(stored)}
    expect(await publishReviewedSelection(client,preview,current,destination,true)).toEqual(stored)
  })
  it('withholds success after revocation while the immutable write is in flight',async()=>{
    const current=session(),preview=await createPublicationPreview(current,['public-brick'],destination,'Example')
    let active=true,complete!:(value:unknown)=>void
    const client={createIfNotExists:vi.fn(()=>new Promise(resolve=>{complete=resolve}))}
    const pending=publishReviewedSelection(client,preview,current,destination,true,()=>active)
    await vi.waitFor(()=>expect(client.createIfNotExists).toHaveBeenCalledTimes(1))
    active=false;complete(preview.document)
    await expect(pending).rejects.toThrow('permission or workspace changed')
  })
})
