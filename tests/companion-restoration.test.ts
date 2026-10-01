import { afterEach, describe, expect, it, vi } from 'vitest'
import { allowSharing, currentDraft, parseDraft, readLegacyDraft, resetDraft, restoreDraft, sharingAllowed, updateDraft } from '../web/src/lib/companion-state'

const full = { requestId: 'mission-1', question: 'How?', context: 'A page', report: 'A report', axes: ['Observation'], sources: [{id: 's1', title: 'Source', url: 'https://example.org/source', status: 'read'}] }
afterEach(() => { resetDraft(); vi.unstubAllGlobals() })
describe('Private research restoration', () => {
  it('retains request ID, axes and sources without writing storage before consent', () => {
    const setItem = vi.fn(); vi.stubGlobal('localStorage', { setItem, getItem: () => JSON.stringify(full) })
    updateDraft(full); expect(restoreDraft()).toEqual(full); expect(setItem).not.toHaveBeenCalled()
  })
  it('does not silently assign an anonymous draft to a new account', () => {
    vi.stubGlobal('localStorage', {getItem: () => JSON.stringify(full)})
    expect(restoreDraft().question).toBe(''); expect(readLegacyDraft()).toEqual(full)
    expect(currentDraft().question).toBe('')
  })
  it('revokes sharing and private content when the account closes', () => {
    updateDraft(full); allowSharing(true); resetDraft()
    expect(sharingAllowed()).toBe(false); expect(currentDraft().sources).toEqual([])
  })
  it('rejects corrupted sources instead of restoring unsafe content', () => {
    expect(parseDraft({...full, sources:[{...full.sources[0],url:'javascript:alert(1)'}]})).toBeNull()
    expect(parseDraft({...full,axes:Array(10).fill('extra')})).toBeNull()
  })
})
