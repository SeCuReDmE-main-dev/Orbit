import { defineField, defineType } from 'sanity'

export const source = defineType({
  name: 'source', title: 'Source', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required().max(160) }),
    defineField({ name: 'url', title: 'Canonical URL', type: 'url', validation: (rule) => rule.uri({ scheme: ['http', 'https'] }).required() }),
    defineField({ name: 'publisher', type: 'string' }),
    defineField({ name: 'observedAt', type: 'datetime' }),
    defineField({ name: 'license', type: 'string' }),
    defineField({ name: 'notes', type: 'text', rows: 4 }),
  ],
  preview: { select: { title: 'title', subtitle: 'publisher' } },
})
