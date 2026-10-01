import { describe, expect, it } from 'vitest'
import { compareClaims, type ContradictionRule } from '../packages/evidence-review/src/relations'
import type { Claim, ClaimScope } from '../packages/evidence-review/src/index'

const make = (id: string, value: string, more: Partial<ClaimScope> = {}): Claim => ({
  id, statement: id, kind: 'reported', disposition: 'indeterminate', evidence: [],
  scopeAttributes: { subject: 'operation', property: 'availability', value, ...more },
})
const rules: ContradictionRule[] = [{ id: 'exclusive', attribute: 'value:availability', left: 'yes', right: 'no', relation: 'incompatible', version: '1', justification: 'Mutually exclusive values under identical conditions.' }]

describe('missing scope and domain equivalence regressions', () => {
  it('does not infer identical scope from missing boundaries on both sides', () => {
    expect(compareClaims(make('a', 'yes'), make('b', 'no'), rules).kind).toBe('indeterminate')
  })
  it('keeps a missing provider indeterminate rather than asserting a scope difference', () => {
    expect(compareClaims(make('a', 'yes', { product: 'api', provider: 'A' }), make('b', 'no', { product: 'api' }), rules).kind).toBe('indeterminate')
  })
  it('does not infer succession from a missing version', () => {
    expect(compareClaims(make('a', 'yes', { product: 'api', version: '1' }), make('b', 'no', { product: 'api' }), rules).kind).toBe('indeterminate')
  })
  it('does not infer replacement merely from different version strings', () => {
    expect(compareClaims(make('a', 'yes', { product: 'api', version: '1' }), make('b', 'no', { product: 'api', version: '2' }), rules).kind).not.toBe('version-succession')
  })
  it('uses approved equivalence instead of raw string inequality', () => {
    const equivalent: ContradictionRule = { id: 'alias', attribute: 'scope:product', left: 'api', right: 'API public name', relation: 'identical', justification: 'Names of the same documented product.', version: '1' }
    expect(compareClaims(make('a', 'yes', { product: 'api' }), make('b', 'no', { product: 'API public name' }), [...rules, equivalent]).kind).toBe('same-scope-contradiction')
  })
})
