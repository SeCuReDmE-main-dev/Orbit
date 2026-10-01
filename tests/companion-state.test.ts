import { describe, expect, it, vi } from 'vitest'
import { allowSharing, allowPresentation, updateDraft, researchRequest, presentResearch, currentDraft } from '../web/src/lib/companion-state'
describe('companion workspace authority', () => {
 it('withholds context until opted in, rejects stale replies and revokes access',()=>{
  vi.stubGlobal('document',{dispatchEvent:vi.fn()})
  updateDraft({requestId:'current',question:'Question',context:'Selected context'})
  allowSharing(false);expect(researchRequest()).toMatchObject({state:'CONSENT_REQUIRED'})
  allowSharing(true);allowPresentation(true);expect(researchRequest()).toMatchObject({question:'Question'})
  expect(()=>presentResearch({requestId:'old',report:'text',axes:[],sources:[]})).toThrow('reference')
  presentResearch({requestId:'current',report:'Clarify the scope?',axes:[],sources:[]})
  expect(currentDraft().report).toBe('Clarify the scope?')
  expect(()=>presentResearch({requestId:'current',report:'text',axes:[],sources:[{title:'unsafe',url:'javascript:alert(1)',status:'read'}]})).toThrow('Invalid source')
  allowSharing(false);expect(()=>presentResearch({requestId:'current',report:'text',axes:[],sources:[]})).toThrow('Consent')
  vi.unstubAllGlobals()
 })
})

