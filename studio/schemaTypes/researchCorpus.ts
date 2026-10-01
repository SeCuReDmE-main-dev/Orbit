import { defineField, defineType } from 'sanity'

export const researchCorpus = defineType({
  name: 'researchCorpus',
  title: 'Research corpus',
  type: 'document',
  fields: [
    defineField({
      name: 'key',
      title: 'Stable key',
      type: 'string',
      options: { list: [
        { title: 'Clean references', value: 'clean-reference' },
        { title: 'Direct contradictions', value: 'direct-contradiction' },
        { title: 'Scope ambiguities', value: 'scope-ambiguity' },
        { title: 'Version evolution', value: 'version-evolution' },
      ] },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required().max(160) }),
    defineField({ name: 'purpose', type: 'text', rows: 4, validation: (rule) => rule.required().max(1200) }),
    defineField({
      name: 'status',
      type: 'string',
      initialValue: 'incomplete',
      options: { list: ['incomplete', 'ready', 'retired'] },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'admissionCriteria',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (rule) => rule.required().min(1).max(12),
    }),
    defineField({ name: 'expectedCases', type: 'array', of: [{ type: 'string' }], validation: (rule) => rule.max(12) }),
    defineField({
      name: 'sources',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'source' }] }],
      description: 'Only reviewed source records are linked here. Empty is an honest incomplete corpus.',
    }),
    defineField({ name: 'notes', type: 'text', rows: 5 }),
  ],
  preview: { select: { title: 'title', subtitle: 'status' } },
})
