import { defineField, defineType } from 'sanity'

export const concept = defineType({
  name: 'concept', title: 'Concept', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required().max(120) }),
    defineField({ name: 'summary', type: 'text', rows: 5, validation: (rule) => rule.required() }),
    defineField({ name: 'sources', type: 'array', of: [{ type: 'reference', to: [{ type: 'source' }] }] }),
  ],
})
