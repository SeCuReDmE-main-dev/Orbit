import { defineField, defineType } from 'sanity'

export const product = defineType({
  name: 'product', title: 'Data product', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'kind', type: 'string', options: { list: ['observation', 'retrieval', 'forecast', 'derived'] }, validation: (rule) => rule.required() }),
    defineField({ name: 'units', type: 'string' }),
    defineField({ name: 'source', type: 'reference', to: [{ type: 'source' }], validation: (rule) => rule.required() }),
    defineField({ name: 'qualityNotes', type: 'text', rows: 4 }),
  ],
})
