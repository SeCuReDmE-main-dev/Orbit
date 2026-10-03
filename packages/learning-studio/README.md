# Orbit Learning Studio

Portable local-first Sanity Studio plugin for the Orbit learning course. Installing this plugin adds **Orbit · Lab** and **Orbit · Projects** to the host Studio. It does not replace the host navigation or create a Sanity account, project, dataset or private tenant.

The course remains 40 hours: eight modules with one live hour and three solo hours each, plus a final project with two live hours and six solo hours. The final project follows one teacher hour for setup, six hours with the student's assistant, then one teacher hour for closure.

## Install the archive in your own Studio

Use the `.tgz` produced by the cloud packaging task:

```sh
npm install /path/to/orbit-learning-studio-1.0.1.tgz
```

Add the plugin to the Studio you already own:

```ts
import {defineConfig} from 'sanity'
import {orbitLearningStudio} from '@orbit/learning-studio'

export default defineConfig({
  // Keep your own projectId, dataset, existing plugins and schema here.
  projectId: 'YOUR_PROJECT_ID',
  dataset: 'YOUR_DATASET',
  plugins: [orbitLearningStudio({courseOrigin: 'https://orbit.securedme.ca'})],
})
```

The host must supply React 19 and Sanity 5.1 or 6. The archive embeds the course, learning store, evidence engines, display preferences and WebMCP adapter. It does not import files from the Orbit monorepo at runtime. No npm registry publication is needed.

## Real authority and storage

`useClient()` and `useCurrentUser()` take the project, dataset, authenticated identity and existing permissions from the host. No organisation or service token is included. The plugin never overrides `projectId`, `dataset` or `auth`.

Personal artefacts and reflections stay in memory until local saving is explicitly allowed. Browser saving is namespaced by project, dataset and user. The local browser profile is not an encrypted vault. Switching module, tool, account or workspace invalidates agent access; reopening a tool requires fresh sharing.

Colab notebooks saved in Drive are **Google cloud documents**, not local Orbit storage. A notebook's cells and outputs can be disclosed when it is shared. Choose what to hand to the teacher; installing the plugin grants the teacher no access.

The free Sanity plan has public datasets, and a Growth trial downgrade can make a formerly private dataset public. Treat every selected Sanity publication as publishable content. The sharing view shows the exact destination and JSON before a separate human acknowledgement and click. Only selected artefacts are sent; journal entries, permissions, private proposals and the rest of the session are excluded. No private Sanity form autosave is used. The immutable publication document type is `orbitLearningPublication`.

Publication identity includes the normalized title, course module, revision, destination and selected content. Reopening the same selection preserves its immutable ID and the first stored publication's date; changing its title or module creates a distinct document. Version 1.0.1 leaves existing publications untouched. The complete preview is checked before writing, and the returned document is checked before the UI reports verified publication. A response arriving after revocation or navigation is withheld; a mutation already sent may still have completed, so inspect the stored document before retrying.

## Routes, accessibility and tools

The tool routes are `orbit-learning-lab/:view/:module` and `orbit-learning-projects/:view/:module`, under the host's own Studio base path. The Lab provides Mission, Experiment, Evidence and Reflection. Projects provides Files, Versions, Journal and Sharing.

UI labels and the eight missions support FR, EN and ES and use Orbit's canonical browser display preferences. Resource names retain their declared language. Code and student content are never automatically translated. Static display, contrast and larger text remain local display choices. No decorative scene is required to use the plugin.

When a learning tool is mounted and Chrome exposes native WebMCP, the page registers the original fifteen tool names and ten learning tools once. Leaving the tool removes the registry. A browser without WebMCP shows the unavailable state and keeps the human controls. No tool grants itself human approval, publishes to Sanity or invokes a second LLM service.

The public course Context gateway is explicitly `https://orbit.securedme.ca`, independent of the host Studio's origin. It sends no private student journal or question and no credentials. Cross-origin operation depends on the gateway's CORS policy. The student's own personal MCP remains in their assistant; this plugin collects no such credential.

Engine choices are `baseline`, `n` and `p`, singly or in pairs. A new session selects none. Equal decisions are permitted results; no vote, average truth percentage or automatic winner is added. Artefact hashes identify contents, not mastery or independent execution.

## Build and validate in the cloud

The mission uses Kaggle for software validation and E2B for isolated construction/browser work. Do not run the learning benchmark with Codex or Antigravity model tokens.

```sh
python tools/package_learning_studio.py --environment e2b --repo . --out artifacts/learning-studio
```

The cloud workspace must have the repository sources and its Node/esbuild dependencies installed. Run the focused `tests/learning-studio-publication.test.ts` and the shared learning tests from the Kaggle validation notebook. Installing and building the `.tgz` in a second blank Studio is a separate integration check; a successful bundle alone does not prove it.

Packaging does not publish anything or modify the team Studio configuration. Runtime validation and actual account/permission checks must be reported separately from preparation.
