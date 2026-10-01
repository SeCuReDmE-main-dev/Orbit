# Public course Context — bounded source review

Review date: **October 1, 2026**. Repository branch `master`; observed HEAD `dacedf22e842d202aaf2dd31ed62cc4cfeb4b319`. The reviewed backend files include working-tree changes and untracked source, so this commit alone does not identify their contents. The fingerprints below identify the inspected bytes.

Initial status: **SOURCE_REVIEW_WITH_TWO_FINDINGS**. The source follow-up below records the owner's corrections as **RESOLVED_IN_SOURCE_REMOTE_VALIDATION_PENDING**. This review read source and prepared tests. It did not execute PHP, send a network request, enable the public endpoint, import sources, change a permission, or publish learner work. The coordinator owns the separate Kaggle and public-runtime receipts. This note contains no account credential or learner data.

## Observed boundaries

- The two new public routes are GET `/api/v1/course-context/outline` and `/api/v1/course-context/entries`. They use their own middleware and an IP request throttle. The existing knowledge, session and workspace routes keep their original middleware.
- CORS is configured only for the two exact public paths, with GET/HEAD, `Accept`, wildcard origin and `supports_credentials: false`. Wildcard access is intentional for public course material; it grants no browser session. The existing private middleware still rejects a foreign browser origin.
- The client transport sends GET requests with `credentials: 'omit'`. The public controller permits no outline query, and only the `paths` query for entries. Its JSON list requires one to five distinct paths, each at most 200 characters, and a raw query value at most 2,200 bytes. The public middleware rejects request bodies.
- The reader requires an enabled server-owned manifest, the configured Knowledge Base, nine source records, SHA-256 digests, one to forty entry records, citations within those source IDs and coverage of all nine IDs. Accepted source URLs must be immutable GitHub raw URLs in the Orbit course's module/project paths.
- The real upstream service uses the existing server credential, fixed Sanity origin and two fixed MCP tools. It returns its own bounded text/metadata object, rather than forwarding authorization headers or arbitrary upstream JSON. Its streaming body limit is 262,144 bytes.
- The public outline verifies the complete upstream text digest, then constructs a course-only projection. It does not forward the original Knowledge Base outline. Entry paths are checked before any upstream read. Each entry is read individually, checked against its audited digest and added to an aggregate text budget of 262,144 bytes. This is a text budget; JSON encoding and audit metadata have additional overhead.
- Missing manifests, foreign citations, upstream errors, changed text and exhausted upstream budgets fail closed with a generic unavailable response. Error details and raw changed content are withheld. The source exposes no fallback to the old complete outline.
- The import preparator selects exactly Modules 1–8 and `PROJECT.md` at one pinned commit, checks public/local hashes and the indexed-document budget, rejects mixed/incomplete generated entries, requires one revision and all nine source IDs, and prepares its manifest disabled. It adds no learner journal or private project to those nine inputs.

These are source properties, not proof that the current deployed process has this configuration. A retained entry hash identifies the exact audited MCP representation; it does not certify its semantic correctness or replace examination of generated text and citations.

## Findings sent to the backend owner

### 1. The advertised environment switch is disconnected

`services/account-api/config/orbit.php:4` declares `orbit.public_course_context_enabled` from `ORBIT_PUBLIC_COURSE_CONTEXT_ENABLED`. The reader and middleware currently consult only `course_context.enabled` (`PublicCourseContextReader.php:14`, `PublicCourseContext.php:13`). The declared environment switch is therefore not a kill switch.

Impact: an operator setting the documented environment variable to false would not disable a manifest already marked enabled. The inspected manifest remains disabled, so this review observes a configuration ambiguity, not an active public exposure.

Suggested resolution: either require both explicit gates and cover all four combinations, or remove the unused setting and document one authoritative activation mechanism. Do not announce an environment-driven disable operation without verifying which gate the server uses.

### 2. Nine distinct URLs do not establish the exact nine-file set

