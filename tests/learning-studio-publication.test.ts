import {describe, expect, it, vi} from 'vitest'
import {createPublicationPreview, publishReviewedSelection, validatePublication, type PublishableSession} from '../packages/learning-studio/src/publication'

const destination = {projectId:'student-project',dataset:'production',userId:'student-1'}
function session(): PublishableSession & {journal: unknown[]; proposals: unknown[]} {
  return {id:'lesson-1',namespace:'student-project/production/student-1',revision:4,permissions:{sanityPublish:true},artifacts:[{id:'public-brick',content:'export const position = 3',title:'A chosen brick'},{id:'private-note',content:'Private observation',title:'Private note'}],journal:[{text:'Never publish automatically'}],proposals:[{text:'Private suggestion'}]} as PublishableSession & {journal: unknown[]; proposals: unknown[]}
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
    current.artifacts[0]={id:'public-brick',content:'different content'} as {id:string}
    await expect(validatePublication(preview,current,destination,true)).rejects.toThrow('preview content changed')
  })
  it('uses an immutable content-addressed create operation instead of replacing existing work',async()=>{
    const current=session(),preview=await createPublicationPreview(current,['public-brick'],destination,'Example')
    const client={createIfNotExists:vi.fn().mockResolvedValue({_id:preview.document._id})}
    await publishReviewedSelection(client,preview,current,destination,true)
    await publishReviewedSelection(client,preview,current,destination,true)
    expect(client.createIfNotExists).toHaveBeenCalledTimes(2)
    expect(client.createIfNotExists.mock.calls[0][0]._id).toBe(client.createIfNotExists.mock.calls[1][0]._id)
  })
})
