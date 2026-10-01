import { defineField, defineType } from 'sanity'

export const source = defineType({
  name: 'source', title: 'Source', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required().max(160) }),
    defineField({ name: 'url', title: 'Canonical URL', type: 'url', validation: (rule) => rule.uri({ scheme: ['http', 'https'] }).required() }),
    defineField({ name: 'publisher', type: 'string' }),
    defineField({ name: 'publishedAt', type: 'datetime' }),
    defineField({ name: 'version', type: 'string' }),
    defineField({ name: 'observedAt', type: 'datetime' }),
    defineField({ name: 'license', type: 'string' }),
    defineField({ name: 'excerpt', type: 'text', rows: 8, description: 'Exact retained passage used by Orbit. Do not paraphrase here.' }),
    defineField({ name: 'notes', type: 'text', rows: 4 }),
    defineField({
      name: 'auditState',
      title: 'Source inventory state',
      type: 'string',
      initialValue: 'active',
      options: { list: ['active', 'review', 'duplicate', 'unreachable', 'excluded'] },
      description: 'Excluding or deleting a cited source requires a dependency review.',
    }),
    defineField({ name: 'auditNote', type: 'text', rows: 3 }),
    defineField({ name: 'replacedBy', type: 'reference', to: [{ type: 'source' }] }),
    defineField({ name: 'corpora', type: 'array', of: [{ type: 'reference', to: [{ type: 'researchCorpus' }] }] }),
  ],
  preview: { select: { title: 'title', subtitle: 'publisher' } },
})
