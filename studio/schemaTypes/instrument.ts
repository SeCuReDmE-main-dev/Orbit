import { defineField, defineType } from 'sanity'

export const instrument = defineType({
  name: 'instrument', title: 'Instrument', type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'platform', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'measurement', type: 'string' }),
    defineField({ name: 'products', type: 'array', of: [{ type: 'reference', to: [{ type: 'product' }] }] }),
    defineField({ name: 'source', type: 'reference', to: [{ type: 'source' }] }),
  ],
  preview: { select: { title: 'name', subtitle: 'platform' } },
})
