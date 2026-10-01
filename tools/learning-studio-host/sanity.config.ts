import {defineConfig} from 'sanity'
import {orbitLearningStudio} from '@orbit/learning-studio'

// The CLI owns the /formation/studio mount. A workspace base path of / keeps
// the two paths from being accidentally joined as /formation/studio/studio.
// This host consumes the portable archive, not a monorepo source import.
export default defineConfig({
  name: 'orbit-formation-host',
  title: 'Orbit · Formation Studio',
  projectId: 'pzscx4w8',
  dataset: 'production',
  basePath: '/',
  plugins: [orbitLearningStudio({courseOrigin: 'https://orbit.securedme.ca'})],
  schema: {types: []},
})
