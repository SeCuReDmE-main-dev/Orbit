import {defineCliConfig} from 'sanity/cli'

// Self-hosted static files use the existing Orbit origin. No app registration,
// deployment.appId, credential, dataset creation or permission change occurs.
export default defineCliConfig({
  api: {projectId: 'pzscx4w8', dataset: 'production'},
  project: {basePath: '/formation/studio'},
})
