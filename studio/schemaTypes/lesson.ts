import { defineField, defineType } from 'sanity'

export const lesson = defineType({
  name: 'lesson', title: 'Lesson', type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    defineField({ name: 'learningObjective', type: 'text', rows: 3, validation: (rule) => rule.required() }),
    defineField({ name: 'concepts', type: 'array', of: [{ type: 'reference', to: [{ type: 'concept' }] }] }),
    defineField({ name: 'checkpointPrompt', type: 'text', rows: 3 }),
    defineField({ name: 'sources', type: 'array', of: [{ type: 'reference', to: [{ type: 'source' }] }] }),
  ],
})
