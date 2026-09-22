import { defineField, defineType } from 'sanity'

export const claim = defineType({
  name: 'claim', title: 'Claim', type: 'document',
  fields: [
    defineField({ name: 'statement', type: 'text', rows: 4, validation: (rule) => rule.required().max(800) }),
    defineField({ name: 'status', type: 'string', options: { list: ['confirmed', 'inferred', 'unresolved'] }, validation: (rule) => rule.required() }),
    defineField({ name: 'confidence', type: 'number', validation: (rule) => rule.min(0).max(1) }),
    defineField({ name: 'sources', type: 'array', of: [{ type: 'reference', to: [{ type: 'source' }] }], validation: (rule) => rule.min(1) }),
  ],
  preview: { select: { title: 'statement', subtitle: 'status' } },
})
