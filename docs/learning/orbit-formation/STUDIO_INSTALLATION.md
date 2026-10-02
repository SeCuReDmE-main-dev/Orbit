# Install Orbit learning tools in your own Sanity Studio

The portable plugin adds **Orbit · Lab** and **Orbit · Projects** to a Studio that you already own. It does not create a Sanity account, project, dataset, or teacher invitation. Your host Studio supplies its project, dataset, authenticated session, and existing rights; this follows the [Sanity plugin configuration API](https://www.sanity.io/docs/studio/plugins-api-reference).

## Verified archive and validation status

Download [orbit-learning-studio-1.0.0.tgz](../../../artifacts/learning-studio/orbit-learning-studio-1.0.0.tgz) and retain its [packaging report](../../../artifacts/learning-studio/package-report.json).

The collected archive SHA-256 is:

```text
184358d01d9866ef7da0b5ac67f5d8020545656a31b66e39fece0c0e8e17ff64
```

The current archive hash is recorded in the packaging report and in the [public closure HTTP digest readback](../../receipts/formation/closure-static-live-transport.json). The archive contains its JavaScript bundle, TypeScript declaration, build-input record, package manifest, and README. The learning core and engines are embedded; React and Sanity come from the host. No npm publication is required.

**The current package was installed and served by a second HTTPS Studio during the recorded validation.** The [cross-origin receipt](../../receipts/formation/cross-origin-public-validation.json) records 16 passing public checks, including native discovery and execution of the course registry, consent boundaries and a credential-free course Context read from the foreign origin. It does not establish an authenticated Content Lake write. The later temporary authentication desktop is now absent from the active SDK inventory, and its exact CORS rule has been removed; [authentication closure](../../receipts/formation/native-studio-authentication-closure.json). Its expired address is not a permanent learner Studio.

The exact current archive was installed and compiled in E2B with the fixed host dependencies and **316 generated files**. The [current cloud-build receipt](../../receipts/formation/current-portable-studio-cloud-build.json) is checked against the actual returned build artifact. This is construction evidence, explicitly `build-not-test`; the later Kaggle runtime checks and authenticated publication keep separate receipts.

The dedicated course Context now serves its nine admitted canonical sources. [Admission and provenance](../../receipts/formation/course-context-ingestion.json). The subsequent owner-operated native login is a separate flow: Google rejected Chrome 150 as an insecure browser; the official Chrome 154 update and login-screen reload are [recorded separately](../../receipts/formation/native-studio-login-chrome154-kaggle.json). Without a confirmed native login, authenticated selected publication, replay, workspace/logout transitions and a read-only-account server rejection remain **unvalidated**.

The historical [locked integration receipt](../../receipts/formation/portable-studio-v2-install-kaggle.json) qualified archive `f2b0dc68…` with `PASS_STATIC_INSTALL_BUILD`, all command exits 0 and **315 generated build files**. Its [immutable Kaggle version 354436854](https://www.kaggle.com/code/celebrum/orbit-formation-software-validation?scriptVersionId=354436854) retains that result. The historical [authenticated UI-only observation](../../receipts/formation/authenticated-second-studio.json) reads eight modules, FR/EN/ES controls, memory storage and all six permissions off, with no native tool call or Content Lake write. Neither historical result is relabelled as a test of the current archive. See the [current delivery receipt](../../receipts/FORMATION_DELIVERY_STATUS.md) for the separate qualifications.

The [earlier installation receipt](../../receipts/formation/second-studio-static.json), archive `3e3a499d…`, and the [subsequent locked installation](../../receipts/formation/portable-studio-locked-install-kaggle.json), archive `ea0f93ef…`, are preserved as **historical checkpoints**. Their results and hashes do not identify the archive currently linked above.

## Add the plugin to an existing Studio

From your own Studio directory, install the downloaded archive:

```sh
npm install /path/to/orbit-learning-studio-1.0.0.tgz
```

Add the plugin to your existing `sanity.config.ts`; preserve your other plugins, schemas, and workspace configuration:

```ts
import {defineConfig} from 'sanity'
import {orbitLearningStudio} from '@orbit/learning-studio'

export default defineConfig({
  name: 'my-studio',
  projectId: 'YOUR_PROJECT_ID',
  dataset: 'YOUR_DATASET',
  plugins: [
    // Keep your existing plugins here.
    orbitLearningStudio({courseOrigin: 'https://orbit.securedme.ca'}),
  ],
  schema: {types: [/* Keep your existing schema types here. */]},
})
```

The example is a configuration pattern, not a request to replace an existing file. Your project and dataset identifiers are configuration, not credentials. Do not paste a service token into this file, the plugin, a notebook, or a learner handout.

The current Orbit host is pinned for the integration campaign to **Sanity 6.16.0, React 19.3.0, react-dom 19.3.0, and styled-components 6.5.3**, as resolved by its lockfile. Sanity 6.16.0 declares Node `>=22.12`; the Kaggle cell uses Node **22.20.0** with an archive checksum. These are the validation versions. The package's broader peer range is not a promise that every permitted version has been tested.

The tool paths, below your own Studio base URL, are:

- `orbit-learning-lab/mission/1` — Mission, Experiment, Evidence, Reflection;
- `orbit-learning-projects/files/1` — Files, Versions, Journal, Sharing.

The host retains its other navigation. Module and view are encoded in the tool routes. FR / EN / ES, static display, contrast, and larger text use Orbit's shared preference contract on the current origin. Browser storage cannot automatically synchronize preferences across unrelated origins. Learner files and code are not automatically translated.

## Three separate decisions about your work

**Local saving:** personal work starts in memory. Allow browser saving, then explicitly choose restore or save. The local namespace includes project, dataset, and user. Opening the tool does not automatically load old personal work. Browser storage is not an encrypted vault.

**Sharing:** choose the exact artifacts and journal entries your assistant may read, and allow proposal deposits separately if wanted. Teacher handoff is a selected export, not an automatic transmission or invitation. Colab and Drive are Google cloud storage; importing an export into Orbit does not make its original Google copy local.

**Sanity publication:** enable preparation of publishable content, select artifacts, inspect the exact JSON and destination, then acknowledge and click the human publication control. These are separate steps. Private journal entries, permissions, and unselected session content are excluded. No pedagogical WebMCP tool approves or publishes as the human. Do not rely on a free or trial dataset to protect private learner work.

Switching account, workspace, module, or learning tool invalidates the related assistant access. Restored/imported sessions require fresh authority. The assistant cannot silently promote imported work to verified execution or understanding.

## Credential-free integration validation in Kaggle

Prepare the notebook without running software tests locally:

```sh
python tools/prepare_learning_studio_validation.py
```

The preparation writes one code cell and a notebook under `.orbit/learning-studio-validation/`. Run the cell in Kaggle with Internet enabled. It embeds the archive above, verifies its checksum, downloads a checksum-pinned Node runtime, creates a new directory and isolated configuration, installs exact host dependencies plus the tarball, imports the plugin, and invokes the documented [Sanity build command](https://www.sanity.io/docs/cli-reference/build).

The validation uses a **fictitious project ID**, no real account, and no token. It does not log in, create a project, deploy, publish to npm, or write Content Lake documents. It has no LLM calls.

Results are retained in `/kaggle/working/learning-studio-validation/`:

- `installation-status.json` — stages, command exit codes, versions, duration, and explicit limits;
- command logs — dependency installation, plugin import, and Studio build;
- `second-studio-package-lock.json` — exact resolved dependencies after success;
- `static-build-manifest.json` — fingerprints of generated static files after success.

`PASS_STATIC_INSTALL_BUILD` means that the archive installed, imported, and compiled in the fresh host. It does **not** mean that a person logged in, the UI behaved correctly, or native tools executed. A failed run keeps its stage and error; do not replace it with a fabricated passing receipt.

## Separate authenticated and cross-origin QA

The current [public cross-origin receipt](../../receipts/formation/cross-origin-public-validation.json) records 16 passing Kaggle-dispatched checks in an isolated E2B Linux browser. It observes native course-tool discovery and execution, public course reads, synthetic import/export and consent revocation on the public formation surface; the second HTTPS Studio serves the exact pinned package and public Context without credentials. Its signed-out Studio exposes no private tools. This receipt does not certify an authenticated Studio publication.

The subsequent native desktop login is a separate owner-operated flow. Google rejected that browser with “This browser or app may not be secure”. No session was copied and no Google protection was bypassed. The authenticated publication, replay and logout scenarios remain unvalidated until a supported native sign-in succeeds. Their status must not be inferred from installation, a public Context read or the earlier authenticated UI-only inspection.

After a passing integration run, inspect a real second Studio with its owner's normal session. Keep these outcomes separate from the static build:

1. Open both tools, navigate forward/back, change module, and verify keyboard, small-screen, language, static display, contrast, and larger-text behavior.
2. Import only test artifacts. Verify save/restore, account and workspace isolation, fresh consent after navigation/import, and rejection of stale or late proposals.
3. Inspect the publication preview. Verify the host destination and selected payload; a real write requires the owner's explicit human action and existing rights. A read-only account must remain read-only.
4. From the second origin, verify the public course Context transport and the gateway CORS response. Keep personal journal content out of those requests. A compiled `courseOrigin` setting does not prove a successful cross-origin call.
5. In a browser that actually supports WebMCP, discover and execute the mounted twenty-five tools, verify permission refusal and revocation, then leave the tool and confirm cleanup. A browser without native WebMCP retains human controls; that fallback is not an agent execution.

No personal MCP credential is collected by the plugin. The student's assistant retains its own personal MCP configuration. Record authenticated, cross-origin, and native WebMCP results with their own environment, artifact version, observed output, and limits.