`PublicCourseContextReader.php:27` allows Modules 1–8 or `PROJECT.md` at any valid commit. The distinct-URL count at line 31 permits two versions of the same module at different commits while omitting another module. Coverage then proves coverage of nine IDs, not the exact expected file set.

Impact: the current preparator provides the intended nine distinct files at one commit. Request parameters cannot modify the manifest. However, a malformed server-owned manifest could satisfy the reader's structural checks without representing exactly Modules 1–8 plus the project protocol.

Suggested resolution: extract the relative path and commit, require the exact nine expected paths once each and a single reviewed commit, then add negative fixtures for an omitted module replaced by another version of a module. Preserve the existing rejection of foreign origins, unknown source IDs and altered content.

## Inspected source fingerprints

| Source | SHA-256 |
|---|---|
| `services/account-api/app/Services/PublicCourseContextReader.php` | `7dc36e729009559dc9ed64b1621b068eec0635601ae50fc1c028329e093ae8a9` |
| `services/account-api/app/Http/Controllers/CourseContextController.php` | `370e7878781d813e80c4d35ab1db00a7af5a53eb18177502faa1ec12f3a12e90` |
| `services/account-api/app/Http/Middleware/PublicCourseContext.php` | `a9666c422a79063ac9c5502eef521407463813e0e78befd2c59e97da620901c2` |
| `services/account-api/config/cors.php` | `9a74f474a978656c46dad0e21c353e09cbb8b2342617464a8abed6105cdea499` |
| `services/account-api/routes/api.php` | `e7204c88d56e3471e8d556129ea34410b9eff34ce49f698f3bdd3e464c172551` |
| `tools/import_formation_context.mjs` | `6fa4b334d9f0b54531ab33ff49b1a3a2118004b51529d3d8ffd70e1fde4893c2` |

The existing `PublicCourseContextTest.php` source covers disabled transport, foreign-origin public reads, bounded inputs, preservation of private-origin refusal, CORS path scope, cache/shared budget, errors, missing scope, citations, changed text and single-entry batch reads. Those test bodies were inspected, not run by this reviewer. Changes resolving the findings require new source hashes and an actual remote test result.

Next validation: resolve the two configuration invariants, execute the affected PHP suite in Kaggle, preserve its payload fingerprint, then read the enabled deployed endpoints from an independent origin with credentials omitted. Verify projection/citations, changed-content refusal, private-route CORS refusal and the explicit disable gate separately from the real Sanity Studio session.

## Owner correction — source follow-up on the same date

The reviewer reread the owner's changed source after reporting the findings. The unused environment declaration was removed from `config/orbit.php` and `.env.example`; the public contract now names the audited `config/course_context.php` manifest as the single activation authority. The reader now extracts each source's Git commit and relative path, requires a single commit and the exact Modules 1–8 plus `PROJECT.md` set, and rejects a noncanonical set before reading upstream content. A new feature-test fixture covers both mixed commits and duplicate module paths.

| Changed source | New SHA-256 |
|---|---|
| `services/account-api/app/Services/PublicCourseContextReader.php` | `06c9bc33519b82f9e4efa3d623b0c01fdc3c1310c45ccb89855d800d6559d518` |
| `services/account-api/config/orbit.php` | `8b2e6350e82b091e8ae9038d6a8cda62432eab2c6d4b13b75b3b43f33fef4bd2` |
| `services/account-api/.env.example` | `572fca7d3e03f23656bfc7cecec23b88b2efc4803755391d3b4c816fdcc2c603` |
| `services/account-api/tests/Feature/PublicCourseContextTest.php` | `5f7854f76c333c2ae12617f2b48bd235fe39cbcc20b97b98c01987dde4d6523a` |

Both original findings remain visible above for provenance. Their corrections are verified by source inspection here, not a test execution. The requested Kaggle PHP run, real audited manifest, enable operation and independent-origin public readback remain the coordinator's separate validation steps.
