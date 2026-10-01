import { describe, expect, it } from 'vitest'
import { contextProvenance } from '../web/src/lib/context-provenance'
const read = (text: string) => contextProvenance([{ type: 'text', text }], ['research/policies'])

describe('Context original-source boundary', () => {
  it('keeps a named Web source without inventing its URL', () => {
    const result = read('# Policies\n## Sources\n1. Vendor Policy § overview — Web\n2. Primary — Web · https://example.org/policy')
    expect(result.status).toBe('incomplete')
    expect(result.referencesWithoutOriginalUrl).toBe(1)
    expect(result.references[0]).toMatchObject({ title: 'Vendor Policy § overview', url: null, entryTitle: 'Policies' })
    expect(result.references[1].url).toBe('https://example.org/policy')
    expect(result.originalDocumentsRead).toBe(false)
  })
  it('separates a local derivative file from the original publication', () => {
    expect(read('## Sources\n1. LOCAL_COMPARISON.md — File')).toMatchObject({status:'incomplete',references:[{kind:'file',url:null}]})
  })
  it('does not turn an uncited body URL into a source reference', () => {
    expect(read('Claim: https://example.org\n1. Vendor — Web')).toMatchObject({ status:'not-observed', references:[] })
  })
  it('does not assign the first entry citations to every selected path', () => {
    const result=read('# First\n## Sources\n1. A — Web\n---\n# Second\n## Sources\n1. B — Web · https://example.org/b')
    expect(result.references.map(r=>r.entryTitle)).toEqual(['First','Second'])
  })
  it('refuses credential-bearing or executable source addresses', () => {
    const result=read('## Sources\n1. A — Web · https://user:password@example.org\n2. B — Web · javascript:alert(1)')
    expect(result.references.every(r=>r.url===null)).toBe(true)
  })
  it('supports CRLF and explicitly marks complete observed URL metadata', () => {
    expect(read('# Title\r\n## Sources\r\n1. Source — Web · https://example.org')).toMatchObject({status:'urls-observed',originalDocumentsRead:false})
  })
})
