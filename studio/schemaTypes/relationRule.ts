import { defineField, defineType } from 'sanity'

export const relationRule = defineType({
  name: 'relationRule',
  title: 'Relation rule',
  type: 'document',
  fields: [
    defineField({ name: 'attribute', type: 'string', description: 'For example value:availability or scope:product.', validation: (rule) => rule.required().max(160) }),
    defineField({ name: 'left', type: 'string', validation: (rule) => rule.required().max(500) }),
    defineField({ name: 'right', type: 'string', validation: (rule) => rule.required().max(500) }),
    defineField({
      name: 'relation',
      type: 'string',
      options: { list: ['identical', 'incompatible', 'unknown'] },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'justification', type: 'text', rows: 4, validation: (rule) => rule.required().max(1200) }),
    defineField({ name: 'ruleVersion', type: 'string', validation: (rule) => rule.required().max(40) }),
    defineField({ name: 'corpus', type: 'reference', to: [{ type: 'researchCorpus' }] }),
    defineField({ name: 'sources', type: 'array', of: [{ type: 'reference', to: [{ type: 'source' }] }], validation: (rule) => rule.min(1) }),
    defineField({ name: 'approvedByHuman', type: 'boolean', initialValue: false, description: 'An agent cannot set this field as proof of human approval.' }),
  ],
  preview: {
    select: { attribute: 'attribute', left: 'left', right: 'right', relation: 'relation' },
    prepare: ({ attribute, left, right, relation }) => ({ title: `${left ?? '?'} ↔ ${right ?? '?'}`, subtitle: `${attribute ?? '?'} · ${relation ?? '?'}` }),
  },
})
