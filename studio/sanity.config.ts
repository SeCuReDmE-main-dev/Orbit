import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemaTypes/index.js'

export default defineConfig({
  name: 'orbit-companion',
  title: 'Orbit Companion',
  projectId: 'pzscx4w8',
  dataset: 'production',
  plugins: [structureTool()],
  schema: { types: schemaTypes },
})
