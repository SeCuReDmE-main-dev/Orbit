import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemaTypes/index.js'
import { orbitEvidenceReview } from './plugins/evidence-review/index'
import { orbitResearchWorkbench } from './plugins/research-workbench/index'
import { OrbitToolMenu } from './components/OrbitToolMenu'
import { orbitStructure } from './structure'

export default defineConfig({
  name: 'orbit-companion',
  title: 'Orbit Companion',
  projectId: 'pzscx4w8',
  dataset: 'production',
  // The public Orbit host serves the Studio as a distinct, authenticated surface.
  // Keep asset and client-side routes inside /studio instead of colliding with
  // the public Astro application at the domain root.
  basePath: '/studio',
  plugins: [structureTool({ structure: orbitStructure }), orbitEvidenceReview(), orbitResearchWorkbench()],
  studio: { components: { toolMenu: OrbitToolMenu } },
  schema: { types: schemaTypes },
})
