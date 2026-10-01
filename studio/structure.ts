import type { StructureResolver } from 'sanity/structure'

export const orbitStructure: StructureResolver = (S) => S.list()
  .title('Content')
  .items([
    S.documentTypeListItem('researchCorpus').title('Research corpus'),
    S.documentTypeListItem('source').title('Source'),
    S.documentTypeListItem('claim').title('Claim'),
    S.documentTypeListItem('concept').title('Concept'),
    S.documentTypeListItem('relationRule').title('Relation rules'),
    S.divider(),
    S.listItem()
      .title('Scientific content kept from the earlier build')
      .child(S.list().title('Scientific content').items([
        S.documentTypeListItem('product').title('Data product'),
        S.documentTypeListItem('instrument').title('Instrument'),
        S.documentTypeListItem('lesson').title('Lesson'),
      ])),
  ])
